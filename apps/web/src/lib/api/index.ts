import { apiClient, setAccessToken } from './client';
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
  invoices: ['invoices'] as const,
  analyticsDashboard: ['analytics', 'dashboard'] as const,
  adminMetrics: ['analytics', 'metrics'] as const,
  adminRevenue: ['analytics', 'revenue-history'] as const,
  adminFunnel: ['analytics', 'funnel'] as const,
  adminCohort: ['analytics', 'cohort-retention'] as const,
  adminCac: ['analytics', 'cac'] as const,
  adminLtv: ['analytics', 'ltv'] as const,
  marketplace: ['marketplace', 'templates'] as const,
  sessions: ['auth', 'sessions'] as const,
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

export type LoginResult = AuthResponse | { requires2fa: true };

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
    try {
      // Never refresh-on-401 during logout — that would re-issue session cookies.
      await apiClient('/auth/logout', { method: 'POST', body: {}, skipRefresh: true });
    } finally {
      useAuthStore.getState().clearSession();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('cv_logout_at', String(Date.now()));
      }
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
  oauthGoogle: (payload: { idToken?: string; code?: string; redirectUri?: string }) =>
    apiClient<AuthResponse>('/auth/oauth/google', {
      method: 'POST',
      body: payload,
      skipRefresh: true,
    }).then(applyAuth),
  oauthLinkedIn: (payload: { code: string; redirectUri: string }) =>
    apiClient<AuthResponse>('/auth/oauth/linkedin', {
      method: 'POST',
      body: payload,
      skipRefresh: true,
    }).then(applyAuth),
  enable2fa: () =>
    apiClient<{
      secret: string;
      otpauthUrl: string;
      qrCodeDataUrl: string;
      message: string;
    }>('/auth/2fa/enable', { method: 'POST', body: {} }),
  verify2fa: (code: string) =>
    apiClient<{ enabled: boolean }>('/auth/2fa/verify', {
      method: 'POST',
      body: { code },
    }),
  disable2fa: (code: string) =>
    apiClient<{ disabled: boolean }>('/auth/2fa/disable', {
      method: 'POST',
      body: { code },
    }),
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
  subscriptionEndDate?: string | null;
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

export type SubscriptionMeResponse = {
  tier: 'free' | 'pro' | 'business' | string;
  status: 'free' | 'active' | 'canceling' | 'past_due' | 'canceled';
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  subscriptionEndDate: string | null;
  entitlements?: {
    cvCreate?: boolean;
    aiOptimize?: boolean;
    exportDocx?: boolean;
  };
  subscription?: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string;
    currentPeriodStart: string;
    stripeSubscriptionId?: string | null;
    plan?: { name: string } | null;
  } | null;
};

export const subscriptionsApi = {
  me: () => apiClient<SubscriptionMeResponse>('/subscriptions/me'),
  checkout: (plan: 'pro' | 'business', interval: 'month' | 'year') =>
    apiClient<{ url: string; mode?: string; sessionId?: string }>('/subscriptions/checkout', {
      method: 'POST',
      body: { plan, interval },
    }),
  portal: () =>
    apiClient<{ url: string }>('/subscriptions/portal', {
      method: 'POST',
      body: {},
    }),
  reactivate: () =>
    apiClient<SubscriptionMeResponse & { reactivated?: boolean; alreadyActive?: boolean }>(
      '/subscriptions/me/reactivate',
      {
        method: 'POST',
        body: {},
      }
    ),
};

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  amount: string | number;
  currency: string;
  status: string;
  pdfUrl?: string | null;
  paidAt?: string | null;
  dueDate: string;
  createdAt: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  source?: 'stripe' | 'db';
};

export const invoicesApi = {
  list: () => apiClient<{ items: InvoiceListItem[] }>('/invoices'),
  download: (id: string) =>
    apiClient<{ url: string | null; invoiceNumber: string; message?: string }>(
      `/invoices/${id}/download`
    ),
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
  createListing: (body: {
    templateId: string;
    title: string;
    slug: string;
    description?: string;
    priceCents: number;
    tags?: string[];
  }) => apiClient('/marketplace/seller/listings', { method: 'POST', body }),
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

export type PlatformMetrics = {
  totalUsers: number;
  tierBreakdown: Record<string, number>;
  mrr: number;
  paidUsers: number;
  activePaidUsers: number;
  cancelingUsers: number;
  canceledThisMonth: number;
  churnRate: number;
  revenueThisMonth: number;
  generatedAt: string;
};

export type RevenueHistoryItem = {
  month: string;
  monthKey: string;
  revenue: number;
};

export type FunnelStep = {
  count: number;
  rate: number;
};

export type FunnelAnalysis = {
  signup: FunnelStep;
  emailVerified: FunnelStep;
  dashboard: FunnelStep;
  cvCreated: FunnelStep;
  upgraded: FunnelStep;
};

export type CohortRow = {
  month: string;
  monthKey: string;
  cohortSize: number;
  retained: number;
  retainedPaid: number;
  retentionRate: number;
  paidRetentionRate: number;
};

export type CacMetrics = {
  period: string;
  marketingSpend: number;
  newCustomers: number;
  cac: number;
};

export type LtvMetrics = {
  ltv: number;
  arpu: number;
  avgLifetimeMonths: number;
  paidUsers: number;
  mrr: number;
};

export const analyticsApi = {
  dashboard: () =>
    apiClient<{
      cvsCreated: number;
      totalViews: number;
      latestAtsScore: number | null;
      latestAtsAt: string | null;
    }>('/analytics/dashboard'),
  metrics: () => apiClient<PlatformMetrics>('/analytics/metrics'),
  revenueHistory: (months = 12) =>
    apiClient<{ items: RevenueHistoryItem[]; months: number }>(
      `/analytics/revenue-history?months=${months}`
    ),
  funnel: () => apiClient<FunnelAnalysis>('/analytics/funnel'),
  cohortRetention: (months = 12) =>
    apiClient<CohortRow[]>(`/analytics/cohort-retention?months=${months}`),
  cac: (period: 'month' | 'quarter' | 'year' = 'month') =>
    apiClient<CacMetrics>(`/analytics/cac?period=${period}`),
  ltv: () => apiClient<LtvMetrics>('/analytics/ltv'),
};
