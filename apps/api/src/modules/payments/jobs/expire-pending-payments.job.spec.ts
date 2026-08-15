import { Logger } from '@nestjs/common';
import { ExpirePendingPaymentsJob } from './expire-pending-payments.job';
import { PaymentsService } from '../payments.service';

describe('ExpirePendingPaymentsJob', () => {
  const payments = { expireStalePending: jest.fn() };
  const job = new ExpirePendingPaymentsJob(payments as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs when stale pending payments are expired', async () => {
    payments.expireStalePending.mockResolvedValue({ count: 3 });
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    await job.expirePendingPayments();
    expect(payments.expireStalePending).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('Expired 3 pending payments');
    log.mockRestore();
  });

  it('stays quiet when nothing is stale', async () => {
    payments.expireStalePending.mockResolvedValue({ count: 0 });
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    await job.expirePendingPayments();
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('skips renewal reminders in v1', async () => {
    const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    await job.sendRenewalReminders();
    expect(debug).toHaveBeenCalledWith(expect.stringMatching(/v2/i));
    debug.mockRestore();
  });
});

describe('ExpirePendingPaymentsJob logic (via PaymentsService.expireStalePending)', () => {
  const prisma = {
    payment: { updateMany: jest.fn() },
  };
  const service = new PaymentsService(
    prisma as never,
    { applyPaidEntitlement: jest.fn() } as never,
    { sendPaymentFailed: jest.fn() } as never,
    {} as never,
    { captureException: jest.fn() } as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.payment.updateMany.mockResolvedValue({ count: 2 });
  });

  it('marks pending rows older than 60 minutes as failed', async () => {
    const result = await service.expireStalePending();
    expect(result).toEqual({ count: 2 });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'pending',
          createdAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
        data: expect.objectContaining({
          status: 'failed',
          failedReason: expect.stringMatching(/timeout/i),
        }),
      })
    );
  });

  it('is a no-op when nothing is stale', async () => {
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.expireStalePending()).resolves.toEqual({ count: 0 });
  });
});
