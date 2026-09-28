/**
 * AI gateway for CV Studio AI.
 * Live: optimize-resume, cover-letter, ats-explain, job-match, interview prep, career advice
 * skills suggestions and grammar check (heuristic; optional OpenAI for optimize and grammar).
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

export type {
  JobMatchInput,
  JobMatchResult,
  JobMatchGap,
  JobMatchStrength,
  JobMatchEdit,
} from './prompts/job-match';
export { JOB_MATCH_PROMPT_ID, JOB_MATCH_PROMPT_VERSION } from './prompts/job-match';

export type {
  InterviewPrepInput,
  InterviewPrepResult,
  InterviewQuestion,
  InterviewType,
} from './prompts/interview-prep';
export { INTERVIEW_PREP_PROMPT_ID, INTERVIEW_PREP_PROMPT_VERSION } from './prompts/interview-prep';

export type {
  CareerAdviceInput,
  CareerAdviceResult,
  CareerAdviceCard,
} from './prompts/career-advice';
export { CAREER_ADVICE_PROMPT_ID, CAREER_ADVICE_PROMPT_VERSION } from './prompts/career-advice';

export type {
  SkillsSuggestInput,
  SkillsSuggestResult,
  SkillSuggestion,
  SkillToDevelop,
} from './prompts/skills-suggest';
export { SKILLS_SUGGEST_PROMPT_ID, SKILLS_SUGGEST_PROMPT_VERSION } from './prompts/skills-suggest';

export type { CvFacts, CvFactExperience } from './cv-facts';
export { extractCvFacts, extractKeywords, cvMentions } from './cv-facts';

export type { GrammarCheckInput, GrammarCheckResult, GrammarEdit } from './prompts/grammar-check';
export {
  GRAMMAR_CHECK_PROMPT_ID,
  GRAMMAR_CHECK_PROMPT_VERSION,
  buildGrammarCheckMessages,
} from './prompts/grammar-check';
export { grammarCheckHeuristic, detectLanguage, applyEdits } from './providers/heuristic-grammar';

export { optimizeResumeHeuristic } from './providers/heuristic-optimize';
export { matchJobHeuristic } from './providers/heuristic-job-match';
export { interviewPrepHeuristic } from './providers/heuristic-interview-prep';
export { careerAdviceHeuristic } from './providers/heuristic-career-advice';
export { skillsSuggestHeuristic } from './providers/heuristic-skills-suggest';
export { generateCoverLetterHeuristic } from './providers/heuristic-cover-letter';
export { explainAtsHeuristic } from './providers/heuristic-ats-explain';
export { optimizeResumeWithOpenAi, grammarCheckWithOpenAi } from './providers/openai-compatible';
export type { OpenAiOptions } from './providers/openai-compatible';
export { SYSTEM_GUARDRAILS } from './prompts/guardrails';
