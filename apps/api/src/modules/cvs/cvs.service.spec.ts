import { ForbiddenException } from '@nestjs/common';
import { CvsService } from './cvs.service';

describe('CvsService entitlements', () => {
  const prisma = {
    cv: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const entitlements = {
    can: jest.fn(),
    getTier: jest.fn(),
  };
  const pdfExport = {
    enqueueFromCvId: jest.fn(),
  };
  const auditLog = {
    logFeatureDenial: jest.fn().mockResolvedValue(undefined),
  };

  let service: CvsService;

  const existingCv = {
    id: 'cv-1',
    userId: 'u1',
    title: 'My CV',
    templateId: null,
    content: {},
    locale: 'fr-FR',
    paper: 'A4',
    isPublic: false,
    publicUrl: null,
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    entitlements.getTier.mockResolvedValue('free');
    prisma.cv.create.mockResolvedValue({ ...existingCv, id: 'cv-new' });
    prisma.cv.findFirst.mockResolvedValue(existingCv);
    prisma.cv.update.mockResolvedValue(existingCv);
    service = new CvsService(
      prisma as never,
      entitlements as never,
      pdfExport as never,
      auditLog as never
    );
  });

  describe('create', () => {
    it('creates when entitlement allows', async () => {
      entitlements.can.mockResolvedValue(true);
      await service.create('u1', { title: 'CV 1' } as never);
      expect(prisma.cv.create).toHaveBeenCalled();
    });

    it('denies free user at CV limit', async () => {
      entitlements.can.mockResolvedValue(false);
      await expect(service.create('u1', { title: 'CV 2' } as never)).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(auditLog.logFeatureDenial).toHaveBeenCalledWith('u1', 'cv:create', 'free');
      expect(prisma.cv.create).not.toHaveBeenCalled();
    });

    it('allows pro unlimited creates', async () => {
      entitlements.can.mockResolvedValue(true);
      entitlements.getTier.mockResolvedValue('pro');
      await service.create('u1', { title: 'CV N' } as never);
      expect(prisma.cv.create).toHaveBeenCalled();
    });
  });

  describe('duplicate', () => {
    it('denies duplicate when create quota is exhausted', async () => {
      entitlements.can.mockResolvedValue(false);
      await expect(service.duplicate('u1', 'cv-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.cv.create).not.toHaveBeenCalled();
    });

    it('duplicates when entitled', async () => {
      entitlements.can.mockResolvedValue(true);
      await service.duplicate('u1', 'cv-1');
      expect(prisma.cv.create).toHaveBeenCalled();
    });
  });

  describe('shareMeta', () => {
    it('denies free users', async () => {
      entitlements.can.mockResolvedValue(false);
      await expect(service.shareMeta('u1', 'cv-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'ENTITLEMENT_REQUIRED' }),
      });
      expect(auditLog.logFeatureDenial).toHaveBeenCalledWith('u1', 'share', 'free');
    });

    it('returns unpublished payload for entitled users', async () => {
      entitlements.can.mockResolvedValue(true);
      const result = await service.shareMeta('u1', 'cv-1');
      expect(result.isPublic).toBe(false);
      expect(result.shareUrl).toBeNull();
    });
  });

  describe('publish', () => {
    it('denies making a CV public on free tier', async () => {
      entitlements.can.mockResolvedValue(false);
      await expect(service.publish('u1', 'cv-1', { isPublic: true })).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(prisma.cv.update).not.toHaveBeenCalled();
    });

    it('allows unpublish without share entitlement', async () => {
      entitlements.can.mockResolvedValue(false);
      prisma.cv.update.mockResolvedValue({ ...existingCv, isPublic: false });
      await service.publish('u1', 'cv-1', { isPublic: false });
      expect(prisma.cv.update).toHaveBeenCalled();
    });

    it('allows publish on pro', async () => {
      entitlements.can.mockResolvedValue(true);
      prisma.cv.update.mockResolvedValue({ ...existingCv, isPublic: true });
      await service.publish('u1', 'cv-1', { isPublic: true });
      expect(prisma.cv.update).toHaveBeenCalled();
    });
  });

  describe('countByUser', () => {
    it('counts non-deleted CVs', async () => {
      prisma.cv.count.mockResolvedValue(3);
      await expect(service.countByUser('u1')).resolves.toBe(3);
      expect(prisma.cv.count).toHaveBeenCalledWith({
        where: { userId: 'u1', deletedAt: null },
      });
    });
  });

  describe('exportPdf', () => {
    it('delegates to pdf export (entitlement checked downstream)', async () => {
      pdfExport.enqueueFromCvId.mockResolvedValue({ status: 'queued', jobId: 'j1' });
      await service.exportPdf('u1', 'cv-1');
      expect(pdfExport.enqueueFromCvId).toHaveBeenCalledWith('u1', 'cv-1', expect.any(Object));
    });
  });
});
