import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';

/**
 * Stripe route regression: CinetPay must not change POST /payments/webhook
 * or the checkout default (Stripe when paymentMethod is omitted).
 */
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

  it('POST /api/v1/payments/webhook is a distinct route from CinetPay notify', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/cinetpay')
      .send({ cpm_trans_id: 'cv_unknown', cpm_status: 'ACCEPTED' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .send({ type: 'invoice.paid' })
      .expect(400);
  });

  it('GET /api/v1/payments/webhook is not a Stripe ping (CinetPay uses /webhook/cinetpay)', async () => {
    await request(app.getHttpServer()).get('/api/v1/payments/webhook').expect(404);
    await request(app.getHttpServer()).get('/api/v1/payments/webhook/cinetpay').expect(200);
  });
});
