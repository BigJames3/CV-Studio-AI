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

  it('pro user can create up to 5 CVs and is blocked at cap', async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    prisma.cv.count.mockResolvedValue(4);
    await expect(service.can('u1', 'cv:create')).resolves.toBe(true);
    prisma.cv.count.mockResolvedValue(5);
    await expect(service.can('u1', 'cv:create')).resolves.toBe(false);
  });

  it('business user can create up to 20 CVs and is blocked at cap', async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'business' });
    prisma.cv.count.mockResolvedValue(19);
    await expect(service.can('u1', 'cv:create')).resolves.toBe(true);
    prisma.cv.count.mockResolvedValue(20);
    await expect(service.can('u1', 'cv:create')).resolves.toBe(false);
  });

  it('grandfathers pro users already above cap', async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    prisma.cv.count.mockResolvedValue(7);
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
    expect(snap.cvCount).toBe(0);
    expect(snap.cvLimit).toBe(1);
    expect(snap.cvRemaining).toBe(1);
  });

  it('snapshot exposes pro quota remaining', async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    prisma.cv.count.mockResolvedValue(3);
    const snap = await service.snapshot('u1');
    expect(snap.cvCount).toBe(3);
    expect(snap.cvLimit).toBe(5);
    expect(snap.cvRemaining).toBe(2);
    expect(snap.entitlements.cvCreate).toBe(true);
  });
});
