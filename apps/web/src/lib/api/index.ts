import { apiClient, setAccessToken, setLogoutInProgress } from './client';
import { useAuthStore } from '@/stores/auth-store';

export const queryKeys = {
  user: {
    all: () => ['user'] as const,
    me: () => ['user', 'me'] as const,
    profile: () => ['user', 'profile'] as const,
  },
  /** @deprecated Prefer queryKeys.user.me() */
  me: ['user', 'me'] as const,
  cvs: (filters?: unknown) => ['cvs', filters] as const,
  cv: (id: string) => ['cvs', id] as const,
  templates: (q?: unknown) => ['templates', q] as const,
  subscription: ['subscription', 'me'] as const,
  analyticsDashboard: ['analytics', 'dashboard'] as const,
  marketplace: ['marketplace', 'templates'] as const,
  sessions: ['auth', 'sessions'] as const,
  payments: ['payments', 'history'] as const,
  paymentMethods: ['payments', 'methods'] as const,
  geoCountry: ['geo', 'country'] as const,
};

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    subscriptionTier: string;
    isEmailVerified?: boolean;
  };
};

export type LoginResult = AuthResponse | { requires2fa: true; tempToken?: string };

function applyAuth(data: AuthResponse) {
  setAccessToken(data.accessToken);
  useAuthStore.getState().setUser(data.user);
  return data;
}

export const authApi = {
  login: async (email: string, password: string, totp?: string): Promise<LoginResult> => {
    const data = await apiClient<LoginResult>('/auth/login', {
      method: 'POST',
      body: { email, password, ...(totp ? { totp } : {}) },
      skipRefresh: true,
    });
    if ('requires2fa' in data) return data;
    return applyAuth(data);
  },
  register: async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const data = await apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: payload,
      skipRefresh: true,
    });
    return applyAuth(data);
  },
  logout: async () => {
    setLogoutInProgress(true);
    try {
      // Never refresh-on-401 during logout — that would re-issue session cookies.
      await apiClient('/auth/logout', { method: 'POST', body: {}, skipRefresh: true });
    } finally {
      useAuthStore.getState().clearSession();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('cv_logout_at', String(Date.now()));
      }
      setLogoutInProgress(false);
    }
  },
  getProfile: () => apiClient<UserProfile>('/auth/profile'),
  updateProfile: (body: UpdateProfileInput) =>
    apiClient<UserProfile>('/auth/profile', { method: 'PUT', body }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient<{ changed: boolean; message?: string }>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
  forgotPassword: (email: string) =>
    apiClient<{ sent: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      skipRefresh: true,
    }),
  resetPassword: (token: string, newPassword: string) =>
    apiClient<{ reset: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
      skipRefresh: true,
    }),
  verifyEmail: (token: string) =>
    apiClient<{ verified: boolean }>('/auth/verify-email', {
      method: 'POST',
      body: { token },
      skipRefresh: true,
    }),
  resendVerification: () =>
    apiClient<{ sent: boolean }>('/auth/resend-verification', { method: 'POST', body: {} }),
  enable2fa: () =>
    apiClient<{
      secret: string;
      otpauthUrl: string;
      qrCodeDataUrl: string;
      message: string;
    }>('/auth/2fa/enable', { method: 'POST', body: {} }),
  verify2fa: (code: string) =>
    apiClient<{ enabled: boolean; backupCodes?: string[] }>('/auth/2fa/verify', {
      method: 'POST',
      body: { code },
    }),
  disable2fa: (code: string) =>
    apiClient<{ disabled: boolean }>('/auth/2fa/disable', {
      method: 'POST',
      body: { code },
    }),
  complete2fa: (tempToken: string, totp?: string, backupCode?: string) =>
    apiClient<AuthResponse>('/auth/2fa/complete', {
      method: 'POST',
      body: { tempToken, ...(totp ? { totp } : {}), ...(backupCode ? { backupCode } : {}) },
      skipRefresh: true,
    }).then(applyAuth),
  createOAuthState: (provider: 'google' | 'linkedin', next?: string) =>
    apiClient<{ state: string; next: string }>('/auth/oauth/state', {
      method: 'POST',
      body: { provider, next },
      skipRefresh: true,
    }),
  oauthGoogle: async (payload: { idToken?: string; code?: string; redirectUri?: string }) => {
    const data = await apiClient<AuthResponse | LoginResult>('/auth/oauth/google', {
      method: 'POST',
      body: payload,
      skipRefresh: true,
    });
    if (data && typeof data === 'object' && 'requires2fa' in data) return data;
    return applyAuth(data as AuthResponse);
  },
  oauthLinkedIn: async (payload: { code: string; redirectUri: string; state?: string }) => {
    const data = await apiClient<AuthResponse | LoginResult>('/auth/oauth/linkedin', {
      method: 'POST',
      body: payload,
      skipRefresh: true,
    });
    if (data && typeof data === 'object' && 'requires2fa' in data) return data;
    return applyAuth(data as AuthResponse);
  },
  sessions: () =>
    apiClient<{
      items: Array<{
        id: string;
        familyId: string;
        userAgent: string | null;
        ipAddress: string | null;
        createdAt: string;
        updatedAt: string;
        expiresAt: string;
      }>;
    }>('/auth/sessions'),
  revokeSession: (id: string) =>
    apiClient<{ revoked: boolean }>(`/auth/sessions/${id}`, { method: 'DELETE' }),
};

