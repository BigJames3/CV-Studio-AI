import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import { createTestApp } from './create-test-app';
import { refreshFromCookie, STRONG_PASSWORD } from './auth-helpers';

function expectRefreshCookieCleared(res: Response) {
  const raw = res.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cleared = list.find((c) => c.startsWith('refresh_token='));
  expect(cleared).toBeDefined();
  expect(cleared!.toLowerCase()).toMatch(/max-age=0|expires=thu, 01 jan 1970/);
}

describe('P1: Access Token Binding', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('invalidates the access token after logout', async () => {
    const email = `e2e+${Date.now()}@example.com`;
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: STRONG_PASSWORD, firstName: 'Bind', lastName: 'User' })
      .expect(201);

    const accessToken = loginRes.body.data.accessToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(401);
  });

  it('logout without Authorization still 200 and clears refresh cookie', async () => {
    const email = `e2e+${Date.now()}-pub@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: STRONG_PASSWORD, firstName: 'Bind', lastName: 'Public' })
      .expect(201);

    const refresh = refreshFromCookie(reg);
    const logoutRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `refresh_token=${refresh}`)
      .expect(200);

    expect(logoutRes.body.data.revoked).toBe(true);
    expectRefreshCookieCleared(logoutRes);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh })
      .expect(401);
  });

  it('logout with invalid Bearer and valid refresh cookie still revokes', async () => {
    const email = `e2e+${Date.now()}-exp@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: STRONG_PASSWORD, firstName: 'Bind', lastName: 'Expired' })
      .expect(201);

    const refresh = refreshFromCookie(reg);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', 'Bearer not-a-jwt')
      .set('Cookie', `refresh_token=${refresh}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh })
      .expect(401);
  });
});
