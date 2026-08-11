import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../../redis/redis.module';
import { PrismaService } from '../../database/prisma.module';

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

export type SessionMeta = {
  userAgent?: string;
  ip?: string;
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

  /** Create a new refresh family and register current jti */
  async createSession(
    userId: string,
    jti: string,
    familyId: string,
    meta: SessionMeta = {}
  ): Promise<void> {
    await this.redis.connect();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

    await this.redis.set(
      this.jtiKey(jti),
      JSON.stringify({ userId, familyId }),
      REFRESH_TTL_SECONDS
    );
    await this.redis.set(this.familyKey(familyId), jti, REFRESH_TTL_SECONDS);
    await this.redis.client.sadd(this.userFamiliesKey(userId), familyId);
    await this.redis.client.expire(this.userFamiliesKey(userId), REFRESH_TTL_SECONDS);

    await this.prisma.authSession.create({
      data: {
        userId,
        familyId,
        refreshJti: jti,
        userAgent: meta.userAgent?.slice(0, 512),
        ipAddress: meta.ip?.slice(0, 64),
        expiresAt,
      },
    });
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
      // Family revoked or expired
      return 'invalid';
    }

    if (currentJti !== presentedJti) {
      // Reuse of an old refresh token → revoke whole family
      await this.revokeFamily(userId, familyId);
      return 'reuse';
    }

    const jtiRecord = await this.redis.get(this.jtiKey(presentedJti));
    if (!jtiRecord) {
      await this.revokeFamily(userId, familyId);
      return 'reuse';
    }

    await this.redis.del(this.jtiKey(presentedJti));
    await this.redis.set(
      this.jtiKey(newJti),
      JSON.stringify({ userId, familyId }),
      REFRESH_TTL_SECONDS
    );
    await this.redis.set(this.familyKey(familyId), newJti, REFRESH_TTL_SECONDS);

    await this.prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { refreshJti: newJti, updatedAt: new Date() },
    });

    return 'ok';
  }

  async revokeFamily(userId: string, familyId: string): Promise<void> {
    await this.redis.connect();
    const currentJti = await this.redis.get(this.familyKey(familyId));
    if (currentJti) await this.redis.del(this.jtiKey(currentJti));
    await this.redis.del(this.familyKey(familyId));
    await this.redis.client.srem(this.userFamiliesKey(userId), familyId);

    await this.prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
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
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
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

  get refreshTtlSeconds() {
    return REFRESH_TTL_SECONDS;
  }
}
