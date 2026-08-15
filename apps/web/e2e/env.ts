/** Shared E2E env. Never commit real secrets — CI injects them. */
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'TestPassword123!';
export const API_URL = (
  process.env.E2E_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1'
).replace(/\/$/, '');

export const stripeEnabled = process.env.E2E_STRIPE === '1';
export const realPdfEnabled = process.env.E2E_REAL_PDF === '1';

export function uniqueEmail(prefix = 'e2e'): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}.${stamp}@cvstudio.test`;
}
