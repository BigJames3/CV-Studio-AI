import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, Public, RequireEntitlement } from '../../common/decorators';
import { EntitlementsGuard } from '../../common/guards/entitlements.guard';
import { ConfirmPurchaseDto } from './dto/confirm-purchase.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateSellerTemplateDto } from './dto/create-seller-template.dto';
import { MarketplaceService } from './marketplace.service';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Public()
  @Get('templates')
  @ApiOperation({ summary: 'Browse marketplace listings (no designData)' })
  list(@Query('q') q?: string, @Query('category') category?: string) {
    return this.marketplace.listPublished({ q, category });
  }

  @Public()
  @Get('templates/:id')
  @ApiOperation({ summary: 'Listing preview — increments impressions, omits designData' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketplace.get(id);
  }

  @ApiBearerAuth('JWT')
  @Get('templates/:id/design')
  @ApiOperation({ summary: 'Full designData — owner or purchaser only' })
  getDesign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.marketplace.getDesign(user.id, id);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(EntitlementsGuard)
  @RequireEntitlement('marketplace:buy')
  @Post('templates/:id/payment-intent')
  @ApiOperation({ summary: 'Create Stripe PaymentIntent for a listing' })
  createPaymentIntent(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.marketplace.createPaymentIntent(user.id, id);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(EntitlementsGuard)
  @RequireEntitlement('marketplace:buy')
  @Post('templates/:id/purchase')
  purchase(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ConfirmPurchaseDto
  ) {
    return this.marketplace.purchase(user.id, id, body.paymentIntentId);
  }

  @ApiBearerAuth('JWT')
  @Post('templates/:id/reviews')
  review(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { rating: number; comment?: string }
  ) {
    return this.marketplace.addReview(user.id, id, body);
  }

  @ApiBearerAuth('JWT')
  @Post('seller/apply')
  apply(
    @CurrentUser() user: AuthUser,
    @Body() body: { displayName: string; slug: string; country: string; bio?: string }
  ) {
    return this.marketplace.applySeller(user.id, body);
  }

  @ApiBearerAuth('JWT')
  @Get('seller/me')
  sellerMe(@CurrentUser() user: AuthUser) {
    return this.marketplace.sellerMe(user.id);
  }

  @ApiBearerAuth('JWT')
  @Get('seller/templates')
  @ApiOperation({ summary: 'Templates owned by the current user' })
  myTemplates(@CurrentUser() user: AuthUser) {
    return this.marketplace.listMyTemplates(user.id);
  }

  @ApiBearerAuth('JWT')
  @Post('seller/templates')
  @ApiOperation({ summary: 'Create a seller-owned template (sets createdBy)' })
  createTemplate(@CurrentUser() user: AuthUser, @Body() body: CreateSellerTemplateDto) {
    return this.marketplace.createSellerTemplate(user.id, body);
  }

  @ApiBearerAuth('JWT')
  @Post('seller/listings')
  createListing(@CurrentUser() user: AuthUser, @Body() body: CreateListingDto) {
    return this.marketplace.submitListing(user.id, body);
  }

  @ApiBearerAuth('JWT')
  @Get('sales')
  @ApiOperation({ summary: 'Seller sales dashboard' })
  sales(@CurrentUser() user: AuthUser) {
    return this.marketplace.sales(user.id);
  }

  @ApiBearerAuth('JWT')
  @Get('seller/analytics')
  sellerAnalytics(@CurrentUser() user: AuthUser) {
    return this.marketplace.sellerAnalytics(user.id);
  }

  @ApiBearerAuth('JWT')
  @Post('purchases/:id/disputes')
  dispute(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { type: 'quality' | 'access' | 'billing' | 'ip'; reason: string }
  ) {
    return this.marketplace.openDispute(user.id, id, body);
  }
}
