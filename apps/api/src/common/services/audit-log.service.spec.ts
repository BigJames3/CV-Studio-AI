import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  const prisma = {
    auditLog: { create: jest.fn() },
  };

  let service: AuditLogService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
    service = new AuditLogService(prisma as never);
  });

  it('writes FEATURE_DENIED without throwing', async () => {
    await service.logFeatureDenial('11111111-1111-4111-8111-111111111111', 'downloadPDF', 'free');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'FEATURE_DENIED',
        entityType: 'feature_gate',
        newValues: { feature: 'downloadPDF', tier: 'free' },
      }),
    });
  });

  it('writes FEATURE_ACCESSED', async () => {
    await service.logFeatureAccess('11111111-1111-4111-8111-111111111111', 'share', 'pro');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'FEATURE_ACCESSED',
        newValues: { feature: 'share', tier: 'pro' },
      }),
    });
  });

  it('swallows DB errors so gating never fails open/closed on audit', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('db down'));
    await expect(
      service.logFeatureDenial('11111111-1111-4111-8111-111111111111', 'share', 'free')
    ).resolves.toBeUndefined();
  });
});
