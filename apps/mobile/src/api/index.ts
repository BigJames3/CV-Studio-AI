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

export const billingApi = {
  me: () => apiClient<{ plan: string; status: string }>('/subscriptions/me'),
  paymentSheet: () =>
    apiClient<{
      paymentIntentClientSecret: string;
      ephemeralKey: string;
      customerId: string;
    }>('/payments/payment-sheet', { method: 'POST' }),
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
