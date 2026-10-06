import type {
  TemplateCustomization,
  TemplateDesignData,
  TemplateKey,
  TemplateListItem,
} from './types';

const modernDefaults: TemplateCustomization = {
  primaryColor: '#2563eb',
  accentColor: '#2563eb',
  backgroundColor: '#ffffff',
  textColor: '#111827',
  headerFont: 'var(--font-inter), Inter, system-ui, sans-serif',
  bodyFont: 'var(--font-inter), Inter, system-ui, sans-serif',
  density: 'spacious',
  showPhoto: true,
  showSummary: true,
  showReferences: false,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const creativeDefaults: TemplateCustomization = {
  primaryColor: '#2563eb',
  accentColor: '#ec4899',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  headerFont: 'var(--font-montserrat), Montserrat, Inter, sans-serif',
  bodyFont: 'var(--font-inter), Inter, system-ui, sans-serif',
  density: 'normal',
  showPhoto: true,
  showSummary: true,
  showReferences: false,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const executiveDefaults: TemplateCustomization = {
  primaryColor: '#111827',
  accentColor: '#b45309',
  backgroundColor: '#ffffff',
  textColor: '#111827',
  headerFont: 'var(--font-lato), Lato, Calibri, sans-serif',
  bodyFont: 'Calibri, var(--font-lato), sans-serif',
  density: 'compact',
  showPhoto: true,
  showSummary: true,
  showReferences: true,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const startupDefaults: TemplateCustomization = {
  primaryColor: '#0f172a',
  accentColor: '#22d3ee',
  backgroundColor: '#fafafa',
  textColor: '#0f172a',
  headerFont: 'var(--font-poppins), Poppins, Inter, sans-serif',
  bodyFont: 'var(--font-poppins), Poppins, Inter, sans-serif',
  density: 'normal',
  showPhoto: false,
  showSummary: true,
  showReferences: false,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const atsDefaults: TemplateCustomization = {
  primaryColor: '#000000',
  accentColor: '#000000',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  headerFont: 'Arial, Calibri, sans-serif',
  bodyFont: 'Arial, Calibri, sans-serif',
  density: 'normal',
  showPhoto: false,
  showSummary: true,
  showReferences: false,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

// Second generation of templates (French sections and dates, see components/templates/blocks.tsx).
const classicDefaults: TemplateCustomization = {
  primaryColor: '#1e3a5f',
  accentColor: '#1e3a5f',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  headerFont: "Georgia, 'Times New Roman', serif",
  bodyFont: "Georgia, 'Times New Roman', serif",
  density: 'normal',
  showPhoto: false,
  showSummary: true,
  showReferences: true,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const bannerDefaults: TemplateCustomization = {
  primaryColor: '#0f4c81',
  accentColor: '#fbbf24',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  headerFont: 'var(--font-montserrat), Montserrat, Inter, sans-serif',
  bodyFont: 'var(--font-inter), Inter, system-ui, sans-serif',
  density: 'normal',
  showPhoto: true,
  showSummary: true,
  showReferences: false,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const compactDefaults: TemplateCustomization = {
  primaryColor: '#334155',
  accentColor: '#0ea5e9',
  backgroundColor: '#ffffff',
  textColor: '#111827',
  headerFont: 'var(--font-inter), Inter, system-ui, sans-serif',
  bodyFont: 'var(--font-inter), Inter, system-ui, sans-serif',
  density: 'compact',
  showPhoto: false,
  showSummary: true,
  showReferences: false,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const developerDefaults: TemplateCustomization = {
  primaryColor: '#0f172a',
  accentColor: '#16a34a',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  headerFont: 'var(--font-inter), Inter, system-ui, sans-serif',
  bodyFont: 'var(--font-inter), Inter, system-ui, sans-serif',
  density: 'normal',
  showPhoto: false,
  showSummary: true,
  showReferences: false,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const healthDefaults: TemplateCustomization = {
  primaryColor: '#0f766e',
  accentColor: '#5eead4',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  headerFont: 'var(--font-lato), Lato, Calibri, sans-serif',
  bodyFont: 'var(--font-lato), Lato, Calibri, sans-serif',
  density: 'normal',
  showPhoto: true,
  showSummary: true,
  showReferences: false,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const minimalDefaults: TemplateCustomization = {
  primaryColor: '#111111',
  accentColor: '#111111',
  backgroundColor: '#ffffff',
  textColor: '#111111',
  headerFont: 'var(--font-inter), Inter, system-ui, sans-serif',
  bodyFont: 'var(--font-inter), Inter, system-ui, sans-serif',
  density: 'spacious',
  showPhoto: false,
  showSummary: true,
  showReferences: false,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const elegantDefaults: TemplateCustomization = {
  primaryColor: '#1c1917',
  accentColor: '#b08d57',
  backgroundColor: '#ffffff',
  textColor: '#1c1917',
  headerFont: "Georgia, 'Times New Roman', serif",
  bodyFont: 'var(--font-lato), Lato, Calibri, sans-serif',
  density: 'normal',
  showPhoto: true,
  showSummary: true,
  showReferences: true,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const timelineDefaults: TemplateCustomization = {
  primaryColor: '#1e293b',
  accentColor: '#7c3aed',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  headerFont: 'var(--font-poppins), Poppins, Inter, sans-serif',
  bodyFont: 'var(--font-inter), Inter, system-ui, sans-serif',
  density: 'normal',
  showPhoto: true,
  showSummary: true,
  showReferences: false,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const sidebarDefaults: TemplateCustomization = {
  primaryColor: '#1f2a44',
  accentColor: '#f97316',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  headerFont: 'var(--font-montserrat), Montserrat, Inter, sans-serif',
  bodyFont: 'var(--font-inter), Inter, system-ui, sans-serif',
  density: 'normal',
  showPhoto: true,
  showSummary: true,
  showReferences: false,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

const infographicDefaults: TemplateCustomization = {
  primaryColor: '#4338ca',
  accentColor: '#06b6d4',
  backgroundColor: '#f8fafc',
  textColor: '#1f2937',
  headerFont: 'var(--font-poppins), Poppins, Inter, sans-serif',
  bodyFont: 'var(--font-poppins), Poppins, Inter, sans-serif',
  density: 'normal',
  showPhoto: true,
  showSummary: true,
  showReferences: false,
  showSkills: true,
  showEducation: true,
  showExperience: true,
  showProjects: true,
  showCertificates: true,
};

export const TEMPLATE_DESIGN_DATA: Record<TemplateKey, TemplateDesignData> = {
  modern: {
    key: 'modern',
    layout: 'two-column',
    defaults: modernDefaults,
    fontOptions: {
      headers: [
        'Inter, system-ui, sans-serif',
        'Helvetica, Arial, sans-serif',
        'Source Sans 3, Inter, sans-serif',
      ],
      body: [
        'Inter, system-ui, sans-serif',
        'Helvetica, Arial, sans-serif',
        'Roboto, Inter, sans-serif',
      ],
    },
    colorPresets: [
      { name: 'Blue', primary: '#2563eb', accent: '#2563eb' },
      { name: 'Slate', primary: '#334155', accent: '#64748b' },
      { name: 'Teal', primary: '#0d9488', accent: '#14b8a6' },
    ],
    features: {
      supportsPhoto: true,
      supportsIcons: false,
      supportsGradient: false,
      atsSafe: false,
    },
    usage: 'Startups, Tech roles',
  },
  creative: {
    key: 'creative',
    layout: 'header-gradient',
    defaults: creativeDefaults,
    fontOptions: {
      headers: [
        'Montserrat, Inter, sans-serif',
        'Poppins, Inter, sans-serif',
        'Raleway, Inter, sans-serif',
      ],
      body: ['Inter, system-ui, sans-serif', 'Open Sans, Inter, sans-serif'],
    },
    colorPresets: [
      { name: 'Blue→Purple', primary: '#2563eb', accent: '#ec4899' },
      { name: 'Violet', primary: '#7c3aed', accent: '#f472b6' },
      { name: 'Indigo', primary: '#4f46e5', accent: '#a855f7' },
    ],
    features: { supportsPhoto: true, supportsIcons: true, supportsGradient: true, atsSafe: false },
    usage: 'Design, marketing, creative roles',
  },
  executive: {
    key: 'executive',
    layout: 'single-column',
    defaults: executiveDefaults,
    fontOptions: {
      headers: ['Lato, Calibri, sans-serif', 'Georgia, Times New Roman, serif', 'Garamond, serif'],
      body: ['Calibri, Lato, sans-serif', 'Georgia, serif', 'Times New Roman, serif'],
    },
    colorPresets: [
      { name: 'Gold', primary: '#111827', accent: '#b45309' },
      { name: 'Navy', primary: '#0f172a', accent: '#92400e' },
      { name: 'Charcoal', primary: '#1f2937', accent: '#a16207' },
    ],
    features: { supportsPhoto: true, supportsIcons: false, supportsGradient: false, atsSafe: true },
    usage: 'Executives, lawyers, consultants',
  },
  startup: {
    key: 'startup',
    layout: 'asymmetric',
    defaults: startupDefaults,
    fontOptions: {
      headers: [
        'Poppins, Inter, sans-serif',
        'Space Grotesk, Inter, sans-serif',
        'Inter, sans-serif',
      ],
      body: ['Poppins, Inter, sans-serif', 'Inter, system-ui, sans-serif'],
    },
    colorPresets: [
      { name: 'Cyan neon', primary: '#0f172a', accent: '#22d3ee' },
      { name: 'Lime', primary: '#14532d', accent: '#a3e635' },
      { name: 'Magenta', primary: '#18181b', accent: '#e879f9' },
    ],
    features: { supportsPhoto: true, supportsIcons: true, supportsGradient: false, atsSafe: false },
    usage: 'Startup roles, junior positions, tech',
  },
  ats: {
    key: 'ats',
    layout: 'single-column',
    defaults: atsDefaults,
    fontOptions: {
      headers: [
        'Arial, Calibri, sans-serif',
        'Calibri, Arial, sans-serif',
        'Times New Roman, serif',
      ],
      body: ['Arial, Calibri, sans-serif', 'Calibri, Arial, sans-serif'],
    },
    colorPresets: [{ name: 'Black', primary: '#000000', accent: '#000000' }],
    features: {
      supportsPhoto: false,
      supportsIcons: false,
      supportsGradient: false,
      atsSafe: true,
    },
    usage: 'Large corporations, traditional industries',
  },
  classic: {
    key: 'classic',
    layout: 'single-column',
    defaults: classicDefaults,
    fontOptions: {
      headers: [
        "Georgia, 'Times New Roman', serif",
        'var(--font-inter), Inter, system-ui, sans-serif',
      ],
      body: [
        "Georgia, 'Times New Roman', serif",
        'var(--font-inter), Inter, system-ui, sans-serif',
        'var(--font-lato), Lato, Calibri, sans-serif',
      ],
    },
    colorPresets: [
      { name: 'Marine', primary: '#1e3a5f', accent: '#1e3a5f' },
      { name: 'Bordeaux', primary: '#7f1d1d', accent: '#7f1d1d' },
      { name: 'Noir', primary: '#111827', accent: '#111827' },
    ],
    features: {
      supportsPhoto: true,
      supportsIcons: false,
      supportsGradient: false,
      atsSafe: true,
    },
    usage: 'Administration, juridique, fonction publique',
  },
  banner: {
    key: 'banner',
    layout: 'header-gradient',
    defaults: bannerDefaults,
    fontOptions: {
      headers: [
        'var(--font-montserrat), Montserrat, Inter, sans-serif',
        'var(--font-inter), Inter, system-ui, sans-serif',
        "Georgia, 'Times New Roman', serif",
      ],
      body: [
        'var(--font-inter), Inter, system-ui, sans-serif',
        'var(--font-lato), Lato, Calibri, sans-serif',
      ],
    },
    colorPresets: [
      { name: 'Bleu & or', primary: '#0f4c81', accent: '#fbbf24' },
      { name: 'Vert & corail', primary: '#065f46', accent: '#fb7185' },
      { name: 'Anthracite & cyan', primary: '#1f2937', accent: '#22d3ee' },
    ],
    features: {
      supportsPhoto: true,
      supportsIcons: true,
      supportsGradient: false,
      atsSafe: false,
    },
    usage: 'Commercial, vente, relation client',
  },
  compact: {
    key: 'compact',
    layout: 'two-column',
    defaults: compactDefaults,
    fontOptions: {
      headers: [
        'var(--font-inter), Inter, system-ui, sans-serif',
        "Georgia, 'Times New Roman', serif",
      ],
      body: [
        'var(--font-inter), Inter, system-ui, sans-serif',
        'var(--font-lato), Lato, Calibri, sans-serif',
      ],
    },
    colorPresets: [
      { name: 'Ardoise', primary: '#334155', accent: '#0ea5e9' },
      { name: 'Bleu nuit', primary: '#1e3a8a', accent: '#3b82f6' },
      { name: 'Vert sapin', primary: '#14532d', accent: '#22c55e' },
    ],
    features: {
      supportsPhoto: false,
      supportsIcons: true,
      supportsGradient: false,
      atsSafe: false,
    },
    usage: 'Profils expérimentés, CV d’une page',
  },
  developer: {
    key: 'developer',
    layout: 'single-column',
    defaults: developerDefaults,
    fontOptions: {
      headers: [
        'var(--font-inter), Inter, system-ui, sans-serif',
        "Georgia, 'Times New Roman', serif",
      ],
      body: [
        'var(--font-inter), Inter, system-ui, sans-serif',
        'var(--font-lato), Lato, Calibri, sans-serif',
      ],
    },
    colorPresets: [
      { name: 'Terminal', primary: '#0f172a', accent: '#16a34a' },
      { name: 'Océan', primary: '#0c4a6e', accent: '#0ea5e9' },
      { name: 'Violet', primary: '#1e1b4b', accent: '#8b5cf6' },
    ],
    features: {
      supportsPhoto: true,
      supportsIcons: true,
      supportsGradient: false,
      atsSafe: false,
    },
    usage: 'Développeurs, data, DevOps',
  },
  health: {
    key: 'health',
    layout: 'single-column',
    defaults: healthDefaults,
    fontOptions: {
      headers: [
        'var(--font-lato), Lato, Calibri, sans-serif',
        'var(--font-inter), Inter, system-ui, sans-serif',
        "Georgia, 'Times New Roman', serif",
      ],
      body: [
        'var(--font-lato), Lato, Calibri, sans-serif',
        'var(--font-inter), Inter, system-ui, sans-serif',
      ],
    },
    colorPresets: [
      { name: 'Turquoise', primary: '#0f766e', accent: '#5eead4' },
      { name: 'Bleu clinique', primary: '#1d4ed8', accent: '#93c5fd' },
      { name: 'Lavande', primary: '#5b21b6', accent: '#c4b5fd' },
    ],
    features: {
      supportsPhoto: true,
      supportsIcons: true,
      supportsGradient: false,
      atsSafe: false,
    },
    usage: 'Médical, paramédical, social',
  },
  minimal: {
    key: 'minimal',
    layout: 'single-column',
    defaults: minimalDefaults,
    fontOptions: {
      headers: [
        'var(--font-inter), Inter, system-ui, sans-serif',
        "Georgia, 'Times New Roman', serif",
      ],
      body: [
        'var(--font-inter), Inter, system-ui, sans-serif',
        'var(--font-lato), Lato, Calibri, sans-serif',
      ],
    },
    colorPresets: [
      { name: 'Noir', primary: '#111111', accent: '#111111' },
      { name: 'Gris', primary: '#374151', accent: '#374151' },
      { name: 'Bleu encre', primary: '#1e293b', accent: '#1e293b' },
    ],
    features: {
      supportsPhoto: false,
      supportsIcons: false,
      supportsGradient: false,
      atsSafe: true,
    },
    usage: 'Tous secteurs',
  },
  elegant: {
    key: 'elegant',
    layout: 'two-column',
    defaults: elegantDefaults,
    fontOptions: {
      headers: [
        "Georgia, 'Times New Roman', serif",
        'var(--font-inter), Inter, system-ui, sans-serif',
      ],
      body: [
        'var(--font-lato), Lato, Calibri, sans-serif',
        'var(--font-inter), Inter, system-ui, sans-serif',
      ],
    },
    colorPresets: [
      { name: 'Or', primary: '#1c1917', accent: '#b08d57' },
      { name: 'Marine & or', primary: '#1e293b', accent: '#a16207' },
      { name: 'Bordeaux & rose', primary: '#4c0519', accent: '#be8a8a' },
    ],
    features: {
      supportsPhoto: true,
      supportsIcons: true,
      supportsGradient: false,
      atsSafe: false,
    },
    usage: 'Cadres, luxe, conseil',
  },
  timeline: {
    key: 'timeline',
    layout: 'single-column',
    defaults: timelineDefaults,
    fontOptions: {
      headers: [
        'var(--font-poppins), Poppins, Inter, sans-serif',
        'var(--font-inter), Inter, system-ui, sans-serif',
        "Georgia, 'Times New Roman', serif",
      ],
      body: [
        'var(--font-inter), Inter, system-ui, sans-serif',
        'var(--font-lato), Lato, Calibri, sans-serif',
      ],
    },
    colorPresets: [
      { name: 'Violet', primary: '#1e293b', accent: '#7c3aed' },
      { name: 'Émeraude', primary: '#064e3b', accent: '#10b981' },
      { name: 'Corail', primary: '#3f1d1d', accent: '#f97316' },
    ],
    features: {
      supportsPhoto: true,
      supportsIcons: true,
      supportsGradient: false,
      atsSafe: false,
    },
    usage: 'Parcours riches, managers',
  },
  sidebar: {
    key: 'sidebar',
    layout: 'two-column',
    defaults: sidebarDefaults,
    fontOptions: {
      headers: [
        'var(--font-montserrat), Montserrat, Inter, sans-serif',
        'var(--font-inter), Inter, system-ui, sans-serif',
        "Georgia, 'Times New Roman', serif",
      ],
      body: [
        'var(--font-inter), Inter, system-ui, sans-serif',
        'var(--font-lato), Lato, Calibri, sans-serif',
      ],
    },
    colorPresets: [
      { name: 'Nuit & orange', primary: '#1f2a44', accent: '#f97316' },
      { name: 'Ardoise & turquoise', primary: '#1e293b', accent: '#2dd4bf' },
      { name: 'Prune & rose', primary: '#3b0764', accent: '#f472b6' },
    ],
    features: {
      supportsPhoto: true,
      supportsIcons: true,
      supportsGradient: false,
      atsSafe: false,
    },
    usage: 'Créatifs, marketing, communication',
  },
  infographic: {
    key: 'infographic',
    layout: 'header-gradient',
    defaults: infographicDefaults,
    fontOptions: {
      headers: [
        'var(--font-poppins), Poppins, Inter, sans-serif',
        'var(--font-inter), Inter, system-ui, sans-serif',
        "Georgia, 'Times New Roman', serif",
      ],
      body: [
        'var(--font-poppins), Poppins, Inter, sans-serif',
        'var(--font-inter), Inter, system-ui, sans-serif',
        'var(--font-lato), Lato, Calibri, sans-serif',
      ],
    },
    colorPresets: [
      { name: 'Indigo & cyan', primary: '#4338ca', accent: '#06b6d4' },
      { name: 'Rose & orange', primary: '#be185d', accent: '#f97316' },
      { name: 'Vert & citron', primary: '#047857', accent: '#a3e635' },
    ],
    features: {
      supportsPhoto: true,
      supportsIcons: true,
      supportsGradient: true,
      atsSafe: false,
    },
    usage: 'Design, communication, événementiel',
  },
};

/** Stable UUIDs for seed templates (API + frontend demo). */
export const TEMPLATE_SEED_IDS: Record<TemplateKey, string> = {
  modern: '11111111-1111-4111-8111-111111111101',
  creative: '11111111-1111-4111-8111-111111111102',
  executive: '11111111-1111-4111-8111-111111111103',
  startup: '11111111-1111-4111-8111-111111111104',
  ats: '11111111-1111-4111-8111-111111111105',
  classic: '11111111-1111-4111-8111-111111111106',
  banner: '11111111-1111-4111-8111-111111111107',
  compact: '11111111-1111-4111-8111-111111111108',
  developer: '11111111-1111-4111-8111-111111111109',
  health: '11111111-1111-4111-8111-111111111110',
  minimal: '11111111-1111-4111-8111-111111111111',
  elegant: '11111111-1111-4111-8111-111111111112',
  timeline: '11111111-1111-4111-8111-111111111113',
  sidebar: '11111111-1111-4111-8111-111111111114',
  infographic: '11111111-1111-4111-8111-111111111115',
};

export const TEMPLATE_CATALOG: TemplateListItem[] = [
  {
    id: TEMPLATE_SEED_IDS.modern,
    name: 'Modern',
    description: 'Minimaliste 2 colonnes — blanc, accents bleu. Ideal startups & tech.',
    category: 'modern',
    previewImageUrl: '/templates/previews/modern.svg',
    isPremium: false,
    accessTier: 'free',
    rating: 4.8,
    downloadCount: 12840,
    designData: TEMPLATE_DESIGN_DATA.modern,
  },
  {
    id: TEMPLATE_SEED_IDS.creative,
    name: 'Creative',
    description: 'En-tête gradient, icons, timeline. Design & marketing.',
    category: 'creative',
    previewImageUrl: '/templates/previews/creative.svg',
    isPremium: false,
    accessTier: 'free',
    rating: 4.7,
    downloadCount: 9420,
    designData: TEMPLATE_DESIGN_DATA.creative,
  },
  {
    id: TEMPLATE_SEED_IDS.executive,
    name: 'Executive',
    description: 'Formel, élégant, accents or. Cadres, juridique, consulting.',
    category: 'executive',
    previewImageUrl: '/templates/previews/executive.svg',
    isPremium: true,
    accessTier: 'pro',
    price: 0,
    rating: 4.9,
    downloadCount: 6100,
    designData: TEMPLATE_DESIGN_DATA.executive,
  },
  {
    id: TEMPLATE_SEED_IDS.startup,
    name: 'Startup',
    description: 'Asymétrique, Poppins, accents néon. Junior & scale-ups.',
    category: 'startup',
    previewImageUrl: '/templates/previews/startup.svg',
    isPremium: false,
    accessTier: 'free',
    rating: 4.6,
    downloadCount: 8200,
    designData: TEMPLATE_DESIGN_DATA.startup,
  },
  {
    id: TEMPLATE_SEED_IDS.ats,
    name: 'ATS-Optimized',
    description: 'Colonne unique, texte noir, zéro décor — max ATS parse.',
    category: 'ats_optimized',
    previewImageUrl: '/templates/previews/ats.svg',
    isPremium: false,
    accessTier: 'free',
    rating: 4.9,
    downloadCount: 22100,
    designData: TEMPLATE_DESIGN_DATA.ats,
  },
  {
    id: TEMPLATE_SEED_IDS.classic,
    name: 'Classique',
    description:
      'Une colonne, police à empattement, en-tête centré. Administration, droit, fonction publique.',
    category: 'executive',
    previewImageUrl: '/templates/previews/classic.svg',
    isPremium: false,
    accessTier: 'free',
    rating: 0,
    downloadCount: 0,
    designData: TEMPLATE_DESIGN_DATA.classic,
  },
  {
    id: TEMPLATE_SEED_IDS.banner,
    name: 'Bandeau',
    description:
      'Grand bandeau coloré avec photo, puis deux colonnes. Commercial, relation client.',
    category: 'creative',
    previewImageUrl: '/templates/previews/banner.svg',
    isPremium: false,
    accessTier: 'free',
    rating: 0,
    downloadCount: 0,
    designData: TEMPLATE_DESIGN_DATA.banner,
  },
  {
    id: TEMPLATE_SEED_IDS.compact,
    name: 'Compact',
    description: 'Deux colonnes serrées pour tout faire tenir sur une page. Profils expérimentés.',
    category: 'modern',
    previewImageUrl: '/templates/previews/compact.svg',
    isPremium: false,
    accessTier: 'free',
    rating: 0,
    downloadCount: 0,
    designData: TEMPLATE_DESIGN_DATA.compact,
  },
  {
    id: TEMPLATE_SEED_IDS.developer,
    name: 'Développeur',
    description: 'Accents « code », compétences en étiquettes, projets mis en avant. Tech, data.',
    category: 'startup',
    previewImageUrl: '/templates/previews/developer.svg',
    isPremium: false,
    accessTier: 'free',
    rating: 0,
    downloadCount: 0,
    designData: TEMPLATE_DESIGN_DATA.developer,
  },
  {
    id: TEMPLATE_SEED_IDS.health,
    name: 'Santé',
    description: 'Sobre, tons doux, certifications juste après le profil. Médical, paramédical.',
    category: 'modern',
    previewImageUrl: '/templates/previews/health.svg',
    isPremium: false,
    accessTier: 'free',
    rating: 0,
    downloadCount: 0,
    designData: TEMPLATE_DESIGN_DATA.health,
  },
  {
    id: TEMPLATE_SEED_IDS.minimal,
    name: 'Minimal',
    description: 'Noir et blanc, beaucoup d’espace, grand nom et titres en marge. Tous profils.',
    category: 'modern',
    previewImageUrl: '/templates/previews/minimal.svg',
    isPremium: false,
    accessTier: 'free',
    rating: 0,
    downloadCount: 0,
    designData: TEMPLATE_DESIGN_DATA.minimal,
  },
  {
    id: TEMPLATE_SEED_IDS.elegant,
    name: 'Élégant',
    description: 'Empattements, filets dorés, colonne ivoire. Cadres, luxe, conseil.',
    category: 'executive',
    previewImageUrl: '/templates/previews/elegant.svg',
    isPremium: true,
    accessTier: 'pro',
    price: 0,
    rating: 0,
    downloadCount: 0,
    designData: TEMPLATE_DESIGN_DATA.elegant,
  },
  {
    id: TEMPLATE_SEED_IDS.timeline,
    name: 'Timeline',
    description:
      'Les expériences sur une frise verticale. Parcours riches et évolutions de carrière.',
    category: 'creative',
    previewImageUrl: '/templates/previews/timeline.svg',
    isPremium: true,
    accessTier: 'pro',
    price: 0,
    rating: 0,
    downloadCount: 0,
    designData: TEMPLATE_DESIGN_DATA.timeline,
  },
  {
    id: TEMPLATE_SEED_IDS.sidebar,
    name: 'Sidebar sombre',
    description: 'Colonne foncée avec photo et barres de niveau. Créatifs, marketing.',
    category: 'creative',
    previewImageUrl: '/templates/previews/sidebar.svg',
    isPremium: true,
    accessTier: 'pro',
    price: 0,
    rating: 0,
    downloadCount: 0,
    designData: TEMPLATE_DESIGN_DATA.sidebar,
  },
  {
    id: TEMPLATE_SEED_IDS.infographic,
    name: 'Infographie',
    description:
      'En-tête dégradé, jauges de compétences, sections en cartes. Design, communication.',
    category: 'creative',
    previewImageUrl: '/templates/previews/infographic.svg',
    isPremium: true,
    accessTier: 'pro',
    price: 0,
    rating: 0,
    downloadCount: 0,
    designData: TEMPLATE_DESIGN_DATA.infographic,
  },
];

export function getTemplateById(id: string) {
  return TEMPLATE_CATALOG.find((t) => t.id === id);
}

export function getDesignData(key: TemplateKey) {
  return TEMPLATE_DESIGN_DATA[key];
}

/**
 * Editor key (renderer) of a catalog template. Several templates share a category (the DB
 * enum has five values), so the key comes from `designData.key`, not from the category.
 */
export function templateKeyOf(template: Pick<TemplateListItem, 'category' | 'designData'>) {
  return template.designData?.key ?? categoryToKey(String(template.category));
}

export function categoryToKey(category: string): TemplateKey {
  if (category === 'ats_optimized') return 'ats';
  if (category in TEMPLATE_DESIGN_DATA) return category as TemplateKey;
  return 'modern';
}
