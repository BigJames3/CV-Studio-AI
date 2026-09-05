import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  const prisma = {
    auditLog: { create: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
  });

  it('writes FEATURE_DENIED with feature and tier', async () => {
    const service = new AuditLogService(prisma as never);
    await service.logFeatureDenial('user-1', 'downloadPDF', 'free');

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        entityType: 'feature_gate',
        entityId: 'user-1',
        action: 'FEATURE_DENIED',
        newValues: expect.objectContaining({
          feature: 'downloadPDF',
          tier: 'free',
          action: 'FEATURE_DENIED',
        }),
      }),
    });
  });

  it('writes FEATURE_ACCESSED', async () => {
    const service = new AuditLogService(prisma as never);
    await service.logFeatureAccess('user-1', 'share', 'pro');

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'FEATURE_ACCESSED',
        newValues: expect.objectContaining({ feature: 'share', tier: 'pro' }),
      }),
    });
  });

  it('does not throw when prisma is missing', async () => {
    const service = new AuditLogService();
    await expect(service.logFeatureDenial('user-1', 'share', 'free')).resolves.toBeUndefined();
  });

  it('does not throw when prisma write fails', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('db down'));
    const service = new AuditLogService(prisma as never);
    await expect(service.logFeatureDenial('user-1', 'share', 'free')).resolves.toBeUndefined();
  });
});
