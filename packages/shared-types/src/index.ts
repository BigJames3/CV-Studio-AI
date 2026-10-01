/** Shared domain types used by web, api, mobile */

// ─── Auth / billing ───
export type UserRole = 'free_user' | 'pro_user' | 'business_user' | 'admin' | 'moderator';
export type SubscriptionTier = 'free' | 'pro' | 'business';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
  location?: string;
  bio?: string;
  subscriptionTier: SubscriptionTier;
  isEmailVerified: boolean;
  is2FAEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Template keys (Sprint 4) ───
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

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
  meta?: Record<string, unknown>;
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export type PlanEntitlement =
  | 'cv:create'
  | 'export:pdf'
  | 'export:docx'
  | 'ai:generate'
  | 'ai:optimize'
  | 'ai:ats'
  | 'marketplace:buy';

export type { BillingCatalogEntitlement, BillingPlanSlug, PublicBillingPlan } from './billing';

// ─── Prompt-compatible CV entity model ───
export interface CV {
  id: string;
  userId: string;
  title: string;
  templateId?: string;
  content: CVContent;
  isPublic: boolean;
  publicUrl?: string;
  viewCount: number;
  isStarred: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CVContent {
  personalInfo: PersonalInfo;
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  certificates: Certificate[];
  projects: Project[];
  customization?: PromptTemplateCustomization;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  dateOfBirth?: Date;
}

export interface Experience {
  id: string;
  companyName: string;
  jobTitle: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
  description?: string;
  order: number;
}

export interface Education {
  id: string;
  schoolName: string;
  degree: string;
  fieldOfStudy: string;
  startDate: Date;
  endDate?: Date;
  isOngoing: boolean;
  grade?: string;
  description?: string;
  order: number;
}

export interface Skill {
  id: string;
  skillName: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  endorsementsCount: number;
  order: number;
}

export interface Language {
  id: string;
  language: string;
  proficiency: 'elementary' | 'limited_working' | 'professional' | 'full_professional' | 'native';
  order: number;
}

export interface Certificate {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expirationDate?: Date;
  url?: string;
  credentialId?: string;
  order: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  url?: string;
  imageUrl?: string;
  startDate: Date;
  endDate?: Date;
  order: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'creative' | 'executive' | 'startup' | 'ats_optimized';
  previewImageUrl: string;
  isPremium: boolean;
  price?: number;
  designData: TemplateDesignData;
  isPublished: boolean;
  downloadCount: number;
  rating: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateDesignData {
  colors: TemplateColors;
  fonts: TemplateFonts;
  spacing: TemplateSpacing;
}

export interface TemplateColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface TemplateFonts {
  headers: string;
  body: string;
  monospace: string;
}

export interface TemplateSpacing {
  small: number;
  medium: number;
  large: number;
}

export interface PromptTemplateCustomization {
  templateId: string;
  primaryColor?: string;
  secondaryColor?: string;
  headerFont?: string;
  bodyFont?: string;
  fontSize?: 'small' | 'medium' | 'large';
  showPhoto?: boolean;
  showObjective?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface CreateCVDTO {
  title: string;
  templateId?: string;
}

export interface UpdateCVDTO {
  title?: string;
  content?: CVContent;
  isPublic?: boolean;
}
