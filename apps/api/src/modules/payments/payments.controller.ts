import { Controller, Get, Headers, Post, Req, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, Public } from '../../common/decorators';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @ApiBearerAuth('JWT')
  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.payments.history(user.id);
  }

  @Public()
  @Post('webhook')
  @ApiExcludeEndpoint()
  webhook(
    @Req() req: { rawBody?: Buffer; body: Buffer | object },
    @Headers('stripe-signature') signature: string
  ) {
    const raw = req.rawBody ?? (Buffer.isBuffer(req.body) ? req.body : null);
    if (!raw || !signature) {
      throw new BadRequestException({
        code: 'INVALID_WEBHOOK',
        message: 'Missing raw body or stripe-signature',
      });
    }
    return this.payments.handleStripeWebhook(raw, signature);
  }
}
