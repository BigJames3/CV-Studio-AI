export const JOB_MATCH_PROMPT_ID = 'job_matcher';
export const JOB_MATCH_PROMPT_VERSION = 'v1';

export type JobMatchInput = {
  cvFacts: Record<string, unknown>;
  jobDescription: string;
  locale?: string;
};

export type JobMatchGap = { requirement: string; reason: string };
export type JobMatchStrength = { keyword: string; evidence: string };
export type JobMatchEdit = { target: string; suggestion: string };

export type JobMatchResult = {
  ok: boolean;
  promptId: string;
  promptVersion: string;
  /** 0–100, weighted keyword coverage (required terms count double). */
  matchScore: number;
  strengths: JobMatchStrength[];
  mustHaveGaps: JobMatchGap[];
  niceToHaveGaps: JobMatchGap[];
  suggestedEdits: JobMatchEdit[];
  warnings: string[];
  refusals: string[];
};
