import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module';
import { RedisService } from '../../redis/redis.module';
import {
  PLANS_CACHE_KEY,
  PLANS_CACHE_TTL_SECONDS,
  toCatalogPlan,
  type CatalogPlanDto,
} from './plan-catalog';

/**
 * Single source of truth for billing plans (prices, entitlements, Stripe ids).
 * Consumed by GET /plans, pricing, billing, and checkout.
 */
@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  /**
   * Active plans with pricing + entitlements. Cached 1 hour (catalog rarely changes).
   */
  async findAll(): Promise<{ items: CatalogPlanDto[] }> {
    const cached = await this.readCache();
    if (cached) return cached;

    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });

    const items = plans
      .map((plan) => toCatalogPlan(plan))
      .filter((item): item is CatalogPlanDto => item !== null)
      .sort((a, b) => a.position - b.position);

    const payload = { items };
    await this.writeCache(payload);
    return payload;
  }

  private async readCache(): Promise<{ items: CatalogPlanDto[] } | null> {
    try {
      const raw = await this.redis.get(PLANS_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { items?: CatalogPlanDto[] };
      if (!Array.isArray(parsed?.items) || parsed.items.length === 0) return null;
      return { items: parsed.items };
    } catch (error) {
      this.logger.warn(
        `Plans cache read failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  private async writeCache(payload: { items: CatalogPlanDto[] }): Promise<void> {
    try {
      await this.redis.set(PLANS_CACHE_KEY, JSON.stringify(payload), PLANS_CACHE_TTL_SECONDS);
    } catch (error) {
      this.logger.warn(
        `Plans cache write failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
