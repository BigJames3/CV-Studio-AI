import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module';
import { EntitlementsService } from '../subscriptions/entitlements.service';

type AiQuotaFeature = 'optimize-resume' | 'cover-letter' | 'ats-explain';

const DAILY_LIMITS: Record<'free' | 'pro' | 'business', Record<AiQuotaFeature, number>> = {
  free: {
    'optimize-resume': 0,
    'cover-letter': 0,
    'ats-explain': 1,
  },
  pro: {
    'optimize-resume': 50,
    'cover-letter': 20,
    'ats-explain': 20,
  },
  business: {
    'optimize-resume': 200,
    'cover-letter': 100,
    'ats-explain': 100,
  },
};

const ACTION_TYPE: Record<AiQuotaFeature, 'resume_optimization' | 'cover_letter' | 'jd_match'> = {
  'optimize-resume': 'resume_optimization',
  'cover-letter': 'cover_letter',
  // reuse jd_match bucket for ATS explain history until dedicated enum exists
  'ats-explain': 'jd_match',
};

@Injectable()
export class AiQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService
  ) {}

  async assertOptimizeQuota(userId: string): Promise<{ used: number; limit: number }> {
    return this.assertFeatureQuota(userId, 'optimize-resume');
  }

  async assertCoverLetterQuota(userId: string): Promise<{ used: number; limit: number }> {
    return this.assertFeatureQuota(userId, 'cover-letter');
  }

  async assertAtsExplainQuota(userId: string): Promise<{ used: number; limit: number }> {
    return this.assertFeatureQuota(userId, 'ats-explain');
  }

  private async assertFeatureQuota(
    userId: string,
    feature: AiQuotaFeature
  ): Promise<{ used: number; limit: number }> {
    const tier = await this.entitlements.getTier(userId);
    const limit = DAILY_LIMITS[tier][feature];
    const used = await this.countToday(userId, ACTION_TYPE[feature]);

    if (used >= limit) {
      throw new ForbiddenException({
        statusCode: 429,
        code: 'AI_QUOTA_EXCEEDED',
        message: `Daily ${feature} quota exceeded (${used}/${limit})`,
        details: { feature, used, limit, tier, upgradeUrl: '/pricing' },
      });
    }

    return { used, limit };
  }

  private async countToday(
    userId: string,
    actionType: 'resume_optimization' | 'cover_letter' | 'jd_match'
  ): Promise<number> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    return this.prisma.aiHistory.count({
      where: {
        userId,
        actionType,
        createdAt: { gte: start },
      },
    });
  }
}
