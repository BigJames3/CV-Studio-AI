import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';

/** Stripe is the only payment provider: its webhook is the only payment webhook. */
describe('Stripe payment regression (e2e)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('POST /api/v1/payments/webhook still requires a Stripe signature', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .send({})
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).toMatch(/INVALID_WEBHOOK|stripe-signature|raw body/i);
  });

  it('GET /api/v1/payments/webhook is not a route (Stripe only POSTs)', async () => {
    await request(app.getHttpServer()).get('/api/v1/payments/webhook').expect(404);
  });

  it('CinetPay routes are gone', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/cinetpay')
      .send({ cpm_trans_id: 'cv_unknown', cpm_status: 'ACCEPTED' })
      .expect(404);
    await request(app.getHttpServer()).get('/api/v1/payments/webhook/cinetpay').expect(404);
  });
});
