import { Body, Controller, NotImplementedException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { OptimizeResumeDto, GenerateCoverLetterDto, CheckAtsDto } from './dto/ai.dto';
import { CurrentUser, AuthUser, RequireEntitlement } from '../../common/decorators';
import { EntitlementsGuard } from '../../common/guards/entitlements.guard';

/**
 * AI features whose pipeline is not wired yet. They answer 501 rather than the scaffold
 * payloads in `AiService`, so no client ever shows placeholder results as real ones.
 * Remove a feature from here once its service method does real work.
 */
export const UNAVAILABLE_AI_FEATURES = [
  'generate-cv',
  'match-job',
  'interview-prep',
  'career-advice',
  'generate-portfolio',
  'grammar-check',
  'skills-suggest',
  'linkedin-import',
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
  matchJob(): never {
    return unavailable('match-job');
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
  interviewPrep(): never {
    return unavailable('interview-prep');
  }

  @Post('career-advice')
  @RequireEntitlement('ai:optimize')
  careerAdvice(): never {
    return unavailable('career-advice');
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
  skillsSuggest(): never {
    return unavailable('skills-suggest');
  }

  @Post('linkedin-import')
  @RequireEntitlement('ai:generate')
  linkedInImport(): never {
    return unavailable('linkedin-import');
  }

  @Post('parse-pdf')
  @RequireEntitlement('ai:generate')
  @ApiOperation({ summary: 'PDF OCR + structure extraction' })
  parsePdf(): never {
    return unavailable('parse-pdf');
  }
}
