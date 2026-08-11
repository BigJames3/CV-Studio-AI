export const ATS_EXPLAIN_PROMPT_ID = 'ats_explain';
export const ATS_EXPLAIN_PROMPT_VERSION = 'v1';

export type AtsExplainInput = {
  score: number;
  breakdown: Record<string, unknown>;
  cvSummary: Record<string, unknown>;
  hasJd: boolean;
  locale?: string;
};

export type AtsExplainItem = {
  category: 'format' | 'structure' | 'content' | 'keywords' | 'contact' | string;
  severity: 'high' | 'med' | 'low' | string;
  issue: string;
  fix: string;
};

export type AtsExplainResult = {
  ok: boolean;
  promptId: string;
  promptVersion: string;
  headline: string;
  explanations: AtsExplainItem[];
  quickWins: string[];
  warnings: string[];
};

export function buildAtsExplainMessages(input: AtsExplainInput) {
  return [
    {
      role: 'system' as const,
      content: `Explain ATS_REPORT_BREAKDOWN in ${input.locale ?? 'en'} with actionable fixes. Do not invent CV content. Numeric score is authoritative. Return JSON: ok, headline, explanations[], quickWins[], warnings[].`,
    },
    {
      role: 'user' as const,
      content: `ATS_SCORE: ${input.score}\nBREAKDOWN:\n${JSON.stringify(input.breakdown)}\nCV_SUMMARY:\n${JSON.stringify(input.cvSummary)}\nJD_MODE: ${input.hasJd}`,
    },
  ];
}
