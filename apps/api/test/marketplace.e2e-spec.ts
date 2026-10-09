import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { STRONG_PASSWORD } from './auth-helpers';
import { PrismaService } from '../src/database/prisma.module';
import { MarketplaceService } from '../src/modules/marketplace/marketplace.service';

/**
 * Marketplace phase 1 against the real Postgres (constraints, advisory locks, relation
 * filters). Stripe is faked: no network, no real payment, refund or transfer.
 */
describe('Marketplace (e2e, real database)', () => {
  jest.setTimeout(90_000);
  let app: INestApplication;
  let prisma: PrismaService;
  let marketplace: MarketplaceService;
  const userIds: string[] = [];
  const prevModerators = process.env.MARKETPLACE_MODERATOR_IDS;

  type Account = { id: string; token: string };
  let moderator: Account;
  let seller: Account;
  let free: Account;
  let pro: Account;
  let business: Account;
  let sellerProfileId: string;
  let templateId: string;
  let listingId: string;

  const intents = new Map<string, Record<string, unknown>>();
  const transfers: Array<{ id: string; transfer_group: string; amount: number }> = [];
  const fakeStripe = {
    checkout: {
      sessions: {
        create: jest.fn(async () => ({ id: 'cs_e2e', url: 'https://checkout.stripe.test/cs_e2e' })),
      },
    },
    paymentIntents: {
      retrieve: jest.fn(async (id: string) => {
        const intent = intents.get(id);
        if (!intent) throw new Error('No such payment_intent');
        return intent;
      }),
    },
    transfers: {
      create: jest.fn(
        async (
          params: { amount: number; transfer_group: string },
          opts: { idempotencyKey: string }
        ) => {
          // Stripe idempotency: the same key returns the first transfer.
          await new Promise((resolve) => setTimeout(resolve, 20));
          const existing = transfers.find((t) => t.id === `tr_${opts.idempotencyKey}`);
          if (existing) return existing;
          const transfer = {
            id: `tr_${opts.idempotencyKey}`,
            transfer_group: params.transfer_group,
            amount: params.amount,
          };
          transfers.push(transfer);
          return transfer;
        }
      ),
      list: jest.fn(async ({ transfer_group }: { transfer_group: string }) => ({
        data: transfers.filter((t) => t.transfer_group === transfer_group),
      })),
    },
  };

  const http = () => request(app.getHttpServer());

  async function register(tier: 'free' | 'pro' | 'business' = 'free'): Promise<Account> {
    const email = `e2e+mkt-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ email, password: STRONG_PASSWORD, firstName: 'Mkt', lastName: 'E2E' })
      .expect(201);
    const id = res.body.data.user.id as string;
    userIds.push(id);
    if (tier !== 'free') {
      await prisma.user.update({ where: { id }, data: { subscriptionTier: tier } });
    }
    return { id, token: res.body.data.accessToken as string };
  }

  function paidIntent(id: string, buyerId: string) {
    intents.set(id, {
      id,
      status: 'succeeded',
      amount: 1299,
      amount_received: 1299,
      currency: 'usd',
      metadata: {
        type: 'marketplace',
        listingId,
        buyerId,
        priceCents: '1299',
        currency: 'usd',
      },
    });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    marketplace = app.get(MarketplaceService);
    (marketplace as unknown as { stripe: unknown }).stripe = fakeStripe;

    moderator = await register();
    seller = await register();
    free = await register('free');
    pro = await register('pro');
    business = await register('business');
    process.env.MARKETPLACE_MODERATOR_IDS = moderator.id;

    const profile = await prisma.sellerProfile.create({
      data: {
        userId: seller.id,
        displayName: 'E2E Seller',
        slug: `e2e-seller-${Date.now()}`,
        country: 'FR',
        status: 'active',
        tier: 'trusted',
        stripeAccountId: `acct_e2e_${Date.now()}`,
        payoutsEnabled: true,
        tosAcceptedAt: new Date(),
      },
    });
    sellerProfileId = profile.id;
  });

  afterAll(async () => {
    process.env.MARKETPLACE_MODERATOR_IDS = prevModerators;
    if (prisma && userIds.length) {
      await prisma.marketplaceLedgerEntry.deleteMany({ where: { sellerId: { in: userIds } } });
      await prisma.sellerPayout.deleteMany({ where: { sellerProfileId } });
      await prisma.cv.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.marketplacePurchase.deleteMany({ where: { buyerId: { in: userIds } } });
      await prisma.marketplaceTemplate.deleteMany({ where: { sellerId: { in: userIds } } });
      await prisma.template.deleteMany({ where: { createdBy: { in: userIds } } });
      await prisma.sellerProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.analyticsEvent.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (app) await app.close();
  });

  describe('Lot A: publication', () => {
    it('a seller submits a listing that only a moderator can publish', async () => {
      const template = await http()
        .post('/api/v1/marketplace/seller/templates')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          name: 'E2E Executive',
          description: 'Executive layout, navy',
          category: 'executive',
          previewImageUrl: '/p.png',
          designData: { key: 'executive', defaults: { primaryColor: '#1e3a8a' } },
        })
        .expect(201);
      templateId = template.body.data.id;

      const listing = await http()
        .post('/api/v1/marketplace/seller/listings')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({ templateId, title: 'E2E listing', slug: `e2e-${Date.now()}`, priceCents: 1299 })
        .expect(201);
      listingId = listing.body.data.id;
      expect(listing.body.data).toMatchObject({ status: 'submitted', isPublished: false });

      // Not in the catalogue yet.
      await http().get(`/api/v1/marketplace/templates/${listingId}`).expect(404);
    });

    it.each([
      ['anonymous', () => null, 401],
      ['Free', () => free.token, 403],
      ['Pro', () => pro.token, 403],
      ['Business', () => business.token, 403],
      ['the seller', () => seller.token, 403],
    ])('%s cannot moderate', async (_who, token, status) => {
      const call = http().post(`/api/v1/marketplace/moderation/listings/${listingId}/approve`);
      const t = token();
      if (t) call.set('Authorization', `Bearer ${t}`);
      await call.send({}).expect(status);
      const row = await prisma.marketplaceTemplate.findUnique({ where: { id: listingId } });
      expect(row?.status).toBe('submitted');
    });

    it('a moderator approves: published, in the catalogue, decision recorded', async () => {
      const list = await http()
        .get('/api/v1/marketplace/moderation/listings')
        .set('Authorization', `Bearer ${moderator.token}`)
        .expect(200);
      expect(list.body.data.some((l: { id: string }) => l.id === listingId)).toBe(true);

      await http()
        .post(`/api/v1/marketplace/moderation/listings/${listingId}/approve`)
        .set('Authorization', `Bearer ${moderator.token}`)
        .send({ notes: 'Looks good' })
        .expect(201);

      const row = await prisma.marketplaceTemplate.findUnique({
        where: { id: listingId },
        include: { moderations: true },
      });
      expect(row).toMatchObject({ status: 'published', isPublished: true });
      expect(row?.publishedAt).toBeInstanceOf(Date);
      expect(row?.moderations[0]).toMatchObject({ decision: 'approve', reviewerId: moderator.id });

      const pub = await http().get(`/api/v1/marketplace/templates/${listingId}`).expect(200);
      expect(JSON.stringify(pub.body)).not.toContain('designData');
      const catalogue = await http().get('/api/v1/marketplace/templates').expect(200);
      expect(JSON.stringify(catalogue.body)).not.toContain('designData');
    });

    it('a second approval is refused (conditional transition)', async () => {
      await http()
        .post(`/api/v1/marketplace/moderation/listings/${listingId}/approve`)
        .set('Authorization', `Bearer ${moderator.token}`)
        .send({})
        .expect(409);
    });
  });

  describe('Lot B and C: purchase and delivery', () => {
    it('without a licence, nobody gets the design or a CV with it, Business included', async () => {
      for (const account of [free, pro, business]) {
        await http()
          .get(`/api/v1/marketplace/templates/${listingId}/design`)
          .set('Authorization', `Bearer ${account.token}`)
          .expect(403);
        await http()
          .post('/api/v1/cvs')
          .set('Authorization', `Bearer ${account.token}`)
          .send({ title: 'Try', templateId, content: { templateKey: 'executive' } })
          .expect(403);
      }
    });

    it('the seller cannot buy their own listing', async () => {
      const res = await http()
        .post(`/api/v1/marketplace/templates/${listingId}/checkout`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send({})
        .expect(403);
      expect(res.body.error.code).toBe('OWN_LISTING');
    });

    it('a webhook replayed and a confirmation at once grant one licence and one ledger set', async () => {
      paidIntent('pi_e2e_free_1', free.id);
      const session = {
        id: 'cs_e2e_1',
        payment_status: 'paid',
        payment_intent: 'pi_e2e_free_1',
        client_reference_id: free.id,
        metadata: { type: 'marketplace', listingId, buyerId: free.id },
      } as never;

      const results = await Promise.all([
        marketplace.fulfillCheckoutSession(session),
        marketplace.fulfillCheckoutSession(session),
        marketplace.fulfillCheckoutSession(session),
      ]);

      expect(results.filter((r) => r?.outcome === 'fulfilled')).toHaveLength(1);
      expect(results.every((r) => r?.outcome !== 'duplicate_payment')).toBe(true);
      const purchases = await prisma.marketplacePurchase.findMany({
        where: { listingId, buyerId: free.id },
      });
      expect(purchases).toHaveLength(1);
      const ledger = await prisma.marketplaceLedgerEntry.count({
        where: { purchaseId: purchases[0].id },
      });
      expect(ledger).toBe(4);
    });

    it('a second checkout for an owned licence is refused', async () => {
      const res = await http()
        .post(`/api/v1/marketplace/templates/${listingId}/checkout`)
        .set('Authorization', `Bearer ${free.token}`)
        .send({})
        .expect(409);
      expect(res.body.error.code).toBe('ALREADY_PURCHASED');
    });

    it('a second payment for the same licence grants nothing and is reported', async () => {
      paidIntent('pi_e2e_free_2', free.id);
      const result = await marketplace.fulfillCheckoutSession({
        id: 'cs_e2e_2',
        payment_status: 'paid',
        payment_intent: 'pi_e2e_free_2',
        metadata: { type: 'marketplace', listingId, buyerId: free.id },
      } as never);
      expect(result).toEqual({ outcome: 'duplicate_payment', purchase: null });
      expect(
        await prisma.marketplacePurchase.count({ where: { listingId, buyerId: free.id } })
      ).toBe(1);
    });

    it('the Free buyer opens a CV with the design, premium layout included, and no other', async () => {
      const licence = await http()
        .get(`/api/v1/marketplace/templates/${listingId}/licence`)
        .set('Authorization', `Bearer ${free.token}`)
        .expect(200);
      expect(licence.body.data).toMatchObject({ status: 'active', templateId });

      const design = await http()
        .get(`/api/v1/marketplace/templates/${listingId}/design`)
        .set('Authorization', `Bearer ${free.token}`)
        .expect(200);
      expect(design.body.data.designData.key).toBe('executive');

      const cv = await http()
        .post('/api/v1/cvs')
        .set('Authorization', `Bearer ${free.token}`)
        .send({
          title: 'From marketplace',
          templateId,
          content: {
            templateKey: 'executive',
            customization: design.body.data.designData.defaults,
          },
        })
        .expect(201);
      expect(cv.body.data.templateId).toBe(templateId);

      // Another official premium layout stays locked for this Free account.
      await http()
        .patch(`/api/v1/cvs/${cv.body.data.id}`)
        .set('Authorization', `Bearer ${free.token}`)
        .send({ content: { templateKey: 'elegant' } })
        .expect(403);
    });
  });

  describe('Lot E: payouts', () => {
    it('three pods running the payout at once send one transfer', async () => {
      // A Pro buyer's sale, platform-held and past the hold window.
      paidIntent('pi_e2e_pro', pro.id);
      await marketplace.fulfillCheckoutSession({
        id: 'cs_e2e_pro',
        payment_status: 'paid',
        payment_intent: 'pi_e2e_pro',
        metadata: { type: 'marketplace', listingId, buyerId: pro.id },
      } as never);
      const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await prisma.marketplaceLedgerEntry.updateMany({
        where: { sellerId: seller.id },
        data: { createdAt: old },
      });
      // Two sales stay under the $25 minimum: add earnings from earlier sales.
      await prisma.marketplaceLedgerEntry.create({
        data: {
          sellerId: seller.id,
          entryType: 'seller_earning',
          amountCents: 2000,
          createdAt: old,
        },
      });

      const runs = await Promise.all([
        marketplace.processWeeklyPayouts(),
        marketplace.processWeeklyPayouts(),
        marketplace.processWeeklyPayouts(),
      ]);

      expect(runs.reduce((n, r) => n + r.paidCount, 0)).toBe(1);
      expect(fakeStripe.transfers.create).toHaveBeenCalledTimes(1);
      const payouts = await prisma.sellerPayout.findMany({ where: { sellerProfileId } });
      expect(payouts).toHaveLength(1);
      expect(payouts[0]).toMatchObject({ status: 'paid' });

      // Nothing left to pay on the next run.
      await marketplace.processWeeklyPayouts();
      expect(fakeStripe.transfers.create).toHaveBeenCalledTimes(1);
    });

    it('an abandoned pending payout is found on Stripe and not sent again', async () => {
      const payout = await prisma.sellerPayout.create({
        data: {
          sellerProfileId,
          amountCents: 3000,
          status: 'pending',
          periodStart: new Date(),
          periodEnd: new Date(),
          createdAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      });
      transfers.push({ id: 'tr_crashed', transfer_group: `payout_${payout.id}`, amount: 3000 });
      const before = fakeStripe.transfers.create.mock.calls.length;

      await marketplace.processWeeklyPayouts();

      expect(fakeStripe.transfers.create.mock.calls.length).toBe(before);
      const row = await prisma.sellerPayout.findUnique({ where: { id: payout.id } });
      expect(row).toMatchObject({ status: 'paid', stripeTransferId: 'tr_crashed' });
    });
  });

  describe('Lot D: refunds', () => {
    it('a full refund revokes the licence once and records the clawback', async () => {
      const refund = {
        id: 'ch_e2e',
        payment_intent: 'pi_e2e_free_1',
        amount: 1299,
        amount_refunded: 1299,
        refunded: true,
      } as never;

      await expect(marketplace.onChargeRefunded(refund)).resolves.toEqual({ outcome: 'revoked' });
      await expect(marketplace.onChargeRefunded(refund)).resolves.toEqual({
        outcome: 'already_revoked',
      });

      const purchase = await prisma.marketplacePurchase.findFirst({
        where: { listingId, buyerId: free.id },
        include: { ledger: true },
      });
      expect(purchase?.refundedAt).toBeInstanceOf(Date);
      expect(purchase?.ledger.filter((l) => l.entryType === 'refund_clawback')).toHaveLength(1);

      await http()
        .get(`/api/v1/marketplace/templates/${listingId}/design`)
        .set('Authorization', `Bearer ${free.token}`)
        .expect(403);
      await http()
        .post('/api/v1/cvs')
        .set('Authorization', `Bearer ${free.token}`)
        .send({ title: 'After refund', templateId })
        .expect(403);
      const licence = await http()
        .get(`/api/v1/marketplace/templates/${listingId}/licence`)
        .set('Authorization', `Bearer ${free.token}`)
        .expect(200);
      expect(licence.body.data.status).toBe('refunded');
    });
  });

  describe('Lot A: withdrawal keeps the sales', () => {
    it('a suspended listing leaves the catalogue, purchases stay', async () => {
      await http()
        .post(`/api/v1/marketplace/moderation/listings/${listingId}/suspend`)
        .set('Authorization', `Bearer ${moderator.token}`)
        .send({ reasonCode: 'ip_claim' })
        .expect(201);
      await http().get(`/api/v1/marketplace/templates/${listingId}`).expect(404);
      expect(await prisma.marketplacePurchase.count({ where: { listingId } })).toBe(2);

      // The Pro buyer's licence still works.
      await http()
        .get(`/api/v1/marketplace/templates/${listingId}/design`)
        .set('Authorization', `Bearer ${pro.token}`)
        .expect(200);
    });
  });
});
