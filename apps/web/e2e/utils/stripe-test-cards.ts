export const STRIPE_CARDS = {
  success: {
    number: '4242424242424242',
    exp: '1234',
    cvc: '123',
    zip: '10001',
  },
  declined: {
    number: '4000000000000002',
    exp: '1234',
    cvc: '123',
    zip: '10001',
  },
  expired: {
    number: '4000000000000069',
    exp: '1234',
    cvc: '123',
    zip: '10001',
  },
  insufficientFunds: {
    number: '4000000000009995',
    exp: '1234',
    cvc: '123',
    zip: '10001',
  },
  invalid: {
    number: '1234567890123456',
    exp: '1234',
    cvc: '123',
    zip: '10001',
  },
} as const;

export type StripeTestCard = (typeof STRIPE_CARDS)[keyof typeof STRIPE_CARDS];
