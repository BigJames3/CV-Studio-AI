/** Shared CV + template customization types (Sprint 4) */

export type TemplateKey = 'modern' | 'creative' | 'executive' | 'startup' | 'ats';

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
  start: string;
  end?: string | null;
  current?: boolean;
  bullets: string[];
};

export type CvEducation = {
  id: string;
  school: string;
  degree: string;
  field?: string;
  start?: string;
  end?: string;
  details?: string;
};

export type CvSkill = {
  id: string;
  name: string;
  level?: number;
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
    linkedin?: string;
    github?: string;
    website?: string;
    photoUrl?: string | null;
  };
  summary: { text: string };
  experiences: CvExperience[];
  education: CvEducation[];
  skills: CvSkill[];
  languages: Array<{ id: string; name: string; level?: string }>;
  projects: Array<{ id: string; name: string; description?: string; url?: string }>;
  certificates: Array<{ id: string; name: string; issuer?: string; year?: string }>;
  references?: Array<{ id: string; name: string; role?: string; contact?: string }>;
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
