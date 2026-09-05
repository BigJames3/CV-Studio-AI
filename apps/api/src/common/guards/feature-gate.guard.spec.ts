import { ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { FeatureGateGuard } from './feature-gate.guard';
import { FeatureGateService } from '../services/feature-gate.service';
import { AuditLogService } from '../services/audit-log.service';
import { FEATURE_GATE_KEY, GatedFeature } from '../decorators';

function mockContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('FeatureGateGuard', () => {
  const featureGate = new FeatureGateService();
  const prisma = {
    user: { findUnique: jest.fn() },
  };
  const auditLog = {
    logFeatureDenial: jest.fn().mockResolvedValue(undefined),
    logFeatureAccess: jest.fn().mockResolvedValue(undefined),
  };
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: FeatureGateGuard;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector = { getAllAndOverride: jest.fn() };
    prisma.user.findUnique.mockResolvedValue(null);
    guard = new FeatureGateGuard(
      reflector as unknown as Reflector,
      featureGate,
      prisma as never,
      auditLog as unknown as AuditLogService
    );
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  function setFeature(feature: GatedFeature | undefined) {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === FEATURE_GATE_KEY ? feature : undefined
    );
  }

  it('allows when no feature metadata is set', async () => {
    setFeature(undefined);
    await expect(guard.canActivate(mockContext({ id: 'u1' }))).resolves.toBe(true);
  });

  it('denies unauthenticated requests', async () => {
    setFeature('downloadPDF');
    await expect(guard.canActivate(mockContext(undefined))).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it('returns 403 when a free user downloads PDF', async () => {
    setFeature('downloadPDF');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'free' });
    await expect(
      guard.canActivate(mockContext({ id: 'u-free', subscriptionTier: 'free' }))
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ENTITLEMENT_REQUIRED' }),
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(auditLog.logFeatureDenial).toHaveBeenCalledWith('u-free', 'downloadPDF', 'free');
  });

  it('allows a pro user to download PDF', async () => {
    setFeature('downloadPDF');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    await expect(
      guard.canActivate(mockContext({ id: 'u-pro', subscriptionTier: 'pro' }))
    ).resolves.toBe(true);
  });

  it('allows a business user to download PDF', async () => {
    setFeature('downloadPDF');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'business' });
    await expect(
      guard.canActivate(mockContext({ id: 'u-biz', subscriptionTier: 'business' }))
    ).resolves.toBe(true);
  });

  it('allows a business user to access business templates', async () => {
    setFeature('businessTemplates');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'business' });
    await expect(
      guard.canActivate(mockContext({ id: 'u-biz', subscriptionTier: 'business' }))
    ).resolves.toBe(true);
  });

  it('returns 403 when a pro user accesses business templates', async () => {
    setFeature('businessTemplates');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    await expect(
      guard.canActivate(mockContext({ id: 'u-pro', subscriptionTier: 'pro' }))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 403 when a pro user accesses pro templates (matrix)', async () => {
    setFeature('proTemplates');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    await expect(
      guard.canActivate(mockContext({ id: 'u-pro', subscriptionTier: 'pro' }))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prefers DB tier over stale JWT after upgrade', async () => {
    setFeature('downloadPDF');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    await expect(
      guard.canActivate(mockContext({ id: 'u-upgraded', subscriptionTier: 'free' }))
    ).resolves.toBe(true);
  });

  it('denies unknown features', async () => {
    reflector.getAllAndOverride.mockReturnValue('not-a-feature');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'business' });
    await expect(
      guard.canActivate(mockContext({ id: 'u-biz', subscriptionTier: 'business' }))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
