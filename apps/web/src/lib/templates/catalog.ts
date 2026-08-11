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
};

/** Stable UUIDs for seed templates (API + frontend demo). */
export const TEMPLATE_SEED_IDS: Record<TemplateKey, string> = {
  modern: '11111111-1111-4111-8111-111111111101',
  creative: '11111111-1111-4111-8111-111111111102',
  executive: '11111111-1111-4111-8111-111111111103',
  startup: '11111111-1111-4111-8111-111111111104',
  ats: '11111111-1111-4111-8111-111111111105',
};

export const TEMPLATE_CATALOG: TemplateListItem[] = [
  {
    id: TEMPLATE_SEED_IDS.modern,
    name: 'Modern',
    description: 'Minimaliste 2 colonnes — blanc, accents bleu. Ideal startups & tech.',
    category: 'modern',
    previewImageUrl: '/templates/previews/modern.svg',
    isPremium: false,
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
    rating: 4.9,
    downloadCount: 22100,
    designData: TEMPLATE_DESIGN_DATA.ats,
  },
];

export function getTemplateById(id: string) {
  return TEMPLATE_CATALOG.find((t) => t.id === id);
}

export function getDesignData(key: TemplateKey) {
  return TEMPLATE_DESIGN_DATA[key];
}

export function categoryToKey(category: string): TemplateKey {
  if (category === 'ats_optimized') return 'ats';
  if (category in TEMPLATE_DESIGN_DATA) return category as TemplateKey;
  return 'modern';
}
