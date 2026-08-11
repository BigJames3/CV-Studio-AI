/** Flat CV content shape used by the PDF renderer (matches web editor CvContent). */

export type PdfPageSize = 'A4' | 'Letter';

export type PdfQuality = 'draft' | 'standard' | 'high';

export type PdfCvContent = {
  schemaVersion?: number;
  templateKey?: string;
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
  summary?: { text?: string };
  experiences?: Array<{
    id?: string;
    company: string;
    title: string;
    location?: string;
    start?: string;
    end?: string | null;
    current?: boolean;
    bullets?: string[];
    description?: string;
  }>;
  education?: Array<{
    id?: string;
    school: string;
    degree: string;
    field?: string;
    start?: string;
    end?: string;
    details?: string;
  }>;
  skills?: Array<{ id?: string; name: string; level?: number | string }>;
  languages?: Array<{ id?: string; name: string; level?: string }>;
  projects?: Array<{
    id?: string;
    name: string;
    description?: string;
    url?: string;
  }>;
  certificates?: Array<{
    id?: string;
    name: string;
    issuer?: string;
    year?: string;
  }>;
  customization?: {
    primaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    showPhoto?: boolean;
    showSummary?: boolean;
    showSkills?: boolean;
    showEducation?: boolean;
    showExperience?: boolean;
    showProjects?: boolean;
    showCertificates?: boolean;
  };
};

export type ExportPdfOptions = {
  includeFooter?: boolean;
  includeHeader?: boolean;
  pageSize?: PdfPageSize;
  marginMm?: number;
  filename?: string;
  quality?: PdfQuality;
  siteUrl?: string;
  /** When true, render client-serialized template HTML with zero margins / scale 1 */
  wysiwyg?: boolean;
  /** Pre-rendered HTML from browser TemplateWrapper (takes precedence over content builder) */
  html?: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};
