import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { PrismaService } from '../src/database/prisma.module';

const CINETPAY_HOST = 'api-checkout.cinetpay.com';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(),
  } as unknown as Response;
}

describe('CinetPay payment flow (e2e)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication;
  let prisma: PrismaService;
  let originalFetch: typeof fetch;
  const checkByTx: Record<string, 'ACCEPTED' | 'REFUSED' | 'WAITING'> = {};

  const password = 'Str0ngpass1';
  const uniqueEmail = () =>
    `cinetpay+${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  async function register() {
    const email = uniqueEmail();
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Pay', lastName: 'User' })
      .expect(201);
    return {
      email,
      id: res.body.data.user.id as string,
      token: res.body.data.accessToken as string,
    };
  }

  async function ensurePlans() {
    await prisma.plan.upsert({
      where: { name: 'Pro' },
      create: {
        name: 'Pro',
        description: 'Pro plan',
        priceMonthly: 9.99,
        priceYearly: 99,
        cvLimit: -1,
        aiFeatures: true,
      },
      update: {},
    });
  }

  beforeAll(async () => {
    process.env.CINETPAY_API_KEY = 'test_api_key';
    process.env.CINETPAY_SITE_ID = 'test_site_id';
    originalFetch = global.fetch;
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!url.includes(CINETPAY_HOST)) {
        return originalFetch(input, init);
      }
      if (url.includes('/v2/payment/check')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { transaction_id?: string };
        const status = checkByTx[body.transaction_id ?? ''] ?? 'WAITING';
        return jsonResponse({ data: { status } });
      }
      if (url.includes('/v2/payment')) {
        return jsonResponse({
          code: '201',
          message: 'CREATED',
          data: { payment_url: 'https://checkout.cinetpay.com/payment/tok_test' },
        });
      }
      return jsonResponse({}, false, 404);
    }) as typeof fetch;

    app = await createTestApp();
    prisma = app.get(PrismaService);
    await ensurePlans();
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    if (app) await app.close();
  });

  it('POST /subscriptions/checkout requires auth', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/subscriptions/checkout')
      .send({ plan: 'pro', interval: 'month', paymentMethod: 'cinetpay' })
      .expect(401);
  });

  it('POST /subscriptions/checkout validates plan enum', async () => {
    const { token } = await register();
    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'gold', interval: 'month' })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /subscriptions/checkout validates interval enum', async () => {
    const { token } = await register();
    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'pro', interval: 'weekly' })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it('completes CinetPay checkout → notify ACCEPTED → pro entitlement', async () => {
    const user = await register();

    const checkoutRes = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ plan: 'pro', interval: 'month', paymentMethod: 'cinetpay' })
      .expect(201);

    const data = checkoutRes.body.data;
    expect(data.url).toMatch(/cinetpay/);
    expect(data.transactionId).toMatch(/^cv_/);
    expect(data.paymentMethod).toBe('cinetpay');

    const pending = await prisma.payment.findUnique({
      where: { transactionId: data.transactionId },
      include: { subscription: true },
    });
    expect(pending?.status).toBe('pending');
    expect(pending?.subscription.userId).toBe(user.id);

    checkByTx[data.transactionId] = 'ACCEPTED';

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/cinetpay')
      .send({ cpm_trans_id: data.transactionId, cpm_status: 'ACCEPTED' })
      .expect(200);

    const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
    expect(subscription?.provider).toBe('cinetpay');
    expect(subscription?.status).toBe('active');

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.subscriptionTier).toBe('pro');

    const completed = await prisma.payment.findUnique({
      where: { transactionId: data.transactionId },
    });
    expect(completed?.status).toBe('completed');
  });

  it('marks payment failed on REFUSED and leaves the user free', async () => {
    const user = await register();

    const checkoutRes = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ plan: 'pro', interval: 'month', paymentMethod: 'cinetpay' })
      .expect(201);
    const { transactionId } = checkoutRes.body.data as { transactionId: string };
    checkByTx[transactionId] = 'REFUSED';

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/cinetpay')
      .send({
        cpm_trans_id: transactionId,
        cpm_status: 'REFUSED',
        cpm_error_message: 'Insufficient funds',
      })
      .expect(200);

    const payment = await prisma.payment.findUnique({ where: { transactionId } });
    expect(payment?.status).toBe('failed');
    expect(payment?.failedReason).toContain('Insufficient');

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.subscriptionTier).toBe('free');
  });

  it('is idempotent on duplicate ACCEPTED notify', async () => {
    const user = await register();

    const checkoutRes = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ plan: 'pro', interval: 'month', paymentMethod: 'cinetpay' })
      .expect(201);
    const { transactionId } = checkoutRes.body.data as { transactionId: string };
    checkByTx[transactionId] = 'ACCEPTED';

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/cinetpay')
      .send({ cpm_trans_id: transactionId, cpm_status: 'ACCEPTED' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/cinetpay')
      .send({ cpm_trans_id: transactionId, cpm_status: 'ACCEPTED' })
      .expect(200);

    const payments = await prisma.payment.findMany({ where: { transactionId } });
    expect(payments).toHaveLength(1);
    expect(payments[0]?.status).toBe('completed');

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.subscriptionTier).toBe('pro');
  });

  it('GET /payments/status/:tx requires auth and returns not_found for unknown ids', async () => {
    await request(app.getHttpServer()).get('/api/v1/payments/status/cv_missing').expect(401);

    const user = await register();
    const res = await request(app.getHttpServer())
      .get('/api/v1/payments/status/cv_missing')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(res.body.data).toMatchObject({ status: 'not_found', transactionId: 'cv_missing' });
  });

  it('GET /payments/status/:tx returns pending after checkout', async () => {
    const user = await register();
    const checkoutRes = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ plan: 'pro', interval: 'month', paymentMethod: 'cinetpay' })
      .expect(201);
    const { transactionId } = checkoutRes.body.data as { transactionId: string };

    const res = await request(app.getHttpServer())
      .get(`/api/v1/payments/status/${transactionId}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.data).toMatchObject({
      status: 'pending',
      paymentMethod: 'cinetpay',
      transactionId,
    });
  });

  it('CinetPay webhook GET ping is public and returns 200', async () => {
    await request(app.getHttpServer()).get('/api/v1/payments/webhook/cinetpay').expect(200);
  });

  it('WAITING notify leaves the payment pending', async () => {
    const user = await register();
    const checkoutRes = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ plan: 'pro', interval: 'month', paymentMethod: 'cinetpay' })
      .expect(201);
    const { transactionId } = checkoutRes.body.data as { transactionId: string };
    checkByTx[transactionId] = 'WAITING';

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/cinetpay')
      .send({ cpm_trans_id: transactionId, cpm_status: 'WAITING' })
      .expect(200);

    const payment = await prisma.payment.findUnique({ where: { transactionId } });
    expect(payment?.status).toBe('pending');
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.subscriptionTier).toBe('free');
  });
});
