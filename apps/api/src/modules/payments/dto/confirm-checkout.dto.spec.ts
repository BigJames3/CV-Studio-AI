import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ConfirmCheckoutDto } from './confirm-checkout.dto';

const errors = (reference: unknown) =>
  validateSync(plainToInstance(ConfirmCheckoutDto, { reference }));

describe('ConfirmCheckoutDto', () => {
  it('accepts a Paystack reference', () => {
    expect(errors('sub_3f2b6c1d9e8a4b7c8d9e0f1a2b3c4d5e')).toHaveLength(0);
    expect(errors('T123456789')).toHaveLength(0);
  });

  it('rejects anything that could reach the Paystack URL path or query', () => {
    expect(errors('../transaction/list')).not.toHaveLength(0);
    expect(errors('ref?perPage=1')).not.toHaveLength(0);
    expect(errors('abc')).not.toHaveLength(0);
    expect(errors(undefined)).not.toHaveLength(0);
  });
});
