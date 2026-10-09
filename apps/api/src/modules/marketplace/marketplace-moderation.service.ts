import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingStatus, ModerationDecision, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';

type Decision = {
  decision: ModerationDecision;
  /** Statuses a listing may be in for this decision. */
  from: ListingStatus[];
  to: ListingStatus;
  isPublished: boolean;
};

const DECISIONS = {
  approve: {
    decision: 'approve',
    from: ['submitted', 'in_review', 'changes_requested', 'suspended'],
    to: 'published',
    isPublished: true,
  },
  request_changes: {
    decision: 'request_changes',
    from: ['submitted', 'in_review'],
    to: 'changes_requested',
    isPublished: false,
  },
  reject: {
    decision: 'reject',
    from: ['submitted', 'in_review', 'changes_requested'],
    to: 'rejected',
    isPublished: false,
  },
  suspend: {
    decision: 'suspend',
    from: ['published'],
    to: 'suspended',
    isPublished: false,
  },
} satisfies Record<ModerationDecision, Decision>;

/** Statuses a seller may send back to review. */
const RESUBMITTABLE: ListingStatus[] = ['unpublished', 'changes_requested', 'rejected'];

/**
 * Listing lifecycle. Only a moderator publishes; a seller can withdraw a published listing
 * or send it back to review. Purchases and the sales ledger are never touched: buyers keep
 * the licences they paid for when a listing is withdrawn or suspended.
 */
@Injectable()
export class MarketplaceModerationService {
  constructor(private readonly prisma: PrismaService) {}

  listForReview(status: ListingStatus = 'submitted') {
    return this.prisma.marketplaceTemplate.findMany({
      where: { status },
      orderBy: { updatedAt: 'asc' },
      take: 100,
      include: {
        template: {
          select: { id: true, name: true, category: true, previewImageUrl: true, designData: true },
        },
        sellerProfile: { select: { displayName: true, slug: true, status: true, tier: true } },
        moderations: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
  }

  async decide(
    reviewerId: string,
    listingId: string,
    kind: ModerationDecision,
    input: { reasonCode?: string; notes?: string }
  ) {
    const rule = DECISIONS[kind];
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.marketplaceTemplate.findUnique({
        where: { id: listingId },
        select: { id: true, status: true, sellerId: true, publishedAt: true },
      });
      if (!listing) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Listing not found' });
      }
      if (listing.sellerId === reviewerId) {
        throw new ForbiddenException({
          code: 'OWN_LISTING',
          message: 'A moderator cannot decide on their own listing',
        });
      }

      // Conditional update: two moderators deciding at once cannot both apply a transition.
      const updated = await tx.marketplaceTemplate.updateMany({
        where: { id: listingId, status: { in: rule.from } },
        data: {
          status: rule.to,
          isPublished: rule.isPublished,
          ...(rule.to === 'published' && !listing.publishedAt ? { publishedAt: now } : {}),
        },
      });
      if (updated.count === 0) {
        throw new ConflictException({
          code: 'INVALID_TRANSITION',
          message: `Cannot ${kind} a listing in status ${listing.status}`,
        });
      }

      // Close the pending review row opened at submission, or record a new decision.
      const open = await tx.listingModeration.findFirst({
        where: { marketplaceTemplateId: listingId, decision: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      const record: Prisma.ListingModerationUncheckedUpdateInput = {
        decision: rule.decision,
        reasonCode: input.reasonCode ?? null,
        notes: input.notes ?? null,
        reviewerId,
        decidedAt: now,
      };
      const moderation = open
        ? await tx.listingModeration.update({ where: { id: open.id }, data: record })
        : await tx.listingModeration.create({
            data: {
              ...(record as Prisma.ListingModerationUncheckedCreateInput),
              marketplaceTemplateId: listingId,
            },
          });

      return { listingId, status: rule.to, isPublished: rule.isPublished, moderation };
    });
  }

  /** The seller takes a published listing off the catalogue. */
  async unpublishOwn(sellerId: string, listingId: string) {
    const updated = await this.prisma.marketplaceTemplate.updateMany({
      where: { id: listingId, sellerId, status: 'published' },
      data: { status: 'unpublished', isPublished: false },
    });
    if (updated.count === 0) await this.explainSellerRefusal(sellerId, listingId, 'unpublish');
    return { listingId, status: 'unpublished' as const, isPublished: false };
  }

  /** The seller sends a withdrawn, rejected or to-be-changed listing back to review. */
  async resubmitOwn(sellerId: string, listingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.marketplaceTemplate.updateMany({
        where: { id: listingId, sellerId, status: { in: RESUBMITTABLE } },
        data: { status: 'submitted', isPublished: false },
      });
      if (updated.count === 0) await this.explainSellerRefusal(sellerId, listingId, 'resubmit');
      await tx.listingModeration.create({ data: { marketplaceTemplateId: listingId } });
      return { listingId, status: 'submitted' as const, isPublished: false };
    });
  }

  private async explainSellerRefusal(sellerId: string, listingId: string, action: string) {
    const listing = await this.prisma.marketplaceTemplate.findUnique({
      where: { id: listingId },
      select: { sellerId: true, status: true },
    });
    // Someone else's listing looks like a missing one.
    if (!listing || listing.sellerId !== sellerId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Listing not found' });
    }
    throw new ConflictException({
      code: 'INVALID_TRANSITION',
      message: `Cannot ${action} a listing in status ${listing.status}`,
    });
  }
}
