import { useAuthStore } from '../stores/auth-store';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export type ApiEnvelope<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error: { code: string; message: string }; meta?: Record<string, unknown> };

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

type Options = {
  method?: string;
  body?: unknown;
  idempotencyKey?: string;
  auth?: boolean;
};

export async function apiClient<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, idempotencyKey, auth = true } = opts;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Client': 'mobile',
  };
  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !json.success) {
    const err = !json.success ? json.error : { code: 'HTTP_ERROR', message: res.statusText };
    throw new ApiError(err.code, err.message, res.status);
  }
  return json.data;
}
