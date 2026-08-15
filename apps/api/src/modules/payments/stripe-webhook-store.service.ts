import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { RedisService } from '../../redis/redis.module';

const REDIS_PROCESSED_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
/** Covers Stripe retrieve + 3 retries with backoff; expires so a crashed pod cannot block Stripe retries. */
export const WEBHOOK_LOCK_TTL_SECONDS = 60;
const REDIS_PREFIX = 'stripe:webhook:';

export type DlqMessage = {
  eventId: string;
  eventType: string;
  data: unknown;
  error?: string;
  timestamp: Date;
  attempts: number;
};

@Injectable()
export class StripeWebhookStoreService {
  private readonly logger = new Logger(StripeWebhookStoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async acquireProcessingLock(eventId: string): Promise<boolean> {
    const ok = await this.redis.setNx(
      `${REDIS_PREFIX}lock:${eventId}`,
      '1',
      WEBHOOK_LOCK_TTL_SECONDS
    );
    if (!ok) {
      this.logger.warn(`Webhook ${eventId} already processing (redis lock)`);
    }
    return ok;
  }

  async releaseProcessingLock(eventId: string): Promise<void> {
    await this.redis.del(`${REDIS_PREFIX}lock:${eventId}`);
  }

  async isProcessed(eventId: string): Promise<boolean> {
    const cached = await this.redis.get(`${REDIS_PREFIX}processed:${eventId}`);
    if (cached === '1') return true;

    const row = await this.prisma.stripeWebhookEvent.findUnique({
      where: { id: eventId },
      select: { status: true },
    });
    return row?.status === 'processed';
  }

  async markProcessing(eventId: string, type: string, payload: unknown): Promise<boolean> {
    try {
      await this.prisma.stripeWebhookEvent.create({
        data: {
          id: eventId,
          type,
          status: 'processing',
          attempts: 0,
          payload: payload as Prisma.InputJsonValue,
        },
      });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.prisma.stripeWebhookEvent.findUnique({
          where: { id: eventId },
        });
        if (existing?.status === 'processed') return false;
        // Reclaim `processing` after a crash (Redis lock expired). Never reclaim `dlq`
        // — that path is retryDlqEvent only, to avoid racing the DLQ worker.
        if (existing?.status === 'processing') return true;
        return false;
      }
      throw err;
    }
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.prisma.stripeWebhookEvent.update({
      where: { id: eventId },
      data: {
        status: 'processed',
        processedAt: new Date(),
        lastError: null,
      },
    });
    await this.redis.set(`${REDIS_PREFIX}processed:${eventId}`, '1', REDIS_PROCESSED_TTL_SECONDS);
  }

  async incrementAttempts(eventId: string, errorMessage: string): Promise<number> {
    const updated = await this.prisma.stripeWebhookEvent.update({
      where: { id: eventId },
      data: {
        attempts: { increment: 1 },
        lastError: errorMessage.slice(0, 4000),
      },
    });
    return updated.attempts;
  }

  async pushDlq(message: DlqMessage): Promise<void> {
    await this.prisma.stripeWebhookEvent.upsert({
      where: { id: message.eventId },
      create: {
        id: message.eventId,
        type: message.eventType,
        status: 'dlq',
        attempts: message.attempts,
        lastError: message.error?.slice(0, 4000),
        payload: message.data as Prisma.InputJsonValue,
      },
      update: {
        status: 'dlq',
        attempts: message.attempts,
        lastError: message.error?.slice(0, 4000),
        payload: message.data as Prisma.InputJsonValue,
      },
    });
    await this.redis.client.lpush(
      `${REDIS_PREFIX}dlq`,
      JSON.stringify({
        ...message,
        timestamp: message.timestamp.toISOString(),
      })
    );
  }

  async listDlq(limit = 50): Promise<
    Array<{
      id: string;
      type: string;
      attempts: number;
      lastError: string | null;
      payload: unknown;
      createdAt: Date;
    }>
  > {
    return this.prisma.stripeWebhookEvent.findMany({
      where: { status: 'dlq' },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        type: true,
        attempts: true,
        lastError: true,
        payload: true,
        createdAt: true,
      },
    });
  }

  async reclaimFromDlq(eventId: string): Promise<void> {
    await this.prisma.stripeWebhookEvent.update({
      where: { id: eventId },
      data: { status: 'processing' },
    });
  }
}
