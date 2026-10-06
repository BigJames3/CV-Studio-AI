import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators';
import { AddTeamMemberDto, CreateTeamDto, UpdateTeamMemberDto } from './dto/team.dto';
import { TeamsService } from './teams.service';

@ApiTags('Teams')
@ApiBearerAuth('JWT')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'Teams I belong to' })
  list(@CurrentUser() user: AuthUser) {
    return this.teams.listMine(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create my team (Business, one owned team per user)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teams.create(user.id, dto.name);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teams.get(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teams.remove(user.id, id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add an existing account to the team by email' })
  addMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTeamMemberDto
  ) {
    return this.teams.addMember(user.id, id, dto.email, dto.role ?? 'editor');
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateTeamMemberDto
  ) {
    return this.teams.updateMember(user.id, id, memberId, dto.role);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove a member, or leave the team (own membership)' })
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string
  ) {
    return this.teams.removeMember(user.id, id, memberId);
  }
}
