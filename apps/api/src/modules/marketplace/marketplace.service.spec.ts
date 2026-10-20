import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MarketplaceService } from './marketplace.service';
import { PaystackApiError, type PaystackTransaction } from '../payments/paystack.client';

function p2002(target: string[]) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

/** 5 000 F CFA, in subunits. */
const PRICE = 500_000;

const listingInput = {
  templateId: 'tmpl-1',
  title: 'My listing',
  slug: 'my-listing',
  priceCents: PRICE,
};

function publishedListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    templateId: 'tmpl-1',
    sellerId: 'seller-1',
    title: 'Listed',
    priceCents: PRICE,
    currency: 'XOF',
    status: 'published',
    isPublished: true,
    impressionCount: 0,
    template: {
      id: 'tmpl-1',
      name: 'Mine',
      previewImageUrl: '/p.png',
      category: 'modern',
      rating: 0,
      isPremium: true,
    },
    sellerProfile: { displayName: 'Ada', slug: 'ada', tier: 'new', status: 'active' },
    reviews: [],
    ...overrides,
  };
}

function paidTx(overrides: Partial<PaystackTransaction> = {}): PaystackTransaction {
  return {
    id: 77,
    status: 'success',
    reference: 'mkt_ref_1',
    amount: PRICE,
    currency: 'XOF',
    fees: 17_500,
    subaccount: {},
    metadata: {
      type: 'marketplace',
      listingId: 'listing-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      priceCents: PRICE,
      currency: 'XOF',
      sellerShareCents: null,
    },
    ...overrides,
  };
}

