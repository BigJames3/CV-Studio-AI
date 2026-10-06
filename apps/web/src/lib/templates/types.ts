/** Shared CV + template customization types (Sprint 4) */

export type TemplateKey =
  | 'modern'
  | 'creative'
  | 'executive'
  | 'startup'
  | 'ats'
  | 'classic'
  | 'banner'
  | 'compact'
  | 'developer'
  | 'health'
  | 'minimal'
  | 'elegant'
  | 'timeline'
  | 'sidebar'
  | 'infographic';

export type DensityPreset = 'compact' | 'normal' | 'spacious';

export type TemplateCustomization = {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headerFont: string;
  bodyFont: string;
  density: DensityPreset;
  showPhoto: boolean;
  showSummary: boolean;
  showReferences: boolean;
  showSkills: boolean;
  showEducation: boolean;
  showExperience: boolean;
  showProjects: boolean;
  showCertificates: boolean;
};

export type CvExperience = {
  id: string;
  company: string;
  title: string;
  location?: string;
  /** CDI, CDD, Stage, Alternance, Freelance… */
  contractType?: string;
  sector?: string;
  start: string;
  end?: string | null;
  current?: boolean;
  /** Responsibilities, one per line. */
  bullets: string[];
  /** Achievements the candidate reports, one per line (figures only if they gave them). */
  achievements?: string[];
  /** Tools, equipment or skills used, comma-separated. */
  tools?: string;
};

export type CvEducation = {
  id: string;
  school: string;
  degree: string;
  field?: string;
  location?: string;
  start?: string;
  end?: string;
  /** Mention, e.g. « Très bien ». */
  honors?: string;
  /** Final project or thesis. */
  thesis?: string;
  details?: string;
};

export type CvSkill = {
  id: string;
  name: string;
  /** 1–5; absent when the candidate gave no level. */
  level?: number;
  /** e.g. « Compétences techniques »; skills are grouped by category when set. */
  category?: string;
};

export type CvLanguage = {
  id: string;
  name: string;
  /** CECRL level (A1…C2) or « Langue maternelle ». */
  level?: string;
  certification?: string;
};

export type CvProject = {
  id: string;
  name: string;
  role?: string;
  start?: string;
  end?: string;
  current?: boolean;
  description?: string;
  technologies?: string;
  url?: string;
};

export type CvCertificate = {
  id: string;
  name: string;
  issuer?: string;
  /** Date obtained. */
  year?: string;
  expires?: string;
  credentialId?: string;
  url?: string;
};

export type CvReference = {
  id: string;
  name: string;
  role?: string;
  organization?: string;
  contact?: string;
};

export type CvAward = {
  id: string;
  name: string;
  issuer?: string;
  date?: string;
  description?: string;
};

export type CvVolunteering = {
  id: string;
  organization: string;
  role?: string;
  location?: string;
  start?: string;
  end?: string;
  current?: boolean;
  description?: string;
};

export type CvPublication = {
  id: string;
  title: string;
  type?: string;
  authors?: string;
  publisher?: string;
  date?: string;
  url?: string;
};

export type CvTalk = {
  id: string;
  event: string;
  topic?: string;
  role?: string;
  organizer?: string;
  location?: string;
  date?: string;
};

/** Driving licence or professional clearance (habilitation). */
export type CvLicense = {
  id: string;
  name: string;
  issuer?: string;
  date?: string;
  expires?: string;
};

export type CvInterest = { id: string; name: string };

/** Free « label : value » line for job-specific facts (ordre professionnel, zones couvertes…). */
export type CvAdditionalInfo = { id: string; label: string; value: string };

export type CvExtras = {
  /** « Disponible immédiatement », « À partir de septembre 2026 »… */
  availability?: string;
  notice?: string;
  desiredLocation?: string;
  /** Picked from MOBILITY_OPTIONS. */
  mobility?: string[];
};

export type CvContent = {
  schemaVersion: number;
  templateKey?: TemplateKey;
  customization?: TemplateCustomization;
  identity: {
    fullName: string;
    headline?: string;
    email?: string;
    phone?: string;
    city?: string;
    country?: string;
    address?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    photoUrl?: string | null;
  };
  summary: { text: string };
  experiences: CvExperience[];
  education: CvEducation[];
  skills: CvSkill[];
  languages: CvLanguage[];
  projects: CvProject[];
  certificates: CvCertificate[];
  references?: CvReference[];
  awards?: CvAward[];
  volunteering?: CvVolunteering[];
  publications?: CvPublication[];
  talks?: CvTalk[];
  licenses?: CvLicense[];
  interests?: CvInterest[];
  additionalInfo?: CvAdditionalInfo[];
  extras?: CvExtras;
};

export type TemplateDesignData = {
  key: TemplateKey;
  layout: 'two-column' | 'single-column' | 'header-gradient' | 'asymmetric';
  defaults: TemplateCustomization;
  fontOptions: {
    headers: string[];
    body: string[];
  };
  colorPresets: Array<{ name: string; primary: string; accent: string }>;
  features: {
    supportsPhoto: boolean;
    supportsIcons: boolean;
    supportsGradient: boolean;
    atsSafe: boolean;
  };
  usage: string;
};

export type TemplateListItem = {
  id: string;
  name: string;
  description: string;
  category: TemplateKey | string;
  previewImageUrl: string;
  isPremium: boolean;
  accessTier?: 'free' | 'pro' | 'business';
  price?: number | null;
  rating: number;
  downloadCount: number;
  designData?: TemplateDesignData;
};

export const DENSITY_SCALE: Record<
  DensityPreset,
  { sectionGap: string; lineHeight: number; fontScale: number }
> = {
  compact: { sectionGap: '0.75rem', lineHeight: 1.35, fontScale: 0.92 },
  normal: { sectionGap: '1.25rem', lineHeight: 1.5, fontScale: 1 },
  spacious: { sectionGap: '1.75rem', lineHeight: 1.65, fontScale: 1.06 },
};

export function mergeCustomization(
  base: TemplateCustomization,
  patch?: Partial<TemplateCustomization>
): TemplateCustomization {
  return { ...base, ...patch };
}
