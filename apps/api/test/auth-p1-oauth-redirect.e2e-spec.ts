import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';

describe('P1: OAuth Redirect Validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects evil.com redirect in OAuth state', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/oauth/state')
      .send({ provider: 'linkedin', next: 'https://evil.com/steal-data' })
      .expect(200);

    expect(res.body.data.next).not.toContain('evil.com');
    expect(res.body.data.next).toBe('/dashboard');
    expect(res.body.data.state).toHaveLength(64);
  });

  it('accepts relative redirects', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/oauth/state')
      .send({ provider: 'linkedin', next: '/dashboard' })
      .expect(200);

    expect(res.body.data.next).toBe('/dashboard');
  });

  it('rejects LinkedIn callback without a matching state', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/oauth/linkedin')
      .send({
        code: 'abc',
        redirectUri: 'http://localhost:3000/auth/oauth/linkedin/callback',
        state: 'deadbeef'.repeat(8),
      })
      .expect(401);

    expect(res.body.error?.message ?? res.body.message ?? '').toMatch(/State validation/i);
  });
});
