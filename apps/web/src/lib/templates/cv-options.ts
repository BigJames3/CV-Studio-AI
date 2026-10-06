/** Suggested values for the editor fields. Every field stays free text unless noted. */

export const CONTRACT_TYPES = [
  'CDI',
  'CDD',
  'Stage',
  'Alternance',
  'Intérim',
  'Freelance',
  'Consultant',
  'Mission',
  'Temps plein',
  'Temps partiel',
  'Saisonnier',
  'Bénévolat',
  'Autre',
] as const;

export const LANGUAGE_LEVELS = ['Langue maternelle', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export const SKILL_CATEGORIES = [
  'Compétences professionnelles',
  'Compétences techniques',
  'Compétences comportementales',
  'Logiciels / outils',
] as const;

export const AVAILABILITY_SUGGESTIONS = [
  'Disponible immédiatement',
  'Disponible à partir du ',
] as const;

/** Fixed choices: the CV lists the ticked ones. */
export const MOBILITY_OPTIONS = [
  'Mobilité nationale',
  'Mobilité internationale',
  'Télétravail',
  'Travail hybride',
  'Travail sur site',
  'Disponible pour déménager',
] as const;

export const TALK_ROLES = ['Conférencier', 'Intervenant', 'Modérateur', 'Formateur', 'Participant'];

export const PUBLICATION_TYPES = ['Article', 'Livre', 'Chapitre', 'Rapport', 'Thèse', 'Blog'];

/** Placeholder shared by every date field: month is optional, never guessed. */
export const DATE_PLACEHOLDER = 'AAAA-MM ou AAAA';
