import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MarketplaceService } from './marketplace.service';

function p2002(target: string[]) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

const listingInput = {
  templateId: 'tmpl-1',
  title: 'My listing',
  slug: 'my-listing',
  priceCents: 1299,
};

function publishedListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    templateId: 'tmpl-1',
    sellerId: 'seller-1',
    title: 'Listed',
    priceCents: 1299,
    currency: 'USD',
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
    sellerProfile: { displayName: 'Ada', slug: 'ada', tier: 'new' },
    reviews: [],
    ...overrides,
  };
}

describe('MarketplaceService security fixes', () => {
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
    sellerProfile: { findUnique: jest.fn(), upsert: jest.fn() },
    marketplacePurchase: { findUnique: jest.fn(), create: jest.fn() },
    marketplaceLedgerEntry: { createMany: jest.fn() },
    templateReview: { create: jest.fn(), aggregate: jest.fn() },
    marketplaceDispute: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const stripe = {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  };

  let service: MarketplaceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MarketplaceService(prisma as never);
    (service as unknown as { stripe: typeof stripe }).stripe = stripe;
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma)
    );
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
        designData: { defaults: {} },
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

  describe('purchase requires Stripe (issue 3)', () => {
    beforeEach(() => {
      prisma.marketplaceTemplate.findUnique.mockResolvedValue(publishedListing());
    });

    it('fails closed when Stripe is not configured', async () => {
      (service as unknown as { stripe: null }).stripe = null;
      await expect(service.purchase('buyer-1', 'listing-1', 'pi_x')).rejects.toBeInstanceOf(
        ServiceUnavailableException
      );
    });

    it('rejects when payment has not succeeded', async () => {
      stripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_fake',
        status: 'requires_payment_method',
        amount: 1299,
        amount_received: 0,
        metadata: { listingId: 'listing-1', buyerId: 'buyer-1' },
      });

      await expect(service.purchase('buyer-1', 'listing-1', 'pi_fake')).rejects.toBeInstanceOf(
        HttpException
      );
      try {
        await service.purchase('buyer-1', 'listing-1', 'pi_fake');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        expect((err as HttpException).getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      }
      expect(prisma.marketplacePurchase.create).not.toHaveBeenCalled();
    });

    it('rejects amount mismatch', async () => {
      stripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_low',
        status: 'succeeded',
        amount: 500,
        amount_received: 500,
        metadata: { listingId: 'listing-1', buyerId: 'buyer-1' },
      });

      await expect(service.purchase('buyer-1', 'listing-1', 'pi_low')).rejects.toMatchObject({
        response: { code: 'AMOUNT_MISMATCH' },
      });
    });

    it('rejects payment bound to another listing or buyer', async () => {
      stripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_ok',
        status: 'succeeded',
        amount: 1299,
        amount_received: 1299,
        metadata: { listingId: 'listing-other', buyerId: 'buyer-1' },
      });

      await expect(service.purchase('buyer-1', 'listing-1', 'pi_ok')).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it('createPaymentIntent charges the listing price and binds buyer metadata', async () => {
      stripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_new',
        client_secret: 'secret',
      });

      const result = await service.createPaymentIntent('buyer-1', 'listing-1');
      expect(result).toEqual({ clientSecret: 'secret', paymentIntentId: 'pi_new' });
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1299,
          currency: 'usd',
          metadata: expect.objectContaining({
            type: 'marketplace',
            listingId: 'listing-1',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
          }),
        })
      );
    });

    it('creates the purchase after a matching succeeded PaymentIntent', async () => {
      stripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_ok',
        status: 'succeeded',
        amount: 1299,
        amount_received: 1299,
        metadata: { listingId: 'listing-1', buyerId: 'buyer-1' },
      });
      prisma.marketplacePurchase.create.mockResolvedValue({
        id: 'pur-1',
        stripePaymentIntentId: 'pi_ok',
      });
      prisma.marketplaceLedgerEntry.createMany.mockResolvedValue({ count: 4 });
      prisma.marketplaceTemplate.update.mockResolvedValue({});

      const purchase = await service.purchase('buyer-1', 'listing-1', 'pi_ok');
      expect(purchase.stripePaymentIntentId).toBe('pi_ok');
      expect(prisma.marketplacePurchase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stripePaymentIntentId: 'pi_ok',
            buyerId: 'buyer-1',
            amountCents: 1299,
          }),
        })
      );
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
});
