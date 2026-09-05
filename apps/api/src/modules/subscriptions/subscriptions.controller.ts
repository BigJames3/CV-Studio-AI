import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { PlansService } from '../plans/plans.service';
import { CheckoutDto, UpdateSubscriptionDto, CreateSubscriptionDto } from './dto/subscription.dto';
import { CurrentUser, AuthUser, Public } from '../../common/decorators';

@ApiTags('Subscriptions')
@ApiBearerAuth('JWT')
@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly plans: PlansService
  ) {}

  @Public()
  @Get('plans')
  @ApiOperation({
    deprecated: true,
    summary: 'Deprecated alias of GET /plans — public catalog of active plans',
  })
  listPlans() {
    return this.plans.findAll();
  }

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
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptions.update(user.id, dto);
  }

  @Delete('me/cancel')
  cancel(@CurrentUser() user: AuthUser) {
    return this.subscriptions.cancel(user.id);
  }

  @Post('checkout')
  @ApiOperation({
    summary: 'Create checkout session (Stripe by default; CinetPay coming in Phase 2)',
  })
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.subscriptions.checkout(user.id, dto);
  }
}
