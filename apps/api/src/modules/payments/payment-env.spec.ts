import {
  availablePaymentMethods,
  expandableStripeId,
  isStripeConfiguredFromEnv,
  isStripeFailClosed,
} from './payment-env';

describe('payment-env', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('treats placeholder Stripe keys as unconfigured', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    expect(isStripeConfiguredFromEnv()).toBe(false);
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    expect(isStripeConfiguredFromEnv()).toBe(false);
  });

  it('enables Stripe fail-closed by default (opt out with 0/false/off)', () => {
    delete process.env.STRIPE_FAIL_CLOSED;
    process.env.NODE_ENV = 'development';
    expect(isStripeFailClosed()).toBe(true);
    process.env.NODE_ENV = 'production';
    expect(isStripeFailClosed()).toBe(true);
    process.env.STRIPE_FAIL_CLOSED = '1';
    expect(isStripeFailClosed()).toBe(true);
    process.env.STRIPE_FAIL_CLOSED = '0';
    expect(isStripeFailClosed()).toBe(false);
  });

  it('exposes configured providers without leaking secrets', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_real';
    expect(availablePaymentMethods()).toEqual({ stripe: true });
  });

  it('does not advertise Stripe when a live key is blocked', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_real';
    delete process.env.STRIPE_ALLOW_LIVE;
    expect(availablePaymentMethods().stripe).toBe(false);
  });

  it('extracts ids from Stripe expandable fields', () => {
    expect(expandableStripeId('cus_1')).toBe('cus_1');
    expect(expandableStripeId({ id: 'cus_2' })).toBe('cus_2');
    expect(expandableStripeId(null)).toBeUndefined();
    expect(expandableStripeId(undefined)).toBeUndefined();
  });
});
