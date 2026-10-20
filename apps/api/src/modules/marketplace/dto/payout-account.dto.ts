import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class PayoutAccountDto {
  @ApiProperty({
    description: 'Paystack bank or mobile money operator code (GET seller/payout-banks)',
  })
  @Matches(/^[A-Za-z0-9_-]{1,32}$/, { message: 'bankCode must be a Paystack bank code' })
  bankCode!: string;

  @ApiProperty({ description: 'Account or mobile money number' })
  @Matches(/^[0-9]{6,20}$/, { message: 'accountNumber must be 6 to 20 digits' })
  accountNumber!: string;
}
