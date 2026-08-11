import type { CvContent } from './types';

/** Demo CV for template previews */
export const SAMPLE_CV: CvContent = {
  schemaVersion: 1,
  identity: {
    fullName: 'Alex Martin',
    headline: 'Senior Product Designer',
    email: 'alex.martin@email.com',
    phone: '+33 6 12 34 56 78',
    city: 'Paris, FR',
    linkedin: 'linkedin.com/in/alexmartin',
    photoUrl: null,
  },
  summary: {
    text: 'Designer produit avec 8 ans d’expérience chez Canva et startups. Spécialisé design systems, ATS-friendly resumes, et collaboration cross-fonctionnelle.',
  },
  experiences: [
    {
      id: 'e1',
      company: 'Canva',
      title: 'Senior Product Designer',
      location: 'Remote',
      start: '2022',
      end: null,
      current: true,
      bullets: [
        'Led redesign of template gallery (+18% conversion)',
        'Built shared design system used by 40+ designers',
        'Partnered with eng on real-time preview performance',
      ],
    },
    {
      id: 'e2',
      company: 'Startup Studio',
      title: 'Product Designer',
      start: '2019',
      end: '2022',
      bullets: [
        'Shipped mobile-first onboarding (D1 retention +12%)',
        'Established research cadence with weekly interviews',
      ],
    },
  ],
  education: [
    {
      id: 'ed1',
      school: 'École de Design Nantes',
      degree: 'Master',
      field: 'Interaction Design',
      start: '2015',
      end: '2017',
    },
  ],
  skills: [
    { id: 's1', name: 'Figma', level: 5 },
    { id: 's2', name: 'Design Systems', level: 5 },
    { id: 's3', name: 'Prototyping', level: 4 },
    { id: 's4', name: 'User Research', level: 4 },
    { id: 's5', name: 'HTML/CSS', level: 3 },
  ],
  languages: [
    { id: 'l1', name: 'Français', level: 'Natif' },
    { id: 'l2', name: 'English', level: 'Fluent' },
  ],
  projects: [
    {
      id: 'p1',
      name: 'Design System Kit',
      description: 'Open-source Figma UI kit used by 2k+ designers; tokens + accessibility docs.',
      url: 'https://github.com/alexmartin/ds-kit',
    },
    {
      id: 'p2',
      name: 'Resume Preview Engine',
      description: 'Real-time A4 preview with sub-100ms debounce for template switching.',
      url: 'https://cvstudio.ai',
    },
  ],
  certificates: [
    {
      id: 'c1',
      name: 'Google UX Design Certificate',
      issuer: 'Coursera',
      year: '2021',
    },
    {
      id: 'c2',
      name: 'WCAG 2.2 Accessibility',
      issuer: 'Deque University',
      year: '2023',
    },
  ],
  references: [{ id: 'r1', name: 'Available upon request', role: '', contact: '' }],
};
