import { checkPaystackConfig } from './paystack-config-check';

const levels = (results: { level: string; message: string }[], level: string) =>
  results.filter((r) => r.level === level).map((r) => r.message);

describe('checkPaystackConfig', () => {
  const banks = { listBanks: jest.fn() };

  beforeEach(() => {
    banks.listBanks.mockReset().mockResolvedValue([{ name: 'MTN', code: 'MTN' }]);
  });

  it('passes a test key with XOF prices and a reachable API', async () => {
    const results = await checkPaystackConfig(
      { PAYSTACK_SECRET_KEY: 'sk_test_abc', API_URL: 'https://api.example.com/api/v1' },
      banks
    );
    expect(levels(results, 'error')).toEqual([]);
    expect(levels(results, 'ok')).toEqual(
      expect.arrayContaining([
        'Test Paystack key (sk_test_).',
        'Pro / month: 6 600 XOF.',
        'Paystack API reachable: 1 payout bank(s) / operator(s) in XOF.',
      ])
    );
    expect(levels(results, 'warn')[0]).toContain('https://api.example.com/api/v1/payments/webhook');
    expect(banks.listBanks).toHaveBeenCalledWith('XOF');
  });

  it('reports a missing, malformed or blocked live key', async () => {
    expect(levels(await checkPaystackConfig({}, null), 'error')[0]).toContain('missing');
    expect(
      levels(await checkPaystackConfig({ PAYSTACK_SECRET_KEY: 'pk_test_abc' }, null), 'error')[0]
    ).toContain('sk_test_ or sk_live_');
    expect(
      levels(await checkPaystackConfig({ PAYSTACK_SECRET_KEY: 'sk_live_abc' }, null), 'error')[0]
    ).toContain('PAYSTACK_ALLOW_LIVE');
    expect(
      levels(
        await checkPaystackConfig(
          { PAYSTACK_SECRET_KEY: 'sk_live_abc', PAYSTACK_ALLOW_LIVE: '1' },
          null
        ),
        'error'
      )
    ).toEqual([]);
  });

  it('reports missing prices for a currency without parity, and API failures', async () => {
    banks.listBanks.mockRejectedValue(new Error('Invalid key'));
    const results = await checkPaystackConfig(
      { PAYSTACK_SECRET_KEY: 'sk_test_abc', PAYMENT_CURRENCY: 'GHS' },
      banks
    );
    const errors = levels(results, 'error');
    expect(errors).toContain('Pro / month: no GHS price. Set PAYSTACK_PRICE_PRO_MONTHLY.');
    expect(errors).toContain('Paystack API call failed: Invalid key');
  });
});
