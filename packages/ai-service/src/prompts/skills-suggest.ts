export const SKILLS_SUGGEST_PROMPT_ID = 'skills_suggest';
export const SKILLS_SUGGEST_PROMPT_VERSION = 'v1';

export type SkillsSuggestInput = {
  cvFacts: Record<string, unknown>;
  targetRole?: string;
  locale?: string;
};

/** A skill the CV already demonstrates but does not list in its Skills section. */
export type SkillSuggestion = {
  skill: string;
  evidence: string;
  source: 'experience' | 'project' | 'certificate' | 'summary' | 'education';
  relevantToTarget: boolean;
};

/** A skill the target role usually expects and the CV shows no sign of. Never to be added as-is. */
export type SkillToDevelop = { skill: string; reason: string };

export type SkillsSuggestResult = {
  ok: boolean;
  promptId: string;
  promptVersion: string;
  suggestions: SkillSuggestion[];
  toDevelop: SkillToDevelop[];
  warnings: string[];
};
