import {
  availablePaymentMethods,
  isCinetpayConfiguredFromEnv,
  isCinetpayFailClosed,
  isStripeConfiguredFromEnv,
} from './payment-env';

describe('payment-env', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('treats placeholder Stripe keys as unconfigured', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    expect(isStripeConfiguredFromEnv()).toBe(false);
  });

  it('requires both CinetPay key and site id', () => {
    process.env.CINETPAY_API_KEY = 'real_key';
    process.env.CINETPAY_SITE_ID = '';
    expect(isCinetpayConfiguredFromEnv()).toBe(false);
    process.env.CINETPAY_SITE_ID = 'site_1';
    expect(isCinetpayConfiguredFromEnv()).toBe(true);
  });

  it('defaults fail-closed in production', () => {
    delete process.env.CINETPAY_FAIL_CLOSED;
    process.env.NODE_ENV = 'production';
    expect(isCinetpayFailClosed()).toBe(true);
    process.env.NODE_ENV = 'development';
    expect(isCinetpayFailClosed()).toBe(false);
    process.env.CINETPAY_FAIL_CLOSED = 'true';
    expect(isCinetpayFailClosed()).toBe(true);
    process.env.CINETPAY_FAIL_CLOSED = 'false';
    expect(isCinetpayFailClosed()).toBe(false);
  });

  it('exposes configured providers without leaking secrets', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_real';
    process.env.CINETPAY_API_KEY = '';
    process.env.CINETPAY_SITE_ID = '';
    process.env.CINETPAY_FAIL_CLOSED = 'true';
    expect(availablePaymentMethods()).toEqual({
      stripe: true,
      cinetpay: false,
      cinetpayFailClosed: true,
    });
  });
});
