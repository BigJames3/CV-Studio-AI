import { Body, Controller, NotImplementedException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import {
  OptimizeResumeDto,
  GenerateCoverLetterDto,
  CheckAtsDto,
  InterviewPrepDto,
  MatchJobDto,
  CareerAdviceDto,
  SkillsSuggestDto,
  LinkedInImportDto,
} from './dto/ai.dto';
import { CurrentUser, AuthUser, RequireEntitlement } from '../../common/decorators';
import { EntitlementsGuard } from '../../common/guards/entitlements.guard';

/**
 * AI features whose pipeline is not wired yet. They answer 501 instead of the placeholder
 * payloads in `AiService`, so no client shows fake results as real ones. Remove a feature
 * from here once its service method does real work.
 */
export const UNAVAILABLE_AI_FEATURES = [
  'generate-cv',
  'generate-portfolio',
  'grammar-check',
  'parse-pdf',
] as const;

function unavailable(feature: (typeof UNAVAILABLE_AI_FEATURES)[number]): never {
  throw new NotImplementedException({
    code: 'AI_FEATURE_UNAVAILABLE',
    message: `AI feature "${feature}" is not available yet`,
  });
}

@ApiTags('AI')
@ApiBearerAuth('JWT')
@UseGuards(EntitlementsGuard)
// Burst limit per client on top of the daily quotas (global default is 120/min).
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('generate-cv')
  @RequireEntitlement('ai:generate')
  @ApiOperation({ summary: 'CV Generator — not available yet (501)' })
  generateCv(): never {
    return unavailable('generate-cv');
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
  generatePortfolio(): never {
    return unavailable('generate-portfolio');
  }

  @Post('grammar-check')
  @RequireEntitlement('ai:optimize')
  grammarCheck(): never {
    return unavailable('grammar-check');
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
  @ApiOperation({ summary: 'PDF OCR + structure extraction — not available yet (501)' })
  parsePdf(): never {
    return unavailable('parse-pdf');
  }
}
