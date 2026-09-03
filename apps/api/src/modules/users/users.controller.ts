import { Controller, Get, Patch, Delete, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser, AuthUser } from '../../common/decorators';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @Get('me/export')
  @ApiOperation({ summary: 'GDPR/CCPA data export (JSON)' })
  exportMe(@CurrentUser() user: AuthUser) {
    return this.users.exportMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateUserDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Erase account, CV PII, and cancel billing (GDPR Art. 17)' })
  deleteMe(@CurrentUser() user: AuthUser) {
    return this.users.deleteMe(user.id);
  }
}
