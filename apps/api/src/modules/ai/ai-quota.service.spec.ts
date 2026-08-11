import { ForbiddenException } from '@nestjs/common';
import { AiQuotaService } from './ai-quota.service';

describe('AiQuotaService', () => {
  it('allows optimize when under daily Pro limit', async () => {
    const prisma = {
      aiHistory: {
        count: jest.fn().mockResolvedValue(12),
      },
    };
    const entitlements = {
      getTier: jest.fn().mockResolvedValue('pro'),
    };
    const service = new AiQuotaService(prisma as never, entitlements as never);

    await expect(service.assertOptimizeQuota('user-1')).resolves.toEqual({
      used: 12,
      limit: 50,
    });
  });

  it('rejects optimize when Pro daily quota is exhausted', async () => {
    const prisma = {
      aiHistory: {
        count: jest.fn().mockResolvedValue(50),
      },
    };
    const entitlements = {
      getTier: jest.fn().mockResolvedValue('pro'),
    };
    const service = new AiQuotaService(prisma as never, entitlements as never);

    await expect(service.assertOptimizeQuota('user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects free tier optimize via zero daily limit', async () => {
    const prisma = {
      aiHistory: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const entitlements = {
      getTier: jest.fn().mockResolvedValue('free'),
    };
    const service = new AiQuotaService(prisma as never, entitlements as never);

    await expect(service.assertOptimizeQuota('user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('enforces cover-letter and ats-explain quotas per plan', async () => {
    const prisma = {
      aiHistory: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const entitlements = {
      getTier: jest.fn().mockResolvedValue('pro'),
    };
    const service = new AiQuotaService(prisma as never, entitlements as never);

    await expect(service.assertCoverLetterQuota('user-1')).resolves.toEqual({
      used: 0,
      limit: 20,
    });
    await expect(service.assertAtsExplainQuota('user-1')).resolves.toEqual({
      used: 0,
      limit: 20,
    });
  });
});
