import { Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { BillingCatalogEntitlement, PublicBillingPlan } from '@cvstudio/shared-types';
import { canDownloadPDF, canShare, getCvLimit } from '@cvstudio/shared-utils';
import { PrismaService } from '../../database/prisma.module';
import { RedisService } from '../../redis/redis.module';
import { isNonPlaceholderSecret } from '../payments/payment-env';
import { TEMPLATE_SEEDS } from '../templates/template-seeds';

export const PLAN_CACHE_KEY = 'plans:all';
export const PLAN_CACHE_TTL_SECONDS = 3600;
export const TRIAL_PERIOD_DAYS = 14;

export type PlanSlug = 'free' | 'pro' | 'business';
export type PlanEntitlementDto = BillingCatalogEntitlement;
export type PublicPlanDto = PublicBillingPlan;

const DISPLAY_NAME: Record<string, string> = {
  Free: 'Gratuit',
  Pro: 'Pro',
  Business: 'Business',
};

/**
 * Plan copy lives here rather than in `plans.description`, so what the pricing page promises
 * follows the code on deploy instead of whatever an older seed wrote to the database.
 */
export const PLAN_DESCRIPTION: Record<PlanSlug, string> = {
  free: '1 CV, 4 templates, sans export PDF, partage ni IA',
  pro: '5 CVs, tous les templates, export PDF et partage, IA : optimisation, lettre de motivation, analyse ATS',
  business: "20 CVs, tout Pro + collaboration d'équipe, analytics, API, marque personnalisée",
};

/** Templates a Free user can pick (non-premium ones); paid plans get the whole catalog. */
export const FREE_TEMPLATE_COUNT = TEMPLATE_SEEDS.filter((t) => !t.isPremium).length;

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
    description: '1 CV, 4 templates, sans export PDF, partage ni IA',
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
    description:
      '5 CVs, tous les templates, export PDF et partage, IA : optimisation, lettre de motivation, analyse ATS',
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
    description: "20 CVs, tout Pro + collaboration d'équipe, analytics, API, marque personnalisée",
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

function envPriceId(plan: PlanSlug, interval: 'MONTHLY' | 'YEARLY'): string | null {
  const raw = process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${interval}`];
  return isNonPlaceholderSecret(raw) ? raw : null;
}

function slugFromName(name: string): PlanSlug {
  const slug = name.toLowerCase();
  if (slug === 'free' || slug === 'pro' || slug === 'business') return slug;
  throw new Error(`Unknown plan name: ${name}`);
}

export function mapPlanToPublicDto(plan: PlanRow): PublicPlanDto {
  const id = slugFromName(plan.name);
  const priceMonthly = toNumber(plan.priceMonthly);
  const priceYearly = toNumber(plan.priceYearly);
  const cvLimit = getCvLimit(id);
  const paid = priceMonthly > 0;

  const entitlements: PlanEntitlementDto[] = [
    {
      feature: 'cvLimit',
      value: String(cvLimit),
      included: true,
    },
    {
      feature: 'downloadPdf',
      value: String(canDownloadPDF({ subscriptionTier: id })),
      included: canDownloadPDF({ subscriptionTier: id }),
    },
    {
      feature: 'share',
      value: String(canShare({ subscriptionTier: id })),
      included: canShare({ subscriptionTier: id }),
    },
    { feature: 'aiFeatures', value: String(plan.aiFeatures), included: plan.aiFeatures },
    {
      feature: 'templates',
      value: id === 'free' ? String(FREE_TEMPLATE_COUNT) : 'all',
      included: true,
    },
    {
      feature: 'collaborate',
      value: String(id === 'business'),
      included: id === 'business',
    },
    {
      feature: 'prioritySupport',
      value: String(plan.prioritySupport),
      included: plan.prioritySupport,
    },
    { feature: 'customDomain', value: String(plan.customDomain), included: plan.customDomain },
    // Marketplace purchases are one-off payments open to every plan (`marketplace:buy`).
    { feature: 'marketplaceAccess', value: 'true', included: true },
    { feature: 'apiAccess', value: String(plan.apiAccess), included: plan.apiAccess },
  ];

  return {
    id,
    name: DISPLAY_NAME[plan.name] ?? plan.name,
    description: PLAN_DESCRIPTION[id],
    position: POSITION[plan.name] ?? 99,
    priceMonthly,
    priceAnnual: paid && priceYearly > 0 ? priceYearly : null,
    currency: 'EUR',
    trialDays: paid ? TRIAL_PERIOD_DAYS : null,
    recommended: id === 'pro',
    stripePriceMonthlyId: paid ? envPriceId(id, 'MONTHLY') : null,
    stripePriceAnnualId: paid ? envPriceId(id, 'YEARLY') : null,
    entitlements,
  };
}

/**
 * Single source of truth for billing plans (pricing, entitlements, Stripe price ids).
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
