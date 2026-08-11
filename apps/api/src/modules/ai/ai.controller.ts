import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import {
  GenerateCvDto,
  OptimizeResumeDto,
  GenerateCoverLetterDto,
  CheckAtsDto,
  InterviewPrepDto,
  MatchJobDto,
  CareerAdviceDto,
  GeneratePortfolioDto,
  GrammarCheckDto,
  SkillsSuggestDto,
  LinkedInImportDto,
  ParsePdfDto,
} from './dto/ai.dto';
import { CurrentUser, AuthUser, RequireEntitlement } from '../../common/decorators';
import { EntitlementsGuard } from '../../common/guards/entitlements.guard';

@ApiTags('AI')
@ApiBearerAuth('JWT')
@UseGuards(EntitlementsGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('generate-cv')
  @RequireEntitlement('ai:generate')
  @ApiOperation({ summary: 'CV Generator — LinkedIn / PDF facts / scratch' })
  generateCv(@CurrentUser() user: AuthUser, @Body() dto: GenerateCvDto) {
    return this.ai.generateCv(user.id, dto);
  }

  @Post('optimize-resume')
  @RequireEntitlement('ai:optimize')
  @ApiOperation({ summary: 'Resume Optimizer — 3 factual variants' })
  optimize(@CurrentUser() user: AuthUser, @Body() dto: OptimizeResumeDto) {
    return this.ai.optimizeResume(user.id, dto);
  }

  @Post('generate-cover-letter')
  @RequireEntitlement('ai:cover_letter')
  coverLetter(@CurrentUser() user: AuthUser, @Body() dto: GenerateCoverLetterDto) {
    return this.ai.generateCoverLetter(user.id, dto);
  }

  @Post('match-job')
  @RequireEntitlement('ai:optimize')
  @ApiOperation({ summary: 'Job Matcher — score + gaps + safe edits' })
  matchJob(@CurrentUser() user: AuthUser, @Body() dto: MatchJobDto) {
    return this.ai.matchJob(user.id, dto);
  }

  @Post('check-ats')
  @RequireEntitlement('ai:ats')
  checkAts(@CurrentUser() user: AuthUser, @Body() dto: CheckAtsDto) {
    return this.ai.checkAts(user.id, dto);
  }

  @Post('explain-ats-score')
  @RequireEntitlement('ai:ats')
  @ApiOperation({ summary: 'ATS score explanation + quick wins (quota-gated)' })
  explainAts(@CurrentUser() user: AuthUser, @Body() dto: CheckAtsDto) {
    return this.ai.explainAtsScore(user.id, dto);
  }

  @Post('interview-prep')
  @RequireEntitlement('ai:interview')
  interviewPrep(@CurrentUser() user: AuthUser, @Body() dto: InterviewPrepDto) {
    return this.ai.interviewPrep(user.id, dto);
  }

  @Post('career-advice')
  @RequireEntitlement('ai:optimize')
  careerAdvice(@CurrentUser() user: AuthUser, @Body() dto: CareerAdviceDto) {
    return this.ai.careerAdvice(user.id, dto);
  }

  @Post('generate-portfolio')
  @RequireEntitlement('ai:generate')
  generatePortfolio(@CurrentUser() user: AuthUser, @Body() dto: GeneratePortfolioDto) {
    return this.ai.generatePortfolio(user.id, dto);
  }

  @Post('grammar-check')
  @RequireEntitlement('ai:optimize')
  grammarCheck(@CurrentUser() user: AuthUser, @Body() dto: GrammarCheckDto) {
    return this.ai.grammarCheck(user.id, dto);
  }

  @Post('skills-suggest')
  @RequireEntitlement('ai:optimize')
  skillsSuggest(@CurrentUser() user: AuthUser, @Body() dto: SkillsSuggestDto) {
    return this.ai.skillsSuggest(user.id, dto);
  }

  @Post('linkedin-import')
  @RequireEntitlement('ai:generate')
  linkedInImport(@CurrentUser() user: AuthUser, @Body() dto: LinkedInImportDto) {
    return this.ai.linkedInImport(user.id, dto);
  }

  @Post('parse-pdf')
  @RequireEntitlement('ai:generate')
  @ApiOperation({ summary: 'PDF OCR + structure extraction' })
  parsePdf(@CurrentUser() user: AuthUser, @Body() dto: ParsePdfDto) {
    return this.ai.parsePdf(user.id, dto);
  }
}