export type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  subscriptionTier: string;
  countryCode?: string | null;
  isEmailVerified?: boolean;
  is2faEnabled?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  bio?: string;
  avatarUrl?: string | null;
};

export const usersApi = {
  me: () => apiClient<UserProfile>('/users/me'),
  getMe: () => apiClient<UserProfile>('/users/me'),
  updateMe: (body: UpdateProfileInput) =>
    apiClient<UserProfile>('/users/me', { method: 'PATCH', body }),
  deleteMe: () =>
    apiClient<{
      deleted: boolean;
      dataPurged?: boolean;
      billingCanceled?: boolean;
      stripeCanceled?: boolean;
    }>('/users/me', { method: 'DELETE' }),
  exportMe: () =>
    apiClient<{ exportedAt: string; user: UserProfile; cvs: unknown[] }>('/users/me/export'),
};

export type CvListItem = {
  id: string;
  title: string;
  updatedAt: string;
  isPublic?: boolean;
  isStarred?: boolean;
  publicUrl?: string | null;
  templateId?: string | null;
  viewCount?: number;
  createdAt?: string;
};

export type ListCvsParams = {
  cursor?: string;
  limit?: number;
  starred?: boolean;
};

export type ListCvsResponse = {
  items: CvListItem[];
  nextCursor: string | null;
};

