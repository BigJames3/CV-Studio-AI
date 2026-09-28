import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GenerateCvDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedInUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  profileHints?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;
}

export class OptimizeResumeDto {
  @ApiProperty()
  @IsUUID()
  cvId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bulletText?: string;

  @ApiPropertyOptional({ enum: ['executive', 'factual', 'enthusiastic'] })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobDescription?: string;
}

export class GenerateCoverLetterDto {
  @ApiProperty()
  @IsUUID()
  cvId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20_000)
  jobDescription!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tone?: string;
}

export class CheckAtsDto {
  @ApiProperty()
  @IsUUID()
  cvId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  jobDescription?: string;
}

export class InterviewPrepDto {
  @ApiProperty()
  @IsUUID()
  cvId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20_000)
  jobDescription!: string;

  @ApiPropertyOptional({ enum: ['hr', 'hiring_manager', 'technical'] })
  @IsOptional()
  @IsString()
  interviewType?: string;
}

export class MatchJobDto {
  @ApiProperty()
  @IsUUID()
  cvId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20_000)
  jobDescription!: string;
}

export class CareerAdviceDto {
  @ApiProperty()
  @IsUUID()
  cvId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetRole?: string;
}

export class GeneratePortfolioDto {
  @ApiProperty()
  @IsUUID()
  cvId!: string;

  @ApiPropertyOptional({ enum: ['concise', 'storytelling'] })
  @IsOptional()
  @IsString()
  voice?: string;
}

export class GrammarCheckDto {
  @ApiProperty()
  @IsString()
  @MaxLength(10_000)
  text!: string;

  @ApiPropertyOptional({ example: 'fr-FR' })
  @IsOptional()
  @IsString()
  locale?: string;
}

export class SkillsSuggestDto {
  @ApiProperty()
  @IsUUID()
  cvId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetRole?: string;
}

export class LinkedInImportDto {
  @ApiProperty({
    description:
      'CSV text of the LinkedIn data export files, by file name ' +
      '(Profile.csv, Positions.csv, Education.csv, Skills.csv, Languages.csv, ' +
      'Certifications.csv, Projects.csv, Email Addresses.csv, PhoneNumbers.csv).',
    example: { 'Positions.csv': 'Company Name,Title,Description,Location,Started On,Finished On' },
  })
  @IsObject()
  files!: Record<string, string>;
}

export class ParsePdfDto {
  @ApiProperty({ description: 'Base64 PDF or use multipart in production' })
  @IsString()
  fileBase64!: string;
}
