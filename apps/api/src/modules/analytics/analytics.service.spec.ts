import { AnalyticsService } from './analytics.service';
import { captureServerEvent } from '../../observability/posthog';

jest.mock('../../observability/posthog', () => {
  const actual = jest.requireActual(
    '../../observability/posthog'
  ) as typeof import('../../observability/posthog');
  return {
    ...actual,
    captureServerEvent: jest.fn(),
    getMarketingSpendMonthly: jest.fn(() => 1000),
  };
});

describe('AnalyticsService', () => {
  const prisma = {
    analyticsEvent: { create: jest.fn() },
    user: { count: jest.fn() },
    cv: { count: jest.fn(), aggregate: jest.fn() },
    atsReport: { findFirst: jest.fn() },
  };

  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService(prisma as never);
  });

  it('dual-writes track events to DB and PostHog and strips secrets', async () => {
    prisma.analyticsEvent.create.mockResolvedValue({
      id: 'evt-1',
      eventType: 'signup_succeeded',
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    const result = await service.track('user-1', {
      event: 'signup_succeeded',
      properties: { password: 'nope', plan: 'free' },
      sessionId: 'sid',
      platform: 'web',
    });

    expect(result.event).toBe('signup_succeeded');
    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          eventType: 'signup_succeeded',
          eventData: expect.not.objectContaining({ password: 'nope' }),
        }),
      })
    );
    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: 'user-1',
        event: 'signup_succeeded',
        properties: expect.objectContaining({ plan: 'free', platform: 'web' }),
      })
    );
    expect((captureServerEvent as jest.Mock).mock.calls[0][0].properties.password).toBeUndefined();
  });

  it('computes CAC from marketing spend / new paid customers', async () => {
    prisma.user.count.mockResolvedValue(10);
    const kpis = await service.unitEconomics();
    expect(kpis.marketingSpendMonthly).toBe(1000);
    expect(kpis.newPaidCustomers).toBe(10);
    expect(kpis.cac).toBe(100);
  });

  it('returns null CAC when there are no paid customers', async () => {
    prisma.user.count.mockResolvedValue(0);
    const kpis = await service.unitEconomics();
    expect(kpis.cac).toBeNull();
  });
});
