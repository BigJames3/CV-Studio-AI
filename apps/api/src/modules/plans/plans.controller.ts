import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PlansService } from './plans.service';

/**
 * Public catalog of billing plans — pricing page, billing page, checkout.
 */
@ApiTags('Plans')
@Controller({ path: 'plans', version: '1' })
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active plans with prices and entitlements' })
  list() {
    return this.plansService.findAll();
  }
}
