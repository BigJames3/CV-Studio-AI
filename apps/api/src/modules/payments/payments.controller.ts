import {
  Controller,
  Get,
  Headers,
  Post,
  Req,
  Param,
  Logger,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, Public } from '../../common/decorators';
import { PaymentsService } from './payments.service';
import { CinetpayGateway } from './gateways/cinetpay.gateway';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly cinetpayGateway: CinetpayGateway
  ) {}

  @ApiBearerAuth('JWT')
  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.payments.history(user.id);
  }

  @ApiBearerAuth('JWT')
  @Get('methods')
  @ApiOperation({ summary: 'Which payment providers are configured' })
  paymentMethods() {
    return this.payments.availableMethods();
  }

  @ApiBearerAuth('JWT')
  @Get('status/:transactionId')
  @ApiOperation({ summary: 'Poll payment status by transaction id' })
  getPaymentStatus(@CurrentUser() user: AuthUser, @Param('transactionId') transactionId: string) {
    return this.payments.getStatus(user.id, transactionId);
  }

  @ApiBearerAuth('JWT')
  @Get('cinetpay/:transactionId')
  @ApiOperation({ summary: 'Poll CinetPay payment status' })
  cinetpayStatus(@CurrentUser() user: AuthUser, @Param('transactionId') transactionId: string) {
    return this.cinetpayGateway.getPaymentStatus(transactionId, user.id);
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

  @Public()
  @SkipThrottle()
  @Get('webhook/cinetpay')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  cinetpayWebhookPing() {
    return this.cinetpayGateway.handleCinetpayNotify({}, 'GET');
  }

  @Public()
  @SkipThrottle()
  @Post('webhook/cinetpay')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async cinetpayWebhook(@Req() req: { body?: Record<string, unknown>; method: string }) {
    const raw = req.body ?? {};
    const body: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string') body[key] = value;
    }
    const tx = body.cpm_trans_id || body.transaction_id;
    this.logger.log(`CinetPay webhook received: ${tx ?? 'unknown'}`);
    try {
      return await this.cinetpayGateway.handleCinetpayNotify(body, req.method);
    } catch (error) {
      this.logger.error(
        `CinetPay webhook error: ${error instanceof Error ? error.message : String(error)}`
      );
      return { received: true };
    }
  }
}
