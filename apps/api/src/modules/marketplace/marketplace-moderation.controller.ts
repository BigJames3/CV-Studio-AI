import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListingStatus, ModerationDecision } from '@prisma/client';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { ModerateListingDto } from './dto/moderate-listing.dto';
import { MarketplaceModerationService } from './marketplace-moderation.service';
import { MarketplaceModeratorGuard } from './marketplace-moderator.guard';

@ApiTags('Marketplace moderation')
@ApiBearerAuth('JWT')
@UseGuards(MarketplaceModeratorGuard)
@Controller('marketplace/moderation')
export class MarketplaceModerationController {
  constructor(private readonly moderation: MarketplaceModerationService) {}

  @Get('listings')
  @ApiOperation({ summary: 'Listings waiting for a decision (moderators only)' })
  list(
    @Query('status', new ParseEnumPipe(ListingStatus, { optional: true })) status?: ListingStatus
  ) {
    return this.moderation.listForReview(status);
  }

  @Post('listings/:id/:decision')
  @ApiOperation({ summary: 'approve | request_changes | reject | suspend (moderators only)' })
  decide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('decision', new ParseEnumPipe(ModerationDecision)) decision: ModerationDecision,
    @Body() body: ModerateListingDto
  ) {
    return this.moderation.decide(user.id, id, decision, body);
  }
}
