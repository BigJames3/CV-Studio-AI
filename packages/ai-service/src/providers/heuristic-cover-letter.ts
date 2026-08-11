import type { CoverLetterInput, CoverLetterResult } from '../prompts/cover-letter';
import {
  COVER_LETTER_PROMPT_ID,
  COVER_LETTER_PROMPT_VERSION,
} from '../prompts/cover-letter';

function extractName(cvFacts: Record<string, unknown>): string {
  const identity = (cvFacts.identity ?? cvFacts.personal ?? {}) as Record<string, unknown>;
  const name =
    (identity.fullName as string) ||
    [identity.firstName, identity.lastName].filter(Boolean).join(' ') ||
    (cvFacts.fullName as string) ||
    'Candidate';
  return String(name);
}

function extractEvidence(cvFacts: Record<string, unknown>): string[] {
  const evidence: string[] = [];
  const experience = Array.isArray(cvFacts.experience) ? cvFacts.experience : [];
  for (const exp of experience.slice(0, 3)) {
    const row = exp as Record<string, unknown>;
    const title = String(row.position ?? row.title ?? '');
    const company = String(row.company ?? '');
    if (title || company) evidence.push([title, company].filter(Boolean).join(' at '));
  }
  const skills = Array.isArray(cvFacts.skills) ? cvFacts.skills : [];
  for (const s of skills.slice(0, 5)) {
    const name = typeof s === 'string' ? s : String((s as { name?: string }).name ?? '');
    if (name) evidence.push(name);
  }
  return evidence;
}

/**
 * Deterministic cover letter when no LLM key is configured.
 */
export function generateCoverLetterHeuristic(input: CoverLetterInput): CoverLetterResult {
  const jd = (input.jobDescription ?? '').trim();
  if (!jd) {
    return {
      ok: false,
      promptId: COVER_LETTER_PROMPT_ID,
      promptVersion: COVER_LETTER_PROMPT_VERSION,
      letter: { subject: '', body: '' },
      usedEvidence: [],
      warnings: [],
      refusals: ['jobDescription is required'],
    };
  }

  const name = extractName(input.cvFacts);
  const evidence = extractEvidence(input.cvFacts);
  const company = input.company?.trim() || 'your team';
  const warnings: string[] = [];
  if (evidence.length < 2) {
    warnings.push('Limited CV evidence — letter kept honest and concise');
  }

  const evidenceLines = evidence.length
    ? evidence.map((e) => `• ${e}`).join('\n')
    : '• Relevant experience aligned to the role requirements';

  const body = [
    `Dear Hiring Manager,`,
    ``,
    `I am writing to express interest in the opportunity at ${company}. After reviewing the role description, I see a strong fit with my background.`,
    ``,
    `Key evidence from my experience:`,
    evidenceLines,
    ``,
    `I would welcome the chance to discuss how I can contribute. Thank you for your consideration.`,
    ``,
    `Sincerely,`,
    name,
  ].join('\n');

  return {
    ok: true,
    promptId: COVER_LETTER_PROMPT_ID,
    promptVersion: COVER_LETTER_PROMPT_VERSION,
    letter: {
      subject: `Application — ${name} for ${company}`,
      body,
    },
    usedEvidence: evidence,
    warnings,
    refusals: [],
  };
}
