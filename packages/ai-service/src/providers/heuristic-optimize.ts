import type {
  OptimizeResumeInput,
  OptimizeResumeResult,
  OptimizeVariant,
} from '../prompts/optimize-resume';
import {
  OPTIMIZE_RESUME_PROMPT_ID,
  OPTIMIZE_RESUME_PROMPT_VERSION,
} from '../prompts/optimize-resume';

const WEAK_VERBS: Record<string, string> = {
  helped: 'Supported',
  worked: 'Delivered',
  did: 'Executed',
  made: 'Produced',
  assisted: 'Collaborated on',
  handled: 'Managed',
  used: 'Applied',
  participated: 'Contributed to',
};

function trimVariant(text: string, maxChars: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function strengthenVerb(bullet: string): string {
  const match = bullet.match(/^(\s*)([A-Za-z]+)(\b[\s\S]*)$/);
  if (!match) return bullet;
  const [, lead, verb, rest] = match;
  const replacement = WEAK_VERBS[verb.toLowerCase()];
  if (!replacement) return bullet;
  return `${lead}${replacement}${rest}`;
}

function extractSupportedJdKeywords(bullet: string, jobDescription?: string): string[] {
  if (!jobDescription) return [];
  const bulletLower = bullet.toLowerCase();
  const tokens = Array.from(
    new Set(
      jobDescription
        .toLowerCase()
        .split(/[^a-z0-9+#.]/i)
        .map((t) => t.trim())
        .filter((t) => t.length > 3)
    )
  );
  return tokens.filter((t) => bulletLower.includes(t)).slice(0, 4);
}

/**
 * Deterministic optimizer used when no LLM key is configured.
 * Never invents employers, tools, or numeric metrics.
 */
export function optimizeResumeHeuristic(input: OptimizeResumeInput): OptimizeResumeResult {
  const bullet = (input.bulletText ?? '').trim();
  const maxChars = input.maxChars ?? 220;
  const tone = (input.tone ?? 'factual').toString();

  if (!bullet) {
    return {
      ok: false,
      variants: [],
      warnings: [],
      refusals: ['bulletText is required'],
      promptId: OPTIMIZE_RESUME_PROMPT_ID,
      promptVersion: OPTIMIZE_RESUME_PROMPT_VERSION,
    };
  }

  const strong = strengthenVerb(bullet).replace(/\s+/g, ' ').trim();
  const supportedKeywords = extractSupportedJdKeywords(bullet, input.jobDescription);
  const withPeriod = strong.endsWith('.') ? strong : `${strong}.`;

  const clarity: OptimizeVariant = {
    text: trimVariant(withPeriod, maxChars),
    rationale: 'Stronger action verb and clearer phrasing without new claims',
    atsNotes: 'Preserves original facts for ATS parsing',
  };

  const impactCore = strong.replace(/\.$/, '');
  const impactText =
    tone === 'executive'
      ? `Owned: ${impactCore}.`
      : tone === 'enthusiastic'
        ? `Drove: ${impactCore}.`
        : withPeriod;

  const impact: OptimizeVariant = {
    text: trimVariant(impactText, maxChars),
    rationale:
      tone === 'executive'
        ? 'Executive framing emphasizing ownership of existing work'
        : tone === 'enthusiastic'
          ? 'Energetic delivery language without fabricating results'
          : 'Impact-forward phrasing using only stated evidence',
    atsNotes: 'No new metrics introduced',
  };

  const ats: OptimizeVariant = {
    text: trimVariant(withPeriod, maxChars),
    rationale: 'ATS-oriented clarity while staying evidence-bound',
    atsNotes:
      supportedKeywords.length > 0
        ? `Supported JD keywords already present: ${supportedKeywords.join(', ')}`
        : 'No overlapping JD keywords found in the bullet — avoided stuffing',
  };

  const warnings: string[] = [];
  if (!input.jobDescription) {
    warnings.push('No job description provided — keyword alignment skipped');
  }

  return {
    ok: true,
    variants: [clarity, impact, ats],
    warnings,
    refusals: [],
    promptId: OPTIMIZE_RESUME_PROMPT_ID,
    promptVersion: OPTIMIZE_RESUME_PROMPT_VERSION,
  };
}
