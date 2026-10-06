export const INTERVIEW_PREP_PROMPT_ID = 'interview_prep';
export const INTERVIEW_PREP_PROMPT_VERSION = 'v1';

export type InterviewType = 'hr' | 'hiring_manager' | 'technical';

export type InterviewPrepInput = {
  cvFacts: Record<string, unknown>;
  jobDescription: string;
  interviewType?: string;
  locale?: string;
};

export type InterviewQuestion = {
  question: string;
  framework: 'STAR' | 'open' | 'technical';
  tips: string[];
  /** True when the CV has no evidence for it: the candidate must bring their own answer. */
  needsUserInput: boolean;
  basedOn?: string;
};

export type InterviewPrepResult = {
  ok: boolean;
  promptId: string;
  promptVersion: string;
  interviewType: InterviewType;
  questions: InterviewQuestion[];
  disclaimer: string;
  warnings: string[];
  refusals: string[];
};
