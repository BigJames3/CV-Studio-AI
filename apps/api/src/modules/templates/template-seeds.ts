/**
 * Official CV templates seed — mirrors apps/web catalog.
 * Used when DB empty or as designData source of truth for GET /templates/:id
 */

export type TemplateSeed = {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'creative' | 'executive' | 'startup' | 'ats_optimized';
  previewImageUrl: string;
  isPremium: boolean;
  price: number | null;
  rating: number;
  downloadCount: number;
  isPublished: boolean;
  designData: Record<string, unknown>;
};

const modernDefaults = {
  primaryColor: '#2563eb',
  accentColor: '#2563eb',
  backgroundColor: '#ffffff',
  textColor: '#111827',
  headerFont: 'Inter, system-ui, sans-serif',
  bodyFont: 'Inter, system-ui, sans-serif',
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

export const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: 'Modern',
    description: 'Minimaliste 2 colonnes — blanc, accents bleu. Ideal startups & tech.',
    category: 'modern',
    previewImageUrl: '/templates/previews/modern.svg',
    isPremium: false,
    price: null,
    rating: 4.8,
    downloadCount: 12840,
    isPublished: true,
    designData: {
      key: 'modern',
      layout: 'two-column',
      defaults: modernDefaults,
      fontOptions: {
        headers: ['Inter, system-ui, sans-serif', 'Helvetica, Arial, sans-serif'],
        body: ['Inter, system-ui, sans-serif', 'Roboto, Inter, sans-serif'],
      },
      colorPresets: [
        { name: 'Blue', primary: '#2563eb', accent: '#2563eb' },
        { name: 'Slate', primary: '#334155', accent: '#64748b' },
      ],
      features: {
        supportsPhoto: true,
        supportsIcons: false,
        supportsGradient: false,
        atsSafe: false,
      },
      usage: 'Startups, Tech roles',
    },
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: 'Creative',
    description: 'En-tête gradient, icons, timeline. Design & marketing.',
    category: 'creative',
    previewImageUrl: '/templates/previews/creative.svg',
    isPremium: false,
    price: null,
    rating: 4.7,
    downloadCount: 9420,
    isPublished: true,
    designData: {
      key: 'creative',
      layout: 'header-gradient',
      defaults: {
        ...modernDefaults,
        primaryColor: '#2563eb',
        accentColor: '#ec4899',
        headerFont: 'Montserrat, Inter, sans-serif',
        density: 'normal',
      },
      fontOptions: {
        headers: ['Montserrat, Inter, sans-serif', 'Poppins, Inter, sans-serif'],
        body: ['Inter, system-ui, sans-serif'],
      },
      colorPresets: [
        { name: 'Blue→Purple', primary: '#2563eb', accent: '#ec4899' },
        { name: 'Violet', primary: '#7c3aed', accent: '#f472b6' },
      ],
      features: {
        supportsPhoto: true,
        supportsIcons: true,
        supportsGradient: true,
        atsSafe: false,
      },
      usage: 'Design, marketing, creative roles',
    },
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    name: 'Executive',
    description: 'Formel, élégant, accents or. Cadres, juridique, consulting.',
    category: 'executive',
    previewImageUrl: '/templates/previews/executive.svg',
    isPremium: true,
    price: 0,
    rating: 4.9,
    downloadCount: 6100,
    isPublished: true,
    designData: {
      key: 'executive',
      layout: 'single-column',
      defaults: {
        ...modernDefaults,
        primaryColor: '#111827',
        accentColor: '#b45309',
        headerFont: 'Lato, Calibri, sans-serif',
        bodyFont: 'Calibri, Lato, sans-serif',
        density: 'compact',
        showReferences: true,
      },
      fontOptions: {
        headers: ['Lato, Calibri, sans-serif', 'Georgia, Times New Roman, serif'],
        body: ['Calibri, Lato, sans-serif', 'Georgia, serif'],
      },
      colorPresets: [{ name: 'Gold', primary: '#111827', accent: '#b45309' }],
      features: {
        supportsPhoto: true,
        supportsIcons: false,
        supportsGradient: false,
        atsSafe: true,
      },
      usage: 'Executives, lawyers, consultants',
      tier: 'pro',
    },
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    name: 'Startup',
    description: 'Asymétrique, Poppins, accents néon. Junior & scale-ups.',
    category: 'startup',
    previewImageUrl: '/templates/previews/startup.svg',
    isPremium: false,
    price: null,
    rating: 4.6,
    downloadCount: 8200,
    isPublished: true,
    designData: {
      key: 'startup',
      layout: 'asymmetric',
      defaults: {
        ...modernDefaults,
        primaryColor: '#0f172a',
        accentColor: '#22d3ee',
        backgroundColor: '#fafafa',
        headerFont: 'Poppins, Inter, sans-serif',
        bodyFont: 'Poppins, Inter, sans-serif',
        density: 'normal',
        showPhoto: false,
      },
      fontOptions: {
        headers: ['Poppins, Inter, sans-serif', 'Space Grotesk, Inter, sans-serif'],
        body: ['Poppins, Inter, sans-serif', 'Inter, system-ui, sans-serif'],
      },
      colorPresets: [
        { name: 'Cyan neon', primary: '#0f172a', accent: '#22d3ee' },
        { name: 'Lime', primary: '#14532d', accent: '#a3e635' },
      ],
      features: {
        supportsPhoto: true,
        supportsIcons: true,
        supportsGradient: false,
        atsSafe: false,
      },
      usage: 'Startup roles, junior positions, tech',
    },
  },
  {
    id: '11111111-1111-4111-8111-111111111105',
    name: 'ATS-Optimized',
    description: 'Colonne unique, texte noir, zéro décor — max ATS parse.',
    category: 'ats_optimized',
    previewImageUrl: '/templates/previews/ats.svg',
    isPremium: false,
    price: null,
    rating: 4.9,
    downloadCount: 22100,
    isPublished: true,
    designData: {
      key: 'ats',
      layout: 'single-column',
      defaults: {
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
      },
      fontOptions: {
        headers: ['Arial, Calibri, sans-serif', 'Calibri, Arial, sans-serif'],
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
  },
];
