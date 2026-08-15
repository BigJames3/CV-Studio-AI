import type { DensityPreset, TemplateCustomization } from '@cvstudio/shared-types';
import { z } from 'zod';

// Constants
export const APP_NAME = 'CV Studio AI';
export const API_VERSION = 'v1';
export const API_TIMEOUT = 30_000;

// Date Constants
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';

// Regex Patterns
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
export const URL_REGEX = /^https?:\/\/.+/;

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export const DENSITY_SCALE: Record<
  DensityPreset,
  { sectionGap: string; lineHeight: number; fontScale: number }
> = {
  compact: { sectionGap: '0.75rem', lineHeight: 1.35, fontScale: 0.92 },
  normal: { sectionGap: '1.25rem', lineHeight: 1.5, fontScale: 1 },
  spacious: { sectionGap: '1.75rem', lineHeight: 1.65, fontScale: 1.06 },
};

export function mergeCustomization(
  base: TemplateCustomization,
  patch?: Partial<TemplateCustomization>
): TemplateCustomization {
  return { ...base, ...patch };
}

export function formatDateRange(start?: string, end?: string | null, current?: boolean) {
  if (!start) return '';
  if (current || !end) return `${start} – Present`;
  return `${start} – ${end}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type PaymentProvider = 'stripe' | 'cinetpay';

/** WAEMU + CEMAC + other CinetPay-supported countries (ISO 3166-1 alpha-2). */
const CINETPAY_COUNTRIES = new Set([
  'SN',
  'CI',
  'BF',
  'ML',
  'BJ',
  'TG',
  'NE',
  'GW',
  'CM',
  'CF',
  'CG',
  'GQ',
  'GA',
  'TD',
  'CD',
  'GN',
]);

export function suggestPaymentMethod(countryCode?: string | null): PaymentProvider {
  if (!countryCode) return 'stripe';
  return CINETPAY_COUNTRIES.has(countryCode.toUpperCase()) ? 'cinetpay' : 'stripe';
}

export const emailSchema = z.string().email();
export const passwordSchema = z
  .string()
  .min(8)
  .regex(PASSWORD_REGEX, 'Password must include upper, lower, digit, and special char');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
