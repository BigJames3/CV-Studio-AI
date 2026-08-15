import { APIRequestContext, expect } from '@playwright/test';
import { API_URL, E2E_PASSWORD, uniqueEmail } from '../env';

export type Envelope<T> = {
  success?: boolean;
  data?: T;
  error?: { code: string; message: string };
};

export type TestUser = {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  accessToken: string;
  subscriptionTier: string;
};

async function unwrap<T>(response: {
  ok: () => boolean;
  json: () => Promise<unknown>;
}): Promise<T> {
  const json = (await response.json()) as Envelope<T> | T;
  if (
    json &&
    typeof json === 'object' &&
    'data' in json &&
    (json as Envelope<T>).data !== undefined
  ) {
    return (json as Envelope<T>).data as T;
  }
  return json as T;
}

export async function apiRegister(
  request: APIRequestContext,
  overrides: Partial<Pick<TestUser, 'email' | 'password' | 'firstName' | 'lastName'>> = {}
): Promise<TestUser> {
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? E2E_PASSWORD;
  const firstName = overrides.firstName ?? 'E2E';
  const lastName = overrides.lastName ?? 'User';

  const res = await request.post(`${API_URL}/auth/register`, {
    data: { email, password, firstName, lastName },
  });
  expect(res.ok(), `register failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const data = await unwrap<{
    accessToken: string;
    user: { id: string; email: string; subscriptionTier: string };
  }>(res);

  return {
    id: data.user.id,
    email: data.user.email,
    password,
    firstName,
    lastName,
    accessToken: data.accessToken,
    subscriptionTier: data.user.subscriptionTier,
  };
}

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<TestUser> {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  expect(res.ok(), `login failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const data = await unwrap<{
    accessToken: string;
    user: {
      id: string;
      email: string;
      subscriptionTier: string;
      firstName?: string;
      lastName?: string;
    };
  }>(res);
  return {
    id: data.user.id,
    email: data.user.email,
    password,
    firstName: data.user.firstName ?? 'E2E',
    lastName: data.user.lastName ?? 'User',
    accessToken: data.accessToken,
    subscriptionTier: data.user.subscriptionTier,
  };
}

export async function apiAuthHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getSubscription(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_URL}/subscriptions/me`, {
    headers: await apiAuthHeaders(token),
  });
  expect(res.ok(), `subscriptions/me failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return unwrap<{
    subscription: {
      status: string;
      cancelAtPeriodEnd: boolean;
      currentPeriodEnd: string;
      plan?: { name: string };
    } | null;
    tier: 'free' | 'pro' | 'business';
    entitlements: { cvCreate: boolean; aiOptimize: boolean; exportDocx: boolean };
  }>(res);
}

export async function getMe(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_URL}/users/me`, {
    headers: await apiAuthHeaders(token),
  });
  expect(res.ok(), `users/me failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return unwrap<{
    id: string;
    email: string;
    firstName: string;
    subscriptionTier: 'free' | 'pro' | 'business';
  }>(res);
}

export async function listCvs(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_URL}/cvs`, {
    headers: await apiAuthHeaders(token),
  });
  expect(res.ok(), `cvs list failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return unwrap<{ items: Array<{ id: string; title: string }> }>(res);
}

export async function checkout(
  request: APIRequestContext,
  token: string,
  plan: 'pro' | 'business',
  interval: 'month' | 'year' = 'month'
) {
  const res = await request.post(`${API_URL}/subscriptions/checkout`, {
    headers: await apiAuthHeaders(token),
    data: { plan, interval },
  });
  expect(res.ok(), `checkout failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return unwrap<{ url: string; mode?: string; sessionId?: string }>(res);
}

export async function cancelSubscription(request: APIRequestContext, token: string) {
  const res = await request.delete(`${API_URL}/subscriptions/me/cancel`, {
    headers: await apiAuthHeaders(token),
  });
  expect(res.ok(), `cancel failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return unwrap<{ status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: string }>(res);
}

/** GDPR soft-delete — isolates leftover rows from later logins. */
export async function deleteUser(request: APIRequestContext, token: string) {
  const res = await request.delete(`${API_URL}/users/me`, {
    headers: await apiAuthHeaders(token),
  });
  if (!res.ok()) {
    // Best-effort teardown: never fail the test after assertions passed.
    console.warn(`deleteMe failed: ${res.status()} ${await res.text()}`);
  }
}
