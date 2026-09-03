import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { STRONG_PASSWORD } from './auth-helpers';

describe('P1: CSP and Token Storage', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not return refreshToken in the login JSON body', async () => {
    const email = `e2e+${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: STRONG_PASSWORD, firstName: 'Csp', lastName: 'User' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: STRONG_PASSWORD })
      .expect(200);

    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.refreshToken).toBeUndefined();
  });

  it('sets refreshToken in an httpOnly cookie', async () => {
    const email = `e2e+${Date.now()}@example.com`;
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: STRONG_PASSWORD, firstName: 'Cookie', lastName: 'User' })
      .expect(201);

    const setCookie = response.headers['set-cookie'];
    const list = Array.isArray(setCookie) ? setCookie : [setCookie];
    const refreshCookie = list.find((c) => c.includes('refresh_token='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/httponly/i);
    expect(refreshCookie).toMatch(/samesite=lax/i);
  });

  it('returns CSP headers on API responses', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  it('returns refreshToken in JSON for mobile clients', async () => {
    const email = `e2e+${Date.now()}@example.com`;
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Client', 'mobile')
      .send({ email, password: STRONG_PASSWORD, firstName: 'Mob', lastName: 'User' })
      .expect(201);

    expect(response.body.data.refreshToken).toBeDefined();
  });
});
