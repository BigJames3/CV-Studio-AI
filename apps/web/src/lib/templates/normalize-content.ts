import type { CvContent, TemplateKey } from './types';

type LegacyWrapped = {
  schemaVersion?: number;
  templateKey?: TemplateKey;
  customization?: CvContent['customization'];
  sections?: Partial<Omit<CvContent, 'schemaVersion' | 'templateKey' | 'customization'>>;
};

/** Flatten legacy API `{ sections: { … } }` into editor `CvContent`. */
export function normalizeCvContent(raw: unknown, fallbackTemplate: TemplateKey = 'modern'): CvContent {
  const empty: CvContent = {
    schemaVersion: 1,
    templateKey: fallbackTemplate,
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

  if (!raw || typeof raw !== 'object') return empty;

  const obj = raw as LegacyWrapped & Partial<CvContent>;
  const sections =
    obj.sections && typeof obj.sections === 'object' ? obj.sections : null;
  const src = sections ?? obj;

  const identity = (src.identity ?? empty.identity) as CvContent['identity'];

  return {
    schemaVersion: Number(obj.schemaVersion ?? 1) || 1,
    templateKey: (obj.templateKey ?? fallbackTemplate) as TemplateKey,
    customization: obj.customization,
    identity: {
      fullName: identity.fullName ?? '',
      headline: identity.headline,
      email: identity.email,
      phone: identity.phone,
      city: identity.city,
      linkedin: identity.linkedin,
      github: identity.github,
      website: identity.website,
      photoUrl: identity.photoUrl ?? null,
    },
    summary: { text: (src.summary as { text?: string } | undefined)?.text ?? '' },
    experiences: Array.isArray(src.experiences) ? src.experiences : [],
    education: Array.isArray(src.education) ? src.education : [],
    skills: Array.isArray(src.skills) ? src.skills : [],
    languages: Array.isArray(src.languages) ? src.languages : [],
    projects: Array.isArray(src.projects) ? src.projects : [],
    certificates: Array.isArray(src.certificates) ? src.certificates : [],
    references: Array.isArray(src.references) ? src.references : [],
  };
}
