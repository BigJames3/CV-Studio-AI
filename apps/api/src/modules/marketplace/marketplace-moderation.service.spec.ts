import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MarketplaceModerationService } from './marketplace-moderation.service';
import { isMarketplaceModerator, moderatorIds } from './marketplace-moderator.guard';

const MOD = '11111111-1111-4111-8111-111111111111';
const SELLER = '22222222-2222-4222-8222-222222222222';

function setup(listing: { status: string; sellerId?: string; publishedAt?: Date | null } | null) {
  const prisma = {
    marketplaceTemplate: {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          listing && { id: 'listing-1', sellerId: SELLER, publishedAt: null, ...listing }
        ),
      updateMany: jest.fn().mockImplementation(({ where }) => ({
        count: listing && (where.status.in ?? [where.status]).includes(listing.status) ? 1 : 0,
      })),
    },
    listingModeration: {
      findFirst: jest.fn().mockResolvedValue({ id: 'mod-open' }),
      update: jest.fn().mockImplementation(({ data }) => ({ id: 'mod-open', ...data })),
      create: jest.fn().mockImplementation(({ data }) => ({ id: 'mod-new', ...data })),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
  return { service: new MarketplaceModerationService(prisma as never), prisma };
}

describe('marketplace moderators', () => {
  it('lets in only listed user ids, whatever the plan', () => {
    const env = { MARKETPLACE_MODERATOR_IDS: ` ${MOD.toUpperCase()} , not-a-uuid` };
    expect(isMarketplaceModerator(MOD, env)).toBe(true);
    expect(isMarketplaceModerator(SELLER, env)).toBe(false);
    expect(moderatorIds(env).size).toBe(1);
  });

  it('is closed when the list is missing or empty', () => {
    expect(isMarketplaceModerator(MOD, {})).toBe(false);
    expect(isMarketplaceModerator(MOD, { MARKETPLACE_MODERATOR_IDS: '' })).toBe(false);
    expect(isMarketplaceModerator(undefined, { MARKETPLACE_MODERATOR_IDS: MOD })).toBe(false);
  });
});

describe('MarketplaceModerationService', () => {
  it('publishes an approved listing and closes its open review', async () => {
    const { service, prisma } = setup({ status: 'submitted' });

    const result = await service.decide(MOD, 'listing-1', 'approve', { notes: 'ok' });

    expect(result).toMatchObject({ status: 'published', isPublished: true });
    expect(prisma.marketplaceTemplate.updateMany).toHaveBeenCalledWith({
      where: { id: 'listing-1', status: { in: expect.arrayContaining(['submitted']) } },
      data: expect.objectContaining({
        status: 'published',
        isPublished: true,
        publishedAt: expect.any(Date),
      }),
    });
    expect(prisma.listingModeration.update).toHaveBeenCalledWith({
      where: { id: 'mod-open' },
      data: expect.objectContaining({ decision: 'approve', reviewerId: MOD, notes: 'ok' }),
    });
  });

  it('suspends a published listing and records why', async () => {
    const { service, prisma } = setup({ status: 'published' });
    prisma.listingModeration.findFirst.mockResolvedValue(null);

    const result = await service.decide(MOD, 'listing-1', 'suspend', { reasonCode: 'ip_claim' });

    expect(result).toMatchObject({ status: 'suspended', isPublished: false });
    expect(prisma.listingModeration.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        marketplaceTemplateId: 'listing-1',
        decision: 'suspend',
        reasonCode: 'ip_claim',
      }),
    });
  });

  it('refuses a transition the status does not allow', async () => {
    const { service, prisma } = setup({ status: 'published' });
    await expect(service.decide(MOD, 'listing-1', 'approve', {})).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(prisma.listingModeration.update).not.toHaveBeenCalled();
  });

  it('never lets a moderator decide on their own listing', async () => {
    const { service, prisma } = setup({ status: 'submitted', sellerId: MOD });
    await expect(service.decide(MOD, 'listing-1', 'approve', {})).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(prisma.marketplaceTemplate.updateMany).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown listing', async () => {
    const { service } = setup(null);
    await expect(service.decide(MOD, 'missing', 'reject', {})).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('lets a seller withdraw only their own published listing', async () => {
    const { service, prisma } = setup({ status: 'published' });

    await expect(service.unpublishOwn(SELLER, 'listing-1')).resolves.toMatchObject({
      status: 'unpublished',
    });
    expect(prisma.marketplaceTemplate.updateMany).toHaveBeenCalledWith({
      where: { id: 'listing-1', sellerId: SELLER, status: 'published' },
      data: { status: 'unpublished', isPublished: false },
    });

    prisma.marketplaceTemplate.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.unpublishOwn(MOD, 'listing-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sends a withdrawn listing back to review with a new open review', async () => {
    const { service, prisma } = setup({ status: 'unpublished' });

    await expect(service.resubmitOwn(SELLER, 'listing-1')).resolves.toMatchObject({
      status: 'submitted',
    });
    expect(prisma.listingModeration.create).toHaveBeenCalledWith({
      data: { marketplaceTemplateId: 'listing-1' },
    });
  });
});
