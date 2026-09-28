import type Stripe from 'stripe';
import { ACCOUNT_WEBHOOK_EVENTS, checkStripeConfig, checkStripeEnv } from './stripe-config-check';

const GOOD_ENV = {
  STRIPE_SECRET_KEY: 'sk_test_realkey',
  STRIPE_WEBHOOK_SECRET: 'whsec_account',
  STRIPE_CONNECT_WEBHOOK_SECRET: 'whsec_connect',
  STRIPE_PRICE_PRO_MONTHLY: 'price_pro_m',
  STRIPE_PRICE_PRO_YEARLY: 'price_pro_y',
  STRIPE_PRICE_BUSINESS_MONTHLY: 'price_biz_m',
  STRIPE_PRICE_BUSINESS_YEARLY: 'price_biz_y',
};

function price(
  id: string,
  unitAmount: number,
  interval: 'month' | 'year',
  overrides: Partial<Stripe.Price> = {}
) {
  return {
    id,
    active: true,
    type: 'recurring',
    currency: 'eur',
    unit_amount: unitAmount,
    recurring: { interval, interval_count: 1, trial_period_days: null },
    ...overrides,
  } as unknown as Stripe.Price;
}

const PRICES: Record<string, Stripe.Price> = {
  price_pro_m: price('price_pro_m', 999, 'month'),
  price_pro_y: price('price_pro_y', 9900, 'year'),
  price_biz_m: price('price_biz_m', 2999, 'month'),
  price_biz_y: price('price_biz_y', 29900, 'year'),
};

function fakeStripe(
  overrides: { prices?: Record<string, Stripe.Price>; portalActive?: boolean } = {}
) {
  const prices = overrides.prices ?? PRICES;
  return {
    accounts: { retrieveCurrent: jest.fn().mockResolvedValue({ id: 'acct_1', country: 'FR' }) },
    prices: {
      retrieve: jest.fn(async (id: string) => {
        if (!prices[id]) throw new Error(`No such price: '${id}'`);
        return prices[id];
      }),
    },
    webhookEndpoints: {
      list: jest.fn().mockResolvedValue({
        data: [
          {
            url: 'https://api.example.com/api/v1/payments/webhook',
            status: 'enabled',
            enabled_events: [...ACCOUNT_WEBHOOK_EVENTS],
          },
        ],
      }),
    },
    billingPortal: {
      configurations: {
        list: jest.fn().mockResolvedValue({
          data: overrides.portalActive === false ? [] : [{ active: true }],
        }),
      },
    },
  } as unknown as Stripe & {
    accounts: { retrieveCurrent: jest.Mock };
    webhookEndpoints: { list: jest.Mock };
  };
}

const errors = (results: { level: string; message: string }[]) =>
  results.filter((r) => r.level === 'error').map((r) => r.message);

describe('checkStripeEnv', () => {
  it('flags missing and placeholder secrets as errors', () => {
    const results = checkStripeEnv({ STRIPE_SECRET_KEY: 'sk_test_xxx', STRIPE_WEBHOOK_SECRET: '' });
    expect(errors(results)).toEqual([
      expect.stringContaining('STRIPE_SECRET_KEY'),
      expect.stringContaining('STRIPE_WEBHOOK_SECRET'),
    ]);
  });

  it('blocks a live key unless STRIPE_ALLOW_LIVE is set', () => {
    expect(errors(checkStripeEnv({ ...GOOD_ENV, STRIPE_SECRET_KEY: 'sk_live_real' }))).toEqual([
      expect.stringContaining('STRIPE_ALLOW_LIVE'),
    ]);
    const allowed = checkStripeEnv({
      ...GOOD_ENV,
      STRIPE_SECRET_KEY: 'sk_live_real',
      STRIPE_ALLOW_LIVE: '1',
    });
    expect(errors(allowed)).toEqual([]);
    expect(allowed).toContainEqual({ level: 'warn', message: expect.stringContaining('LIVE') });
  });

  it('rejects a webhook secret that is not a whsec_ value', () => {
    expect(errors(checkStripeEnv({ ...GOOD_ENV, STRIPE_WEBHOOK_SECRET: 'sk_test_oops' }))).toEqual([
      expect.stringContaining('whsec_'),
    ]);
  });

  it('only warns when the Connect webhook secret is missing', () => {
    const { STRIPE_CONNECT_WEBHOOK_SECRET: _omit, ...env } = GOOD_ENV;
    const results = checkStripeEnv(env);
    expect(errors(results)).toEqual([]);
    expect(results).toContainEqual({
      level: 'warn',
      message: expect.stringContaining('STRIPE_CONNECT_WEBHOOK_SECRET'),
    });
  });
});

