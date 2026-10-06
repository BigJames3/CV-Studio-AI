import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { EntitlementsService } from '../subscriptions/entitlements.service';
import { lockUserScope, USER_LOCK_TX_OPTIONS } from '../../common/utils/user-lock';

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

type AiActionType = 'resume_optimization' | 'cover_letter' | 'jd_match';

const ACTION_TYPE: Record<AiQuotaFeature, AiActionType> = {
  'optimize-resume': 'resume_optimization',
  'cover-letter': 'cover_letter',
  // reuse jd_match bucket for ATS explain history until dedicated enum exists
  'ats-explain': 'jd_match',
};

export type AiQuotaReservation = { id: string; used: number; limit: number };

export type AiHistoryWrite = {
  prompt: string;
  result: Prisma.InputJsonValue;
  tokensUsed: number;
};

/**
 * Daily AI quotas. A call first *reserves* its slot: count + insert of a pending AiHistory row
 * under a per-user lock, so parallel requests cannot all see the same count. The row is then
 * completed with the real result, or deleted if the call fails, so failures cost nothing.
 */
@Injectable()
export class AiQuotaService {
  private readonly logger = new Logger(AiQuotaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService
  ) {}

  reserveOptimizeQuota(userId: string, cvId?: string): Promise<AiQuotaReservation> {
    return this.reserve(userId, 'optimize-resume', cvId);
  }

  reserveCoverLetterQuota(userId: string, cvId?: string): Promise<AiQuotaReservation> {
    return this.reserve(userId, 'cover-letter', cvId);
  }

  reserveAtsExplainQuota(userId: string, cvId?: string): Promise<AiQuotaReservation> {
    return this.reserve(userId, 'ats-explain', cvId);
  }

  /** Store the real prompt/result on the reserved history row. */
  async commit(reservation: AiQuotaReservation, write: AiHistoryWrite): Promise<void> {
    await this.prisma.aiHistory.update({ where: { id: reservation.id }, data: write });
  }

  /** Give the slot back after a failed call. Never throws: the original error matters more. */
  async release(reservation: AiQuotaReservation): Promise<void> {
    try {
      await this.prisma.aiHistory.deleteMany({ where: { id: reservation.id } });
    } catch (error) {
      this.logger.error(
        `Could not release AI quota reservation ${reservation.id}`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  private async reserve(
    userId: string,
    feature: AiQuotaFeature,
    cvId?: string
  ): Promise<AiQuotaReservation> {
    const tier = await this.entitlements.getTier(userId);
    const limit = DAILY_LIMITS[tier][feature];
    const actionType = ACTION_TYPE[feature];

    return this.prisma.$transaction(async (tx) => {
      await lockUserScope(tx, userId, `ai:${actionType}`);
      const used = await this.countToday(tx, userId, actionType);
      if (used >= limit) {
        throw new ForbiddenException({
          statusCode: 429,
          code: 'AI_QUOTA_EXCEEDED',
          message: `Daily ${feature} quota exceeded (${used}/${limit})`,
          details: { feature, used, limit, tier, upgradeUrl: '/pricing' },
        });
      }

      const row = await tx.aiHistory.create({
        data: {
          userId,
          cvId,
          actionType,
          prompt: `${feature} | reserved`,
          result: { status: 'pending' },
          tokensUsed: 0,
        },
        select: { id: true },
      });
      return { id: row.id, used, limit };
    }, USER_LOCK_TX_OPTIONS);
  }

  private async countToday(
    db: Prisma.TransactionClient,
    userId: string,
    actionType: AiActionType
  ): Promise<number> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    return db.aiHistory.count({
      where: {
        userId,
        actionType,
        createdAt: { gte: start },
      },
    });
  }
}
