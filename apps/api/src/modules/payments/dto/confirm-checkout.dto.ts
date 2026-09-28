import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class ConfirmCheckoutDto {
  @ApiProperty({ example: 'cs_test_a1B2c3' })
  @Matches(/^cs_(test|live)_[A-Za-z0-9]{1,255}$/, {
    message: 'sessionId must be a Stripe Checkout Session id',
  })
  sessionId!: string;
}
