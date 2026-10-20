import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { STRONG_PASSWORD } from './auth-helpers';
import { PrismaService } from '../src/database/prisma.module';
import { MarketplaceService } from '../src/modules/marketplace/marketplace.service';
import type { PaystackTransaction } from '../src/modules/payments/paystack.client';
import { installFakePaystack } from './paystack-fake';

/**
 * Marketplace phase 1 against the real Postgres (constraints, advisory locks, relation
 * filters). Paystack is faked: no network, no real payment, refund or settlement.
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

  /** 5 000 F CFA, in subunits. */
  const PRICE = 500_000;
  const fakePaystack = {
    initializeTransaction: jest.fn(async (_params: Record<string, unknown>) => ({
      authorization_url: 'https://checkout.paystack.test/e2e',
      access_code: 'e2e',
      reference: 'ignored',
    })),
    listBanks: jest.fn(async () => [
      { name: 'MTN Mobile Money', code: 'MTN', type: 'mobile_money', active: true },
    ]),
    createSubaccount: jest.fn(async () => ({ subaccount_code: 'ACCT_e2e' })),
    updateSubaccount: jest.fn(async () => ({ subaccount_code: 'ACCT_e2e' })),
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

  /** A successful Paystack transaction, as /transaction/verify returns it. */
  function paidTx(
    reference: string,
    buyerId: string,
    split?: { subaccount: string; sellerShareCents: number }
  ): PaystackTransaction {
    return {
      id: Date.now(),
      status: 'success',
      reference,
      amount: PRICE,
      currency: 'XOF',
      fees: 17_500,
      subaccount: split ? { subaccount_code: split.subaccount } : {},
      metadata: {
        type: 'marketplace',
        listingId,
        buyerId,
        priceCents: PRICE,
        currency: 'XOF',
        sellerShareCents: split?.sellerShareCents ?? null,
      },
    };
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    marketplace = app.get(MarketplaceService);
    installFakePaystack(app, fakePaystack);

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
        country: 'CI',
        // Active with no payout account yet: sales are platform-held until it is set up.
        status: 'active',
        tier: 'trusted',
        payoutsEnabled: false,
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
        .send({ templateId, title: 'E2E listing', slug: `e2e-${Date.now()}`, priceCents: PRICE })
        .expect(201);
      listingId = listing.body.data.id;
      expect(listing.body.data).toMatchObject({
        status: 'submitted',
        isPublished: false,
        currency: 'XOF',
      });

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

    it('the checkout opens a Paystack page bound to the buyer and the charged price', async () => {
      const res = await http()
        .post(`/api/v1/marketplace/templates/${listingId}/checkout`)
        .set('Authorization', `Bearer ${free.token}`)
        .send({})
        .expect(201);
      expect(res.body.data.url).toBe('https://checkout.paystack.test/e2e');
      expect(fakePaystack.initializeTransaction).toHaveBeenLastCalledWith(
        expect.objectContaining({
          amount: PRICE,
          currency: 'XOF',
          reference: res.body.data.reference,
          metadata: expect.objectContaining({
            listingId,
            buyerId: free.id,
            sellerShareCents: null,
          }),
        })
      );
      // No payout account yet: no split.
      expect(fakePaystack.initializeTransaction.mock.calls.at(-1)?.[0]).not.toHaveProperty(
        'subaccount'
      );
    });

    it('a webhook replayed and a confirmation at once grant one licence and one ledger set', async () => {
      const tx = paidTx('mkt_e2e_free_1', free.id);

      const results = await Promise.all([
        marketplace.fulfillTransaction(tx),
        marketplace.fulfillTransaction(tx),
        marketplace.fulfillTransaction(tx),
      ]);

      expect(results.filter((r) => r.outcome === 'fulfilled')).toHaveLength(1);
      expect(results.every((r) => r.outcome !== 'duplicate_payment')).toBe(true);
      const purchases = await prisma.marketplacePurchase.findMany({
        where: { listingId, buyerId: free.id },
      });
      expect(purchases).toHaveLength(1);
      expect(purchases[0]).toMatchObject({ paystackReference: 'mkt_e2e_free_1', currency: 'XOF' });
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
      const result = await marketplace.fulfillTransaction(paidTx('mkt_e2e_free_2', free.id));
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

  describe('Lot E: payouts (Paystack subaccount)', () => {
    it('the seller registers a payout account and later sales are split', async () => {
      const res = await http()
        .post('/api/v1/marketplace/seller/payout-account')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({ bankCode: 'MTN', accountNumber: '0701020304' })
        .expect(201);
      expect(res.body.data).toEqual({
        status: 'active',
        payoutsEnabled: true,
        payoutAccount: { bankName: 'MTN Mobile Money', last4: '0304' },
      });

      const checkout = await http()
        .post(`/api/v1/marketplace/templates/${listingId}/checkout`)
        .set('Authorization', `Bearer ${pro.token}`)
        .send({})
        .expect(201);
      const params = fakePaystack.initializeTransaction.mock.calls.at(-1)?.[0] as {
        subaccount: string;
        transaction_charge: number;
        metadata: { sellerShareCents: number };
      };
      expect(params).toMatchObject({ subaccount: 'ACCT_e2e', bearer: 'account' });
      expect(params.transaction_charge + params.metadata.sellerShareCents).toBe(PRICE);

      await marketplace.fulfillTransaction(
        paidTx(checkout.body.data.reference, pro.id, {
          subaccount: 'ACCT_e2e',
          sellerShareCents: params.metadata.sellerShareCents,
        })
      );
      const purchase = await prisma.marketplacePurchase.findFirstOrThrow({
        where: { listingId, buyerId: pro.id },
        include: { ledger: true },
      });
      // Paystack already settled the seller's share: it is booked as paid out.
      expect(purchase.ledger.find((l) => l.entryType === 'payout')?.amountCents).toBe(
        params.metadata.sellerShareCents
      );
    });

    it('a seller cannot register an operator Paystack does not offer', async () => {
      const res = await http()
        .post('/api/v1/marketplace/seller/payout-account')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({ bankCode: 'NOPE', accountNumber: '0701020304' })
        .expect(400);
      expect(res.body.error.code).toBe('PAYOUT_BANK_UNKNOWN');
    });
  });

  describe('Lot D: refunds', () => {
    it('a full refund revokes the licence once and records the clawback', async () => {
      const refund = { id: 1, transaction_reference: 'mkt_e2e_free_1', amount: PRICE };

      await expect(marketplace.onRefundProcessed(refund)).resolves.toEqual({ outcome: 'revoked' });
      await expect(marketplace.onRefundProcessed(refund)).resolves.toEqual({
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
