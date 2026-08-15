import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ConfirmPurchaseDto {
  @ApiProperty({ example: 'pi_3Nxxxxxxxx' })
  @IsString()
  @Matches(/^pi_[A-Za-z0-9]+$/, { message: 'Invalid payment intent id' })
  paymentIntentId!: string;
}
