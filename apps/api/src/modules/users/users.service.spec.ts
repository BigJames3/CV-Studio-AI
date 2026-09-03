import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService.deleteMe / exportMe', () => {
  const userId = 'user-1';

  function createService() {
    const tx = {
      cv: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      aiHistory: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      userOauthAccount: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      authSession: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      notification: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      portfolio: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      user: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: {
        findFirst: jest.fn(),
      },
      cv: { findMany: jest.fn() },
      $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
    };
    const sessions = { revokeAllForUser: jest.fn().mockResolvedValue(undefined) };
    const subscriptions = {
      cancelImmediately: jest
        .fn()
        .mockResolvedValue({ hadSubscription: true, stripeCanceled: true }),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new UsersService(
      prisma as never,
      sessions as never,
      subscriptions as never,
      audit as never
    );
    return { service, prisma, sessions, subscriptions, audit, tx };
  }

  it('cancels Stripe, purges PII, and does not claim a fake scheduled purge', async () => {
    const { service, prisma, sessions, subscriptions, audit, tx } = createService();
    prisma.user.findFirst.mockResolvedValue({ id: userId });

    const result = await service.deleteMe(userId);

    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(userId);
    expect(subscriptions.cancelImmediately).toHaveBeenCalledWith(userId);
    expect(tx.cv.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    expect(tx.aiHistory.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: `deleted-${userId}@purged.invalid`,
          deletedAt: expect.any(Date),
        }),
      })
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'gdpr.erase', userId })
    );
    expect(result).toEqual({
      deleted: true,
      dataPurged: true,
      billingCanceled: true,
      stripeCanceled: true,
    });
    expect(result).not.toHaveProperty('purgeScheduled');
  });

  it('throws when the account is already deleted', async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.deleteMe(userId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exports profile and CVs without secrets', async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: userId,
      email: 'a@b.c',
      firstName: 'Ada',
    });
    prisma.cv.findMany.mockResolvedValue([{ id: 'cv-1', title: 'CV', content: {} }]);

    const exported = await service.exportMe(userId);
    expect(exported.user.email).toBe('a@b.c');
    expect(exported.cvs).toHaveLength(1);
    expect(exported.exportedAt).toBeDefined();
  });
});
