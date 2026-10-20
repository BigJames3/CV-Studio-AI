import {
  availablePaymentMethods,
  isPaymentFailClosed,
  isPaystackConfiguredFromEnv,
  paymentCurrency,
  paystackSecretForClient,
} from './payment-env';

describe('payment-env', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('treats placeholder Paystack keys as unconfigured', () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_xxx';
    expect(isPaystackConfiguredFromEnv()).toBe(false);
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_placeholder';
    expect(isPaystackConfiguredFromEnv()).toBe(false);
    expect(paystackSecretForClient()).toBeNull();
  });

  it('enables fail-closed by default (opt out with 0/false/off)', () => {
    delete process.env.PAYMENT_FAIL_CLOSED;
    expect(isPaymentFailClosed()).toBe(true);
    process.env.PAYMENT_FAIL_CLOSED = '1';
    expect(isPaymentFailClosed()).toBe(true);
    process.env.PAYMENT_FAIL_CLOSED = '0';
    expect(isPaymentFailClosed()).toBe(false);
  });

  it('exposes configured providers without leaking secrets', () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_real';
    expect(availablePaymentMethods()).toEqual({ paystack: true });
  });

  it('blocks a live key unless PAYSTACK_ALLOW_LIVE is set', () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_live_real';
    delete process.env.PAYSTACK_ALLOW_LIVE;
    expect(availablePaymentMethods().paystack).toBe(false);
    process.env.PAYSTACK_ALLOW_LIVE = '1';
    expect(paystackSecretForClient()).toBe('sk_live_real');
  });

  it('charges in XOF unless PAYMENT_CURRENCY names another ISO code', () => {
    delete process.env.PAYMENT_CURRENCY;
    expect(paymentCurrency()).toBe('XOF');
    process.env.PAYMENT_CURRENCY = 'ghs';
    expect(paymentCurrency()).toBe('GHS');
    process.env.PAYMENT_CURRENCY = 'euros';
    expect(paymentCurrency()).toBe('XOF');
  });
});
