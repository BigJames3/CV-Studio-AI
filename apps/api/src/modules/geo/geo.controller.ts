import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { getCountryFromHeaders } from '../../common/utils/geo.util';

@ApiTags('Geo')
@ApiBearerAuth('JWT')
@Controller('geo')
export class GeoController {
  @Get('country')
  @ApiOperation({
    summary: 'Country from reverse-proxy geo headers (IP is not stored)',
  })
  getCountry(@Req() req: Request) {
    const country = getCountryFromHeaders(req);
    return {
      country,
      source: country ? 'ip' : 'unknown',
    };
  }
}
