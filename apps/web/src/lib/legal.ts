/**
 * Facts the legal pages rely on. Operator details cannot be read from the code: the product
 * owner fills them in. Until then every legal page shows a visible "draft" notice listing
 * what is missing (see LegalPage), instead of a silent placeholder.
 */
export const LEGAL_LAST_UPDATED = '8 octobre 2026';

type Missing<T> = T | null;

export const OPERATOR: {
  /** Raison sociale (or the individual's name for a sole trader). */
  name: Missing<string>;
  legalForm: Missing<string>;
  address: Missing<string>;
  /** RCS / RCCM number, or equivalent. */
  registration: Missing<string>;
  /** Country of establishment: decides the applicable law and the supervisory authority. */
  country: Missing<string>;
  vatNumber: Missing<string>;
  publicationDirector: Missing<string>;
  /** Law and courts of the terms, to be chosen with counsel. */
  governingLaw: Missing<string>;
  /** Minimum age to open an account, to be chosen with counsel. */
  minimumAge: Missing<number>;
} = {
  name: null,
  legalForm: null,
  address: null,
  registration: null,
  country: null,
  vatNumber: null,
  publicationDirector: null,
  governingLaw: null,
  minimumAge: null,
};

/**
 * Addresses already used by the product. `verified` stays false until the owner confirms the
 * mailboxes exist and are read.
 */
export const CONTACTS = {
  privacy: 'privacy@cvstudio.ai',
  support: 'support@cvstudio.ai',
  legal: 'legal@cvstudio.ai',
  billing: 'support@cvstudio.ai',
  verified: false,
} as const;

/** Hosting planned in infrastructure/terraform-ovh (region GRA11). */
export const HOSTING = {
  provider: 'OVH SAS',
  address: '2 rue Kellermann, 59100 Roubaix, France',
  location: 'Gravelines (France), Union européenne',
};

export const MISSING_LEGAL_INFO: string[] = [
  ...(OPERATOR.name ? [] : ['identité de l’exploitant (raison sociale)']),
  ...(OPERATOR.legalForm ? [] : ['forme juridique']),
  ...(OPERATOR.address ? [] : ['adresse du siège']),
  ...(OPERATOR.registration ? [] : ['numéro d’immatriculation']),
  ...(OPERATOR.country ? [] : ['pays d’établissement']),
  ...(OPERATOR.governingLaw ? [] : ['droit applicable et juridiction']),
  ...(OPERATOR.minimumAge ? [] : ['âge minimum']),
  ...(CONTACTS.verified ? [] : ['confirmation des adresses de contact']),
];

/** Inline marker for a fact the owner still has to provide. Visible on purpose. */
export function missing(label: string): string {
  return `[à compléter : ${label}]`;
}
