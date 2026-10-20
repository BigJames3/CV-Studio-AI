import { RenewalReminderJob } from './renewal-reminder.job';

describe('RenewalReminderJob', () => {
  const now = new Date('2026-10-20T08:00:00Z');
  const prisma = {
    subscription: { findMany: jest.fn(), updateMany: jest.fn() },
  };
  const mail = { sendRenewalReminder: jest.fn() };
  const job = new RenewalReminderJob(prisma as never, mail as never);

  const due = (id: string) => ({
    id,
    currentPeriodEnd: new Date('2026-10-25T00:00:00Z'),
    plan: { name: 'Pro' },
    user: { email: `${id}@example.com` },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mail.sendRenewalReminder.mockResolvedValue(undefined);
  });

  it('reminds each prepaid period ending within 7 days once', async () => {
    prisma.subscription.findMany.mockResolvedValue([due('a'), due('b')]);
    prisma.subscription.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 }); // already claimed by another pod

    await expect(job.sendReminders(now)).resolves.toEqual({ sent: 1 });

    expect(prisma.subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          provider: 'paystack',
          status: 'active',
          renewalReminderSentAt: null,
          currentPeriodEnd: { gt: now, lte: new Date('2026-10-27T08:00:00Z') },
        }),
      })
    );
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { id: 'a', renewalReminderSentAt: null },
      data: { renewalReminderSentAt: now },
    });
    expect(mail.sendRenewalReminder).toHaveBeenCalledTimes(1);
    expect(mail.sendRenewalReminder).toHaveBeenCalledWith('a@example.com', {
      plan: 'Pro',
      endsAt: new Date('2026-10-25T00:00:00Z'),
    });
  });

  it('does nothing when no period ends soon', async () => {
    prisma.subscription.findMany.mockResolvedValue([]);
    await expect(job.sendReminders(now)).resolves.toEqual({ sent: 0 });
    expect(mail.sendRenewalReminder).not.toHaveBeenCalled();
  });
});
