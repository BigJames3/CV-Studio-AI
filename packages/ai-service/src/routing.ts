export type AiFeature =
  | 'generate-cv'
  | 'optimize-resume'
  | 'cover-letter'
  | 'ats'
  | 'interview'
  | 'job-match'
  | 'career-advice'
  | 'portfolio'
  | 'grammar-check'
  | 'skills-suggest'
  | 'linkedin-import'
  | 'ocr';

/** Default model routing (override via env / Redis config in prod). */
export const DEFAULT_MODEL_ROUTING: Record<AiFeature, string> = {
  'generate-cv': 'gpt-4o-mini',
  'optimize-resume': 'gpt-4o',
  'cover-letter': 'gpt-4o-mini',
  ats: 'gpt-4o-mini',
  interview: 'gpt-4o-mini',
  'job-match': 'claude-sonnet',
  'career-advice': 'gpt-4o-mini',
  portfolio: 'gpt-4o',
  'grammar-check': 'gpt-4o-mini',
  'skills-suggest': 'gpt-4o-mini',
  'linkedin-import': 'gpt-4o-mini',
  ocr: 'gpt-4o',
};

export function resolveModel(feature: AiFeature, override?: string) {
  return override ?? DEFAULT_MODEL_ROUTING[feature];
}
