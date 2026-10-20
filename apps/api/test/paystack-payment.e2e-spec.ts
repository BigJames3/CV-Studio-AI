import { createHmac } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { FAKE_PAYSTACK_SECRET, installFakePaystack } from './paystack-fake';
import { PrismaService } from '../src/database/prisma.module';
import { CATALOG_FALLBACK_ROWS } from '../src/modules/plans/plans.service';
import type { PaystackTransaction } from '../src/modules/payments/paystack.client';

/**
 * Paystack is the only payment provider: its webhook is the only payment webhook. The
 * webhook pipeline (signature, idempotency store, Redis lock, prepaid period) runs for real;
 * only the Paystack API is faked.
 */
describe('Paystack payments (e2e)', () => {
  jest.setTimeout(60_000);
  let app: INestApplication;
  let prisma: PrismaService;
  const userIds: string[] = [];
  const createdPlanIds: string[] = [];
  const transactions = new Map<string, PaystackTransaction>();
  const fake = {
    verifyTransaction: jest.fn(async (reference: string) => {
      const tx = transactions.get(reference);
      if (!tx) throw new Error('Transaction reference not found');
      return tx;
    }),
  };

  const http = () => request(app.getHttpServer());

  function postSigned(body: unknown, secret = FAKE_PAYSTACK_SECRET) {
    const raw = JSON.stringify(body);
    const signature = createHmac('sha512', secret).update(raw).digest('hex');
    return http()
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', signature)
      .send(raw);
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    installFakePaystack(app, fake);
    // CI migrates but does not seed: create the catalog plans that are missing (only those).
    for (const row of CATALOG_FALLBACK_ROWS) {
      if (await prisma.plan.findUnique({ where: { name: row.name } })) continue;
      const plan = await prisma.plan.create({ data: row });
      createdPlanIds.push(plan.id);
    }
  });

  afterAll(async () => {
    if (prisma && userIds.length) {
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (prisma && createdPlanIds.length) {
      await prisma.plan.deleteMany({ where: { id: { in: createdPlanIds } } });
    }
    if (prisma) {
      await prisma.paymentWebhookEvent.deleteMany({
        where: { id: { startsWith: 'charge.success:e2e' } },
      });
    }
    if (app) await app.close();
  });

  it('POST /api/v1/payments/webhook requires a Paystack signature', async () => {
    const res = await http().post('/api/v1/payments/webhook').send({}).expect(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).toMatch(/INVALID_WEBHOOK|x-paystack-signature|raw body/i);
  });

  it('rejects a body signed with another key', async () => {
    const res = await postSigned(
      { event: 'charge.success', data: { id: 'e2e-x' } },
      'sk_test_other'
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_WEBHOOK');
    expect(fake.verifyTransaction).not.toHaveBeenCalled();
  });

  it('GET /api/v1/payments/webhook is not a route (Paystack only POSTs)', async () => {
    await http().get('/api/v1/payments/webhook').expect(404);
  });

  it('CinetPay routes are gone', async () => {
    await http()
      .post('/api/v1/payments/webhook/cinetpay')
      .send({ cpm_trans_id: 'cv_unknown', cpm_status: 'ACCEPTED' })
      .expect(404);
    await http().get('/api/v1/payments/webhook/cinetpay').expect(404);
  });

  it('a signed charge.success grants Pro once, however often Paystack delivers it', async () => {
    const user = await prisma.user.create({
      data: {
        email: `e2e+paystack-${Date.now()}@example.com`,
        firstName: 'Pay',
        lastName: 'Stack',
      },
    });
    userIds.push(user.id);
    const reference = `sub_e2e_${Date.now()}`;
    transactions.set(reference, {
      id: Date.now(),
      status: 'success',
      reference,
      amount: 660_000,
      currency: 'XOF',
      channel: 'mobile_money',
      paid_at: new Date().toISOString(),
      customer: { email: user.email, customer_code: 'CUS_e2e' },
      metadata: {
        type: 'subscription',
        userId: user.id,
        plan: 'pro',
        interval: 'month',
        amount: 660_000,
        currency: 'XOF',
      },
    });
    const event = { event: 'charge.success', data: { id: `e2e${Date.now()}`, reference } };

    const responses = await Promise.all([postSigned(event), postSigned(event), postSigned(event)]);
    expect(responses.every((r) => r.status === 201)).toBe(true);

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { subscription: { include: { payments: true, invoices: true } } },
    });
    expect(after.subscriptionTier).toBe('pro');
    expect(after.subscription).toMatchObject({ provider: 'paystack', status: 'active' });
    expect(after.subscription?.payments).toHaveLength(1);
    expect(after.subscription?.invoices).toHaveLength(1);
    const days =
      (after.subscription!.currentPeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(27);
    expect(days).toBeLessThan(32);
  });
});
