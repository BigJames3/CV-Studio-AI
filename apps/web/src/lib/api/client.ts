export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { timestamp: string; version: string; requestId?: string };
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Skip 401 → refresh retry (used by refresh itself) */
  skipRefresh?: boolean;
};

/** Access token stays in memory only (XSS mitigation). Refresh lives in HttpOnly cookie. */
let memoryAccessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

const LOGOUT_BROADCAST_KEY = 'cv_logout_at';

function clearClientSessionCookies() {
  if (typeof document === 'undefined') return;
  // Must mirror attributes used when setting (SameSite=Lax) or the cookie may survive.
  const expired = 'path=/; Max-Age=0; SameSite=Lax';
  document.cookie = `cv_session=; ${expired}`;
  document.cookie = `access_token=; ${expired}`;
  document.cookie = `refresh_token=; ${expired}`;
}

export function setAccessToken(token: string | null) {
  memoryAccessToken = token;
  if (typeof document !== 'undefined') {
    if (token) {
      document.cookie = 'cv_session=1; path=/; SameSite=Lax; Max-Age=604800';
    } else {
      clearClientSessionCookies();
    }
  }
}

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

/** Wipe in-memory token + client-visible session cookies (call on logout always). */
export function clearClientAuth() {
  memoryAccessToken = null;
  clearClientSessionCookies();
}

export { LOGOUT_BROADCAST_KEY };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });
      const json = (await res.json().catch(() => null)) as Envelope<{ accessToken: string }> | null;
      if (!res.ok || !json?.data?.accessToken) {
        setAccessToken(null);
        return false;
      }
      setAccessToken(json.data.accessToken);
      return true;
    } catch {
      setAccessToken(null);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function shouldSkipRefresh(path: string, options: RequestOptions): boolean {
  if (options.skipRefresh) return true;
  const p = path.toLowerCase();
  return (
    p.includes('/auth/login') ||
    p.includes('/auth/register') ||
    p.includes('/auth/logout') ||
    p.includes('/auth/refresh')
  );
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token !== undefined ? options.token : getAccessToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  const res = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    credentials: 'include',
  });

  if (res.status === 401 && !shouldSkipRefresh(path, options)) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiClient<T>(path, { ...options, skipRefresh: true, token: getAccessToken() });
    }
  }

  const json = (await res.json().catch(() => null)) as Envelope<T> | null;

  if (!res.ok || json?.success === false) {
    throw new ApiError(
      res.status,
      json?.error?.code ?? 'HTTP_ERROR',
      json?.error?.message ?? res.statusText,
      json?.error?.details
    );
  }

  return (json?.data ?? json) as T;
}
