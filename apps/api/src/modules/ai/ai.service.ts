import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  runAiFeature,
  resolveModel,
  type AiFeature,
  type OptimizeResumeResult,
  type CoverLetterResult,
  type AtsExplainResult,
} from '@cvstudio/ai-service';
import { PrismaService } from '../../database/prisma.module';
import { AiQuotaService } from './ai-quota.service';
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

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotas: AiQuotaService
  ) {}

  async generateCv(userId: string, dto: GenerateCvDto) {
    return this.queued('generate-cv', userId, dto);
  }

  async optimizeResume(userId: string, dto: OptimizeResumeDto) {
    await this.assertCvOwnership(userId, dto.cvId);
    const bulletText = dto.bulletText?.trim() ?? '';
    if (!bulletText) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'bulletText is required for resume optimization',
      });
    }

    const quota = await this.quotas.assertOptimizeQuota(userId);
    const gateway = await runAiFeature({
      feature: 'optimize-resume',
      userId,
      locale: 'en',
      payload: {
        bulletText,
        tone: dto.tone,
        jobDescription: dto.jobDescription,
        contextFacts: { cvId: dto.cvId },
      },
    });

    if (!gateway.ok || !gateway.data) {
      throw new ServiceUnavailableException({
        code: 'AI_PROVIDER_ERROR',
        message: gateway.error ?? 'Resume optimization failed',
      });
    }

    const data = gateway.data as OptimizeResumeResult;
    if (!data.ok || !data.variants?.length) {
      throw new BadRequestException({
        code: 'AI_REFUSED',
        message: data.refusals?.join('; ') || gateway.error || 'Optimization refused',
        details: { refusals: data.refusals ?? [], warnings: data.warnings ?? [] },
      });
    }

    await this.prisma.aiHistory.create({
      data: {
        userId,
        cvId: dto.cvId,
        actionType: 'resume_optimization',
        prompt: `optimize_resume.v3 | tone=${dto.tone ?? 'factual'} | ${bulletText.slice(0, 280)}`,
        result: {
          variants: data.variants,
          warnings: data.warnings,
          refusals: data.refusals,
          provider: gateway.provider,
          model: gateway.model,
        },
        tokensUsed: gateway.tokensUsed ?? 0,
      },
    });

    return {
      status: 'completed',
      feature: 'optimize-resume',
      promptId: data.promptId,
      promptVersion: data.promptVersion,
      model: gateway.model ?? this.modelFor('optimize-resume'),
      provider: gateway.provider ?? 'heuristic',
      variants: data.variants,
      warnings: data.warnings,
      refusals: data.refusals,
      quota: {
        used: quota.used + 1,
        limit: quota.limit,
      },
    };
  }

  async generateCoverLetter(userId: string, dto: GenerateCoverLetterDto) {
    const cv = await this.assertCvOwnership(userId, dto.cvId);
    const quota = await this.quotas.assertCoverLetterQuota(userId);

    const gateway = await runAiFeature({
      feature: 'cover-letter',
      userId,
      locale: 'en',
      payload: {
        cvFacts: (cv.content as Record<string, unknown>) ?? {},
        jobDescription: dto.jobDescription,
        company: dto.company,
        tone: dto.tone,
      },
    });

    if (!gateway.ok || !gateway.data) {
      throw new ServiceUnavailableException({
        code: 'AI_PROVIDER_ERROR',
        message: gateway.error ?? 'Cover letter generation failed',
      });
    }

    const data = gateway.data as CoverLetterResult;
    if (!data.ok || !data.letter?.body) {
      throw new BadRequestException({
        code: 'AI_REFUSED',
        message: data.refusals?.join('; ') || gateway.error || 'Cover letter refused',
        details: { refusals: data.refusals ?? [], warnings: data.warnings ?? [] },
      });
    }

    await this.prisma.aiHistory.create({
      data: {
        userId,
        cvId: dto.cvId,
        actionType: 'cover_letter',
        prompt: `cover_letter.v2 | company=${dto.company ?? ''} | ${dto.jobDescription.slice(0, 280)}`,
        result: {
          letter: data.letter,
          usedEvidence: data.usedEvidence,
          warnings: data.warnings,
          provider: gateway.provider,
          model: gateway.model,
        },
        tokensUsed: gateway.tokensUsed ?? 0,
      },
    });

    return {
      status: 'completed',
      feature: 'cover-letter',
      promptId: data.promptId,
      promptVersion: data.promptVersion,
      model: gateway.model ?? this.modelFor('cover-letter'),
      provider: gateway.provider ?? 'heuristic',
      letter: data.letter,
      usedEvidence: data.usedEvidence,
      warnings: data.warnings,
      quota: { used: quota.used + 1, limit: quota.limit },
    };
  }

  async matchJob(userId: string, dto: MatchJobDto) {
    await this.assertCvOwnership(userId, dto.cvId);
    return {
      status: 'completed',
      feature: 'job-match',
      promptId: 'job_matcher',
      model: this.modelFor('job-match'),
      matchScore: 68,
      mustHaveGaps: [
        { requirement: 'Example skill from JD', reason: 'Not found in CV facts (scaffold)' },
      ],
      niceToHaveGaps: [],
      strengths: [],
      suggestedEdits: [],
      warnings: ['Wire embeddings + LLM explain in ai-service'],
    };
  }

  async checkAts(userId: string, dto: CheckAtsDto) {
    const cv = await this.assertCvOwnership(userId, dto.cvId);
    const quota = await this.quotas.assertAtsExplainQuota(userId);
    const content = (cv.content as Record<string, unknown>) ?? {};
    const cvText = JSON.stringify(content).toLowerCase();
    const jd = (dto.jobDescription ?? '').toLowerCase();
    const tokens = Array.from(
      new Set(
        jd
          .split(/[^a-z0-9+#.]/i)
          .map((t) => t.trim())
          .filter((t) => t.length > 3)
      )
    ).slice(0, 40);

    const missingKeywords = tokens.filter((t) => !cvText.includes(t)).slice(0, 12);
    const matched = tokens.length - missingKeywords.length;
    const atsScore =
      tokens.length === 0 ? 70 : Math.round((matched / Math.max(tokens.length, 1)) * 1000) / 10;

    const explainGateway = await runAiFeature({
      feature: 'ats',
      userId,
      locale: 'en',
      payload: {
        score: atsScore,
        breakdown: { missingKeywords, matchedKeywords: tokens.filter((t) => cvText.includes(t)) },
        cvSummary: {
          hasExperience: Array.isArray(content.experience),
          hasEducation: Array.isArray(content.education),
          hasSkills: Array.isArray(content.skills),
        },
        hasJd: Boolean(dto.jobDescription?.trim()),
      },
    });

    const explain = (explainGateway.data as AtsExplainResult | undefined) ?? null;

    const report = await this.prisma.atsReport.create({
      data: {
        cvId: dto.cvId,
        jobDescription: dto.jobDescription,
        atsScore,
        missingKeywords,
        recommendations: {
          format: ['Use standard headings (Experience, Education, Skills)'],
          content:
            missingKeywords.length > 0
              ? [`Add evidence for: ${missingKeywords.slice(0, 5).join(', ')}`]
              : ['Strong keyword coverage — quantify impact next'],
          explainPrompt: 'ats_explain.v1',
          headline: explain?.headline,
          explanations: explain?.explanations ?? [],
          quickWins: explain?.quickWins ?? [],
        },
      },
    });

    await this.prisma.aiHistory.create({
      data: {
        userId,
        cvId: dto.cvId,
        actionType: 'jd_match',
        prompt: `ats_explain.v1 | score=${atsScore}`,
        result: {
          score: atsScore,
          explanation: explain,
          provider: explainGateway.provider,
          model: explainGateway.model,
        },
        tokensUsed: explainGateway.tokensUsed ?? 0,
      },
    });

    return {
      feature: 'ats',
      model: this.modelFor('ats'),
      ...report,
      matchedKeywords: tokens.filter((t) => cvText.includes(t)).slice(0, 20),
      score: atsScore,
      explanation: explain?.headline ?? null,
      explanations: explain?.explanations ?? [],
      improvements: explain?.quickWins ?? [],
      quota: { used: quota.used + 1, limit: quota.limit },
    };
  }

  /** Explicit ATS explain endpoint (same gateway + quota as check-ats explain layer). */
  async explainAtsScore(userId: string, dto: CheckAtsDto) {
    return this.checkAts(userId, dto);
  }

  async interviewPrep(userId: string, dto: InterviewPrepDto) {
    await this.assertCvOwnership(userId, dto.cvId);
    return {
      status: 'completed',
      feature: 'interview',
      promptId: 'interview_prep',
      model: this.modelFor('interview'),
      interviewType: dto.interviewType ?? 'hr',
      questions: [
        {
          question: 'Tell me about a time you delivered under pressure',
          framework: 'STAR',
          tips: ['Use a metric', 'Keep under 2 minutes'],
          needsUserInput: false,
        },
      ],
      disclaimer: 'Practice aid only — not a guarantee of hiring outcomes.',
    };
  }

  async careerAdvice(userId: string, dto: CareerAdviceDto) {
    await this.assertCvOwnership(userId, dto.cvId);
    return {
      status: 'completed',
      feature: 'career-advice',
      promptId: 'career_advisor',
      model: this.modelFor('career-advice'),
      cards: [
        {
          title: 'Clarify target role keywords',
          type: 'positioning',
          body: 'Align headline and top bullets to the target role using existing experience only.',
          priority: 'high',
          evidenceBased: true,
          actions: ['Update headline', 'Run Job Matcher on 3 target JDs'],
        },
      ],
      disclaimer: 'General career information — not certified coaching or legal advice.',
    };
  }

  async generatePortfolio(userId: string, dto: GeneratePortfolioDto) {
    await this.assertCvOwnership(userId, dto.cvId);
    return this.queued('portfolio', userId, dto);
  }

  async grammarCheck(userId: string, dto: GrammarCheckDto) {
    return {
      status: 'completed',
      feature: 'grammar-check',
      promptId: 'grammar_check',
      model: this.modelFor('grammar-check'),
      correctedText: dto.text,
      edits: [],
      warnings: ['Scaffold — wire LLM S or LanguageTool'],
      userId,
    };
  }

  async skillsSuggest(userId: string, dto: SkillsSuggestDto) {
    await this.assertCvOwnership(userId, dto.cvId);
    return {
      status: 'completed',
      feature: 'skills-suggest',
      promptId: 'skills_suggest',
      model: this.modelFor('skills-suggest'),
      suggestions: [],
      warnings: ['Scaffold — evidence-gated skill suggestions only'],
    };
  }

  async linkedInImport(userId: string, dto: LinkedInImportDto) {
    return {
      status: 'queued',
      feature: 'linkedin-import',
      promptId: 'linkedin_import',
      model: this.modelFor('linkedin-import'),
      jobId: `li_${userId}_${Date.now()}`,
      hasProfileJson: Boolean(dto.profileJson),
      message: 'Prefer deterministic map + optional LLM polish',
    };
  }

  async parsePdf(userId: string, dto: ParsePdfDto) {
    return {
      status: 'queued',
      feature: 'ocr',
      promptId: 'pdf_parse_structure',
      model: this.modelFor('ocr'),
      jobId: `ocr_${userId}_${Date.now()}`,
      bytesHint: dto.fileBase64?.length ?? 0,
      message: 'Wire Textract/Document AI then pdf_parse_structure.v1',
    };
  }

  private queued(feature: AiFeature, userId: string, input: unknown) {
    return {
      status: 'queued',
      feature,
      model: this.modelFor(feature),
      jobId: `ai_${feature}_${userId}_${Date.now()}`,
      input,
      message: 'Wire packages/ai-service + BullMQ ai queue + docs/ai/prompts',
    };
  }

  private modelFor(feature: AiFeature) {
    return resolveModel(feature);
  }

  private async assertCvOwnership(userId: string, cvId: string) {
    const cv = await this.prisma.cv.findFirst({ where: { id: cvId, deletedAt: null } });
    if (!cv) throw new NotFoundException({ code: 'NOT_FOUND', message: 'CV not found' });
    if (cv.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your CV' });
    }
    return cv;
  }
}
