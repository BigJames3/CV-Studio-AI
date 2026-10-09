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
import { Prisma, SellerStatus, SellerTier, TemplateCategory } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.module';
import { appOriginFromEnv } from '../../common/utils/url.utils';
import { stripeSecretForClient } from '../payments/payment-env';
import { lockUserScope } from '../../common/utils/user-lock';
import { emitSecurityAlert } from '../../observability/security-alert';
import { TEMPLATE_SEEDS } from '../templates/template-seeds';
import {
  PAYOUT_MIN_CENTS,
  PRICE_MAX_CENTS,
  PRICE_MIN_CENTS,
  destinationApplicationFeeCents,
  estimateStripeFeeCents,
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
  listing: { id: string; sellerId: string; priceCents: number; currency: string }
): Stripe.MetadataParam {
  return {
    type: 'marketplace',
    listingId: listing.id,
    buyerId,
    sellerId: listing.sellerId,
    // What was charged, so fulfilment checks the payment against it rather than today's price.
    priceCents: String(listing.priceCents),
    currency: listing.currency.toLowerCase(),
  };
}

/** A pending payout older than this was abandoned (crash, timeout) and is resumed. */
const PAYOUT_RESUME_AFTER_MS = 10 * 60 * 1000;

/** Stripe answered and refused: nothing was transferred, retrying the same call cannot help. */
function isDefinitiveStripeRefusal(err: unknown): boolean {
  return (
    err instanceof Stripe.errors.StripeInvalidRequestError ||
    err instanceof Stripe.errors.StripePermissionError ||
    err instanceof Stripe.errors.StripeCardError
  );
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
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {
    const key = stripeSecretForClient();
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
    }
  }

  listPublished(query?: { q?: string; category?: string; sort?: string }) {
    const category = parseTemplateCategory(query?.category);
    const q = query?.q?.trim();
    return this.prisma.marketplaceTemplate.findMany({
      where: {
        isPublished: true,
        status: 'published',
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
    await this.assertCanBuy(buyerId, listing);
    const metadata = marketplacePaymentMetadata(buyerId, listing);
    const stripeCustomerId = await this.existingStripeCustomerId(buyerId);

    const intent = await stripe.paymentIntents.create({
      amount: listing.priceCents,
      currency: listing.currency.toLowerCase(),
      metadata,
      automatic_payment_methods: { enabled: true },
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      ...this.destinationChargeParams(listing),
    });

    return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  }

  async createListingCheckout(buyerId: string, listingId: string) {
    const stripe = this.requireStripe();
    const listing = await this.getPublishedListing(listingId);
    await this.assertCanBuy(buyerId, listing);
    const origin = appOriginFromEnv();
    const metadata = marketplacePaymentMetadata(buyerId, listing);
    const destination = this.destinationChargeParams(listing);
    const stripeCustomerId = await this.existingStripeCustomerId(buyerId);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: buyerId,
      // The redirect proves nothing: the page sends session_id back to /payments/checkout/confirm,
      // which reads the session from Stripe.
      success_url: `${origin}/marketplace/${listingId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/marketplace/${listingId}?checkout=cancel`,
      metadata,
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      payment_intent_data: {
        metadata,
        ...destination,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: listing.currency.toLowerCase(),
            unit_amount: listing.priceCents,
            product_data: {
              name: listing.title,
              description: 'Licence d’usage personnelle dans CV Studio — non redistribuable',
            },
          },
        },
      ],
    });

    if (!session.url) {
      throw new BadRequestException({
        code: 'CHECKOUT_FAILED',
        message: 'Stripe did not return a checkout URL',
      });
    }

    return { url: session.url, sessionId: session.id };
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
   * checkout.session.completed / async_payment_succeeded, and the success-page confirmation.
   * Returns null when the session is not paid yet (asynchronous payment methods).
   */
  async fulfillCheckoutSession(session: Stripe.Checkout.Session) {
    const listingId = session.metadata?.listingId;
    const buyerId = session.metadata?.buyerId ?? session.client_reference_id ?? undefined;
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!listingId || !buyerId || !paymentIntentId) {
      throw new Error(
        `marketplace checkout.session.completed missing listing, buyer, or payment (session=${session.id})`
      );
    }
    if (session.payment_status !== 'paid') {
      this.logger.log(
        `Marketplace checkout ${session.id} not paid yet (${session.payment_status})`
      );
      return null;
    }

    return this.fulfillPayment(buyerId, listingId, paymentIntentId);
  }

  /** Client-side confirmation of a PaymentIntent (Elements flow). */
  async purchase(buyerId: string, listingId: string, paymentIntentId: string) {
    const result = await this.fulfillPayment(buyerId, listingId, paymentIntentId);
    if (result.outcome === 'duplicate_payment') {
      throw new ConflictException({
        code: 'ALREADY_PURCHASED',
        message: 'You already own this licence; this payment will be refunded by support',
      });
    }
    return result.purchase;
  }

  /**
   * Grants the licence for a payment read from Stripe, never from the client. Idempotent:
   * the same payment returns the existing licence; a second payment for a licence the buyer
   * already holds is reported for refund and grants nothing.
   */
  private async fulfillPayment(buyerId: string, listingId: string, paymentIntentId: string) {
    const stripe = this.requireStripe();
    // A listing suspended or withdrawn after the payment is still delivered: the buyer paid.
    const listing = await this.prisma.marketplaceTemplate.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Listing not found' });
    }

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
    if (
      intent.metadata?.type !== 'marketplace' ||
      intent.metadata?.listingId !== listingId ||
      intent.metadata?.buyerId !== buyerId
    ) {
      throw new BadRequestException({
        code: 'PAYMENT_MISMATCH',
        message: 'Payment does not match this listing or buyer',
      });
    }
    const expectedCents = Number(intent.metadata?.priceCents ?? listing.priceCents);
    const expectedCurrency = (intent.metadata?.currency ?? listing.currency).toLowerCase();
    if (intent.amount_received !== expectedCents || intent.amount !== expectedCents) {
      throw new BadRequestException({
        code: 'AMOUNT_MISMATCH',
        message: 'Payment amount does not match listing price',
      });
    }
    if (intent.currency.toLowerCase() !== expectedCurrency) {
      throw new BadRequestException({
        code: 'CURRENCY_MISMATCH',
        message: 'Payment currency does not match listing currency',
      });
    }

    const existing = await this.prisma.marketplacePurchase.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (existing) return { outcome: 'already_fulfilled' as const, purchase: existing };

    const amountCents = expectedCents;
    const stripeFeeCents = estimateStripeFeeCents(amountCents);
    const { platformFeeCents, sellerEarningCents } = splitSale(amountCents, stripeFeeCents);
    const destinationSettled = Boolean(intent.transfer_data?.destination);

    try {
      const purchase = await this.prisma.$transaction(async (tx) => {
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
            ...(destinationSettled
              ? [
                  {
                    purchaseId: purchase.id,
                    sellerId: listing.sellerId,
                    entryType: 'payout' as const,
                    amountCents: sellerEarningCents,
                  },
                ]
              : []),
          ],
        });
        await tx.marketplaceTemplate.update({
          where: { id: listingId },
          data: { downloadCount: { increment: 1 } },
        });
        return purchase;
      });
      return { outcome: 'fulfilled' as const, purchase };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Same payment applied concurrently (webhook and confirmation at once): already done.
      const sameIntent = await this.prisma.marketplacePurchase.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
      });
      if (sameIntent) return { outcome: 'already_fulfilled' as const, purchase: sameIntent };
      // Two payments for one licence (two checkouts opened in parallel): the second one grants
      // nothing and must be refunded. Never silent.
      this.logger.error(
        `Duplicate marketplace payment ${paymentIntentId} for listing ${listingId}: refund it`
      );
      emitSecurityAlert({
        id: 'MKT-01',
        severity: 'P1',
        message: 'Duplicate marketplace payment to refund',
        extra: { paymentIntentId, listingId },
      });
      return { outcome: 'duplicate_payment' as const, purchase: null };
    }
  }

  /**
   * charge.refunded. A full refund confirmed by Stripe revokes the licence (getDesign and new
   * CVs check refundedAt) and records the seller's share as a refund_clawback, so it is not
   * paid out (or is recovered from later payouts). Nothing is deleted. A partial refund
   * revokes nothing until a policy exists: it is reported. Idempotent on replays.
   */
  async onChargeRefunded(charge: Stripe.Charge) {
    const paymentIntentId =
      typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return { outcome: 'not_marketplace' as const };
    const purchase = await this.prisma.marketplacePurchase.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      select: { id: true, listingId: true, refundedAt: true, sellerEarningCents: true },
    });
    if (!purchase) return { outcome: 'not_marketplace' as const };

    const fullyRefunded = charge.refunded || charge.amount_refunded >= charge.amount;
    if (!fullyRefunded) {
      emitSecurityAlert({
        id: 'MKT-02',
        severity: 'P2',
        message: 'Partial marketplace refund: licence kept, decide manually',
        extra: { purchaseId: purchase.id, amountRefunded: charge.amount_refunded },
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
        },
      });
    });
    return { outcome: 'revoked' as const };
  }

  /**
   * charge.dispute.*: a dispute is not a refund. The licence stays active; the dispute is
   * reported so someone answers it. What a lost dispute changes is a policy decision.
   */
  async onChargeDispute(dispute: Stripe.Dispute, eventType: string) {
    const paymentIntentId =
      typeof dispute.payment_intent === 'string'
        ? dispute.payment_intent
        : dispute.payment_intent?.id;
    if (!paymentIntentId) return;
    const purchase = await this.prisma.marketplacePurchase.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      select: { id: true },
    });
    if (!purchase) return;
    emitSecurityAlert({
      id: 'MKT-03',
      severity: eventType === 'charge.dispute.created' ? 'P1' : 'P2',
      message: `Marketplace payment dispute (${eventType}, ${dispute.status})`,
      extra: { purchaseId: purchase.id, disputeId: dispute.id, status: dispute.status },
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

  /**
   * Stripe Node 17 has no Accounts v2 client. Express + Account Links matches ADR-019
   * until the SDK is upgraded to `/v2/core/accounts` (dashboard express, platform
   * fee collection, platform negative-balance liability, recipient transfers).
   */
  async startConnectOnboarding(userId: string) {
    const stripe = this.requireStripe();
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new ForbiddenException({
        code: 'NOT_SELLER',
        message: 'Must apply as seller first',
      });
    }
    if (profile.status === SellerStatus.rejected || profile.status === SellerStatus.suspended) {
      throw new ForbiddenException({
        code: 'SELLER_BLOCKED',
        message: `Cannot onboard while status is ${profile.status}`,
      });
    }

    let accountId = profile.stripeAccountId;
    if (!accountId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      const account = await stripe.accounts.create({
        type: 'express',
        country: profile.country.toUpperCase(),
        email: user?.email,
        capabilities: { transfers: { requested: true } },
        metadata: { userId, sellerProfileId: profile.id },
      });
      accountId = account.id;
      await this.prisma.sellerProfile.update({
        where: { id: profile.id },
        data: { stripeAccountId: accountId },
      });
    }

    const origin = appOriginFromEnv();
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/seller/payouts?onboarding=refresh`,
      return_url: `${origin}/seller/payouts?onboarding=return`,
      type: 'account_onboarding',
    });
    if (!link.url) {
      throw new BadRequestException({
        code: 'CONNECT_LINK_FAILED',
        message: 'Stripe did not return an onboarding URL',
      });
    }
    return { url: link.url };
  }

  async refreshConnectAccount(userId: string) {
    const stripe = this.requireStripe();
    const profile = await this.sellerMe(userId);
    if (!profile.stripeAccountId) {
      throw new BadRequestException({
        code: 'CONNECT_NOT_STARTED',
        message: 'Start payouts onboarding first',
      });
    }
    const account = await stripe.accounts.retrieve(profile.stripeAccountId);
    return this.applyConnectCapabilities(profile, account);
  }

  async syncConnectedAccountFromWebhook(account: Stripe.Account) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { stripeAccountId: account.id },
    });
    if (!profile) return null;
    return this.applyConnectCapabilities(profile, account);
  }

  async createConnectLoginLink(userId: string) {
    const stripe = this.requireStripe();
    const profile = await this.sellerMe(userId);
    if (!profile.stripeAccountId || !profile.payoutsEnabled) {
      throw new BadRequestException({
        code: 'CONNECT_NOT_READY',
        message: 'Complete payouts verification first',
      });
    }
    const link = await stripe.accounts.createLoginLink(profile.stripeAccountId);
    if (!link.url) {
      throw new BadRequestException({
        code: 'CONNECT_LINK_FAILED',
        message: 'Stripe did not return a dashboard URL',
      });
    }
    return { url: link.url };
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
      status: profile.status,
      payoutsEnabled: profile.payoutsEnabled,
      country: profile.country,
      displayName: profile.displayName,
    };
  }

  /**
   * Pays platform-held seller earnings to connected accounts (min $25, hold window), in two
   * phases so no crash, retry or second pod can send a payout twice:
   * 1. under a per-seller advisory lock, record a `pending` payout for the available balance
   *    (refused while another one is pending);
   * 2. send the transfer with the payout id as idempotency key and transfer_group;
   * 3. mark it paid and write its ledger row.
   * A payout left pending (crash, timeout, database down after Stripe answered) is resumed on
   * a later run: Stripe is first asked for a transfer in its group, and only if there is none
   * is it sent, with the same key. Destination charges already wrote their `payout` row at
   * purchase and are not paid again.
   */
  async processWeeklyPayouts(now = new Date()) {
    const stripe = this.requireStripe();
    const sellers = await this.prisma.sellerProfile.findMany({
      where: {
        status: SellerStatus.active,
        payoutsEnabled: true,
        stripeAccountId: { not: null },
      },
      include: { user: { select: { email: true } } },
    });

    const paid: Array<{
      sellerId: string;
      email: string;
      amountCents: number;
      transferId: string;
    }> = [];

    for (const seller of sellers) {
      if (!seller.stripeAccountId) continue;
      try {
        const done = await this.payoutSeller(stripe, seller, seller.stripeAccountId, now);
        if (done) paid.push({ sellerId: seller.userId, email: seller.user.email, ...done });
      } catch (err) {
        this.logger.error(
          `Weekly payout failed for seller ${seller.userId}`,
          err instanceof Error ? err.stack : String(err)
        );
      }
    }

    return { paidCount: paid.length, payouts: paid };
  }

  private async payoutSeller(
    stripe: Stripe,
    seller: { id: string; userId: string; tier: SellerTier },
    destination: string,
    now: Date
  ): Promise<{ amountCents: number; transferId: string } | null> {
    const holdDays = seller.tier === SellerTier.new ? 14 : 7;
    const cutoff = new Date(now.getTime() - holdDays * 24 * 60 * 60 * 1000);

    // Phase 1: one pending payout per seller, decided under a lock shared by every pod.
    const reserved = await this.prisma.$transaction(async (tx) => {
      await lockUserScope(tx, seller.userId, 'marketplace:payout');
      const pending = await tx.sellerPayout.findFirst({
        where: { sellerProfileId: seller.id, status: { in: ['pending', 'in_transit'] } },
        orderBy: { createdAt: 'asc' },
      });
      if (pending) return { payout: pending, resumed: true };

      const available = await this.availableForPayout(tx, seller.userId, cutoff);
      if (available < PAYOUT_MIN_CENTS) return null;
      const payout = await tx.sellerPayout.create({
        data: {
          sellerProfileId: seller.id,
          amountCents: available,
          currency: 'USD',
          status: 'pending',
          periodStart: cutoff,
          periodEnd: now,
        },
      });
      return { payout, resumed: false };
    });
    if (!reserved) return null;
    const { payout, resumed } = reserved;
    // A young pending payout is another pod's, still in flight.
    if (resumed && now.getTime() - payout.createdAt.getTime() < PAYOUT_RESUME_AFTER_MS) {
      return null;
    }

    // Phase 2: the transfer, at most once per payout.
    const transferGroup = `payout_${payout.id}`;
    let transfer: Stripe.Transfer | undefined;
    try {
      if (resumed) {
        const found = await stripe.transfers.list({ transfer_group: transferGroup, limit: 1 });
        transfer = found.data[0];
      }
      transfer ??= await stripe.transfers.create(
        {
          amount: payout.amountCents,
          currency: 'usd',
          destination,
          transfer_group: transferGroup,
          metadata: {
            type: 'marketplace_payout',
            payoutId: payout.id,
            sellerId: seller.userId,
            sellerProfileId: seller.id,
          },
        },
        { idempotencyKey: `seller-payout:${payout.id}` }
      );
    } catch (err) {
      if (isDefinitiveStripeRefusal(err)) {
        // Stripe refused it: no money moved, the balance stays available for the next run.
        await this.prisma.sellerPayout.updateMany({
          where: { id: payout.id, status: 'pending' },
          data: { status: 'failed' },
        });
        this.logger.error(
          `Payout ${payout.id} refused by Stripe for seller ${seller.userId}`,
          err instanceof Error ? err.stack : String(err)
        );
        return null;
      }
      // Unknown outcome (network, timeout, 5xx, key in use): stays pending, resumed later.
      this.logger.warn(`Payout ${payout.id} outcome unknown, left pending: ${String(err)}`);
      return null;
    }

    // Phase 3: record it. If this fails the payout stays pending and is resumed (and found).
    const finalized = await this.prisma.$transaction(async (tx) => {
      const marked = await tx.sellerPayout.updateMany({
        where: { id: payout.id, status: { in: ['pending', 'in_transit'] } },
        data: { status: 'paid', stripeTransferId: transfer.id, paidAt: now },
      });
      if (marked.count === 0) return false;
      await tx.marketplaceLedgerEntry.create({
        data: {
          payoutId: payout.id,
          sellerId: seller.userId,
          entryType: 'payout',
          amountCents: payout.amountCents,
          currency: 'USD',
        },
      });
      return true;
    });
    return finalized ? { amountCents: payout.amountCents, transferId: transfer.id } : null;
  }

  /**
   * Earnings past the hold window, minus what was already paid (weekly payouts and
   * destination charges) and minus refunds of platform-held sales.
   */
  private async availableForPayout(
    tx: Prisma.TransactionClient,
    sellerId: string,
    cutoff: Date
  ): Promise<number> {
    const [earned, clawedBack, alreadyPaid] = await Promise.all([
      tx.marketplaceLedgerEntry.aggregate({
        where: { sellerId, entryType: 'seller_earning', createdAt: { lt: cutoff } },
        _sum: { amountCents: true },
      }),
      // Destination charges are refunded with the transfer reversed: not clawed back here.
      tx.marketplaceLedgerEntry.aggregate({
        where: {
          sellerId,
          entryType: 'refund_clawback',
          purchase: { ledger: { none: { entryType: 'payout' } } },
        },
        _sum: { amountCents: true },
      }),
      tx.marketplaceLedgerEntry.aggregate({
        where: { sellerId, entryType: 'payout' },
        _sum: { amountCents: true },
      }),
    ]);
    return (
      (earned._sum.amountCents ?? 0) +
      (clawedBack._sum.amountCents ?? 0) -
      (alreadyPaid._sum.amountCents ?? 0)
    );
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
        sellerProfile: { select: { stripeAccountId: true, payoutsEnabled: true } },
      },
    });
    if (!listing || !listing.isPublished) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Listing not found' });
    }
    return listing;
  }

  private async applyConnectCapabilities(
    profile: { id: string; status: SellerStatus },
    account: Stripe.Account
  ) {
    const ready = Boolean(account.payouts_enabled) && Boolean(account.details_submitted);
    const blocked =
      profile.status === SellerStatus.rejected || profile.status === SellerStatus.suspended;
    const status = blocked
      ? profile.status
      : ready
        ? SellerStatus.active
        : SellerStatus.pending_kyc;

    return this.prisma.sellerProfile.update({
      where: { id: profile.id },
      data: { payoutsEnabled: ready, status },
    });
  }

  private destinationChargeParams(listing: {
    priceCents: number;
    sellerProfile?: { stripeAccountId: string | null; payoutsEnabled: boolean } | null;
  }): Pick<Stripe.PaymentIntentCreateParams, 'transfer_data' | 'application_fee_amount'> {
    const accountId = listing.sellerProfile?.stripeAccountId;
    if (!accountId || !listing.sellerProfile?.payoutsEnabled) {
      return {};
    }
    const stripeFeeCents = estimateStripeFeeCents(listing.priceCents);
    return {
      transfer_data: { destination: accountId },
      application_fee_amount: destinationApplicationFeeCents(listing.priceCents, stripeFeeCents),
    };
  }

  private async existingStripeCustomerId(userId: string): Promise<string | undefined> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    });
    return sub?.stripeCustomerId ?? undefined;
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
