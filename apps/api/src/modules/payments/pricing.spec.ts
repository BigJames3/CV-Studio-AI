import { addInterval, planChargeAmount, prepaidPeriod } from './pricing';

const CATALOG = { monthly: 9.99, yearly: 99 };
const DAY = 24 * 60 * 60 * 1000;

describe('planChargeAmount', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('converts EUR catalog prices to XOF at the fixed parity, rounded up to 100 F', () => {
    expect(planChargeAmount('pro', 'month', CATALOG, 'XOF')).toBe(6600_00);
    expect(planChargeAmount('pro', 'year', CATALOG, 'XOF')).toBe(65000_00);
    expect(planChargeAmount('business', 'month', { monthly: 29.99, yearly: 299 }, 'XOF')).toBe(
      19700_00
    );
  });

  it('charges EUR prices as is, and honours a configured price', () => {
    expect(planChargeAmount('pro', 'month', CATALOG, 'EUR')).toBe(999);
    process.env.PAYSTACK_PRICE_PRO_MONTHLY = '5000';
    expect(planChargeAmount('pro', 'month', CATALOG, 'XOF')).toBe(5000_00);
  });

  it('has no price for another currency without configuration, or a free catalog row', () => {
    expect(planChargeAmount('pro', 'month', CATALOG, 'GHS')).toBeNull();
    expect(planChargeAmount('pro', 'month', { monthly: 0, yearly: 0 }, 'XOF')).toBeNull();
    process.env.PAYSTACK_PRICE_PRO_MONTHLY = 'abc';
    expect(planChargeAmount('pro', 'month', CATALOG, 'GHS')).toBeNull();
  });
});

describe('prepaidPeriod', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  const monthlyPrice = (plan: 'pro' | 'business') => (plan === 'pro' ? 10 : 30);

  it('starts now when nothing is active', () => {
    expect(
      prepaidPeriod({ now, plan: 'pro', interval: 'month', current: null, monthlyPrice })
    ).toEqual({ start: now, end: new Date('2026-11-20T10:00:00Z') });
    const expired = {
      plan: 'pro' as const,
      start: new Date('2026-09-01T00:00:00Z'),
      end: new Date('2026-10-01T00:00:00Z'),
    };
    expect(
      prepaidPeriod({ now, plan: 'pro', interval: 'year', current: expired, monthlyPrice })
    ).toEqual({ start: now, end: new Date('2027-10-20T10:00:00Z') });
  });

  it('adds an early renewal of the same plan after the current end', () => {
    const current = {
      plan: 'pro' as const,
      start: new Date('2026-10-01T00:00:00Z'),
      end: new Date('2026-11-01T00:00:00Z'),
    };
    expect(prepaidPeriod({ now, plan: 'pro', interval: 'month', current, monthlyPrice })).toEqual({
      start: current.start,
      end: new Date('2026-12-01T00:00:00Z'),
    });
  });

  it('credits unused time at the price ratio when the plan changes', () => {
    const pro = { plan: 'pro' as const, start: now, end: new Date(now.getTime() + 30 * DAY) };
    // 30 days of Pro (10) are worth 10 days of Business (30).
    expect(
      prepaidPeriod({ now, plan: 'business', interval: 'month', current: pro, monthlyPrice })
    ).toEqual({ start: now, end: new Date(addInterval(now, 'month').getTime() + 10 * DAY) });

    const business = {
      plan: 'business' as const,
      start: now,
      end: new Date(now.getTime() + 5 * DAY),
    };
    expect(
      prepaidPeriod({ now, plan: 'pro', interval: 'month', current: business, monthlyPrice })
    ).toEqual({ start: now, end: new Date(addInterval(now, 'month').getTime() + 15 * DAY) });
  });

  it('credits nothing when a price is unknown', () => {
    const pro = { plan: 'pro' as const, start: now, end: new Date(now.getTime() + 30 * DAY) };
    expect(
      prepaidPeriod({
        now,
        plan: 'business',
        interval: 'month',
        current: pro,
        monthlyPrice: () => 0,
      })
    ).toEqual({ start: now, end: addInterval(now, 'month') });
  });
});
