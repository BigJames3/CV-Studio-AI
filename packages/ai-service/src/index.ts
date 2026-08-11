/**
 * AI gateway for CV Studio AI.
 * Live: optimize-resume, cover-letter, ats-explain (heuristic + optional OpenAI for optimize).
 */

export type { AiFeature } from './routing';
export { DEFAULT_MODEL_ROUTING, resolveModel } from './routing';

export type { AiRequest, AiResponse, AiProviderMode, ProviderEnv } from './gateway';
export { runAiFeature, resolveProviderMode } from './gateway';

export type {
  OptimizeResumeInput,
  OptimizeResumeResult,
  OptimizeVariant,
  OptimizeTone,
} from './prompts/optimize-resume';
export {
  OPTIMIZE_RESUME_PROMPT_ID,
  OPTIMIZE_RESUME_PROMPT_VERSION,
  buildOptimizeResumeMessages,
} from './prompts/optimize-resume';

export type { CoverLetterInput, CoverLetterResult } from './prompts/cover-letter';
export {
  COVER_LETTER_PROMPT_ID,
  COVER_LETTER_PROMPT_VERSION,
  buildCoverLetterMessages,
} from './prompts/cover-letter';

export type { AtsExplainInput, AtsExplainResult, AtsExplainItem } from './prompts/ats-explain';
export {
  ATS_EXPLAIN_PROMPT_ID,
  ATS_EXPLAIN_PROMPT_VERSION,
  buildAtsExplainMessages,
} from './prompts/ats-explain';

export { optimizeResumeHeuristic } from './providers/heuristic-optimize';
export { generateCoverLetterHeuristic } from './providers/heuristic-cover-letter';
export { explainAtsHeuristic } from './providers/heuristic-ats-explain';
export { optimizeResumeWithOpenAi } from './providers/openai-compatible';
export { SYSTEM_GUARDRAILS } from './prompts/guardrails';
