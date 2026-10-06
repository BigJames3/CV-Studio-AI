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
  awards: unknown[];
  volunteering: unknown[];
  publications: unknown[];
  talks: unknown[];
  licenses: unknown[];
  interests: unknown[];
  additionalInfo: unknown[];
  extras: Record<string, unknown>;
};

/** Optional « modèle universel » lists (distinctions, bénévolat, permis…). */
const EXTRA_LISTS = [
  'awards',
  'volunteering',
  'publications',
  'talks',
  'licenses',
  'interests',
  'additionalInfo',
] as const;

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
  awards: [],
  volunteering: [],
  publications: [],
  talks: [],
  licenses: [],
  interests: [],
  additionalInfo: [],
  extras: {},
};

/**
 * Normalize legacy `{ sections: { … } }` wrappers into the flat editor shape.
 * Safe to call on every read/write so old rows migrate transparently.
 */
export function normalizeCvContent(raw: unknown): FlatCvContent {
  if (!raw || typeof raw !== 'object') {
    return {
      ...EMPTY_CV_CONTENT,
      experiences: [],
      education: [],
      skills: [],
      languages: [],
      projects: [],
      certificates: [],
      references: [],
      ...emptyExtraLists(),
      extras: {},
    };
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
        src.summary &&
        typeof src.summary === 'object' &&
        typeof (src.summary as { text?: unknown }).text === 'string'
          ? (src.summary as { text: string }).text
          : '',
    },
    experiences: Array.isArray(src.experiences) ? src.experiences : [],
    education: Array.isArray(src.education) ? src.education : [],
    skills: Array.isArray(src.skills) ? src.skills : [],
    languages: Array.isArray(src.languages) ? src.languages : [],
    projects: Array.isArray(src.projects) ? src.projects : [],
    certificates: Array.isArray(src.certificates) ? src.certificates : [],
    references: Array.isArray(src.references) ? src.references : [],
    ...(Object.fromEntries(
      EXTRA_LISTS.map((key) => [key, Array.isArray(src[key]) ? src[key] : []])
    ) as Record<(typeof EXTRA_LISTS)[number], unknown[]>),
    extras:
      src.extras && typeof src.extras === 'object' && !Array.isArray(src.extras)
        ? (src.extras as Record<string, unknown>)
        : {},
  };
}

function emptyExtraLists() {
  return Object.fromEntries(EXTRA_LISTS.map((key) => [key, []])) as unknown as Record<
    (typeof EXTRA_LISTS)[number],
    unknown[]
  >;
}
