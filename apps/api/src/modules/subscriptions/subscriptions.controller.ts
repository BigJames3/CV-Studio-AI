import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CheckoutDto, UpdateSubscriptionDto, CreateSubscriptionDto } from './dto/subscription.dto';
import { CurrentUser, AuthUser } from '../../common/decorators';

@ApiTags('Subscriptions')
@ApiBearerAuth('JWT')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create/attach subscription record (prefer checkout)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptions.create(user.id, dto);
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

  @Post('me/reactivate')
  @ApiOperation({ summary: 'Undo cancel_at_period_end (reactivate subscription)' })
  reactivate(@CurrentUser() user: AuthUser) {
    return this.subscriptions.reactivate(user.id);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create Stripe Checkout Session' })
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.subscriptions.checkout(user.id, dto);
  }

  @Post('portal')
  @ApiOperation({ summary: 'Create Stripe Customer Portal session' })
  portal(@CurrentUser() user: AuthUser) {
    return this.subscriptions.createBillingPortalSession(user.id);
  }
}
