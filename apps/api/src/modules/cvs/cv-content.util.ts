/** Flat editor shape — source of truth for `cvs.content` JSONB. */
export type FlatCvContent = {
  schemaVersion: number;
  templateKey?: string;
  customization?: unknown;
  identity: { fullName: string; [key: string]: unknown };
  summary: { text: string };
  experiences: unknown[];
  education: unknown[];
  skills: unknown[];
  languages: unknown[];
  projects: unknown[];
  certificates: unknown[];
  references: unknown[];
};

export const EMPTY_CV_CONTENT: FlatCvContent = {
  schemaVersion: 1,
  identity: { fullName: '' },
  summary: { text: '' },
  experiences: [],
  education: [],
  skills: [],
  languages: [],
  projects: [],
  certificates: [],
  references: [],
};

/**
 * Normalize legacy `{ sections: { … } }` wrappers into the flat editor shape.
 * Safe to call on every read/write so old rows migrate transparently.
 */
export function normalizeCvContent(raw: unknown): FlatCvContent {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_CV_CONTENT, experiences: [], education: [], skills: [], languages: [], projects: [], certificates: [], references: [] };
  }

  const obj = raw as Record<string, unknown>;
  const sections =
    obj.sections && typeof obj.sections === 'object'
      ? (obj.sections as Record<string, unknown>)
      : null;
  const src = sections ?? obj;

  const identityRaw =
    src.identity && typeof src.identity === 'object'
      ? (src.identity as Record<string, unknown>)
      : {};

  return {
    schemaVersion: typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1,
    ...(typeof obj.templateKey === 'string' ? { templateKey: obj.templateKey } : {}),
    ...(obj.customization !== undefined ? { customization: obj.customization } : {}),
    identity: {
      ...identityRaw,
      fullName: typeof identityRaw.fullName === 'string' ? identityRaw.fullName : '',
    },
    summary: {
      text:
        src.summary && typeof src.summary === 'object' && typeof (src.summary as { text?: unknown }).text === 'string'
          ? ((src.summary as { text: string }).text)
          : '',
    },
    experiences: Array.isArray(src.experiences) ? src.experiences : [],
    education: Array.isArray(src.education) ? src.education : [],
    skills: Array.isArray(src.skills) ? src.skills : [],
    languages: Array.isArray(src.languages) ? src.languages : [],
    projects: Array.isArray(src.projects) ? src.projects : [],
    certificates: Array.isArray(src.certificates) ? src.certificates : [],
    references: Array.isArray(src.references) ? src.references : [],
  };
}
