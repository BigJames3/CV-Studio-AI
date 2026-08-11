import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module';
import { PRICE_MAX_CENTS, PRICE_MIN_CENTS, splitSale } from './commission';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

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
        template: {
          select: {
            id: true,
            name: true,
            previewImageUrl: true,
            category: true,
            rating: true,
          },
        },
        sellerProfile: {
          select: { displayName: true, slug: true, tier: true },
        },
      },
      orderBy: [{ rating: 'desc' }, { downloadCount: 'desc' }],
      take: 50,
    });
  }

  async get(id: string) {
    const listing = await this.prisma.marketplaceTemplate.findUnique({
      where: { id },
      include: {
        template: true,
        sellerProfile: true,
        reviews: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!listing || !listing.isPublished) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Listing not found' });
    }
    return listing;
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
    const profile = await this.sellerMe(userId);
    return this.prisma.marketplaceTemplate.create({
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
  }

  async purchase(buyerId: string, listingId: string) {
    const listing = await this.get(listingId);
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
    } catch {
      throw new ConflictException({ code: 'ALREADY_PURCHASED', message: 'Already owned' });
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
}
