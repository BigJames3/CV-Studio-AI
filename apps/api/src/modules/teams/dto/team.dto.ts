import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** Roles a manager can hand out. `owner` is only set when the team is created. */
export const ASSIGNABLE_TEAM_ROLES = ['admin', 'editor', 'viewer'] as const;
export type AssignableTeamRole = (typeof ASSIGNABLE_TEAM_ROLES)[number];

export class CreateTeamDto {
  @ApiProperty({ example: 'Équipe recrutement' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;
}

export class AddTeamMemberDto {
  @ApiProperty({ description: 'Email of an existing CV Studio account' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ enum: ASSIGNABLE_TEAM_ROLES, default: 'editor' })
  @IsOptional()
  @IsIn(ASSIGNABLE_TEAM_ROLES)
  role?: AssignableTeamRole;
}

export class UpdateTeamMemberDto {
  @ApiProperty({ enum: ASSIGNABLE_TEAM_ROLES })
  @IsIn(ASSIGNABLE_TEAM_ROLES)
  role!: AssignableTeamRole;
}

export class ShareCvWithTeamDto {
  @ApiProperty({ nullable: true, description: 'Team to share with, or null to stop sharing' })
  @IsOptional()
  @IsUUID()
  teamId!: string | null;
}
