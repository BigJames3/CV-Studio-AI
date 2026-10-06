export const CAREER_ADVICE_PROMPT_ID = 'career_advisor';
export const CAREER_ADVICE_PROMPT_VERSION = 'v1';

export type CareerAdviceInput = {
  cvFacts: Record<string, unknown>;
  targetRole?: string;
  locale?: string;
};

export type CareerAdviceCard = {
  title: string;
  type:
    'summary' | 'impact' | 'skills' | 'positioning' | 'experience' | 'credibility' | 'next-step';
  body: string;
  priority: 'high' | 'medium' | 'low';
  evidenceBased: boolean;
  actions: string[];
};

export type CareerAdviceResult = {
  ok: boolean;
  promptId: string;
  promptVersion: string;
  cards: CareerAdviceCard[];
  disclaimer: string;
  warnings: string[];
};
