import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ enum: ['pro', 'business'] })
  @IsIn(['pro', 'business'])
  plan!: 'pro' | 'business';

  @ApiProperty({ enum: ['month', 'year'] })
  @IsIn(['month', 'year'])
  interval!: 'month' | 'year';

  @ApiPropertyOptional({ enum: ['stripe', 'cinetpay'] })
  @IsOptional()
  @IsIn(['stripe', 'cinetpay'])
  paymentMethod?: 'stripe' | 'cinetpay';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: ['pro', 'business'] })
  @IsOptional()
  @IsIn(['pro', 'business'])
  plan?: 'pro' | 'business';

  @ApiPropertyOptional({ enum: ['month', 'year'] })
  @IsOptional()
  @IsIn(['month', 'year'])
  interval?: 'month' | 'year';
}

export class CreateSubscriptionDto {
  @ApiProperty({ enum: ['free', 'pro', 'business'] })
  @IsIn(['free', 'pro', 'business'])
  plan!: 'free' | 'pro' | 'business';
}
