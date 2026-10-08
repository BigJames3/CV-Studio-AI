import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

describe('UsersService.deleteMe / exportMe', () => {
  const userId = 'user-1';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('correct horse battery', 4);
  });

  function createService() {
    const tx = {
      cv: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      aiHistory: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      userOauthAccount: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      authSession: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      notification: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      portfolio: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      teamMember: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      collabSession: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      collabSnapshot: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      analyticsEvent: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
      user: { update: jest.fn().mockResolvedValue({}) },
    };
    const empty = () => ({ findMany: jest.fn().mockResolvedValue([]) });
    const prisma = {
      user: { findFirst: jest.fn() },
      cv: empty(),
      aiHistory: empty(),
      subscription: { findUnique: jest.fn().mockResolvedValue(null) },
      userOauthAccount: empty(),
      authSession: empty(),
      notification: empty(),
      portfolio: empty(),
      teamMember: empty(),
      sellerProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      marketplacePurchase: empty(),
      templateReview: empty(),
      marketplaceDispute: empty(),
      analyticsEvent: empty(),
      auditLog: empty(),
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
    prisma.user.findFirst.mockResolvedValue({ id: userId, email: 'a@b.c', passwordHash });

    const result = await service.deleteMe(userId, { password: 'correct horse battery' });

    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(userId);
    expect(subscriptions.cancelImmediately).toHaveBeenCalledWith(userId);
    expect(tx.cv.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    expect(tx.aiHistory.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    expect(tx.teamMember.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    expect(tx.collabSession.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    expect(tx.analyticsEvent.updateMany).toHaveBeenCalledWith({
      where: { userId },
      data: { userId: null, sessionId: null },
    });
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
    await expect(service.deleteMe(userId, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('confirmation', () => {
    it('requires the password of a password account', async () => {
      const { service, prisma, sessions, tx } = createService();
      prisma.user.findFirst.mockResolvedValue({ id: userId, email: 'a@b.c', passwordHash });

      await expect(service.deleteMe(userId, {})).rejects.toBeInstanceOf(BadRequestException);
      expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
      expect(tx.cv.deleteMany).not.toHaveBeenCalled();
    });

    it('refuses a wrong password without touching data or billing', async () => {
      const { service, prisma, subscriptions, tx } = createService();
      prisma.user.findFirst.mockResolvedValue({ id: userId, email: 'a@b.c', passwordHash });

      await expect(service.deleteMe(userId, { password: 'wrong' })).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(subscriptions.cancelImmediately).not.toHaveBeenCalled();
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('asks an OAuth-only account to type its e-mail', async () => {
      const { service, prisma, tx } = createService();
      prisma.user.findFirst.mockResolvedValue({ id: userId, email: 'Ada@B.c', passwordHash: null });

      await expect(service.deleteMe(userId, { confirmEmail: 'other@b.c' })).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(tx.user.update).not.toHaveBeenCalled();

      await service.deleteMe(userId, { confirmEmail: 'ada@b.c' });
      expect(tx.user.update).toHaveBeenCalled();
    });
  });

  it('exports every category of the account, scoped to the caller, without secrets', async () => {
    const { service, prisma, audit } = createService();
    prisma.user.findFirst.mockResolvedValue({ id: userId, email: 'a@b.c', firstName: 'Ada' });
    prisma.cv.findMany.mockResolvedValue([{ id: 'cv-1', title: 'CV', content: {} }]);

    const exported = await service.exportMe(userId);

    expect(exported.user.email).toBe('a@b.c');
    expect(exported.cvs).toHaveLength(1);
    expect(exported.exportedAt).toBeDefined();
    expect(exported.notIncluded.length).toBeGreaterThan(0);
    for (const model of ['cv', 'aiHistory', 'authSession', 'analyticsEvent', 'auditLog'] as const) {
      expect(prisma[model].findMany.mock.calls[0][0].where).toEqual({
        userId,
        ...(model === 'cv' ? { deletedAt: null } : {}),
      });
    }
    expect(prisma.marketplacePurchase.findMany.mock.calls[0][0].where).toEqual({ buyerId: userId });

    const userSelect = prisma.user.findFirst.mock.calls[0][0].select;
    for (const secret of ['passwordHash', 'twoFactorSecretEncrypted', 'twoFactorBackupCodes']) {
      expect(userSelect).not.toHaveProperty(secret);
    }
    const oauthSelect = prisma.userOauthAccount.findMany.mock.calls[0][0].select;
    expect(oauthSelect).not.toHaveProperty('accessTokenEncrypted');
    expect(oauthSelect).not.toHaveProperty('refreshTokenEncrypted');
    expect(prisma.authSession.findMany.mock.calls[0][0].select).not.toHaveProperty('refreshJti');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'gdpr.export' }));
  });

  it('exports nothing for a deleted account', async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.exportMe(userId)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.cv.findMany).not.toHaveBeenCalled();
  });
});