describe('checkStripeConfig', () => {
  it('passes a correct configuration without errors', async () => {
    const results = await checkStripeConfig(GOOD_ENV, fakeStripe());
    expect(errors(results)).toEqual([]);
    expect(results.filter((r) => r.level === 'ok').length).toBeGreaterThanOrEqual(9);
  });

  it('accepts the ANNUAL alias for yearly prices', async () => {
    const { STRIPE_PRICE_PRO_YEARLY: _omit, ...env } = GOOD_ENV;
    const results = await checkStripeConfig(
      { ...env, STRIPE_PRICE_PRO_ANNUAL: 'price_pro_y' },
      fakeStripe()
    );
    expect(errors(results)).toEqual([]);
  });

  it('reports a price whose amount, currency or interval differs from the app', async () => {
    const results = await checkStripeConfig(
      GOOD_ENV,
      fakeStripe({
        prices: {
          ...PRICES,
          price_pro_m: price('price_pro_m', 1099, 'month'),
          price_pro_y: price('price_pro_y', 9900, 'month', { currency: 'usd' }),
        },
      })
    );
    expect(errors(results)).toEqual([
      expect.stringMatching(/Pro monthly.*10\.99 €.*9\.99 €/),
      expect.stringMatching(/Pro yearly.*expected every 1 year.*USD/),
    ]);
  });

  it('reports missing and unknown price ids', async () => {
    const { STRIPE_PRICE_BUSINESS_MONTHLY: _omit, ...env } = GOOD_ENV;
    const results = await checkStripeConfig(
      { ...env, STRIPE_PRICE_BUSINESS_YEARLY: 'price_typo' },
      fakeStripe()
    );
    expect(errors(results)).toEqual([
      expect.stringContaining('STRIPE_PRICE_BUSINESS_MONTHLY is not set'),
      expect.stringContaining('price_typo not found'),
    ]);
  });

  it('warns when a price carries its own trial', async () => {
    const results = await checkStripeConfig(
      GOOD_ENV,
      fakeStripe({
        prices: {
          ...PRICES,
          price_pro_m: price('price_pro_m', 999, 'month', {
            recurring: { interval: 'month', interval_count: 1, trial_period_days: 14 },
          } as Partial<Stripe.Price>),
        },
      })
    );
    expect(errors(results)).toEqual([]);
    expect(results).toContainEqual({
      level: 'warn',
      message: expect.stringContaining('14-day trial'),
    });
  });

  it('reports a webhook endpoint missing events and an inactive customer portal', async () => {
    const stripe = fakeStripe({ portalActive: false });
    stripe.webhookEndpoints.list.mockResolvedValue({
      data: [
        {
          url: 'https://api.example.com/api/v1/payments/webhook',
          status: 'enabled',
          enabled_events: ['checkout.session.completed'],
        },
      ],
    });
    const results = await checkStripeConfig(GOOD_ENV, stripe);
    expect(errors(results)).toEqual([expect.stringContaining('invoice.payment_failed')]);
    expect(results).toContainEqual({
      level: 'warn',
      message: expect.stringContaining('Customer portal is not activated'),
    });
  });

  it('stops after the account call when Stripe rejects the key', async () => {
    const stripe = fakeStripe();
    stripe.accounts.retrieveCurrent.mockRejectedValue(
      Object.assign(new Error('Invalid API Key provided'), { type: 'StripeAuthenticationError' })
    );
    const results = await checkStripeConfig(GOOD_ENV, stripe);
    expect(errors(results)).toEqual([expect.stringContaining('Stripe rejected STRIPE_SECRET_KEY')]);
    expect(stripe.prices.retrieve).not.toHaveBeenCalled();
  });

  it('tells a network failure apart from a rejected key', async () => {
    const stripe = fakeStripe();
    stripe.accounts.retrieveCurrent.mockRejectedValue(
      Object.assign(new Error('An error occurred with our connection to Stripe'), {
        type: 'StripeConnectionError',
      })
    );
    const results = await checkStripeConfig(GOOD_ENV, stripe);
    expect(errors(results)).toEqual([expect.stringContaining('Could not reach the Stripe API')]);
  });

  it('only runs the environment checks without a Stripe client', async () => {
    const results = await checkStripeConfig({}, null);
    expect(errors(results).length).toBeGreaterThan(0);
  });
});
