import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, SellerStatus, TemplateCategory } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.module';
import { PRICE_MAX_CENTS, PRICE_MIN_CENTS, splitSale } from './commission';

const PUBLIC_TEMPLATE_SELECT = {
  id: true,
  name: true,
  description: true,
  previewImageUrl: true,
  category: true,
  rating: true,
  isPremium: true,
} as const;

const PUBLIC_SELLER_SELECT = {
  displayName: true,
  slug: true,
  tier: true,
} as const;

function isUniqueViolation(err: unknown, field?: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') {
    return false;
  }
  if (!field) return true;
  const target = err.meta?.target;
  if (Array.isArray(target)) return target.some((t) => String(t).includes(field));
  if (typeof target === 'string') return target.includes(field);
  return true;
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key && !key.includes('xxx')) {
      this.stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
    }
  }

  listPublished(query?: { q?: string; category?: string }) {
    return this.prisma.marketplaceTemplate.findMany({
      where: {
        isPublished: true,
        status: 'published',
        ...(query?.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' } },
                { description: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        template: { select: PUBLIC_TEMPLATE_SELECT },
        sellerProfile: { select: PUBLIC_SELLER_SELECT },
      },
      orderBy: [{ rating: 'desc' }, { downloadCount: 'desc' }],
      take: 50,
    });
  }

  async get(id: string) {
    const listing = await this.prisma.marketplaceTemplate.findUnique({
      where: { id },
      include: {
        template: { select: PUBLIC_TEMPLATE_SELECT },
        sellerProfile: { select: PUBLIC_SELLER_SELECT },
        reviews: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!listing || !listing.isPublished) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Listing not found' });
    }

    try {
      await this.prisma.marketplaceTemplate.update({
        where: { id },
        data: { impressionCount: { increment: 1 } },
      });
    } catch (err) {
      this.logger.error(
        'Impression tracking failed',
        err instanceof Error ? err.stack : String(err)
      );
      return listing;
    }

    return { ...listing, impressionCount: listing.impressionCount + 1 };
  }

  async getDesign(userId: string, listingId: string) {
    const listing = await this.prisma.marketplaceTemplate.findUnique({
      where: { id: listingId },
      include: {
        template: { select: { id: true, createdBy: true, designData: true } },
      },
    });
    if (!listing) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Listing not found' });
    }

    const isOwner = listing.sellerId === userId || listing.template.createdBy === userId;
    const purchase = isOwner
      ? null
      : await this.prisma.marketplacePurchase.findUnique({
          where: { listingId_buyerId: { listingId, buyerId: userId } },
        });

    if (!isOwner && (!purchase || purchase.refundedAt)) {
      throw new ForbiddenException({
        code: 'PURCHASE_REQUIRED',
        message: 'Purchase required to view template design',
      });
    }

    return {
      listingId,
      templateId: listing.templateId,
      designData: listing.template.designData,
    };
  }

  async applySeller(
    userId: string,
    input: { displayName: string; slug: string; country: string; bio?: string }
  ) {
    return this.prisma.sellerProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: input.displayName,
        slug: input.slug,
        country: input.country,
        bio: input.bio,
        tosAcceptedAt: new Date(),
        status: 'pending_kyc',
      },
      update: {
        displayName: input.displayName,
        bio: input.bio,
      },
    });
  }

  async sellerMe(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({ code: 'NOT_SELLER', message: 'Seller profile not found' });
    }
    return profile;
  }

  async listMyTemplates(userId: string) {
    const items = await this.prisma.template.findMany({
      where: { createdBy: userId },
      select: { id: true, name: true, category: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    return { items };
  }

  async createSellerTemplate(
    userId: string,
    input: {
      name: string;
      description: string;
      category: TemplateCategory;
      previewImageUrl: string;
      designData: Record<string, unknown>;
    }
  ) {
    return this.prisma.template.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        previewImageUrl: input.previewImageUrl,
        designData: input.designData as Prisma.InputJsonValue,
        createdBy: userId,
        isPublished: false,
        isPremium: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        previewImageUrl: true,
        createdBy: true,
        isPublished: true,
      },
    });
  }

  async submitListing(
    userId: string,
    input: {
      templateId: string;
      title: string;
      slug: string;
      description?: string;
      priceCents: number;
      tags?: string[];
    }
  ) {
    if (input.priceCents < PRICE_MIN_CENTS || input.priceCents > PRICE_MAX_CENTS) {
      throw new BadRequestException({
        code: 'INVALID_PRICE',
        message: `Price must be between ${PRICE_MIN_CENTS} and ${PRICE_MAX_CENTS} cents`,
      });
    }

    const profile = await this.requireActiveSeller(userId);
    const template = await this.prisma.template.findUnique({
      where: { id: input.templateId },
      select: { id: true, createdBy: true },
    });
    if (!template) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Template not found' });
    }
    if (template.createdBy !== userId) {
      throw new ForbiddenException({
        code: 'NOT_OWNER',
        message: 'You can only list your own templates',
      });
    }

    try {
      return await this.prisma.marketplaceTemplate.create({
        data: {
          templateId: input.templateId,
          sellerId: userId,
          sellerProfileId: profile.id,
          title: input.title,
          slug: input.slug,
          description: input.description,
          priceCents: input.priceCents,
          tags: input.tags ?? [],
          status: 'submitted',
          isPublished: false,
          moderations: { create: {} },
        },
      });
    } catch (err) {
      if (isUniqueViolation(err, 'template_id') || isUniqueViolation(err, 'templateId')) {
        throw new ConflictException({
          code: 'TEMPLATE_ALREADY_LISTED',
          message: 'This template is already listed',
        });
      }
      if (isUniqueViolation(err, 'slug')) {
        throw new ConflictException({
          code: 'SLUG_TAKEN',
          message: 'This listing slug is already taken',
        });
      }
      if (isUniqueViolation(err)) {
        throw new ConflictException({
          code: 'TEMPLATE_ALREADY_LISTED',
          message: 'This template is already listed',
        });
      }
      throw err;
    }
  }

  async createPaymentIntent(buyerId: string, listingId: string) {
    const stripe = this.requireStripe();
    const listing = await this.getPublishedListing(listingId);

    const intent = await stripe.paymentIntents.create({
      amount: listing.priceCents,
      currency: listing.currency.toLowerCase(),
      metadata: {
        type: 'marketplace',
        listingId,
        buyerId,
        sellerId: listing.sellerId,
      },
      automatic_payment_methods: { enabled: true },
    });

    return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  }

  async purchase(buyerId: string, listingId: string, paymentIntentId: string) {
    const stripe = this.requireStripe();
    const listing = await this.getPublishedListing(listingId);

    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      throw new BadRequestException({
        code: 'INVALID_PAYMENT',
        message: 'Payment intent not found',
      });
    }

    if (intent.status !== 'succeeded') {
      throw new HttpException(
        { code: 'PAYMENT_REQUIRED', message: 'Payment not completed' },
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    const paid = intent.amount_received || intent.amount;
    if (paid !== listing.priceCents) {
      throw new BadRequestException({
        code: 'AMOUNT_MISMATCH',
        message: 'Payment amount does not match listing price',
      });
    }
    if (intent.metadata?.listingId !== listingId || intent.metadata?.buyerId !== buyerId) {
      throw new BadRequestException({
        code: 'PAYMENT_MISMATCH',
        message: 'Payment does not match this listing or buyer',
      });
    }

    const amountCents = listing.priceCents;
    const stripeFeeCents = Math.round(amountCents * 0.029) + 30;
    const { platformFeeCents, sellerEarningCents } = splitSale(amountCents, stripeFeeCents);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const purchase = await tx.marketplacePurchase.create({
          data: {
            listingId,
            buyerId,
            amountCents,
            currency: listing.currency,
            stripePaymentIntentId: paymentIntentId,
            stripeFeeCents,
            platformFeeCents,
            sellerEarningCents,
          },
        });
        await tx.marketplaceLedgerEntry.createMany({
          data: [
            {
              purchaseId: purchase.id,
              sellerId: listing.sellerId,
              entryType: 'charge_gross',
              amountCents,
            },
            {
              purchaseId: purchase.id,
              sellerId: listing.sellerId,
              entryType: 'stripe_fee',
              amountCents: -stripeFeeCents,
            },
            {
              purchaseId: purchase.id,
              sellerId: listing.sellerId,
              entryType: 'platform_commission',
              amountCents: platformFeeCents,
            },
            {
              purchaseId: purchase.id,
              sellerId: listing.sellerId,
              entryType: 'seller_earning',
              amountCents: sellerEarningCents,
            },
          ],
        });
        await tx.marketplaceTemplate.update({
          where: { id: listingId },
          data: { downloadCount: { increment: 1 } },
        });
        return purchase;
      });
    } catch (err) {
      if (isUniqueViolation(err, 'stripe_payment_intent_id')) {
        throw new ConflictException({
          code: 'PAYMENT_ALREADY_USED',
          message: 'This payment was already applied',
        });
      }
      if (isUniqueViolation(err)) {
        throw new ConflictException({ code: 'ALREADY_PURCHASED', message: 'Already owned' });
      }
      throw err;
    }
  }

  async addReview(
    reviewerId: string,
    listingId: string,
    input: { rating: number; comment?: string }
  ) {
    if (input.rating < 1 || input.rating > 5) {
      throw new BadRequestException({ code: 'INVALID_RATING', message: 'Rating 1–5' });
    }
    const owned = await this.prisma.marketplacePurchase.findUnique({
      where: { listingId_buyerId: { listingId, buyerId: reviewerId } },
    });
    if (!owned || owned.refundedAt) {
      throw new BadRequestException({
        code: 'NOT_ELIGIBLE',
        message: 'Purchase required to review',
      });
    }
    const review = await this.prisma.templateReview.create({
      data: {
        marketplaceTemplateId: listingId,
        reviewerId,
        rating: input.rating,
        comment: input.comment,
      },
    });
    const agg = await this.prisma.templateReview.aggregate({
      where: { marketplaceTemplateId: listingId },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.marketplaceTemplate.update({
      where: { id: listingId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviewCount: agg._count,
      },
    });
    return review;
  }

  async openDispute(
    buyerId: string,
    purchaseId: string,
    input: { type: 'quality' | 'access' | 'billing' | 'ip'; reason: string }
  ) {
    const purchase = await this.prisma.marketplacePurchase.findFirst({
      where: { id: purchaseId, buyerId },
    });
    if (!purchase) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Purchase not found' });
    }
    return this.prisma.marketplaceDispute.create({
      data: {
        purchaseId,
        listingId: purchase.listingId,
        buyerId,
        type: input.type,
        reason: input.reason,
      },
    });
  }

  async sales(sellerId: string) {
    const listings = await this.prisma.marketplaceTemplate.findMany({
      where: { sellerId },
      include: {
        _count: { select: { reviews: true } },
        purchases: {
          select: {
            amountCents: true,
            sellerEarningCents: true,
            platformFeeCents: true,
            createdAt: true,
          },
        },
      },
    });

    const revenueCents = listings.reduce(
      (sum, l) => sum + l.purchases.reduce((s, p) => s + p.amountCents, 0),
      0
    );
    const sellerShareCents = listings.reduce(
      (sum, l) => sum + l.purchases.reduce((s, p) => s + p.sellerEarningCents, 0),
      0
    );

    return {
      listings,
      revenueCents,
      takeRatePercent: 30,
      sellerShareCents,
    };
  }

  async sellerAnalytics(userId: string) {
    const sales = await this.sales(userId);
    const impressions = sales.listings.reduce((s, l) => s + l.impressionCount, 0);
    const purchases = sales.listings.reduce((s, l) => s + l.purchases.length, 0);
    return {
      ...sales,
      impressions,
      purchases,
      conversionRate: impressions ? purchases / impressions : 0,
    };
  }

  private async requireActiveSeller(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new ForbiddenException({
        code: 'NOT_SELLER',
        message: 'Must apply as seller first',
      });
    }
    if (profile.status !== SellerStatus.active) {
      throw new ForbiddenException({
        code: 'SELLER_NOT_ACTIVE',
        message: `Cannot list while status is ${profile.status}. Complete KYC first.`,
      });
    }
    return profile;
  }

  private async getPublishedListing(listingId: string) {
    const listing = await this.prisma.marketplaceTemplate.findUnique({
      where: { id: listingId },
    });
    if (!listing || !listing.isPublished) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Listing not found' });
    }
    return listing;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured. Marketplace purchases are unavailable.',
      });
    }
    return this.stripe;
  }
}
