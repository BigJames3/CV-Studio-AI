import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureGateGuard, FEATURE_GATE_KEY, RequireFeature } from './feature-gate.guard';
import { FeatureGateService } from '../services/feature-gate.service';
import { AuditLogService } from '../services/audit-log.service';

function httpContext(user: unknown) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as never;
}

describe('FeatureGateGuard', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
  };
  const auditLog = {
    logFeatureDenial: jest.fn().mockResolvedValue(undefined),
    logFeatureAccess: jest.fn().mockResolvedValue(undefined),
  };
  const featureGate = new FeatureGateService();
  let guard: FeatureGateGuard;
  let reflector: Reflector;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector = { getAllAndOverride: jest.fn() } as never;
    guard = new FeatureGateGuard(
      reflector,
      featureGate,
      prisma as never,
      auditLog as unknown as AuditLogService
    );
  });

  it('passes through when no feature metadata is set', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    await expect(guard.canActivate(httpContext({ id: 'u1' }))).resolves.toBe(true);
  });

  it('throws when unauthenticated', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('downloadPDF');
    await expect(guard.canActivate(httpContext(undefined))).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it('denies free user PDF download with 403 + audit', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('downloadPDF');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'free' });

    await expect(
      guard.canActivate(httpContext({ id: 'u1', subscriptionTier: 'free' }))
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ENTITLEMENT_REQUIRED' }),
    });
    expect(auditLog.logFeatureDenial).toHaveBeenCalledWith('u1', 'downloadPDF', 'free');
  });

  it('allows pro user PDF download', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('downloadPDF');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    await expect(
      guard.canActivate(httpContext({ id: 'u1', subscriptionTier: 'pro' }))
    ).resolves.toBe(true);
    expect(auditLog.logFeatureDenial).not.toHaveBeenCalled();
  });

  it('allows business user business templates', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('businessTemplates');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'business' });
    await expect(
      guard.canActivate(httpContext({ id: 'u1', subscriptionTier: 'business' }))
    ).resolves.toBe(true);
  });

  it('denies pro user business templates', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('businessTemplates');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    await expect(
      guard.canActivate(httpContext({ id: 'u1', subscriptionTier: 'pro' }))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('uses DB tier over stale JWT after upgrade', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('downloadPDF');
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'pro' });
    await expect(
      guard.canActivate(httpContext({ id: 'u1', subscriptionTier: 'free' }))
    ).resolves.toBe(true);
  });

  it('denies unknown features fail-closed', () => {
    expect(guard.checkFeature({ subscriptionTier: 'business' }, 'not-a-feature')).toBe(false);
  });

  it('RequireFeature sets metadata', () => {
    class Demo {
      @RequireFeature('share')
      handler() {
        return true;
      }
    }
    expect(Reflect.getMetadata(FEATURE_GATE_KEY, Demo.prototype.handler)).toBe('share');
  });
});
