import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ConfirmCheckoutDto } from './confirm-checkout.dto';

const errorsFor = (sessionId: unknown) =>
  validateSync(plainToInstance(ConfirmCheckoutDto, { sessionId }));

describe('ConfirmCheckoutDto', () => {
  it('accepts Stripe Checkout Session ids', () => {
    expect(errorsFor('cs_test_a1B2c3')).toHaveLength(0);
    expect(errorsFor('cs_live_a1B2c3')).toHaveLength(0);
  });

  it.each([undefined, '', '{CHECKOUT_SESSION_ID}', 'sub_123', 'cs_test_a/../b', 'cs_test_'])(
    'rejects %p',
    (value) => {
      expect(errorsFor(value).length).toBeGreaterThan(0);
    }
  );
});
