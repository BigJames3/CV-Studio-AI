import { Body, Controller, Get, Headers, Post, Req, BadRequestException } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, Public } from '../../common/decorators';
import { PaymentsService } from './payments.service';
import { ConfirmCheckoutDto } from './dto/confirm-checkout.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @ApiBearerAuth('JWT')
  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.payments.history(user.id);
  }

  @ApiBearerAuth('JWT')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('checkout/confirm')
  @ApiOperation({
    summary: 'Confirm a Paystack payment with Paystack (no webhook wait)',
  })
  confirmCheckout(@CurrentUser() user: AuthUser, @Body() dto: ConfirmCheckoutDto) {
    return this.payments.confirmCheckout(user.id, dto.reference);
  }

  @Public()
  @SkipThrottle()
  @Post('webhook')
  @ApiExcludeEndpoint()
  webhook(
    @Req() req: { rawBody?: Buffer; body: Buffer | object },
    @Headers('x-paystack-signature') signature: string
  ) {
    const raw = req.rawBody ?? (Buffer.isBuffer(req.body) ? req.body : null);
    if (!raw || !signature) {
      throw new BadRequestException({
        code: 'INVALID_WEBHOOK',
        message: 'Missing raw body or x-paystack-signature',
      });
    }
    return this.payments.handlePaystackWebhook(raw, signature);
  }
}
