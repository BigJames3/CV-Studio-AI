import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { PrismaService } from '../src/database/prisma.module';
import { RedisService } from '../src/redis/redis.module';
import { STRONG_PASSWORD } from './auth-helpers';

describe('P1: Account lockout and idle timeout', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('locks the account after repeated failed logins', async () => {
    const email = `e2e+${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: STRONG_PASSWORD, firstName: 'Lock', lastName: 'User' })
      .expect(201);

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPass1!!x' })
        .expect(401);
    }

    const locked = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: STRONG_PASSWORD });

    expect(locked.status).toBe(401);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('rejects access tokens after idle timeout', async () => {
    const email = `e2e+${Date.now()}@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: STRONG_PASSWORD, firstName: 'Idle', lastName: 'User' })
      .expect(201);

    const access = reg.body.data.accessToken as string;
    const userId = reg.body.data.user.id as string;

    const session = await prisma.authSession.findFirst({
      where: { userId, revokedAt: null },
    });
    expect(session).toBeTruthy();

    const idleAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await prisma.authSession.update({
      where: { id: session!.id },
      data: { lastActivityAt: idleAt },
    });
    await redis.del(`session:access:${session!.id}`);

    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${access}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('SESSION_IDLE_TIMEOUT');
  });
});
