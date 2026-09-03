import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../../redis/redis.module';
import { PrismaService } from '../../database/prisma.module';
import { getIdleTimeoutSeconds, getRefreshTtlSeconds } from './auth-secrets';

export type SessionMeta = {
  userAgent?: string;
  ip?: string;
};

type AccessSessionCache = {
  userId: string;
  familyId: string;
  tokenVersion: number;
  lastActivityAt: number;
  revoked?: boolean;
};

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService
  ) {}

  private jtiKey(jti: string) {
    return `refresh:jti:${jti}`;
  }

  private familyKey(familyId: string) {
    return `refresh:family:${familyId}`;
  }

  private userFamiliesKey(userId: string) {
    return `refresh:user:${userId}`;
  }

  private accessKey(sessionId: string) {
    return `session:access:${sessionId}`;
  }

  get refreshTtlSeconds() {
    return getRefreshTtlSeconds();
  }

  /** Create a new refresh family and register current jti */
  async createSession(
    userId: string,
    jti: string,
    familyId: string,
    meta: SessionMeta = {}
  ): Promise<{ id: string; tokenVersion: number }> {
    await this.redis.connect();
    const expiresAt = new Date(Date.now() + this.refreshTtlSeconds * 1000);
    const id = randomUUID();
    const now = Date.now();

    await this.redis.set(
      this.jtiKey(jti),
      JSON.stringify({ userId, familyId, sessionId: id }),
      this.refreshTtlSeconds
    );
    await this.redis.set(this.familyKey(familyId), jti, this.refreshTtlSeconds);
    await this.redis.client.sadd(this.userFamiliesKey(userId), familyId);
    await this.redis.client.expire(this.userFamiliesKey(userId), this.refreshTtlSeconds);

    await this.cacheAccessSession(id, {
      userId,
      familyId,
      tokenVersion: 0,
      lastActivityAt: now,
    });

    await this.prisma.authSession.create({
      data: {
        id,
        userId,
        familyId,
        refreshJti: jti,
        tokenVersion: 0,
        lastActivityAt: new Date(now),
        userAgent: meta.userAgent?.slice(0, 512),
        ipAddress: meta.ip?.slice(0, 64),
        expiresAt,
      },
    });

    return { id, tokenVersion: 0 };
  }

  /**
   * Rotate refresh jti within family.
   * Returns 'ok' | 'reuse' | 'invalid'
   */
  async rotate(
    userId: string,
    familyId: string,
    presentedJti: string,
    newJti: string
  ): Promise<'ok' | 'reuse' | 'invalid'> {
    await this.redis.connect();

    const currentJti = await this.redis.get(this.familyKey(familyId));
    if (!currentJti) {
      return 'invalid';
    }

    if (currentJti !== presentedJti) {
      await this.revokeFamily(userId, familyId);
      return 'reuse';
    }

    const jtiRecord = await this.redis.get(this.jtiKey(presentedJti));
    if (!jtiRecord) {
      await this.revokeFamily(userId, familyId);
      return 'reuse';
    }

    const parsed = JSON.parse(jtiRecord) as { sessionId?: string };
    await this.redis.del(this.jtiKey(presentedJti));
    await this.redis.set(
      this.jtiKey(newJti),
      JSON.stringify({ userId, familyId, sessionId: parsed.sessionId }),
      this.refreshTtlSeconds
    );
    await this.redis.set(this.familyKey(familyId), newJti, this.refreshTtlSeconds);

    await this.prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { refreshJti: newJti, updatedAt: new Date(), lastActivityAt: new Date() },
    });

    return 'ok';
  }

  async getActiveByFamily(userId: string, familyId: string) {
    return this.prisma.authSession.findFirst({
      where: { userId, familyId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async assertAccessToken(sessionId: string, tokenVersion: number, userId: string): Promise<void> {
    await this.redis.connect();
    const key = this.accessKey(sessionId);
    let record: AccessSessionCache | null = null;
    const cached = await this.redis.get(key);
    if (cached) {
      record = JSON.parse(cached) as AccessSessionCache;
    } else {
      const session = await this.prisma.authSession.findFirst({
        where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
      });
      if (!session) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Session not found',
        });
      }
      record = {
        userId: session.userId,
        familyId: session.familyId,
        tokenVersion: session.tokenVersion,
        lastActivityAt: session.lastActivityAt.getTime(),
      };
      await this.cacheAccessSession(sessionId, record);
    }

    if (!record || record.revoked || record.userId !== userId) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Session revoked',
      });
    }
    if (record.tokenVersion !== tokenVersion) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token version mismatch (logged out)',
      });
    }

    const idleMs = getIdleTimeoutSeconds() * 1000;
    if (Date.now() - record.lastActivityAt > idleMs) {
      await this.revokeSessionById(userId, sessionId);
      throw new UnauthorizedException({
        code: 'SESSION_IDLE_TIMEOUT',
        message: 'Session expired due to inactivity',
      });
    }

    if (Date.now() - record.lastActivityAt > 60_000) {
      record.lastActivityAt = Date.now();
      await this.cacheAccessSession(sessionId, record);
      await this.prisma.authSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { lastActivityAt: new Date() },
      });
    }
  }

  async revokeFamily(userId: string, familyId: string): Promise<void> {
    await this.redis.connect();
    const currentJti = await this.redis.get(this.familyKey(familyId));
    if (currentJti) await this.redis.del(this.jtiKey(currentJti));
    await this.redis.del(this.familyKey(familyId));
    await this.redis.client.srem(this.userFamiliesKey(userId), familyId);

    const session = await this.prisma.authSession.findFirst({
      where: { familyId },
      select: { id: true },
    });
    if (session) await this.redis.del(this.accessKey(session.id));

    await this.prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), tokenVersion: { increment: 1 } },
    });
  }

  async revokeByRefreshJti(userId: string, jti: string, familyId?: string): Promise<void> {
    if (familyId) {
      await this.revokeFamily(userId, familyId);
      return;
    }
    await this.redis.connect();
    const raw = await this.redis.get(this.jtiKey(jti));
    if (raw) {
      const parsed = JSON.parse(raw) as { familyId: string };
      await this.revokeFamily(userId, parsed.familyId);
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.redis.connect();
    const families = await this.redis.client.smembers(this.userFamiliesKey(userId));
    for (const familyId of families) {
      await this.revokeFamily(userId, familyId);
    }
    await this.redis.del(this.userFamiliesKey(userId));

    const remaining = await this.prisma.authSession.findMany({
      where: { userId, revokedAt: null },
      select: { id: true },
    });
    for (const row of remaining) {
      await this.redis.del(this.accessKey(row.id));
    }

    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), tokenVersion: { increment: 1 } },
    });
  }

  async listSessions(userId: string) {
    return this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        familyId: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        lastActivityAt: true,
      },
    });
  }

  async revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.prisma.authSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });
    if (!session) return false;
    await this.revokeFamily(userId, session.familyId);
    return true;
  }

  newIds() {
    return { jti: randomUUID(), familyId: randomUUID() };
  }

  private async cacheAccessSession(sessionId: string, record: AccessSessionCache) {
    await this.redis.set(this.accessKey(sessionId), JSON.stringify(record), this.refreshTtlSeconds);
  }
}
