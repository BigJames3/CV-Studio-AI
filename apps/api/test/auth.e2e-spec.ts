import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { PrismaService } from '../src/database/prisma.module';
import { RedisService } from '../src/redis/redis.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  const password = 'Str0ngpass1';
  const uniqueEmail = () => `e2e+${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health is public', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('register → me → refresh → logout', async () => {
    const email = uniqueEmail();

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'User' })
      .expect(201);

    expect(reg.body.success).toBe(true);
    expect(reg.body.data.accessToken).toBeDefined();
    expect(reg.body.data.refreshToken).toBeDefined();
    const cookies = reg.headers['set-cookie'];
    expect(cookies).toBeDefined();

    const access = reg.body.data.accessToken as string;
    const refresh = reg.body.data.refreshToken as string;

    const me = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${access}`)
      .expect(200);
    expect(me.body.data.email).toBe(email.toLowerCase());

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh })
      .expect(200);
    expect(refreshed.body.data.accessToken).toBeDefined();
    expect(refreshed.body.data.refreshToken).not.toBe(refresh);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${refreshed.body.data.accessToken}`)
      .send({ refreshToken: refreshed.body.data.refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshed.body.data.refreshToken })
      .expect(401);
  });

  it('login fails with invalid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'Wrongpass1' })
      .expect(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('detects refresh token reuse and revokes family', async () => {
    const email = uniqueEmail();
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Reuse', lastName: 'Test' })
      .expect(201);

    const oldRefresh = reg.body.data.refreshToken as string;

    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200);
    const newRefresh = first.body.data.refreshToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: newRefresh })
      .expect(401);
  });

  it('forgot + reset password changes hash and revokes sessions', async () => {
    const email = uniqueEmail();
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Reset', lastName: 'User' })
      .expect(201);
    const refresh = reg.body.data.refreshToken as string;
    const userId = reg.body.data.user.id as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email })
      .expect(200);

    // Find reset token key in Redis by scanning pattern — use known hash via DB user + redis keys
    const keys = await redis.client.keys('pwdreset:*');
    expect(keys.length).toBeGreaterThan(0);

    // Recover raw token: we stored hash(raw) → userId. Tests need the raw token.
    // Re-issue by calling service path: store a known token for this user.
    const raw = 'a'.repeat(64);
    const { createHash } = await import('crypto');
    const hash = createHash('sha256').update(raw).digest('hex');
    await redis.set(`pwdreset:${hash}`, userId, 3600);

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: raw, newPassword: 'NewStr0ng9' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'NewStr0ng9' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh })
      .expect(401);
  });

  it('verify-email marks user verified', async () => {
    const email = uniqueEmail();
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Verify', lastName: 'User' })
      .expect(201);
    const userId = reg.body.data.user.id as string;
    expect(reg.body.data.user.isEmailVerified).toBe(false);

    const raw = 'b'.repeat(64);
    const { createHash } = await import('crypto');
    const hash = createHash('sha256').update(raw).digest('hex');
    await redis.set(`emailverify:${hash}`, userId, 3600);

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: raw })
      .expect(200);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.isEmailVerified).toBe(true);
  });

  it('2fa endpoints are disabled', async () => {
    const email = uniqueEmail();
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Two', lastName: 'Fa' })
      .expect(201);
    const access = reg.body.data.accessToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/enable')
      .set('Authorization', `Bearer ${access}`)
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/verify')
      .set('Authorization', `Bearer ${access}`)
      .send({ code: '123456' })
      .expect(400);
  });

  it('lists and revokes sessions', async () => {
    const email = uniqueEmail();
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Sess', lastName: 'User' })
      .expect(201);
    const access = reg.body.data.accessToken as string;

    const list = await request(app.getHttpServer())
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${access}`)
      .expect(200);
    expect(list.body.data.items.length).toBeGreaterThanOrEqual(1);
    const sessionId = list.body.data.items[0].id as string;

    await request(app.getHttpServer())
      .delete(`/api/v1/auth/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${access}`)
      .expect(200);
  });

  it('oauth google without config returns NOT_CONFIGURED', async () => {
    const prev = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/oauth/google')
      .send({ idToken: 'fake' })
      .expect(400);
    expect(res.body.error.code).toBe('NOT_CONFIGURED');
    if (prev) process.env.GOOGLE_CLIENT_ID = prev;
  });

  it('GET /auth/profile returns user without password', async () => {
    const email = uniqueEmail();
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Profil', lastName: 'User' })
      .expect(201);
    const access = reg.body.data.accessToken as string;

    const unauthorized = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .expect(401);
    expect(unauthorized.body.success).toBe(false);

    const profile = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${access}`)
      .expect(200);

    expect(profile.body.success).toBe(true);
    expect(profile.body.data.email).toBe(email.toLowerCase());
    expect(profile.body.data.firstName).toBe('Profil');
    expect(profile.body.data).not.toHaveProperty('passwordHash');
    expect(profile.body.data).not.toHaveProperty('password');
  });

  it('PUT /auth/profile updates profile fields', async () => {
    const email = uniqueEmail();
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Old', lastName: 'Name' })
      .expect(201);
    const access = reg.body.data.accessToken as string;

    const updated = await request(app.getHttpServer())
      .put('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${access}`)
      .send({
        firstName: 'Jean',
        lastName: 'Dupont',
        bio: 'Mon bio',
        location: 'Paris',
      })
      .expect(200);

    expect(updated.body.data.firstName).toBe('Jean');
    expect(updated.body.data.lastName).toBe('Dupont');
    expect(updated.body.data.bio).toBe('Mon bio');
    expect(updated.body.data.location).toBe('Paris');

    await request(app.getHttpServer())
      .put('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${access}`)
      .send({ firstName: '' })
      .expect(400);
  });

  it('POST /auth/change-password validates and updates password', async () => {
    const email = uniqueEmail();
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Pwd', lastName: 'Change' })
      .expect(201);
    const access = reg.body.data.accessToken as string;
    const refresh = reg.body.data.refreshToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${access}`)
      .send({ currentPassword: 'WrongPass1', newPassword: 'NewStr0ng9' })
      .expect(401);

    const ok = await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${access}`)
      .send({ currentPassword: password, newPassword: 'NewStr0ng9' })
      .expect(200);
    expect(ok.body.data.changed).toBe(true);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'NewStr0ng9' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh })
      .expect(401);
  });
});
