import type { AiFeature } from './routing';
import { resolveModel } from './routing';
import type { OptimizeResumeInput, OptimizeResumeResult } from './prompts/optimize-resume';
import { optimizeResumeHeuristic } from './providers/heuristic-optimize';
import { grammarCheckWithOpenAi, optimizeResumeWithOpenAi } from './providers/openai-compatible';
import type { GrammarCheckInput, GrammarCheckResult } from './prompts/grammar-check';
import { detectLanguage, grammarCheckHeuristic } from './providers/heuristic-grammar';
import { importLinkedInExport, type LinkedInImportInput } from './linkedin-import';
import type { CoverLetterInput, CoverLetterResult } from './prompts/cover-letter';
import { generateCoverLetterHeuristic } from './providers/heuristic-cover-letter';
import type { AtsExplainInput, AtsExplainResult } from './prompts/ats-explain';
import { explainAtsHeuristic } from './providers/heuristic-ats-explain';
import { matchJobHeuristic } from './providers/heuristic-job-match';
import { interviewPrepHeuristic } from './providers/heuristic-interview-prep';
import { careerAdviceHeuristic } from './providers/heuristic-career-advice';
import { skillsSuggestHeuristic } from './providers/heuristic-skills-suggest';

export type AiRequest = {
  feature: AiFeature;
  userId: string;
  payload: Record<string, unknown>;
  locale?: string;
};

export type AiResponse = {
  ok: boolean;
  data?: unknown;
  error?: string;
  model?: string;
  tokensUsed?: number;
  provider?: 'heuristic' | 'openai';
};

export type AiProviderMode = 'heuristic' | 'openai';

export type ProviderEnv = {
  AI_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  AI_API_KEY?: string;
};

export function resolveProviderMode(env: ProviderEnv = process.env): AiProviderMode {
  const forced = env.AI_PROVIDER?.toLowerCase();
  if (forced === 'heuristic' || forced === 'openai') return forced;
  return env.OPENAI_API_KEY || env.AI_API_KEY ? 'openai' : 'heuristic';
}

function asOptimizeInput(payload: Record<string, unknown>, locale?: string): OptimizeResumeInput {
  return {
    bulletText: String(payload.bulletText ?? ''),
    tone: typeof payload.tone === 'string' ? payload.tone : undefined,
    jobDescription: typeof payload.jobDescription === 'string' ? payload.jobDescription : undefined,
    contextFacts:
      payload.contextFacts && typeof payload.contextFacts === 'object'
        ? (payload.contextFacts as Record<string, unknown>)
        : undefined,
    locale,
    maxChars: typeof payload.maxChars === 'number' ? payload.maxChars : undefined,
  };
}

function asCoverLetterInput(payload: Record<string, unknown>, locale?: string): CoverLetterInput {
  return {
    cvFacts:
      payload.cvFacts && typeof payload.cvFacts === 'object'
        ? (payload.cvFacts as Record<string, unknown>)
        : {},
    jobDescription: String(payload.jobDescription ?? ''),
    company: typeof payload.company === 'string' ? payload.company : undefined,
    tone: typeof payload.tone === 'string' ? payload.tone : undefined,
    length:
      payload.length === 'short' || payload.length === 'standard' || payload.length === 'long'
        ? payload.length
        : 'standard',
    locale,
  };
}

function asAtsExplainInput(payload: Record<string, unknown>, locale?: string): AtsExplainInput {
  return {
    score: Number(payload.score ?? 0),
    breakdown:
      payload.breakdown && typeof payload.breakdown === 'object'
        ? (payload.breakdown as Record<string, unknown>)
        : {},
    cvSummary:
      payload.cvSummary && typeof payload.cvSummary === 'object'
        ? (payload.cvSummary as Record<string, unknown>)
        : {},
    hasJd: Boolean(payload.hasJd),
    locale,
  };
}

