import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  Patch,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CheckoutDto, UpdateSubscriptionDto, CreateSubscriptionDto } from './dto/subscription.dto';
import { CurrentUser, AuthUser } from '../../common/decorators';

@ApiTags('Subscriptions')
@ApiBearerAuth('JWT')
@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Post()
  @ApiOperation({
    deprecated: true,
    summary: 'Disabled — paid plans are granted only via checkout + verified webhooks',
  })
  create(@CurrentUser() user: AuthUser, @Body() _dto: CreateSubscriptionDto) {
    this.logger.warn(`Blocked direct subscription create by user ${user.id}`);
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Direct subscription creation is disabled. Use POST /subscriptions/checkout.',
    });
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.subscriptions.me(user.id);
  }

  @Patch('me')
  @ApiOperation({
    deprecated: true,
    summary: 'Disabled — change plan with POST /subscriptions/checkout',
  })
  update(@CurrentUser() user: AuthUser, @Body() _dto: UpdateSubscriptionDto) {
    this.logger.warn(`Blocked PATCH /subscriptions/me by user ${user.id}`);
    throw new BadRequestException({
      code: 'USE_CHECKOUT',
      message: 'To change plan, use POST /subscriptions/checkout.',
    });
  }

  @Delete('me/cancel')
  cancel(@CurrentUser() user: AuthUser) {
    return this.subscriptions.cancel(user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('me/portal')
  @ApiOperation({ summary: 'Open the Stripe Customer Portal (update card, invoices)' })
  billingPortal(@CurrentUser() user: AuthUser) {
    return this.subscriptions.billingPortal(user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('checkout')
  @ApiOperation({
    summary: 'Create a Stripe checkout session, or change plan in place for a Stripe subscriber',
  })
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.subscriptions.checkout(user.id, dto);
  }
}
