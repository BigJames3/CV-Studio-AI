import { ForbiddenException } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import { FeatureGateService } from '../../common/services/feature-gate.service';

describe('EntitlementsService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    cv: { count: jest.fn() },
  };
  const auditLog = {
    logFeatureDenial: jest.fn(),
    logFeatureAccess: jest.fn(),
  };

  let service: EntitlementsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EntitlementsService(prisma as never, new FeatureGateService(), auditLog as never);
  });

  it('free user can create first CV only', async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'free' });
    prisma.cv.count.mockResolvedValue(0);
    await expect(service.can('u1', 'cv:create')).resolves.toBe(true);
    prisma.cv.count.mockResolvedValue(1);
    await expect(service.can('u1', 'cv:create')).resolves.toBe(false);
  });

  it('denies PDF export on free tier (matrix lock)', async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'free' });
    await expect(service.can('u1', 'cv:export:pdf')).resolves.toBe(false);
  });

  it('allows PDF export on pro tier', async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    await expect(service.can('u1', 'cv:export:pdf')).resolves.toBe(true);
  });

  it('denies share on free, allows pro', async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'free' });
    await expect(service.can('u1', 'cv:share')).resolves.toBe(false);
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    await expect(service.can('u1', 'cv:share')).resolves.toBe(true);
  });

  it('denies pro templates for pro, allows business', async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    await expect(service.can('u1', 'templates:pro')).resolves.toBe(false);
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'business' });
    await expect(service.can('u1', 'templates:pro')).resolves.toBe(true);
  });

  it('keeps AI generate as pro+', async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'free' });
    await expect(service.can('u1', 'ai:generate')).resolves.toBe(false);
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    await expect(service.can('u1', 'ai:generate')).resolves.toBe(true);
  });

  it('assertCan throws ENTITLEMENT_REQUIRED and audits', async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'free' });
    await expect(service.assertCan('u1', 'cv:export:pdf', 'nope')).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(auditLog.logFeatureDenial).toHaveBeenCalledWith('u1', 'cv:export:pdf', 'free');
  });

  it('snapshot exposes matrix flags without extra PDF for free', async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'free' });
    prisma.cv.count.mockResolvedValue(0);
    const snap = await service.snapshot('u1');
    expect(snap.entitlements.cvCreate).toBe(true);
    expect(snap.entitlements.exportPdf).toBe(false);
    expect(snap.entitlements.share).toBe(false);
    expect(snap.entitlements.proTemplates).toBe(false);
  });
});
