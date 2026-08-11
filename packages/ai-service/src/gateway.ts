import type { AiFeature } from './routing';
import { resolveModel } from './routing';
import type { OptimizeResumeInput, OptimizeResumeResult } from './prompts/optimize-resume';
import { optimizeResumeHeuristic } from './providers/heuristic-optimize';
import { optimizeResumeWithOpenAi } from './providers/openai-compatible';
import type { CoverLetterInput, CoverLetterResult } from './prompts/cover-letter';
import { generateCoverLetterHeuristic } from './providers/heuristic-cover-letter';
import type { AtsExplainInput, AtsExplainResult } from './prompts/ats-explain';
import { explainAtsHeuristic } from './providers/heuristic-ats-explain';

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

/**
 * Multi-feature AI gateway.
 * Live: optimize-resume, cover-letter, ats (explain layer).
 */
export async function runAiFeature(req: AiRequest): Promise<AiResponse> {
  switch (req.feature) {
    case 'optimize-resume':
      return runOptimizeResume(req);
    case 'cover-letter':
      return runCoverLetter(req);
    case 'ats':
      return runAtsExplain(req);
    default:
      return {
        ok: false,
        error: `AI feature not wired yet: ${req.feature}`,
        model: resolveModel(req.feature),
      };
  }
}
