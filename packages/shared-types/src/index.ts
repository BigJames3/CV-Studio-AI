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
  | 'cv:share'
  | 'export:pdf'
  | 'export:docx'
  | 'ai:generate'
  | 'ai:optimize'
  | 'ai:ats'
  | 'marketplace:buy'
  | 'templates:pro'
  | 'templates:business';

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
