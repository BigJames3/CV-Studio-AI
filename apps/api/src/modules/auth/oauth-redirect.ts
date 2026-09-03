const DEFAULT_NEXT = '/dashboard';

function appBaseUrl(appUrl?: string): URL {
  try {
    return new URL(appUrl || process.env.APP_URL || 'http://localhost:3000');
  } catch {
    return new URL('http://localhost:3000');
  }
}

/**
 * Allow only same-origin or relative paths. Rejects protocol-relative, javascript:,
 * data:, and off-origin absolute URLs (open-redirect).
 */
export function sanitizeNextPath(next?: string | null, appUrl?: string): string {
  if (!next || typeof next !== 'string') return DEFAULT_NEXT;
  const trimmed = next.trim();
  if (!trimmed) return DEFAULT_NEXT;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    return DEFAULT_NEXT;
  }
  if (trimmed.startsWith('//') || trimmed.includes('\\')) return DEFAULT_NEXT;

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.includes('://')) return DEFAULT_NEXT;
    const withoutHash = trimmed.split('#')[0] ?? DEFAULT_NEXT;
    return withoutHash.startsWith('/') ? withoutHash : DEFAULT_NEXT;
  }

  try {
    const base = appBaseUrl(appUrl);
    const url = new URL(trimmed, base);
    if (url.origin !== base.origin) return DEFAULT_NEXT;
    return `${url.pathname}${url.search}` || DEFAULT_NEXT;
  } catch {
    return DEFAULT_NEXT;
  }
}
