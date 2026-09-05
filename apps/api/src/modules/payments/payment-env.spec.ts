import {
  availablePaymentMethods,
  isCinetpayConfiguredFromEnv,
  isCinetpayFailClosed,
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
  });

  it('requires both CinetPay key and site id', () => {
    process.env.CINETPAY_API_KEY = 'real_key';
    process.env.CINETPAY_SITE_ID = '';
    expect(isCinetpayConfiguredFromEnv()).toBe(false);
    process.env.CINETPAY_SITE_ID = 'site_1';
    expect(isCinetpayConfiguredFromEnv()).toBe(true);
  });

  it('should detect CinetPay configured when both keys present', () => {
    process.env.CINETPAY_API_KEY = 'real_key';
    process.env.CINETPAY_SITE_ID = 'site_1';
    expect(isCinetpayConfiguredFromEnv()).toBe(true);
    expect(availablePaymentMethods().cinetpay).toBe(true);
  });

  it('should report CinetPay unconfigured when keys missing', () => {
    delete process.env.CINETPAY_API_KEY;
    delete process.env.CINETPAY_SITE_ID;
    expect(isCinetpayConfiguredFromEnv()).toBe(false);
    expect(availablePaymentMethods().cinetpay).toBe(false);
  });

  it('enables Stripe fail-closed in production or when STRIPE_FAIL_CLOSED=1', () => {
    delete process.env.STRIPE_FAIL_CLOSED;
    process.env.NODE_ENV = 'production';
    expect(isStripeFailClosed()).toBe(true);
    process.env.NODE_ENV = 'development';
    expect(isStripeFailClosed()).toBe(false);
    process.env.STRIPE_FAIL_CLOSED = '1';
    expect(isStripeFailClosed()).toBe(true);
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