async function runOptimizeResume(req: AiRequest): Promise<AiResponse> {
  const input = asOptimizeInput(req.payload, req.locale);
  const mode = resolveProviderMode();

  if (mode === 'openai') {
    try {
      const { result, model, tokensUsed } = await optimizeResumeWithOpenAi(input);
      return {
        ok: result.ok,
        data: result,
        model,
        tokensUsed,
        provider: 'openai',
        error: result.ok ? undefined : result.refusals.join('; ') || 'Optimization refused',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI provider failed';
      const fallback = optimizeResumeHeuristic(input);
      return {
        ok: fallback.ok,
        data: {
          ...fallback,
          warnings: [...fallback.warnings, `openai_fallback: ${message}`],
        } satisfies OptimizeResumeResult,
        model: resolveModel('optimize-resume'),
        tokensUsed: 0,
        provider: 'heuristic',
        error: fallback.ok ? undefined : fallback.refusals.join('; ') || message,
      };
    }
  }

  const result = optimizeResumeHeuristic(input);
  return {
    ok: result.ok,
    data: result,
    model: 'heuristic-v1',
    tokensUsed: 0,
    provider: 'heuristic',
    error: result.ok ? undefined : result.refusals.join('; ') || 'Optimization failed',
  };
}

async function runCoverLetter(req: AiRequest): Promise<AiResponse> {
  const input = asCoverLetterInput(req.payload, req.locale);
  // OpenAI path can be added later; heuristic is production-safe fallback.
  const result: CoverLetterResult = generateCoverLetterHeuristic(input);
  return {
    ok: result.ok,
    data: result,
    model: resolveProviderMode() === 'openai' ? resolveModel('cover-letter') : 'heuristic-v1',
    tokensUsed: 0,
    provider: 'heuristic',
    error: result.ok ? undefined : result.refusals.join('; ') || 'Cover letter failed',
  };
}

async function runAtsExplain(req: AiRequest): Promise<AiResponse> {
  const input = asAtsExplainInput(req.payload, req.locale);
  const result: AtsExplainResult = explainAtsHeuristic(input);
  return {
    ok: result.ok,
    data: result,
    model: 'heuristic-v1',
    tokensUsed: 0,
    provider: 'heuristic',
    error: result.ok ? undefined : 'ATS explain failed',
  };
}

function payloadObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function payloadString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** CV analysis features: deterministic, evidence-gated, no network call. */
function runCvInsight(req: AiRequest): AiResponse {
  const cvFacts = payloadObject(req.payload.cvFacts);
  const jobDescription = payloadString(req.payload.jobDescription) ?? '';
  const targetRole = payloadString(req.payload.targetRole);
  const locale = req.locale;
  let result: { ok: boolean; refusals?: string[] };
  switch (req.feature) {
    case 'job-match':
      result = matchJobHeuristic({ cvFacts, jobDescription, locale });
      break;
    case 'interview':
      result = interviewPrepHeuristic({
        cvFacts,
        jobDescription,
        interviewType: payloadString(req.payload.interviewType),
        locale,
      });
      break;
    case 'career-advice':
      result = careerAdviceHeuristic({ cvFacts, targetRole, locale });
      break;
    default:
      result = skillsSuggestHeuristic({ cvFacts, targetRole, locale });
  }
  return {
    ok: result.ok,
    data: result,
    model: 'heuristic-v1',
    tokensUsed: 0,
    provider: 'heuristic',
    error: result.ok ? undefined : result.refusals?.join('; ') || `${req.feature} failed`,
  };
}

async function runGrammarCheck(req: AiRequest): Promise<AiResponse> {
  const input: GrammarCheckInput = {
    text: typeof req.payload.text === 'string' ? req.payload.text : '',
    locale: req.locale,
  };
  const fallback = (warning?: string): AiResponse => {
    const result: GrammarCheckResult = grammarCheckHeuristic(input);
    if (warning) result.warnings.push(warning);
    return {
      ok: result.ok,
      data: result,
      model: 'heuristic-v1',
      tokensUsed: 0,
      provider: 'heuristic',
      error: result.ok ? undefined : result.refusals.join('; '),
    };
  };

  if (!input.text.trim() || resolveProviderMode() !== 'openai') return fallback();
  try {
    const language = detectLanguage(input.text, input.locale);
    const { result, model, tokensUsed } = await grammarCheckWithOpenAi(input, language);
    return { ok: true, data: result, model, tokensUsed, provider: 'openai' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenAI provider failed';
    return fallback(`openai_fallback: ${message}`);
  }
}

/** LinkedIn data export → CV content. Deterministic mapping, no model call. */
function runLinkedInImport(req: AiRequest): AiResponse {
  const files = req.payload.files;
  const input: LinkedInImportInput = {
    files:
      files && typeof files === 'object'
        ? Object.fromEntries(
            Object.entries(files as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string'
            )
          )
        : {},
    fallbackIdentity:
      req.payload.fallbackIdentity && typeof req.payload.fallbackIdentity === 'object'
        ? (req.payload.fallbackIdentity as LinkedInImportInput['fallbackIdentity'])
        : undefined,
  };
  const result = importLinkedInExport(input);
  return {
    ok: result.ok,
    data: result,
    model: 'deterministic-v1',
    tokensUsed: 0,
    provider: 'heuristic',
    error: result.ok ? undefined : result.refusals.join('; '),
  };
}

/**
 * Multi-feature AI gateway.
 * Live: optimize-resume, cover-letter, ats (explain layer), job-match, interview,
 * career-advice, skills-suggest, grammar-check (OpenAI when configured, rules otherwise),
 * linkedin-import (data export mapping).
 */
export async function runAiFeature(req: AiRequest): Promise<AiResponse> {
  switch (req.feature) {
    case 'optimize-resume':
      return runOptimizeResume(req);
    case 'cover-letter':
      return runCoverLetter(req);
    case 'ats':
      return runAtsExplain(req);
    case 'grammar-check':
      return runGrammarCheck(req);
    case 'linkedin-import':
      return runLinkedInImport(req);
    case 'job-match':
    case 'interview':
    case 'career-advice':
    case 'skills-suggest':
      return runCvInsight(req);
    default:
      return {
        ok: false,
        error: `AI feature not wired yet: ${req.feature}`,
        model: resolveModel(req.feature),
      };
  }
}
