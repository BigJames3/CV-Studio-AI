import { apiClient } from './client';

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
};

export const authApi = {
  login: (email: string, password: string) =>
    apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),
  register: (email: string, password: string, name?: string) =>
    apiClient<LoginResponse>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
      auth: false,
    }),
  logout: (refreshToken?: string | null) =>
    apiClient<{ revoked: boolean }>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    }),
  refresh: (refreshToken: string) =>
    apiClient<LoginResponse>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    }),
};

export const cvsApi = {
  list: (updatedSince?: string) => {
    const q = updatedSince ? `?updatedSince=${encodeURIComponent(updatedSince)}` : '';
    return apiClient<{ items: CvDto[] }>(`/cvs${q}`);
  },
  get: (id: string) => apiClient<CvDto>(`/cvs/${id}`),
  patch: (id: string, body: Partial<CvDto>, idempotencyKey: string) =>
    apiClient<CvDto>(`/cvs/${id}`, { method: 'PATCH', body, idempotencyKey }),
  create: (body: { title: string; templateId?: string }) =>
    apiClient<CvDto>('/cvs', { method: 'POST', body }),
};

export const templatesApi = {
  list: () => apiClient<{ items: TemplateDto[] }>('/templates'),
};

export type PlanTier = 'free' | 'pro' | 'business';
export type BillingInterval = 'month' | 'year';

export type BillingPlanDto = {
  id: PlanTier;
  name: string;
  priceMonthly: number;
  priceAnnual: number | null;
  currency: string;
};

export const billingApi = {
  me: () =>
    apiClient<{
      tier: PlanTier;
      subscription: {
        status: string;
        provider?: string | null;
        currentPeriodEnd: string;
      } | null;
    }>('/subscriptions/me'),
  plans: () => apiClient<BillingPlanDto[]>('/plans', { auth: false }),
  /** Paystack payment page for one prepaid period. Paystack then returns to the web app. */
  checkout: (plan: 'pro' | 'business', interval: BillingInterval) =>
    apiClient<{ url: string; reference: string }>('/subscriptions/checkout', {
      method: 'POST',
      body: { plan, interval },
    }),
  /** Verifies the payment with Paystack and applies it (idempotent, the webhook does it too). */
  confirmCheckout: (reference: string) =>
    apiClient<{ confirmed: boolean }>('/payments/checkout/confirm', {
      method: 'POST',
      body: { reference },
    }),
};

export const devicesApi = {
  register: (token: string, platform: 'ios' | 'android') =>
    apiClient('/devices', { method: 'POST', body: { token, platform } }),
};

export type CvDto = {
  id: string;
  title: string;
  templateId: string | null;
  content: Record<string, unknown>;
  updatedAt: string;
  deletedAt?: string | null;
};

export type TemplateDto = {
  id: string;
  name: string;
  category: string;
  previewUrl?: string;
  isPremium: boolean;
};
