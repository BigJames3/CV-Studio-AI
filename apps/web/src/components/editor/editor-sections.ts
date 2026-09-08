import type { SectionId } from '@/stores/editor-store';

export const EDITOR_SECTIONS: { id: SectionId; label: string; short: string }[] = [
  { id: 'identity', label: 'Profil', short: 'Pro' },
  { id: 'summary', label: 'Résumé', short: 'Rés' },
  { id: 'experience', label: 'Expérience', short: 'Exp' },
  { id: 'education', label: 'Formation', short: 'For' },
  { id: 'skills', label: 'Skills', short: 'Ski' },
  { id: 'languages', label: 'Langues', short: 'Lan' },
  { id: 'projects', label: 'Projets', short: 'Prj' },
  { id: 'certificates', label: 'Certificats', short: 'Cer' },
  { id: 'references', label: 'Références', short: 'Réf' },
];

export const EDITOR_SECTION_PANEL_ID = 'editor-section-panel';
