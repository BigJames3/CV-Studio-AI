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
    service = new CvsService(prisma as never, entitlements as never, pdfExport as never);
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

  it('create blocks premium template for free/pro', async () => {
    prisma.template.findFirst.mockResolvedValue({ isPremium: true });
    entitlements.assertCan
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ForbiddenException({ code: 'ENTITLEMENT_REQUIRED' }));
    await expect(
      service.create('u1', { title: 'Exec', templateId: '11111111-1111-4111-8111-111111111103' })
    ).rejects.toBeInstanceOf(ForbiddenException);
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
});
