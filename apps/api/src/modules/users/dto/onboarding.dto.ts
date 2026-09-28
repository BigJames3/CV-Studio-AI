import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const CAREER_LEVELS = ['student', 'junior', 'confirmed', 'senior'] as const;
export type CareerLevel = (typeof CAREER_LEVELS)[number];

/** Answers of the guided onboarding (/bienvenue). Every field is optional: steps can be skipped. */
export class OnboardingDto {
  @ApiPropertyOptional({ example: 'Comptable' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  targetRole?: string;

  @ApiPropertyOptional({ enum: CAREER_LEVELS })
  @IsOptional()
  @IsIn(CAREER_LEVELS)
  careerLevel?: CareerLevel;

  @ApiPropertyOptional({ description: 'true when the user finishes or skips the onboarding' })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
