import { ForbiddenException } from '@nestjs/common';
import { CvsService } from './cvs.service';

describe('CvsService feature gates', () => {
  const prisma = {
    cv: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
    template: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const tx = { $executeRaw: jest.fn().mockResolvedValue(1), cv: prisma.cv };
  const entitlements = {
    assertCan: jest.fn(),
    can: jest.fn(),
    getTier: jest.fn(),
  };
  const pdfExport = {
    enqueueFromCvId: jest.fn(),
  };
  const teams = {
    cvAccess: jest.fn(),
    assertCanShareInto: jest.fn(),
    activeMemberships: jest.fn(),
  };

  let service: CvsService;

  beforeEach(() => {
    jest.clearAllMocks();
    entitlements.assertCan.mockResolvedValue(undefined);
    prisma.cv.create.mockResolvedValue({ id: 'cv-1', title: 'Nouveau CV' });
    prisma.cv.findFirst.mockResolvedValue({
      id: 'cv-1',
      userId: 'u1',
      title: 'CV',
      isPublic: false,
      publicUrl: null,
      content: {},
      locale: 'fr-FR',
      paper: 'A4',
      templateId: null,
      deletedAt: null,
    });
    prisma.cv.update.mockResolvedValue({ id: 'cv-1', isPublic: true });
    // Callbacks run one at a time, like the per-user Postgres advisory lock serializes them.
    let chain: Promise<unknown> = Promise.resolve();
    prisma.$transaction.mockImplementation((fn: (client: typeof tx) => Promise<unknown>) => {
      const run = chain.then(() => fn(tx));
      chain = run.catch(() => undefined);
      return run;
    });
    service = new CvsService(
      prisma as never,
      entitlements as never,
      pdfExport as never,
      teams as never
    );
  });

  it('create allows first free CV', async () => {
    await service.create('u1', { title: 'CV 1' });
    expect(entitlements.assertCan).toHaveBeenCalledWith('u1', 'cv:create', expect.any(String), tx);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.cv.create).toHaveBeenCalled();
  });

  it('create denies second free CV', async () => {
    entitlements.assertCan.mockRejectedValue(
      new ForbiddenException({ code: 'ENTITLEMENT_REQUIRED' })
    );
    await expect(service.create('u1', { title: 'CV 2' })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(prisma.cv.create).not.toHaveBeenCalled();
  });

  it('create allows insert when assertCan passes (within plan cap)', async () => {
    await service.create('u1', { title: 'CV 1000' });
    expect(prisma.cv.create).toHaveBeenCalled();
  });

  it('create blocks premium template when the plan lacks it (free)', async () => {
    prisma.template.findFirst.mockResolvedValue({ isPremium: true });
    entitlements.assertCan
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ForbiddenException({ code: 'ENTITLEMENT_REQUIRED' }));
    await expect(
      service.create('u1', { title: 'Exec', templateId: '11111111-1111-4111-8111-111111111103' })
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(entitlements.assertCan).toHaveBeenCalledWith(
      'u1',
      'templates:pro',
      'This template requires a Pro or Business plan'
    );
  });

  describe('premium template picked in the editor (content.templateKey)', () => {
    const denyPremium = () =>
      entitlements.assertCan.mockImplementation(async (_userId: string, feature: string) => {
        if (feature === 'templates:pro') {
          throw new ForbiddenException({ code: 'ENTITLEMENT_REQUIRED' });
        }
      });

    it('update blocks switching to a premium template without the plan', async () => {
      denyPremium();
      await expect(
        service.update('u1', 'cv-1', { content: { templateKey: 'executive' } })
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(entitlements.assertCan).toHaveBeenCalledWith(
        'u1',
        'templates:pro',
        'This template requires a Pro or Business plan'
      );
      expect(prisma.cv.update).not.toHaveBeenCalled();
    });

    it('update allows switching to a premium template with the plan', async () => {
      await service.update('u1', 'cv-1', { content: { templateKey: 'executive' } });
      expect(entitlements.assertCan).toHaveBeenCalledWith(
        'u1',
        'templates:pro',
        expect.any(String)
      );
      expect(prisma.cv.update).toHaveBeenCalled();
    });

    it('update keeps a CV that already uses a premium template editable', async () => {
      denyPremium();
      prisma.cv.findFirst.mockResolvedValueOnce({
        id: 'cv-1',
        userId: 'u1',
        content: { templateKey: 'executive' },
        deletedAt: null,
      });
      await service.update('u1', 'cv-1', { content: { templateKey: 'executive' } });
      expect(prisma.cv.update).toHaveBeenCalled();
    });

    it('update never gates free templates', async () => {
      denyPremium();
      await service.update('u1', 'cv-1', { content: { templateKey: 'ats' } });
      expect(entitlements.assertCan).not.toHaveBeenCalled();
      expect(prisma.cv.update).toHaveBeenCalled();
    });

    it('create blocks a premium templateKey in the initial content', async () => {
      denyPremium();
      await expect(
        service.create('u1', { title: 'Exec', content: { templateKey: 'executive' } })
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.cv.create).not.toHaveBeenCalled();
    });
  });

  it('share denies free users', async () => {
    entitlements.assertCan.mockRejectedValue(
      new ForbiddenException({ code: 'ENTITLEMENT_REQUIRED' })
    );
    await expect(service.shareMeta('u1', 'cv-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('share allows pro users', async () => {
    const result = await service.shareMeta('u1', 'cv-1');
    expect(entitlements.assertCan).toHaveBeenCalledWith('u1', 'cv:share', expect.any(String));
    expect(result.isPublic).toBe(false);
  });

  it('publish public denies free users', async () => {
    entitlements.assertCan.mockRejectedValue(
      new ForbiddenException({ code: 'ENTITLEMENT_REQUIRED' })
    );
    await expect(service.publish('u1', 'cv-1', { isPublic: true })).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it('unpublish remains allowed without share entitlement', async () => {
    await service.publish('u1', 'cv-1', { isPublic: false });
    expect(entitlements.assertCan).not.toHaveBeenCalled();
    expect(prisma.cv.update).toHaveBeenCalled();
  });

  describe('quota under concurrent requests', () => {
    function realQuota(limit: number) {
      let stored = 0;
      prisma.cv.count.mockImplementation(async () => stored);
      prisma.cv.create.mockImplementation(async () => {
        // Simulate DB latency between the quota check and the insert.
        await new Promise((resolve) => setImmediate(resolve));
        stored += 1;
        return { id: `cv-${stored}` };
      });
      entitlements.assertCan.mockImplementation(
        async (_userId: string, feature: string, _msg: string, db?: typeof tx) => {
          if (feature !== 'cv:create') return;
          if ((await (db ?? prisma).cv.count()) >= limit) {
            throw new ForbiddenException({ code: 'ENTITLEMENT_REQUIRED' });
          }
        }
      );
      return () => stored;
    }

    it('creates at most 1 CV for FREE out of 10 parallel requests', async () => {
      const stored = realQuota(1);
      const results = await Promise.allSettled(
        Array.from({ length: 10 }, (_, i) => service.create('u1', { title: `CV ${i}` }))
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(stored()).toBe(1);
    });

    it('creates at most 5 CVs for PRO across parallel creates and duplicates', async () => {
      const stored = realQuota(5);
      const results = await Promise.allSettled([
        ...Array.from({ length: 6 }, (_, i) => service.create('u1', { title: `CV ${i}` })),
        ...Array.from({ length: 6 }, () => service.duplicate('u1', 'cv-1')),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
      expect(stored()).toBe(5);
    });
  });

  it('duplicate is gated as create', async () => {
    entitlements.assertCan.mockRejectedValue(
      new ForbiddenException({ code: 'ENTITLEMENT_REQUIRED' })
    );
    await expect(service.duplicate('u1', 'cv-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('exportPdf delegates to pdf service (PDF gated there)', async () => {
    pdfExport.enqueueFromCvId.mockResolvedValue({ status: 'queued', jobId: 'j1', pollUrl: '/x' });
    await service.exportPdf('u1', 'cv-1');
    expect(pdfExport.enqueueFromCvId).toHaveBeenCalledWith('u1', 'cv-1', {});
  });

  describe('team sharing', () => {
    const teamCv = {
      id: 'cv-1',
      userId: 'owner',
      teamId: 'team-1',
      title: 'CV',
      content: {},
      deletedAt: null,
    };

    it('lets a team editor open and edit a shared CV, without touching the owner star', async () => {
      prisma.cv.findFirst.mockResolvedValue(teamCv);
      teams.cvAccess.mockResolvedValue('editor');

      await expect(service.getAccessible('member', 'cv-1')).resolves.toMatchObject({
        access: 'editor',
      });
      await service.update('member', 'cv-1', { title: 'New', isStarred: true });

      expect(teams.cvAccess).toHaveBeenCalledWith('member', teamCv);
      expect(prisma.cv.update).toHaveBeenCalledWith({
        where: { id: 'cv-1' },
        data: expect.objectContaining({ title: 'New', isStarred: undefined }),
      });
    });

    it('checks a premium template switch against the owner plan, not the editor', async () => {
      prisma.cv.findFirst.mockResolvedValue({ ...teamCv, content: { templateKey: 'modern' } });
      teams.cvAccess.mockResolvedValue('editor');

      await service.update('member', 'cv-1', { content: { templateKey: 'executive' } });

      expect(entitlements.assertCan).toHaveBeenCalledWith(
        'owner',
        'templates:pro',
        expect.any(String)
      );
      expect(entitlements.assertCan).not.toHaveBeenCalledWith(
        'member',
        expect.anything(),
        expect.anything()
      );
    });

    it('keeps team viewers read-only', async () => {
      prisma.cv.findFirst.mockResolvedValue(teamCv);
      teams.cvAccess.mockResolvedValue('viewer');

      await expect(service.getAccessible('member', 'cv-1')).resolves.toMatchObject({
        access: 'viewer',
      });
      await expect(service.update('member', 'cv-1', { title: 'x' })).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'READ_ONLY' }),
      });
      expect(prisma.cv.update).not.toHaveBeenCalled();
    });

    it('refuses people outside the team (or an inactive team)', async () => {
      prisma.cv.findFirst.mockResolvedValue(teamCv);
      teams.cvAccess.mockResolvedValue(null);
      await expect(service.getAccessible('stranger', 'cv-1')).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it('keeps owner-only actions for the owner, even for team editors', async () => {
      prisma.cv.findFirst.mockResolvedValue(teamCv);
      teams.cvAccess.mockResolvedValue('editor');
      await expect(service.remove('member', 'cv-1')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.publish('member', 'cv-1', { isPublic: false })).rejects.toBeInstanceOf(
        ForbiddenException
      );
      await expect(service.setTeam('member', 'cv-1', null)).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it('checks team rights before the owner shares a CV', async () => {
      prisma.cv.findFirst.mockResolvedValue({ ...teamCv, userId: 'u1', teamId: null });
      teams.assertCanShareInto.mockRejectedValue(new ForbiddenException('inactive'));
      await expect(service.setTeam('u1', 'cv-1', 'team-1')).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(prisma.cv.update).not.toHaveBeenCalled();

      teams.assertCanShareInto.mockResolvedValue(undefined);
      await service.setTeam('u1', 'cv-1', null);
      expect(teams.assertCanShareInto).toHaveBeenCalledTimes(1);
      expect(prisma.cv.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { teamId: null } })
      );
    });

    it('lists only CVs from active teams, never the caller own ones', async () => {
      teams.activeMemberships.mockResolvedValue([
        { teamId: 'team-1', teamName: 'Recrutement', access: 'viewer' },
      ]);
      (prisma.cv as Record<string, jest.Mock>).findMany = jest.fn().mockResolvedValue([
        {
          id: 'cv-9',
          title: 'CV Ana',
          templateId: null,
          teamId: 'team-1',
          updatedAt: new Date(),
          user: { firstName: 'Ana', lastName: 'Diallo' },
        },
      ]);

      const { items } = await service.listShared('member');

      expect(items).toEqual([
        expect.objectContaining({
          id: 'cv-9',
          ownerName: 'Ana Diallo',
          teamName: 'Recrutement',
          access: 'viewer',
        }),
      ]);
      expect((prisma.cv as Record<string, jest.Mock>).findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { teamId: { in: ['team-1'] }, userId: { not: 'member' }, deletedAt: null },
        })
      );
    });

    it('returns nothing without an active team', async () => {
      teams.activeMemberships.mockResolvedValue([]);
      await expect(service.listShared('member')).resolves.toEqual({ items: [] });
    });
  });
});
