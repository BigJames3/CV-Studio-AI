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
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;
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

export {
  PAID_TIERS,
  canAccessAdvancedFeatures,
  canAccessBusinessTemplates,
  canAccessProTemplates,
  canAccessTemplate,
  canCreateCV,
  canDownloadPDF,
  canPrint,
  canShare,
  getAvailableTemplateTypes,
  getTierLevel,
  normalizeTier,
  resolveTemplateAccessTier,
  type FeatureGateUser,
  type SubscriptionTier as FeatureGateTier,
  type TemplateAccessType,
} from './feature-gate';

export type PaymentProvider = 'stripe' | 'cinetpay';

export type GeoLocationSource = 'user-profile' | 'browser-ip' | 'unknown';

export type GeoDetectPlan =
  { action: 'profile'; countryCode: string } | { action: 'skip' } | { action: 'fetch-ip' };

/** WAEMU: Benin, Burkina Faso, Côte d'Ivoire, Guinea-Bissau, Mali, Niger, Senegal, Togo */
export const WAEMU_COUNTRIES = ['BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG'] as const;

/** CEMAC: Cameroon, Central African Republic, Chad, Congo, Equatorial Guinea, Gabon */
export const CEMAC_COUNTRIES = ['CM', 'CF', 'TD', 'CG', 'GQ', 'GA'] as const;

/** Extra CinetPay-supported countries beyond WAEMU/CEMAC. */
export const CINETPAY_EXTRA_COUNTRIES = ['CD', 'GN'] as const;

export const AFRICAN_MOBILE_PAYMENT_ZONES = [...WAEMU_COUNTRIES, ...CEMAC_COUNTRIES] as const;

const CINETPAY_COUNTRIES = new Set<string>([
  ...AFRICAN_MOBILE_PAYMENT_ZONES,
  ...CINETPAY_EXTRA_COUNTRIES,
]);

export function isCinetpayCountry(countryCode?: string | null): boolean {
  if (!countryCode) return false;
  return CINETPAY_COUNTRIES.has(countryCode.trim().toUpperCase());
}

export function suggestPaymentMethod(countryCode?: string | null): PaymentProvider {
  return isCinetpayCountry(countryCode) ? 'cinetpay' : 'stripe';
}

/**
 * Decide how to resolve country for payment suggestions.
 * Profile always wins. DNT / declined / undecided consent skip IP lookup.
 */
export function planCountryDetection(input: {
  userCountryCode?: string | null;
  doNotTrack: boolean;
  consent: boolean | null;
}): GeoDetectPlan {
  const code = input.userCountryCode?.trim().toUpperCase();
  if (code && /^[A-Z]{2}$/.test(code)) {
    return { action: 'profile', countryCode: code };
  }
  if (input.doNotTrack || input.consent !== true) {
    return { action: 'skip' };
  }
  return { action: 'fetch-ip' };
}

export const emailSchema = z.string().email();
export const passwordSchema = z
  .string()
  .min(12)
  .regex(
    PASSWORD_REGEX,
    'Password must be ≥12 chars and include upper, lower, digit, and special char'
  );

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