export const cvsApi = {
  list: (params?: ListCvsParams) => {
    const query = new URLSearchParams();
    if (params?.cursor) query.append('cursor', params.cursor);
    if (params?.limit != null) query.append('limit', String(params.limit));
    if (params?.starred !== undefined) {
      query.append('starred', params.starred ? 'true' : 'false');
    }
    const qs = query.toString();
    // apiClient already prefixes NEXT_PUBLIC_API_URL (/api/v1)
    return apiClient<ListCvsResponse>(`/cvs${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => apiClient<Record<string, unknown>>(`/cvs/${id}`),
  create: (body: { title: string; templateId?: string; content?: unknown }) =>
    apiClient('/cvs', { method: 'POST', body }),
  update: (id: string, body: unknown) => apiClient(`/cvs/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => apiClient(`/cvs/${id}`, { method: 'DELETE' }),
  duplicate: (id: string) => apiClient(`/cvs/${id}/duplicate`, { method: 'POST', body: {} }),
  publish: (id: string, body: { isPublic: boolean; publicUrl?: string }) =>
    apiClient(`/cvs/${id}/publish`, { method: 'POST', body }),
  share: (id: string) =>
    apiClient<{
      isPublic: boolean;
      publicUrl: string | null;
      shareUrl: string | null;
      qrCodeDataUrl: string | null;
    }>(`/cvs/${id}/share`),
  /** Async enqueue for saved CVs */
  exportPdf: (id: string, query?: { filename?: string; pageSize?: string; quality?: string }) => {
    const qs = query
      ? `?${new URLSearchParams(
          Object.entries(query).filter(([, v]) => v != null) as [string, string][]
        ).toString()}`
      : '';
    return apiClient<{ jobId: string; pollUrl?: string; status: string }>(
      `/cvs/${id}/export/pdf${qs}`
    );
  },
  getExportJob: (jobId: string) =>
    apiClient<{
      status: string;
      jobId: string;
      downloadUrl?: string;
      error?: string;
      filename?: string;
    }>(`/cvs/exports/${jobId}`),
};

export const templatesApi = {
  list: () =>
    apiClient<{
      items: Array<{
        id: string;
        name: string;
        description: string;
        category: string;
        previewImageUrl: string;
        isPremium: boolean;
        designData?: unknown;
      }>;
    }>('/templates'),
  get: (id: string) => apiClient<Record<string, unknown>>(`/templates/${id}`),
  byCategory: (category: string) => apiClient(`/templates/category/${category}`),
};

export const subscriptionsApi = {
  me: () =>
    apiClient<{
      subscription: {
        status: string;
        cancelAtPeriodEnd: boolean;
        currentPeriodEnd: string;
        currentPeriodStart: string;
      } | null;
      tier: 'free' | 'pro' | 'business';
      entitlements: { cvCreate: boolean; aiOptimize: boolean; exportDocx: boolean };
    }>('/subscriptions/me'),
  checkout: (params: {
    plan: 'pro' | 'business';
    interval: 'month' | 'year';
    paymentMethod?: 'stripe' | 'cinetpay';
  }) =>
    apiClient<{ url: string; mode?: string; transactionId?: string; paymentMethod?: string }>(
      '/subscriptions/checkout',
      {
        method: 'POST',
        body: params,
      }
    ),
  cancel: () =>
    apiClient<{
      status: string;
      cancelAtPeriodEnd: boolean;
      currentPeriodEnd: string;
    }>('/subscriptions/me/cancel', { method: 'DELETE' }),
};

export type PaymentHistoryItem = {
  id: string;
  amount: string | number;
  currency: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
};

export const paymentsApi = {
  history: () => apiClient<{ items: PaymentHistoryItem[] }>('/payments/history'),
  methods: () =>
    apiClient<{ stripe: boolean; cinetpay: boolean; cinetpayFailClosed: boolean }>(
      '/payments/methods'
    ),
  getStatus: (transactionId: string) =>
    apiClient<{
      status: string;
      paymentMethod?: string;
      transactionId: string;
    }>(`/payments/status/${encodeURIComponent(transactionId)}`),
};

export const geoApi = {
  country: () => apiClient<{ country: string | null; source: 'ip' | 'unknown' }>('/geo/country'),
};

export const aiApi = {
  optimize: (body: unknown) => apiClient('/ai/optimize-resume', { method: 'POST', body }),
  checkAts: (body: { cvId: string; jobDescription?: string }) =>
    apiClient<{
      id: string;
      atsScore: number;
      missingKeywords: string[];
      matchedKeywords?: string[];
      score?: number;
      explanation?: string | null;
      explanations?: unknown[];
      improvements?: string[];
      recommendations?: {
        format?: string[];
        content?: string[];
        explainPrompt?: string;
        headline?: string;
        explanations?: unknown[];
        quickWins?: string[];
      };
      feature: string;
      model: string;
    }>('/ai/check-ats', { method: 'POST', body }),
  coverLetter: (body: { cvId: string; jobDescription: string; company?: string; tone?: string }) =>
    apiClient<{
      status: string;
      letter: { subject: string; body: string };
      warnings?: string[];
    }>('/ai/generate-cover-letter', { method: 'POST', body }),
  explainAts: (body: { cvId: string; jobDescription?: string }) =>
    apiClient('/ai/explain-ats-score', { method: 'POST', body }),
};

export const marketplaceApi = {
  listTemplates: (params?: { q?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.q) q.set('q', params.q);
    if (params?.category) q.set('category', params.category);
    const qs = q.toString();
    return apiClient<{ items?: unknown[] } | unknown[]>(
      `/marketplace/templates${qs ? `?${qs}` : ''}`
    );
  },
  sellerMe: () => apiClient('/marketplace/seller/me'),
  applySeller: (body: { displayName: string; slug: string; country: string; bio?: string }) =>
    apiClient('/marketplace/seller/apply', { method: 'POST', body }),
  listMyTemplates: () =>
    apiClient<{ items: Array<{ id: string; name: string; category: string }> }>(
      '/marketplace/seller/templates'
    ),
  createSellerTemplate: (body: {
    name: string;
    description: string;
    category: string;
    previewImageUrl: string;
    designData: Record<string, unknown>;
  }) => apiClient('/marketplace/seller/templates', { method: 'POST', body }),
  createListing: (body: {
    templateId: string;
    title: string;
    slug: string;
    description?: string;
    priceCents: number;
    tags?: string[];
  }) => apiClient('/marketplace/seller/listings', { method: 'POST', body }),
  getListing: (id: string) => apiClient<Record<string, unknown>>(`/marketplace/templates/${id}`),
  getDesign: (id: string) =>
    apiClient<{ listingId: string; templateId: string; designData: unknown }>(
      `/marketplace/templates/${id}/design`
    ),
  createPaymentIntent: (listingId: string) =>
    apiClient<{ clientSecret: string | null; paymentIntentId: string }>(
      `/marketplace/templates/${listingId}/payment-intent`,
      { method: 'POST', body: {} }
    ),
  purchase: (listingId: string, paymentIntentId: string) =>
    apiClient(`/marketplace/templates/${listingId}/purchase`, {
      method: 'POST',
      body: { paymentIntentId },
    }),
  sales: () =>
    apiClient<{
      listings: Array<{
        id: string;
        title: string;
        status: string;
        priceCents: number;
        purchases: Array<{ amountCents: number; sellerEarningCents: number }>;
      }>;
      revenueCents: number;
      sellerShareCents: number;
    }>('/marketplace/sales'),
  analytics: () =>
    apiClient<{
      impressions: number;
      purchases: number;
      conversionRate: number;
      revenueCents: number;
      sellerShareCents: number;
      listings: unknown[];
    }>('/marketplace/seller/analytics'),
};
