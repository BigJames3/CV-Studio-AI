import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, SellerStatus, TemplateCategory } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { appOriginFromEnv } from '../../common/utils/url.utils';
import { paymentCurrency } from '../payments/payment-env';
import { PaystackService } from '../payments/paystack.service';
import {
  PaystackApiError,
  type PaystackBank,
  type PaystackMetadata,
  type PaystackTransaction,
  metadataString,
  transactionMetadata,
} from '../payments/paystack.client';
import { emitSecurityAlert } from '../../observability/security-alert';
import { TEMPLATE_SEEDS } from '../templates/template-seeds';
import {
  MARKETPLACE_TAKE_RATE,
  estimateProcessorFeeCents,
  platformChargeCents,
  priceLimits,
  splitSale,
} from './commission';

export type MarketplaceSort = 'popular' | 'newest' | 'price_low' | 'price_high' | 'rating';

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

const TEMPLATE_CATEGORIES = new Set<string>(Object.values(TemplateCategory));

/** Layouts the editor can render: a seller design customises one of them. */
const EDITOR_TEMPLATE_KEYS: ReadonlySet<string> = new Set(
  TEMPLATE_SEEDS.map((t) => String(t.designData.key))
);

function assertRenderableDesign(designData: Record<string, unknown>) {
  const key = designData.key;
  const defaults = designData.defaults;
  if (typeof key !== 'string' || !EDITOR_TEMPLATE_KEYS.has(key)) {
    throw new BadRequestException({
      code: 'TEMPLATE_DESIGN_INVALID',
      message: `designData.key must be one of: ${[...EDITOR_TEMPLATE_KEYS].join(', ')}`,
    });
  }
  if (
    defaults !== undefined &&
    (typeof defaults !== 'object' || defaults === null || Array.isArray(defaults))
  ) {
    throw new BadRequestException({
      code: 'TEMPLATE_DESIGN_INVALID',
      message: 'designData.defaults must be an object',
    });
  }
}

function parseTemplateCategory(raw?: string): TemplateCategory | undefined {
  if (!raw || !TEMPLATE_CATEGORIES.has(raw)) return undefined;
  return raw as TemplateCategory;
}

function parseSort(raw?: string): MarketplaceSort {
  if (
    raw === 'newest' ||
    raw === 'price_low' ||
    raw === 'price_high' ||
    raw === 'rating' ||
    raw === 'popular'
  ) {
    return raw;
  }
  return 'popular';
}

function sortListings(
  raw?: string
):
  | Prisma.MarketplaceTemplateOrderByWithRelationInput
  | Prisma.MarketplaceTemplateOrderByWithRelationInput[] {
  switch (parseSort(raw)) {
    case 'newest':
      return { publishedAt: 'desc' };
    case 'price_low':
      return { priceCents: 'asc' };
    case 'price_high':
      return { priceCents: 'desc' };
    case 'rating':
      return [{ rating: 'desc' }, { reviewCount: 'desc' }];
    default:
      return [{ rating: 'desc' }, { downloadCount: 'desc' }];
  }
}

function marketplacePaymentMetadata(
  buyerId: string,
  listing: { id: string; sellerId: string; priceCents: number; currency: string },
  sellerShareCents: number | null
): PaystackMetadata {
  return {
    type: 'marketplace',
    listingId: listing.id,
    buyerId,
    sellerId: listing.sellerId,
    // What was charged, so fulfilment checks the payment against it rather than today's price.
    priceCents: listing.priceCents,
    currency: listing.currency.toUpperCase(),
    // What Paystack sends the seller's subaccount (split payment); absent when platform-held.
    sellerShareCents,
  };
}

/** Paystack's `subaccount` on a transaction, whatever shape it comes in. */
function splitSubaccount(tx: Pick<PaystackTransaction, 'subaccount'>): string | undefined {
  const sub = tx.subaccount as { subaccount_code?: string | null } | null | undefined;
  return sub?.subaccount_code ?? undefined;
}

