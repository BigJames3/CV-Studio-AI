const DEFAULT_NEXT = '/dashboard';

/** Client-side open-redirect guard. Prefer the API-sanitized `next` when present. */
export function sanitizeNextPath(next?: string | null): string {
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
  if (trimmed.startsWith('//') || trimmed.includes('\\') || trimmed.includes('://')) {
    return DEFAULT_NEXT;
  }
  if (!trimmed.startsWith('/')) return DEFAULT_NEXT;
  return trimmed.split('#')[0] || DEFAULT_NEXT;
}
