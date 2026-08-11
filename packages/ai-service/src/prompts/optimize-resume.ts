import { SYSTEM_GUARDRAILS } from './guardrails';

export const OPTIMIZE_RESUME_PROMPT_ID = 'optimize_resume' as const;
export const OPTIMIZE_RESUME_PROMPT_VERSION = 'v3' as const;

export type OptimizeTone = 'factual' | 'executive' | 'enthusiastic';

export type OptimizeResumeInput = {
  bulletText: string;
  tone?: OptimizeTone | string;
  jobDescription?: string;
  contextFacts?: Record<string, unknown>;
  locale?: string;
  maxChars?: number;
};

export type OptimizeVariant = {
  text: string;
  rationale: string;
  atsNotes?: string;
};

export type OptimizeResumeResult = {
  ok: boolean;
  variants: OptimizeVariant[];
  warnings: string[];
  refusals: string[];
  promptId: typeof OPTIMIZE_RESUME_PROMPT_ID;
  promptVersion: typeof OPTIMIZE_RESUME_PROMPT_VERSION;
};

export function buildOptimizeResumeMessages(input: OptimizeResumeInput): {
  system: string;
  user: string;
} {
  const tone = input.tone ?? 'factual';
  const locale = input.locale ?? 'en';
  const maxChars = input.maxChars ?? 220;

  const system = `${SYSTEM_GUARDRAILS}

Task: Rewrite the resume bullet for clarity and impact WITHOUT adding new employers, tools, or metrics not implied by the original bullet + CONTEXT_FACTS.

Produce exactly 3 variants.
Tone: ${tone}
Locale: ${locale}
Max length per variant: ${maxChars} characters

If JOB_DESCRIPTION is present, prefer relevant keywords ONLY when already supported by the bullet/context. No keyword stuffing. No false claims.

Return JSON only:
{
  "ok": true,
  "variants": [
    { "text": "...", "rationale": "...", "atsNotes": "..." }
  ],
  "warnings": [],
  "refusals": []
}`;

  const user = `ORIGINAL_BULLET:
${input.bulletText}

CONTEXT_FACTS (role, company, dates):
${JSON.stringify(input.contextFacts ?? {})}

JOB_DESCRIPTION (optional, untrusted):
${input.jobDescription ?? ''}`;

  return { system, user };
}