/** `transaction.reference` (dispute) or `transaction_reference` (refund) of a webhook payload. */
function payloadTransactionReference(data: Record<string, unknown>): string | undefined {
  const direct = data.transaction_reference;
  if (typeof direct === 'string' && direct) return direct;
  const tx = data.transaction as { reference?: unknown } | undefined;
  return typeof tx?.reference === 'string' && tx.reference ? tx.reference : undefined;
}

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService
  ) {}

  listPublished(query?: { q?: string; category?: string; sort?: string }) {
    const category = parseTemplateCategory(query?.category);
    const q = query?.q?.trim();
    return this.prisma.marketplaceTemplate.findMany({
      where: {
        isPublished: true,
        status: 'published',
        sellerProfile: { is: { status: 'active' } },
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(category ? { template: { category } } : {}),
      },
      include: {
        template: { select: PUBLIC_TEMPLATE_SELECT },
        sellerProfile: { select: PUBLIC_SELLER_SELECT },
      },
      orderBy: sortListings(query?.sort),
      take: 50,
    });
  }

  async get(id: string) {
    const found = await this.prisma.marketplaceTemplate.findUnique({
      where: { id },
      include: {
        template: { select: PUBLIC_TEMPLATE_SELECT },
        sellerProfile: { select: { ...PUBLIC_SELLER_SELECT, status: true } },
        reviews: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    // Same rule as the shop: published, approved, from a seller in good standing.
    if (
      !found ||
      !found.isPublished ||
      found.status !== 'published' ||
      found.sellerProfile?.status !== 'active'
    ) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Listing not found' });
    }
    const { status: _sellerStatus, ...sellerProfile } = found.sellerProfile;
    const listing = { ...found, sellerProfile };

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
    // Buyers get this design in the editor: it must be one the editor can render.
    assertRenderableDesign(input.designData);
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
    const currency = paymentCurrency();
    const limits = priceLimits(currency);
    if (input.priceCents < limits.min || input.priceCents > limits.max) {
      throw new BadRequestException({
        code: 'INVALID_PRICE',
        message: `Price must be between ${limits.min / 100} and ${limits.max / 100} ${currency}`,
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
          currency,
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

  /**
   * Paystack payment page for a licence. With a seller subaccount the payment is split at
   * Paystack: the seller's share goes straight to their payout account.
   */
  async createListingCheckout(buyerId: string, listingId: string) {
    const listing = await this.getPublishedListing(listingId);
    await this.assertCanBuy(buyerId, listing);
    const currency = paymentCurrency();
    if (listing.currency.toUpperCase() !== currency) {
      throw new ConflictException({
        code: 'LISTING_CURRENCY_UNSUPPORTED',
        message: `This listing is priced in ${listing.currency}; payments are taken in ${currency}.`,
      });
    }
    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { email: true },
    });
    if (!buyer) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

    const paystack = this.paystack.require();
    const origin = appOriginFromEnv();
    const split = this.splitParams(listing);
    const reference = `mkt_${randomUUID().replace(/-/g, '')}`;
    let session: { authorization_url: string };
    try {
      session = await paystack.initializeTransaction({
        email: buyer.email,
        amount: listing.priceCents,
        currency,
        reference,
        // The redirect proves nothing: the page sends the reference to /payments/checkout/confirm,
        // which reads the transaction from Paystack.
        callback_url: `${origin}/marketplace/${listingId}?checkout=success`,
        metadata: {
          ...marketplacePaymentMetadata(buyerId, listing, split?.sellerShareCents ?? null),
          cancel_action: `${origin}/marketplace/${listingId}?checkout=cancel`,
        },
        ...(split
          ? {
              subaccount: split.subaccount,
              transaction_charge: split.transactionCharge,
              // The platform pays Paystack's fee out of its charge: the seller gets exactly
              // the share recorded in the ledger.
              bearer: 'account' as const,
            }
          : {}),
      });
    } catch (err) {
      this.logger.error(
        `Paystack checkout failed for listing ${listingId}`,
        err instanceof Error ? err.stack : String(err)
      );
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
        message: 'Checkout is temporarily unavailable. Please try again later.',
      });
    }

    return { url: session.authorization_url, reference };
  }

  /** Licence state of the caller for a listing (drives the buy / use buttons). */
  async licence(userId: string, listingId: string) {
    const listing = await this.prisma.marketplaceTemplate.findUnique({
      where: { id: listingId },
      select: { sellerId: true, templateId: true },
    });
    if (!listing) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Listing not found' });
    }
    if (listing.sellerId === userId) {
      return { listingId, templateId: listing.templateId, status: 'owner' as const };
    }
    const purchase = await this.prisma.marketplacePurchase.findUnique({
      where: { listingId_buyerId: { listingId, buyerId: userId } },
      select: { refundedAt: true, createdAt: true },
    });
    if (!purchase) return { listingId, templateId: null, status: 'none' as const };
    if (purchase.refundedAt) return { listingId, templateId: null, status: 'refunded' as const };
    return {
      listingId,
      templateId: listing.templateId,
      status: 'active' as const,
      purchasedAt: purchase.createdAt,
    };
  }

  /**
   * charge.success and the success-page confirmation, for a transaction read from Paystack
   * (never from the client). Idempotent: the same payment returns the existing licence; a
   * second payment for a licence the buyer already holds is reported for refund and grants
   * nothing; a payment that does not match what was asked grants nothing.
   */
  async fulfillTransaction(tx: PaystackTransaction) {
    const metadata = transactionMetadata(tx);
    const listingId = metadataString(metadata, 'listingId');
    const buyerId = metadataString(metadata, 'buyerId');
    const reference = tx.reference;
    if (metadata.type !== 'marketplace' || !listingId || !buyerId || !reference) {
      throw new Error(`Marketplace payment ${reference} has incomplete metadata`);
    }
    if (tx.status !== 'success') {
      this.logger.log(`Marketplace payment ${reference} not paid yet (${tx.status})`);
      return { outcome: 'not_paid' as const, purchase: null };
    }

    // A listing suspended or withdrawn after the payment is still delivered: the buyer paid.
    const listing = await this.prisma.marketplaceTemplate.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Listing not found' });
    }

    const expectedCents = Number(metadata.priceCents ?? listing.priceCents);
    const expectedCurrency = (
      metadataString(metadata, 'currency') ?? listing.currency
    ).toUpperCase();
    if (tx.amount !== expectedCents || tx.currency.toUpperCase() !== expectedCurrency) {
      this.logger.error(
        `Marketplace payment ${reference}: paid ${tx.amount} ${tx.currency}, expected ${expectedCents} ${expectedCurrency}`
      );
      emitSecurityAlert({
        id: 'MKT-04',
        severity: 'P1',
        message: 'Marketplace payment does not match the checkout: nothing granted',
        extra: { reference, listingId, amount: tx.amount, currency: tx.currency },
      });
      return { outcome: 'rejected' as const, purchase: null };
    }

    const existing = await this.prisma.marketplacePurchase.findUnique({
      where: { paystackReference: reference },
    });
    if (existing) return { outcome: 'already_fulfilled' as const, purchase: existing };

    const amountCents = expectedCents;
    const processorFeeCents =
      typeof tx.fees === 'number' && tx.fees >= 0
        ? tx.fees
        : estimateProcessorFeeCents(amountCents);
    const sellerShare = Number(metadata.sellerShareCents);
    const splitSettled =
      Boolean(splitSubaccount(tx)) && Number.isFinite(sellerShare) && sellerShare > 0;
    // A split payment already sent the seller the share fixed at checkout; otherwise the
    // platform holds the seller's earning.
    const sellerEarningCents = splitSettled
      ? sellerShare
      : splitSale(amountCents, processorFeeCents).sellerEarningCents;
    const platformFeeCents = amountCents - processorFeeCents - sellerEarningCents;

    try {
      const purchase = await this.prisma.$transaction(async (prisma) => {
        const purchase = await prisma.marketplacePurchase.create({
          data: {
            listingId,
            buyerId,
            amountCents,
            currency: expectedCurrency,
            paystackReference: reference,
            stripeFeeCents: processorFeeCents,
            platformFeeCents,
            sellerEarningCents,
          },
        });
        await prisma.marketplaceLedgerEntry.createMany({
          data: [
            {
              purchaseId: purchase.id,
              sellerId: listing.sellerId,
              entryType: 'charge_gross',
              amountCents,
              currency: expectedCurrency,
            },
            {
              purchaseId: purchase.id,
              sellerId: listing.sellerId,
              // Processor fee (the enum value predates Paystack).
              entryType: 'stripe_fee',
              amountCents: -processorFeeCents,
              currency: expectedCurrency,
            },
            {
              purchaseId: purchase.id,
              sellerId: listing.sellerId,
              entryType: 'platform_commission',
              amountCents: platformFeeCents,
              currency: expectedCurrency,
            },
            {
              purchaseId: purchase.id,
              sellerId: listing.sellerId,
              entryType: 'seller_earning',
              amountCents: sellerEarningCents,
              currency: expectedCurrency,
            },
            ...(splitSettled
              ? [
                  {
                    purchaseId: purchase.id,
                    sellerId: listing.sellerId,
                    entryType: 'payout' as const,
                    amountCents: sellerEarningCents,
                    currency: expectedCurrency,
                  },
                ]
              : []),
          ],
        });
        await prisma.marketplaceTemplate.update({
          where: { id: listingId },
          data: { downloadCount: { increment: 1 } },
        });
        return purchase;
      });
      return { outcome: 'fulfilled' as const, purchase };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Same payment applied concurrently (webhook and confirmation at once): already done.
      const samePayment = await this.prisma.marketplacePurchase.findUnique({
        where: { paystackReference: reference },
      });
      if (samePayment) return { outcome: 'already_fulfilled' as const, purchase: samePayment };
      // Two payments for one licence (two checkouts opened in parallel): the second one grants
      // nothing and must be refunded. Never silent.
      this.logger.error(
        `Duplicate marketplace payment ${reference} for listing ${listingId}: refund it`
      );
      emitSecurityAlert({
        id: 'MKT-01',
        severity: 'P1',
        message: 'Duplicate marketplace payment to refund',
        extra: { reference, listingId },
      });
      return { outcome: 'duplicate_payment' as const, purchase: null };
    }
  }

  /**
   * refund.processed. A full refund confirmed by Paystack revokes the licence (getDesign and
   * new CVs check refundedAt) and records the seller's share as a refund_clawback, so it is not
   * paid out (or is recovered later). Nothing is deleted. A partial refund revokes nothing
   * until a policy exists: it is reported. Idempotent on replays.
   */
  async onRefundProcessed(data: Record<string, unknown>) {
    const reference = payloadTransactionReference(data);
    if (!reference) return { outcome: 'not_marketplace' as const };
    const purchase = await this.prisma.marketplacePurchase.findUnique({
      where: { paystackReference: reference },
      select: {
        id: true,
        listingId: true,
        refundedAt: true,
        amountCents: true,
        currency: true,
        sellerEarningCents: true,
      },
    });
    if (!purchase) return { outcome: 'not_marketplace' as const };

    const refunded = Number(data.amount);
    const fullyRefunded = Number.isFinite(refunded) && refunded >= purchase.amountCents;
    if (!fullyRefunded) {
      emitSecurityAlert({
        id: 'MKT-02',
        severity: 'P2',
        message: 'Partial marketplace refund: licence kept, decide manually',
        extra: { purchaseId: purchase.id, amountRefunded: data.amount },
      });
      return { outcome: 'partial_refund_reported' as const };
    }
    if (purchase.refundedAt) return { outcome: 'already_revoked' as const };

    const listing = await this.prisma.marketplaceTemplate.findUnique({
      where: { id: purchase.listingId },
      select: { sellerId: true },
    });
    await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.marketplacePurchase.updateMany({
        where: { id: purchase.id, refundedAt: null },
        data: { refundedAt: new Date() },
      });
      if (revoked.count === 0) return; // a concurrent delivery of the same event did it
      await tx.marketplaceLedgerEntry.create({
        data: {
          purchaseId: purchase.id,
          sellerId: listing?.sellerId ?? null,
          entryType: 'refund_clawback',
          amountCents: -purchase.sellerEarningCents,
          currency: purchase.currency,
        },
      });
    });
    return { outcome: 'revoked' as const };
  }

  /**
   * charge.dispute.*: a dispute is not a refund. The licence stays active; the dispute is
   * reported so someone answers it. What a lost dispute changes is a policy decision.
   */
  async onChargeDispute(data: Record<string, unknown>, eventType: string) {
    const reference = payloadTransactionReference(data);
    if (!reference) return;
    const purchase = await this.prisma.marketplacePurchase.findUnique({
      where: { paystackReference: reference },
      select: { id: true },
    });
    if (!purchase) return;
    emitSecurityAlert({
      id: 'MKT-03',
      severity: eventType === 'charge.dispute.create' ? 'P1' : 'P2',
      message: `Marketplace payment dispute (${eventType}, ${String(data.status ?? 'unknown')})`,
      extra: { purchaseId: purchase.id, disputeId: data.id, status: data.status },
    });
  }

  /** One licence per buyer and listing; sellers never buy their own listing. */
  private async assertCanBuy(buyerId: string, listing: { id: string; sellerId: string }) {
    if (listing.sellerId === buyerId) {
      throw new ForbiddenException({
        code: 'OWN_LISTING',
        message: 'You cannot buy your own listing',
      });
    }
    const purchase = await this.prisma.marketplacePurchase.findUnique({
      where: { listingId_buyerId: { listingId: listing.id, buyerId } },
      select: { refundedAt: true },
    });
    if (purchase && !purchase.refundedAt) {
      throw new ConflictException({
        code: 'ALREADY_PURCHASED',
        message: 'You already own this licence',
      });
    }
    if (purchase) {
      // The licence row is unique per buyer and listing: a new payment could not be delivered.
      throw new ConflictException({
        code: 'REPURCHASE_UNAVAILABLE',
        message: 'This licence was refunded and cannot be bought again; contact support',
      });
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

  /** Banks and mobile money operators a seller can be paid to, in the payment currency. */
  async listPayoutBanks() {
    const currency = paymentCurrency();
    let banks: PaystackBank[];
    try {
      banks = await this.paystack.require().listBanks(currency);
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
        message: 'The list of payout accounts is unavailable. Please try again later.',
      });
    }
    return {
      currency,
      items: banks
        .filter((bank) => bank.active !== false)
        .map((bank) => ({ name: bank.name, code: bank.code, type: bank.type ?? null })),
    };
  }

  /**
   * Registers (or replaces) the seller's payout account as a Paystack subaccount. Paystack
   * checks the account; once it accepts it, the seller is active and every sale is split.
   */
  async setupPayoutAccount(userId: string, input: { bankCode: string; accountNumber: string }) {
    const paystack = this.paystack.require();
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    if (!profile) {
      throw new ForbiddenException({
        code: 'NOT_SELLER',
        message: 'Must apply as seller first',
      });
    }
    if (profile.status === SellerStatus.rejected || profile.status === SellerStatus.suspended) {
      throw new ForbiddenException({
        code: 'SELLER_BLOCKED',
        message: `Cannot set up payouts while status is ${profile.status}`,
      });
    }

    const { items } = await this.listPayoutBanks();
    const bank = items.find((b) => b.code === input.bankCode);
    if (!bank) {
      throw new BadRequestException({
        code: 'PAYOUT_BANK_UNKNOWN',
        message: 'Unknown bank or mobile money operator',
      });
    }

    let subaccountCode: string;
    try {
      const subaccount = profile.paystackSubaccountCode
        ? await paystack.updateSubaccount(profile.paystackSubaccountCode, {
            business_name: profile.displayName,
            settlement_bank: input.bankCode,
            account_number: input.accountNumber,
          })
        : await paystack.createSubaccount({
            business_name: profile.displayName,
            settlement_bank: input.bankCode,
            account_number: input.accountNumber,
            // Only a fallback: every checkout sends its own transaction_charge.
            percentage_charge: MARKETPLACE_TAKE_RATE * 100,
            primary_contact_email: profile.user.email,
            metadata: JSON.stringify({ userId, sellerProfileId: profile.id }),
          });
      const code = subaccount.subaccount_code ?? profile.paystackSubaccountCode;
      if (!code) throw new PaystackApiError('Paystack returned no subaccount code', 502);
      subaccountCode = code;
    } catch (err) {
      if (err instanceof PaystackApiError && err.isDefinitive) {
        throw new BadRequestException({
          code: 'PAYOUT_ACCOUNT_REJECTED',
          message: `Paystack refused this account: ${err.message}`,
        });
      }
      this.logger.error(
        `Payout account setup failed for seller ${userId}`,
        err instanceof Error ? err.stack : String(err)
      );
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
        message: 'Payout setup is temporarily unavailable. Please try again later.',
      });
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { id: profile.id },
      data: {
        paystackSubaccountCode: subaccountCode,
        payoutBankName: bank.name.slice(0, 120),
        payoutAccountLast4: input.accountNumber.slice(-4),
        payoutsEnabled: true,
        status: SellerStatus.active,
      },
    });
    return this.payoutAccountView(updated);
  }

  async listPayouts(userId: string) {
    const profile = await this.sellerMe(userId);
    const items = await this.prisma.sellerPayout.findMany({
      where: { sellerProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 24,
    });
    return {
      items,
      country: profile.country,
      displayName: profile.displayName,
      currency: paymentCurrency(),
      ...this.payoutAccountView(profile),
    };
  }

  private payoutAccountView(profile: {
    paystackSubaccountCode: string | null;
    payoutBankName: string | null;
    payoutAccountLast4: string | null;
    payoutsEnabled: boolean;
    status: SellerStatus;
  }) {
    return {
      status: profile.status,
      payoutsEnabled: profile.payoutsEnabled,
      payoutAccount: profile.paystackSubaccountCode
        ? { bankName: profile.payoutBankName, last4: profile.payoutAccountLast4 }
        : null,
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
      include: {
        sellerProfile: { select: { paystackSubaccountCode: true, payoutsEnabled: true } },
      },
    });
    if (!listing || !listing.isPublished) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Listing not found' });
    }
    return listing;
  }

  /** Paystack split for a listing whose seller has a payout account; null when platform-held. */
  private splitParams(listing: {
    priceCents: number;
    sellerProfile?: { paystackSubaccountCode: string | null; payoutsEnabled: boolean } | null;
  }): { subaccount: string; transactionCharge: number; sellerShareCents: number } | null {
    const subaccount = listing.sellerProfile?.paystackSubaccountCode;
    if (!subaccount || !listing.sellerProfile?.payoutsEnabled) return null;
    const transactionCharge = platformChargeCents(
      listing.priceCents,
      estimateProcessorFeeCents(listing.priceCents)
    );
    return {
      subaccount,
      transactionCharge,
      sellerShareCents: listing.priceCents - transactionCharge,
    };
  }
}
