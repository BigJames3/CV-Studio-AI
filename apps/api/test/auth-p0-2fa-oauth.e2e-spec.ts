import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { getJwtAccessSecret } from '../src/modules/auth/auth-secrets';
import { STRONG_PASSWORD } from './auth-helpers';

describe('P0: OAuth 2FA Enforcement', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects pre_2fa temp tokens on protected routes', async () => {
    const email = `e2e+${Date.now()}@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: STRONG_PASSWORD, firstName: 'Two', lastName: 'Fa' })
      .expect(201);

    const userId = reg.body.data.user.id as string;
    const jwt = app.get(JwtService);
    const tempToken = await jwt.signAsync(
      { sub: userId, typ: 'pre_2fa', temp: true },
      { secret: getJwtAccessSecret(), expiresIn: '5m' }
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${tempToken}`);

    expect(response.status).toBe(401);
  });

  it('rejects 2fa/complete with an invalid temp token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/complete')
      .send({ tempToken: 'not-a-jwt', totp: '123456' })
      .expect(401);
  });
});