describe('MarketplaceService', () => {
  const env = { ...process.env };
  const prisma = {
    marketplaceTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    template: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    sellerProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    marketplacePurchase: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    marketplaceLedgerEntry: { createMany: jest.fn(), create: jest.fn() },
    templateReview: { create: jest.fn(), aggregate: jest.fn() },
    marketplaceDispute: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    sellerPayout: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const client = {
    initializeTransaction: jest.fn(),
    listBanks: jest.fn(),
    createSubaccount: jest.fn(),
    updateSubaccount: jest.fn(),
  };
  const paystack = { require: jest.fn(() => client) };

  let service: MarketplaceService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env, APP_URL: 'https://app.example.com' };
    delete process.env.PAYMENT_CURRENCY;
    service = new MarketplaceService(prisma as never, paystack as never);
    prisma.marketplacePurchase.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ email: 'buyer@example.com' });
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma)
    );
  });

  afterAll(() => {
    process.env = env;
  });

  describe('submitListing ownership (issue 1)', () => {
    beforeEach(() => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        userId: 'seller-1',
        status: 'active',
      });
    });

    it('rejects listing someone else’s template', async () => {
      prisma.template.findUnique.mockResolvedValue({ id: 'tmpl-1', createdBy: 'seller-a' });

      await expect(service.submitListing('seller-b', listingInput)).rejects.toMatchObject({
        response: { code: 'NOT_OWNER' },
      });
      await expect(service.submitListing('seller-b', listingInput)).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(prisma.marketplaceTemplate.create).not.toHaveBeenCalled();
    });

    it('rejects catalog templates with null createdBy', async () => {
      prisma.template.findUnique.mockResolvedValue({ id: 'tmpl-1', createdBy: null });

      await expect(service.submitListing('seller-1', listingInput)).rejects.toMatchObject({
        response: { code: 'NOT_OWNER' },
      });
    });

    it('rejects missing template', async () => {
      prisma.template.findUnique.mockResolvedValue(null);
      await expect(service.submitListing('seller-1', listingInput)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('allows listing own template', async () => {
      prisma.template.findUnique.mockResolvedValue({ id: 'tmpl-1', createdBy: 'seller-1' });
      prisma.marketplaceTemplate.create.mockResolvedValue({ id: 'listing-1', ...listingInput });

      const created = await service.submitListing('seller-1', listingInput);
      expect(created.id).toBe('listing-1');
      expect(prisma.marketplaceTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            templateId: 'tmpl-1',
            sellerId: 'seller-1',
            status: 'submitted',
            isPublished: false,
          }),
        })
      );
    });

    it('returns 409 when the same template is listed twice', async () => {
      prisma.template.findUnique.mockResolvedValue({ id: 'tmpl-1', createdBy: 'seller-1' });
      prisma.marketplaceTemplate.create.mockRejectedValue(p2002(['template_id']));

      await expect(service.submitListing('seller-1', listingInput)).rejects.toBeInstanceOf(
        ConflictException
      );
      await expect(service.submitListing('seller-1', listingInput)).rejects.toMatchObject({
        response: { code: 'TEMPLATE_ALREADY_LISTED' },
      });
    });

    it('refuses a design the editor cannot render', async () => {
      for (const designData of [
        { defaults: {} },
        { key: 'made-up' },
        { key: 'modern', defaults: [] },
      ]) {
        await expect(
          service.createSellerTemplate('seller-1', {
            name: 'Mine',
            description: 'A design',
            category: 'modern',
            previewImageUrl: '/p.png',
            designData,
          })
        ).rejects.toMatchObject({ response: { code: 'TEMPLATE_DESIGN_INVALID' } });
      }
      expect(prisma.template.create).not.toHaveBeenCalled();
    });

    it('createSellerTemplate sets createdBy and stays unpublished', async () => {
      prisma.template.create.mockResolvedValue({
        id: 'tmpl-new',
        name: 'Mine',
        createdBy: 'seller-1',
        isPublished: false,
      });

      const created = await service.createSellerTemplate('seller-1', {
        name: 'Mine',
        description: 'A design',
        category: 'modern',
        previewImageUrl: '/p.png',
        designData: { key: 'modern', defaults: {} },
      });

      expect(created.createdBy).toBe('seller-1');
      expect(prisma.template.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdBy: 'seller-1',
            isPublished: false,
          }),
        })
      );
    });
  });

  describe('submitListing KYC gate (issue 2)', () => {
    it('rejects when no seller profile', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);
      await expect(service.submitListing('seller-1', listingInput)).rejects.toMatchObject({
        response: { code: 'NOT_SELLER' },
      });
    });

    it('rejects pending_kyc', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'p',
        userId: 'seller-1',
        status: 'pending_kyc',
      });
      await expect(service.submitListing('seller-1', listingInput)).rejects.toMatchObject({
        response: { code: 'SELLER_NOT_ACTIVE' },
      });
      expect(prisma.template.findUnique).not.toHaveBeenCalled();
    });

    it('rejects rejected and suspended', async () => {
      for (const status of ['rejected', 'suspended'] as const) {
        prisma.sellerProfile.findUnique.mockResolvedValue({
          id: 'p',
          userId: 'seller-1',
          status,
        });
        await expect(service.submitListing('seller-1', listingInput)).rejects.toBeInstanceOf(
          ForbiddenException
        );
      }
    });

    it('allows active sellers through the KYC gate', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'p',
        userId: 'seller-1',
        status: 'active',
      });
      prisma.template.findUnique.mockResolvedValue({ id: 'tmpl-1', createdBy: 'seller-1' });
      prisma.marketplaceTemplate.create.mockResolvedValue({ id: 'listing-1' });
      await expect(service.submitListing('seller-1', listingInput)).resolves.toEqual({
        id: 'listing-1',
      });
    });
  });

  describe('designData leak (issue 4)', () => {
    it('public get omits designData and does not require auth', async () => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue(publishedListing());
      prisma.marketplaceTemplate.update.mockResolvedValue({});

      const listing = await service.get('listing-1');
      expect(listing.template).toBeDefined();
      expect(listing.template).not.toHaveProperty('designData');
    });

    it('getDesign rejects a user without purchase', async () => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue({
        ...publishedListing(),
        template: { id: 'tmpl-1', createdBy: 'seller-1', designData: { secret: true } },
      });
      prisma.marketplacePurchase.findUnique.mockResolvedValue(null);

      await expect(service.getDesign('buyer-1', 'listing-1')).rejects.toMatchObject({
        response: { code: 'PURCHASE_REQUIRED' },
      });
    });

    it('getDesign allows the owner', async () => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue({
        ...publishedListing(),
        template: { id: 'tmpl-1', createdBy: 'seller-1', designData: { secret: true } },
      });

      const result = await service.getDesign('seller-1', 'listing-1');
      expect(result.designData).toEqual({ secret: true });
      expect(prisma.marketplacePurchase.findUnique).not.toHaveBeenCalled();
    });

    it('getDesign allows a buyer with a non-refunded purchase', async () => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue({
        ...publishedListing(),
        template: { id: 'tmpl-1', createdBy: 'seller-1', designData: { secret: true } },
      });
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        id: 'pur-1',
        refundedAt: null,
      });

      const result = await service.getDesign('buyer-1', 'listing-1');
      expect(result.designData).toEqual({ secret: true });
    });

    it('getDesign rejects a refunded purchase', async () => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue({
        ...publishedListing(),
        template: { id: 'tmpl-1', createdBy: 'seller-1', designData: { secret: true } },
      });
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        id: 'pur-1',
        refundedAt: new Date(),
      });

      await expect(service.getDesign('buyer-1', 'listing-1')).rejects.toMatchObject({
        response: { code: 'PURCHASE_REQUIRED' },
      });
    });
  });

  describe('impression tracking (issue 5)', () => {
    it('increments impressionCount on public listing GET', async () => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue(
        publishedListing({ impressionCount: 0 })
      );
      prisma.marketplaceTemplate.update.mockResolvedValue({});

      const listing = await service.get('listing-1');
      expect(prisma.marketplaceTemplate.update).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { impressionCount: { increment: 1 } },
      });
      expect(listing.impressionCount).toBe(1);
    });

    it('does not increment when listing is missing', async () => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue(null);
      await expect(service.get('missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.marketplaceTemplate.update).not.toHaveBeenCalled();
    });

    it('still returns the listing when impression increment fails', async () => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue(
        publishedListing({ impressionCount: 3 })
      );
      prisma.marketplaceTemplate.update.mockRejectedValue(new Error('db down'));

      const listing = await service.get('listing-1');
      expect(listing.id).toBe('listing-1');
      expect(listing.impressionCount).toBe(3);
    });

    it('sellerAnalytics uses stored impressionCount', async () => {
      prisma.marketplaceTemplate.findMany.mockResolvedValue([
        {
          impressionCount: 10,
          purchases: [{ amountCents: 1299, sellerEarningCents: 900, platformFeeCents: 399 }],
        },
      ]);

      const analytics = await service.sellerAnalytics('seller-1');
      expect(analytics.impressions).toBe(10);
      expect(analytics.purchases).toBe(1);
      expect(analytics.conversionRate).toBeCloseTo(0.1);
    });
  });

  describe('catalog query', () => {
    it('filters by template category and price sort', async () => {
      prisma.marketplaceTemplate.findMany.mockResolvedValue([]);
      await service.listPublished({ q: 'pro', category: 'modern', sort: 'price_low' });
      expect(prisma.marketplaceTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            template: { category: 'modern' },
          }),
          orderBy: { priceCents: 'asc' },
        })
      );
    });

    it('ignores unknown categories', async () => {
      prisma.marketplaceTemplate.findMany.mockResolvedValue([]);
      await service.listPublished({ category: 'not-a-category' });
      const arg = prisma.marketplaceTemplate.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(arg.where.template).toBeUndefined();
    });
  });

  describe('listing prices', () => {
    beforeEach(() => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'p',
        userId: 'seller-1',
        status: 'active',
      });
      prisma.template.findUnique.mockResolvedValue({ id: 'tmpl-1', createdBy: 'seller-1' });
      prisma.marketplaceTemplate.create.mockResolvedValue({ id: 'listing-1' });
    });

    it('creates listings in the payment currency, within its bounds', async () => {
      await service.submitListing('seller-1', listingInput);
      expect(prisma.marketplaceTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priceCents: PRICE, currency: 'XOF' }),
        })
      );
      for (const priceCents of [49_900, 5_000_100]) {
        await expect(
          service.submitListing('seller-1', { ...listingInput, priceCents })
        ).rejects.toMatchObject({ response: { code: 'INVALID_PRICE' } });
      }
    });

    it('uses EUR/USD bounds when payments are taken in those currencies', async () => {
      process.env.PAYMENT_CURRENCY = 'EUR';
      await expect(
        service.submitListing('seller-1', { ...listingInput, priceCents: 1299 })
      ).resolves.toEqual({ id: 'listing-1' });
      await expect(
        service.submitListing('seller-1', { ...listingInput, priceCents: PRICE })
      ).rejects.toMatchObject({ response: { code: 'INVALID_PRICE' } });
    });
  });

  describe('checkout', () => {
    beforeEach(() => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue(
        publishedListing({ sellerProfile: { paystackSubaccountCode: null, payoutsEnabled: false } })
      );
      client.initializeTransaction.mockResolvedValue({
        authorization_url: 'https://checkout.paystack.com/x',
      });
    });

    it('opens a Paystack page bound to the buyer, listing and charged price', async () => {
      const result = await service.createListingCheckout('buyer-1', 'listing-1');
      expect(result.url).toBe('https://checkout.paystack.com/x');
      expect(result.reference).toMatch(/^mkt_[0-9a-f]{32}$/);
      expect(client.initializeTransaction).toHaveBeenCalledWith({
        email: 'buyer@example.com',
        amount: PRICE,
        currency: 'XOF',
        reference: result.reference,
        callback_url: 'https://app.example.com/marketplace/listing-1?checkout=success',
        metadata: {
          type: 'marketplace',
          listingId: 'listing-1',
          buyerId: 'buyer-1',
          sellerId: 'seller-1',
          priceCents: PRICE,
          currency: 'XOF',
          sellerShareCents: null,
          cancel_action: 'https://app.example.com/marketplace/listing-1?checkout=cancel',
        },
      });
    });

    it('splits the payment with the seller subaccount: 70% of net to the seller', async () => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue(
        publishedListing({
          sellerProfile: { paystackSubaccountCode: 'ACCT_1', payoutsEnabled: true },
        })
      );
      await service.createListingCheckout('buyer-1', 'listing-1');
      const params = client.initializeTransaction.mock.calls[0][0];
      // fee estimate 3.5% = 17 500; net 482 500; seller 70% = 337 750; platform keeps the rest.
      expect(params).toMatchObject({
        subaccount: 'ACCT_1',
        transaction_charge: 162_250,
        bearer: 'account',
        metadata: { sellerShareCents: 337_750 },
      });
    });

    it('refuses own listings, owned or refunded licences, and legacy currencies', async () => {
      await expect(service.createListingCheckout('seller-1', 'listing-1')).rejects.toMatchObject({
        response: { code: 'OWN_LISTING' },
      });
      prisma.marketplacePurchase.findUnique.mockResolvedValueOnce({ refundedAt: null });
      await expect(service.createListingCheckout('buyer-1', 'listing-1')).rejects.toMatchObject({
        response: { code: 'ALREADY_PURCHASED' },
      });
      prisma.marketplacePurchase.findUnique.mockResolvedValueOnce({ refundedAt: new Date() });
      await expect(service.createListingCheckout('buyer-1', 'listing-1')).rejects.toMatchObject({
        response: { code: 'REPURCHASE_UNAVAILABLE' },
      });
      prisma.marketplaceTemplate.findUnique.mockResolvedValueOnce(
        publishedListing({ currency: 'USD', priceCents: 1299 })
      );
      await expect(service.createListingCheckout('buyer-1', 'listing-1')).rejects.toBeInstanceOf(
        ConflictException
      );
      expect(client.initializeTransaction).not.toHaveBeenCalled();
    });

    it('fails on missing listings, buyers, or a Paystack outage', async () => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValueOnce(null);
      await expect(service.createListingCheckout('buyer-1', 'listing-x')).rejects.toBeInstanceOf(
        NotFoundException
      );
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.createListingCheckout('buyer-1', 'listing-1')).rejects.toBeInstanceOf(
        NotFoundException
      );
      client.initializeTransaction.mockRejectedValueOnce(new PaystackApiError('down', 0));
      await expect(service.createListingCheckout('buyer-1', 'listing-1')).rejects.toMatchObject({
        response: { code: 'PAYMENT_PROVIDER_UNAVAILABLE' },
      });
    });
  });

  describe('fulfillTransaction', () => {
    beforeEach(() => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue(publishedListing());
      prisma.marketplacePurchase.create.mockResolvedValue({ id: 'pur-1' });
      prisma.marketplaceLedgerEntry.createMany.mockResolvedValue({ count: 4 });
      prisma.marketplaceTemplate.update.mockResolvedValue({});
    });

    it('grants the licence and books the actual Paystack fee (platform-held)', async () => {
      await expect(service.fulfillTransaction(paidTx())).resolves.toEqual({
        outcome: 'fulfilled',
        purchase: { id: 'pur-1' },
      });
      // net = 500 000 - 17 500 = 482 500; seller 70% = 337 750; platform 144 750.
      expect(prisma.marketplacePurchase.create).toHaveBeenCalledWith({
        data: {
          listingId: 'listing-1',
          buyerId: 'buyer-1',
          amountCents: PRICE,
          currency: 'XOF',
          paystackReference: 'mkt_ref_1',
          stripeFeeCents: 17_500,
          platformFeeCents: 144_750,
          sellerEarningCents: 337_750,
        },
      });
      const rows = prisma.marketplaceLedgerEntry.createMany.mock.calls[0][0].data;
      expect(rows.map((r: { entryType: string }) => r.entryType)).toEqual([
        'charge_gross',
        'stripe_fee',
        'platform_commission',
        'seller_earning',
      ]);
      expect(prisma.marketplaceTemplate.update).toHaveBeenCalledWith({
        where: { id: 'listing-1' },
        data: { downloadCount: { increment: 1 } },
      });
    });

    it('records a split payment as already paid out to the seller', async () => {
      await service.fulfillTransaction(
        paidTx({
          fees: 20_000,
          subaccount: { subaccount_code: 'ACCT_1' },
          metadata: { ...(paidTx().metadata as object), sellerShareCents: 337_750 },
        })
      );
      expect(prisma.marketplacePurchase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          stripeFeeCents: 20_000,
          sellerEarningCents: 337_750,
          platformFeeCents: 142_250,
        }),
      });
      const rows = prisma.marketplaceLedgerEntry.createMany.mock.calls[0][0].data;
      expect(rows[4]).toMatchObject({ entryType: 'payout', amountCents: 337_750 });
    });

    it('estimates the fee when Paystack does not report it', async () => {
      await service.fulfillTransaction(paidTx({ fees: null }));
      expect(prisma.marketplacePurchase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ stripeFeeCents: 17_500 }),
      });
    });

    it('grants nothing for an unpaid, mismatched or incomplete payment', async () => {
      await expect(service.fulfillTransaction(paidTx({ status: 'abandoned' }))).resolves.toEqual({
        outcome: 'not_paid',
        purchase: null,
      });
      await expect(service.fulfillTransaction(paidTx({ amount: 100 }))).resolves.toMatchObject({
        outcome: 'rejected',
      });
      await expect(service.fulfillTransaction(paidTx({ currency: 'NGN' }))).resolves.toMatchObject({
        outcome: 'rejected',
      });
      await expect(
        service.fulfillTransaction(paidTx({ metadata: { type: 'marketplace' } }))
      ).rejects.toThrow('incomplete metadata');
      prisma.marketplaceTemplate.findUnique.mockResolvedValueOnce(null);
      await expect(service.fulfillTransaction(paidTx())).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.marketplacePurchase.create).not.toHaveBeenCalled();
    });

    it('checks the amount against what was charged, not the current price', async () => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue(
        publishedListing({ priceCents: 900_000 })
      );
      await expect(service.fulfillTransaction(paidTx())).resolves.toMatchObject({
        outcome: 'fulfilled',
      });
    });

    it('returns the existing licence when the same payment is replayed', async () => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({ id: 'pur-1' });
      await expect(service.fulfillTransaction(paidTx())).resolves.toEqual({
        outcome: 'already_fulfilled',
        purchase: { id: 'pur-1' },
      });
      expect(prisma.marketplacePurchase.create).not.toHaveBeenCalled();
    });

    it('treats a concurrent delivery of the same payment as done', async () => {
      prisma.$transaction.mockRejectedValueOnce(p2002(['paystack_reference']));
      prisma.marketplacePurchase.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'pur-1' });
      await expect(service.fulfillTransaction(paidTx())).resolves.toEqual({
        outcome: 'already_fulfilled',
        purchase: { id: 'pur-1' },
      });
    });

    it('reports a second payment for an owned licence and grants nothing', async () => {
      prisma.$transaction.mockRejectedValueOnce(p2002(['listing_id', 'buyer_id']));
      await expect(service.fulfillTransaction(paidTx())).resolves.toEqual({
        outcome: 'duplicate_payment',
        purchase: null,
      });
    });

    it('rethrows other database errors', async () => {
      prisma.$transaction.mockRejectedValueOnce(new Error('db down'));
      await expect(service.fulfillTransaction(paidTx())).rejects.toThrow('db down');
    });
  });

  describe('refunds and disputes', () => {
    beforeEach(() => {
      prisma.marketplacePurchase.findUnique.mockResolvedValue({
        id: 'pur-1',
        listingId: 'listing-1',
        refundedAt: null,
        amountCents: PRICE,
        currency: 'XOF',
        sellerEarningCents: 337_750,
      });
      prisma.marketplaceTemplate.findUnique.mockResolvedValue({ sellerId: 'seller-1' });
      prisma.marketplacePurchase.updateMany.mockResolvedValue({ count: 1 });
      prisma.marketplaceLedgerEntry.create.mockResolvedValue({});
    });

    it('revokes the licence and claws back the seller share on a full refund', async () => {
      await expect(
        service.onRefundProcessed({ transaction_reference: 'mkt_ref_1', amount: PRICE })
      ).resolves.toEqual({ outcome: 'revoked' });
      expect(prisma.marketplacePurchase.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { paystackReference: 'mkt_ref_1' } })
      );
      expect(prisma.marketplaceLedgerEntry.create).toHaveBeenCalledWith({
        data: {
          purchaseId: 'pur-1',
          sellerId: 'seller-1',
          entryType: 'refund_clawback',
          amountCents: -337_750,
          currency: 'XOF',
        },
      });
    });

    it('finds the payment from a nested transaction reference, once', async () => {
      prisma.marketplacePurchase.updateMany.mockResolvedValue({ count: 0 });
      await service.onRefundProcessed({ transaction: { reference: 'mkt_ref_1' }, amount: PRICE });
      expect(prisma.marketplaceLedgerEntry.create).not.toHaveBeenCalled();

      prisma.marketplacePurchase.findUnique.mockResolvedValueOnce({
        id: 'pur-1',
        refundedAt: new Date(),
        amountCents: PRICE,
      });
      await expect(
        service.onRefundProcessed({ transaction_reference: 'mkt_ref_1', amount: PRICE })
      ).resolves.toEqual({ outcome: 'already_revoked' });
    });

    it('keeps the licence on a partial refund and reports it', async () => {
      await expect(
        service.onRefundProcessed({ transaction_reference: 'mkt_ref_1', amount: 1000 })
      ).resolves.toEqual({ outcome: 'partial_refund_reported' });
      expect(prisma.marketplacePurchase.updateMany).not.toHaveBeenCalled();
    });

    it('ignores refunds of other payments', async () => {
      await expect(service.onRefundProcessed({ amount: PRICE })).resolves.toEqual({
        outcome: 'not_marketplace',
      });
      prisma.marketplacePurchase.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.onRefundProcessed({ transaction_reference: 'sub_ref_1', amount: PRICE })
      ).resolves.toEqual({ outcome: 'not_marketplace' });
    });

    it('never treats a dispute as a refund', async () => {
      await service.onChargeDispute(
        { id: 5, status: 'awaiting-merchant-feedback', transaction: { reference: 'mkt_ref_1' } },
        'charge.dispute.create'
      );
      await service.onChargeDispute({ id: 6 }, 'charge.dispute.resolve');
      prisma.marketplacePurchase.findUnique.mockResolvedValueOnce(null);
      await service.onChargeDispute(
        { id: 7, transaction: { reference: 'x' } },
        'charge.dispute.remind'
      );
      expect(prisma.marketplacePurchase.updateMany).not.toHaveBeenCalled();
      expect(prisma.marketplaceLedgerEntry.create).not.toHaveBeenCalled();
    });
  });

  describe('seller payout account (Paystack subaccount)', () => {
    const profile = {
      id: 'profile-1',
      userId: 'seller-1',
      displayName: 'Ada',
      country: 'CI',
      status: 'pending_kyc',
      paystackSubaccountCode: null as string | null,
      payoutBankName: null,
      payoutAccountLast4: null,
      payoutsEnabled: false,
      user: { email: 'ada@example.com' },
    };

    beforeEach(() => {
      client.listBanks.mockResolvedValue([
        { name: 'MTN Mobile Money', code: 'MTN', type: 'mobile_money' },
        { name: 'Old bank', code: 'OLD', active: false },
      ]);
      client.createSubaccount.mockResolvedValue({ subaccount_code: 'ACCT_1' });
      client.updateSubaccount.mockResolvedValue({ subaccount_code: 'ACCT_1' });
      prisma.sellerProfile.findUnique.mockResolvedValue(profile);
      prisma.sellerProfile.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...profile, ...data })
      );
    });

    it('lists active banks and operators in the payment currency', async () => {
      await expect(service.listPayoutBanks()).resolves.toEqual({
        currency: 'XOF',
        items: [{ name: 'MTN Mobile Money', code: 'MTN', type: 'mobile_money' }],
      });
      expect(client.listBanks).toHaveBeenCalledWith('XOF');
      client.listBanks.mockRejectedValueOnce(new PaystackApiError('down', 0));
      await expect(service.listPayoutBanks()).rejects.toMatchObject({
        response: { code: 'PAYMENT_PROVIDER_UNAVAILABLE' },
      });
    });

    it('creates the subaccount and activates the seller', async () => {
      await expect(
        service.setupPayoutAccount('seller-1', { bankCode: 'MTN', accountNumber: '0701020304' })
      ).resolves.toEqual({
        status: 'active',
        payoutsEnabled: true,
        payoutAccount: { bankName: 'MTN Mobile Money', last4: '0304' },
      });
      expect(client.createSubaccount).toHaveBeenCalledWith({
        business_name: 'Ada',
        settlement_bank: 'MTN',
        account_number: '0701020304',
        percentage_charge: 30,
        primary_contact_email: 'ada@example.com',
        metadata: JSON.stringify({ userId: 'seller-1', sellerProfileId: 'profile-1' }),
      });
      expect(prisma.sellerProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: {
          paystackSubaccountCode: 'ACCT_1',
          payoutBankName: 'MTN Mobile Money',
          payoutAccountLast4: '0304',
          payoutsEnabled: true,
          status: 'active',
        },
      });
    });

    it('updates an existing subaccount instead of creating another', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        ...profile,
        paystackSubaccountCode: 'ACCT_1',
      });
      await service.setupPayoutAccount('seller-1', {
        bankCode: 'MTN',
        accountNumber: '0701020304',
      });
      expect(client.updateSubaccount).toHaveBeenCalledWith('ACCT_1', {
        business_name: 'Ada',
        settlement_bank: 'MTN',
        account_number: '0701020304',
      });
      expect(client.createSubaccount).not.toHaveBeenCalled();
    });

    it('refuses non-sellers, blocked sellers and unknown banks', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.setupPayoutAccount('x', { bankCode: 'MTN', accountNumber: '0701020304' })
      ).rejects.toBeInstanceOf(ForbiddenException);
      prisma.sellerProfile.findUnique.mockResolvedValueOnce({ ...profile, status: 'suspended' });
      await expect(
        service.setupPayoutAccount('seller-1', { bankCode: 'MTN', accountNumber: '0701020304' })
      ).rejects.toMatchObject({ response: { code: 'SELLER_BLOCKED' } });
      await expect(
        service.setupPayoutAccount('seller-1', { bankCode: 'OLD', accountNumber: '0701020304' })
      ).rejects.toMatchObject({ response: { code: 'PAYOUT_BANK_UNKNOWN' } });
      expect(prisma.sellerProfile.update).not.toHaveBeenCalled();
    });

    it('reports Paystack refusals and outages, and changes nothing', async () => {
      client.createSubaccount.mockRejectedValueOnce(
        new PaystackApiError('Account number is invalid', 400)
      );
      await expect(
        service.setupPayoutAccount('seller-1', { bankCode: 'MTN', accountNumber: '0701020304' })
      ).rejects.toMatchObject({
        response: {
          code: 'PAYOUT_ACCOUNT_REJECTED',
          message: 'Paystack refused this account: Account number is invalid',
        },
      });
      client.createSubaccount.mockRejectedValueOnce(new PaystackApiError('down', 0));
      await expect(
        service.setupPayoutAccount('seller-1', { bankCode: 'MTN', accountNumber: '0701020304' })
      ).rejects.toMatchObject({ response: { code: 'PAYMENT_PROVIDER_UNAVAILABLE' } });
      client.createSubaccount.mockResolvedValueOnce({});
      await expect(
        service.setupPayoutAccount('seller-1', { bankCode: 'MTN', accountNumber: '0701020304' })
      ).rejects.toMatchObject({ response: { code: 'PAYMENT_PROVIDER_UNAVAILABLE' } });
      expect(prisma.sellerProfile.update).not.toHaveBeenCalled();
    });

    it('shows the payout account and history', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        ...profile,
        status: 'active',
        paystackSubaccountCode: 'ACCT_1',
        payoutBankName: 'MTN Mobile Money',
        payoutAccountLast4: '0304',
        payoutsEnabled: true,
      });
      prisma.sellerPayout.findMany.mockResolvedValue([]);
      await expect(service.listPayouts('seller-1')).resolves.toEqual({
        items: [],
        country: 'CI',
        displayName: 'Ada',
        currency: 'XOF',
        status: 'active',
        payoutsEnabled: true,
        payoutAccount: { bankName: 'MTN Mobile Money', last4: '0304' },
      });
    });
  });
});
