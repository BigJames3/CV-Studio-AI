import { ForbiddenException } from '@nestjs/common';
import { CvsService } from './cvs.service';

describe('CvsService feature gates', () => {
  const prisma = {
    cv: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    template: { findFirst: jest.fn() },
  };
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
    service = new CvsService(prisma as never, entitlements as never, pdfExport as never);
  });

  it('create allows first free CV', async () => {
    await service.create('u1', { title: 'CV 1' });
    expect(entitlements.assertCan).toHaveBeenCalledWith('u1', 'cv:create', expect.any(String));
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

  it('create allows unlimited CVs when assertCan passes (pro/business)', async () => {
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
