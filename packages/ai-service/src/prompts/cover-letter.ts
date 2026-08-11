export const COVER_LETTER_PROMPT_ID = 'cover_letter';
export const COVER_LETTER_PROMPT_VERSION = 'v2';

export type CoverLetterInput = {
  cvFacts: Record<string, unknown>;
  jobDescription: string;
  company?: string;
  tone?: string;
  length?: 'short' | 'standard' | 'long';
  locale?: string;
};

export type CoverLetterResult = {
  ok: boolean;
  promptId: string;
  promptVersion: string;
  letter: { subject: string; body: string };
  usedEvidence: string[];
  warnings: string[];
  refusals: string[];
};

export function buildCoverLetterMessages(input: CoverLetterInput) {
  return [
    {
      role: 'system' as const,
      content: `Write a cover letter using ONLY evidence from CV_FACTS aligned to JOB_DESCRIPTION. Locale: ${input.locale ?? 'en'}. Tone: ${input.tone ?? 'professional'}. Length: ${input.length ?? 'standard'}. Return JSON with ok, letter{subject,body}, usedEvidence, warnings, refusals.`,
    },
    {
      role: 'user' as const,
      content: `CV_FACTS:\n${JSON.stringify(input.cvFacts)}\n\nCOMPANY: ${input.company ?? 'N/A'}\n\nJOB_DESCRIPTION:\n${input.jobDescription}`,
    },
  ];
}
