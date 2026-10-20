import { Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { BillingCatalogEntitlement, PublicBillingPlan } from '@cvstudio/shared-types';
import { getCvLimit } from '@cvstudio/shared-utils';
import { PrismaService } from '../../database/prisma.module';
import { RedisService } from '../../redis/redis.module';
import { paymentCurrency } from '../payments/payment-env';
import { planChargeAmount } from '../payments/pricing';
import { TEMPLATE_SEEDS } from '../templates/template-seeds';

export const PLAN_CACHE_KEY = 'plans:all';
export const PLAN_CACHE_TTL_SECONDS = 3600;
/** Free users get every non-premium official template: derived, so the catalog cannot drift. */
export const FREE_TEMPLATE_COUNT = TEMPLATE_SEEDS.filter((t) => !t.isPremium).length;

export type PlanSlug = 'free' | 'pro' | 'business';
export type PlanEntitlementDto = BillingCatalogEntitlement;
export type PublicPlanDto = PublicBillingPlan;

const DISPLAY_NAME: Record<string, string> = {
  Free: 'Gratuit',
  Pro: 'Pro',
  Business: 'Business',
};

const POSITION: Record<string, number> = {
  Free: 0,
  Pro: 1,
  Business: 2,
};

type PlanRow = {
  name: string;
  description: string;
  priceMonthly: Prisma.Decimal | number | string;
  priceYearly: Prisma.Decimal | number | string;
  cvLimit: number;
  aiFeatures: boolean;
  prioritySupport: boolean;
  customDomain: boolean;
  marketplaceAccess: boolean;
  apiAccess: boolean;
};

/** Used when `plans` is empty (seed not run) so the billing UI still has prices. */
export const CATALOG_FALLBACK_ROWS: PlanRow[] = [
  {
    name: 'Free',
    description: '1 CV, 10 templates, ATS score, no PDF export, no AI optimization',
    priceMonthly: 0,
    priceYearly: 0,
    cvLimit: 1,
    aiFeatures: false,
    prioritySupport: false,
    customDomain: false,
    marketplaceAccess: true,
    apiAccess: false,
  },
  {
    name: 'Pro',
    description: '5 CVs, unlimited templates, AI optimization, ATS check',
    priceMonthly: 9.99,
    priceYearly: 99,
    cvLimit: 5,
    aiFeatures: true,
    prioritySupport: true,
    customDomain: false,
    marketplaceAccess: true,
    apiAccess: false,
  },
  {
    name: 'Business',
    description: '20 CVs, everything in Pro',
    priceMonthly: 29.99,
    priceYearly: 299,
    cvLimit: 20,
    aiFeatures: true,
    prioritySupport: true,
    customDomain: true,
    marketplaceAccess: true,
    apiAccess: true,
  },
];

function toNumber(value: Prisma.Decimal | number | string): number {
  return Number(value);
}

/**
 * Catalog rows are in EUR; customers pay in the payment currency (XOF by default). Prices are
 * shown in what is actually charged, falling back to EUR when no charge price is configured.
 */
function displayPrices(plan: PlanSlug, monthly: number, yearly: number) {
  if (plan === 'free') return { currency: paymentCurrency(), monthly: 0, yearly: 0 };
  const currency = paymentCurrency();
  const catalog = { monthly, yearly };
  const chargedMonthly = planChargeAmount(plan, 'month', catalog, currency);
  const chargedYearly = planChargeAmount(plan, 'year', catalog, currency);
  if (!chargedMonthly) return { currency: 'EUR', monthly, yearly };
  return {
    currency,
    monthly: chargedMonthly / 100,
    yearly: chargedYearly ? chargedYearly / 100 : 0,
  };
}

function slugFromName(name: string): PlanSlug {
  const slug = name.toLowerCase();
  if (slug === 'free' || slug === 'pro' || slug === 'business') return slug;
  throw new Error(`Unknown plan name: ${name}`);
}

/** Plan columns kept in the database but not shipped: the catalog must not list them. */
export const UNSHIPPED_FEATURES = ['collaborate', 'customDomain', 'apiAccess'] as const;

export function mapPlanToPublicDto(plan: PlanRow): PublicPlanDto {
  const id = slugFromName(plan.name);
  const prices = displayPrices(id, toNumber(plan.priceMonthly), toNumber(plan.priceYearly));
  const priceMonthly = prices.monthly;
  const priceYearly = prices.yearly;
  const cvLimit = getCvLimit(id);
  const paid = priceMonthly > 0;

  // Team collaboration, custom domain and API access have no route yet: never advertise them,
  // whatever the plan row says (see UNSHIPPED_FEATURES).
  const entitlements: PlanEntitlementDto[] = [
    {
      feature: 'cvLimit',
      value: String(cvLimit),
      included: true,
    },
    // Same rule as canDownloadPDF / canShare: PDF and sharing are paid features.
    { feature: 'downloadPdf', value: String(id !== 'free'), included: id !== 'free' },
    { feature: 'share', value: String(id !== 'free'), included: id !== 'free' },
    { feature: 'aiFeatures', value: String(plan.aiFeatures), included: plan.aiFeatures },
    // Same rule as the 'ai:ats' entitlement: the ATS score is free on every plan.
    { feature: 'atsCheck', value: 'true', included: true },
    {
      feature: 'templates',
      value: id === 'free' ? String(FREE_TEMPLATE_COUNT) : 'unlimited',
      included: true,
    },
    {
      feature: 'prioritySupport',
      value: String(plan.prioritySupport),
      included: plan.prioritySupport,
    },
    // Marketplace licences are one-off purchases open to every plan (`marketplace:buy`).
    { feature: 'marketplaceAccess', value: 'true', included: true },
  ];

  return {
    id,
    name: DISPLAY_NAME[plan.name] ?? plan.name,
    description: plan.description,
    position: POSITION[plan.name] ?? 99,
    priceMonthly,
    priceAnnual: paid && priceYearly > 0 ? priceYearly : null,
    currency: prices.currency,
    // Prepaid plans: nothing bills after a trial, so none is offered.
    trialDays: null,
    recommended: id === 'pro',
    entitlements,
  };
}

/**
 * Single source of truth for billing plans (pricing, entitlements).
 */
@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redis?: RedisService
  ) {}

  async findAll(): Promise<PublicPlanDto[]> {
    const cached = await this.readCache();
    if (cached) return cached;

    const rows = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });

    if (rows.length === 0) {
      this.logger.warn('plans table is empty — serving catalog fallback');
    }

    const plans = (rows.length > 0 ? rows : CATALOG_FALLBACK_ROWS).map((row) =>
      mapPlanToPublicDto(row)
    );
    await this.writeCache(plans);
    return plans;
  }

  private async readCache(): Promise<PublicPlanDto[] | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(PLAN_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PublicPlanDto[];
    } catch (error) {
      this.logger.warn(
        `Plans cache read failed: ${error instanceof Error ? error.message : 'unknown'}`
      );
      return null;
    }
  }

  private async writeCache(plans: PublicPlanDto[]): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(PLAN_CACHE_KEY, JSON.stringify(plans), PLAN_CACHE_TTL_SECONDS);
    } catch (error) {
      this.logger.warn(
        `Plans cache write failed: ${error instanceof Error ? error.message : 'unknown'}`
      );
    }
  }
}
