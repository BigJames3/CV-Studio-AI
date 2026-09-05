import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PlansService } from './plans.service';

/**
 * Public catalog of billing plans. Used by pricing, billing, and checkout.
 */
@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /**
   * List all active plans with pricing and entitlements.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Public catalog of billing plans (prices + entitlements)' })
  list() {
    return this.plansService.findAll();
  }
}
