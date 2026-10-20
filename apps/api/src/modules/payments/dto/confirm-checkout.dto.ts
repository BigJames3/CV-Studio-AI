import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class ConfirmCheckoutDto {
  @ApiProperty({ example: 'sub_3f2b6c1d9e8a4b7c8d9e0f1a2b3c4d5e' })
  @Matches(/^[A-Za-z0-9_.=-]{6,100}$/, {
    message: 'reference must be a Paystack transaction reference',
  })
  reference!: string;
}
