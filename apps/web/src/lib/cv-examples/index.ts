import type { CvContent, TemplateCustomization, TemplateKey } from '@/lib/templates/types';

/**
 * Starter CVs by job, used by the guided onboarding (/bienvenue).
 * Fictional content (companies, figures) written as a model to adapt: the user's own name and
 * e-mail replace the identity when the CV is created.
 */
export type CvExample = {
  slug: string;
  label: string;
  /** Lower-case words matched against the target job typed by the user. */
  keywords: string[];
  content: Omit<CvContent, 'schemaVersion' | 'templateKey' | 'customization' | 'identity'> & {
    identity: { headline: string; city?: string };
  };
};

const lang = (fr: string, en = 'Intermédiaire (B1)') => [
  { id: 'l1', name: 'Français', level: fr },
  { id: 'l2', name: 'Anglais', level: en },
];

const skills = (names: string[]) =>
  names.map((name, i) => ({ id: `s${i + 1}`, name, level: i < 3 ? 4 : 3 }));

export const CV_EXAMPLES: CvExample[] = [
  {
    slug: 'developpeur-web',
    label: 'Développeur web',
    keywords: [
      'développeur',
      'developpeur',
      'développeuse',
      'web',
      'frontend',
      'backend',
      'fullstack',
      'informatique',
      'programmeur',
      'logiciel',
    ],
    content: {
      identity: { headline: 'Développeur web full-stack (React / Node.js)', city: 'Abidjan' },
      summary: {
        text: 'Développeur full-stack avec 4 ans d’expérience sur des applications web à fort trafic. J’aime livrer vite des fonctionnalités fiables, testées et mesurées.',
      },
      experiences: [
        {
          id: 'e1',
          company: 'FinPay Afrique',
          title: 'Développeur full-stack',
          start: '2022',
          end: null,
          current: true,
          bullets: [
            'Refonte du parcours de paiement mobile : +22 % de transactions réussies',
            'Mise en place des tests automatisés (couverture de 35 % à 80 %)',
            'Temps de chargement des pages divisé par 2 grâce au cache et au lazy loading',
          ],
        },
        {
          id: 'e2',
          company: 'Agence Digitale Horizon',
          title: 'Développeur front-end',
          start: '2020',
          end: '2022',
          bullets: [
            'Réalisation de 15 sites et applications React pour des PME',
            'Intégration d’API de paiement et de cartographie',
          ],
        },
      ],
      education: [
        {
          id: 'ed1',
          school: 'École Supérieure d’Informatique',
          degree: 'Licence',
          field: 'Génie logiciel',
          start: '2017',
          end: '2020',
        },
      ],
      skills: skills([
        'JavaScript / TypeScript',
        'React',
        'Node.js',
        'SQL / PostgreSQL',
        'Git',
        'Tests automatisés',
      ]),
      languages: lang('Natif'),
      projects: [],
      certificates: [],
    },
  },
  {
    slug: 'comptable',
    label: 'Comptable',
    keywords: [
      'comptable',
      'comptabilité',
      'comptabilite',
      'finance',
      'audit',
      'fiscalité',
      'gestion',
      'trésorerie',
    ],
    content: {
      identity: { headline: 'Comptable général — SYSCOHADA / fiscalité', city: 'Dakar' },
      summary: {
        text: 'Comptable avec 5 ans d’expérience en cabinet et en entreprise. Rigoureux sur les clôtures, à l’aise avec les outils de gestion et les obligations fiscales.',
      },
      experiences: [
        {
          id: 'e1',
          company: 'Groupe Industriel Teranga',
          title: 'Comptable général',
          start: '2021',
          end: null,
          current: true,
          bullets: [
            'Clôtures mensuelles réduites de 10 à 6 jours',
            'Tenue de la comptabilité de 3 filiales (chiffre d’affaires cumulé 4 Mds FCFA)',
            'Préparation des déclarations fiscales et sociales sans pénalité depuis 3 ans',
          ],
        },
        {
          id: 'e2',
          company: 'Cabinet Expertise & Conseil',
          title: 'Assistant comptable',
          start: '2019',
          end: '2021',
          bullets: [
            'Suivi d’un portefeuille de 40 clients PME',
            'Rapprochements bancaires et préparation des bilans',
          ],
        },
      ],
      education: [
        {
          id: 'ed1',
          school: 'Institut Supérieur de Gestion',
          degree: 'Licence',
          field: 'Comptabilité et finance',
          start: '2016',
          end: '2019',
        },
      ],
      skills: skills([
        'SYSCOHADA',
        'Fiscalité',
        'Sage / logiciels comptables',
        'Excel avancé',
        'Rapprochements bancaires',
        'Analyse financière',
      ]),
      languages: lang('Natif'),
      projects: [],
      certificates: [],
    },
  },
  {
    slug: 'commercial',
    label: 'Commercial',
    keywords: [
      'commercial',
      'commerciale',
      'vente',
      'vendeur',
      'business developer',
      'account',
      'prospection',
      'représentant',
    ],
    content: {
      identity: { headline: 'Commercial B2B — développement de portefeuille', city: 'Douala' },
      summary: {
        text: 'Commercial terrain et grands comptes, 6 ans d’expérience. Je développe des portefeuilles durables grâce à une prospection structurée et un suivi client exigeant.',
      },
      experiences: [
        {
          id: 'e1',
          company: 'DistriPro Cameroun',
          title: 'Responsable commercial grands comptes',
          start: '2021',
          end: null,
          current: true,
          bullets: [
            'Chiffre d’affaires du portefeuille en hausse de 35 % en 2 ans',
            'Signature de 18 nouveaux comptes, dont 4 grands comptes nationaux',
            'Mise en place d’un CRM et d’un reporting hebdomadaire pour l’équipe de 5 commerciaux',
          ],
        },
        {
          id: 'e2',
          company: 'TéléCom Services',
          title: 'Commercial terrain',
          start: '2018',
          end: '2021',
          bullets: [
            'Objectifs annuels dépassés 3 années de suite (jusqu’à 124 %)',
            'Prospection de 60 PME par mois',
          ],
        },
      ],
      education: [
        {
          id: 'ed1',
          school: 'École Supérieure de Commerce',
          degree: 'BTS',
          field: 'Négociation et relation client',
          start: '2016',
          end: '2018',
        },
      ],
      skills: skills([
        'Prospection',
        'Négociation',
        'CRM (Salesforce, HubSpot)',
        'Gestion de portefeuille',
        'Reporting',
        'Présentation client',
      ]),
      languages: lang('Natif'),
      projects: [],
      certificates: [],
    },
  },
  {
    slug: 'assistant-administratif',
    label: 'Assistant(e) administratif(ve)',
    keywords: [
      'assistant',
      'assistante',
      'administratif',
      'administrative',
      'secrétaire',
      'secretaire',
      'office',
      'accueil',
      'bureau',
    ],
    content: {
      identity: { headline: 'Assistante administrative et de direction', city: 'Lomé' },
      summary: {
        text: 'Assistante polyvalente avec 5 ans d’expérience. Organisée et discrète, je fais gagner du temps aux équipes en structurant l’agenda, les dossiers et la communication.',
      },
      experiences: [
        {
          id: 'e1',
          company: 'Société de Transport Atlantique',
          title: 'Assistante de direction',
          start: '2021',
          end: null,
          current: true,
          bullets: [
            'Gestion de l’agenda et des déplacements de 3 directeurs',
            'Dématérialisation de l’archivage : recherche de documents 3 fois plus rapide',
            'Organisation de 12 réunions de conseil d’administration par an',
          ],
        },
        {
          id: 'e2',
          company: 'Clinique Les Palmiers',
          title: 'Secrétaire accueil',
          start: '2019',
          end: '2021',
          bullets: [
            'Accueil de 80 patients par jour',
            'Gestion des rendez-vous et de la facturation',
          ],
        },
      ],
      education: [
        {
          id: 'ed1',
          school: 'Lycée Technique',
          degree: 'BTS',
          field: 'Assistant de gestion',
          start: '2017',
          end: '2019',
        },
      ],
      skills: skills([
        'Pack Office',
        'Gestion d’agenda',
        'Rédaction de courriers',
        'Classement et archivage',
        'Accueil',
        'Facturation',
      ]),
      languages: lang('Natif'),
      projects: [],
      certificates: [],
    },
  },
  {
    slug: 'infirmier',
    label: 'Infirmier(ère)',
    keywords: [
      'infirmier',
      'infirmière',
      'infirmiere',
      'santé',
      'sante',
      'soins',
      'aide-soignant',
      'hôpital',
      'medical',
      'médical',
    ],
    content: {
      identity: {
        headline: 'Infirmière diplômée d’État — soins généraux et urgences',
        city: 'Lyon',
      },
      summary: {
        text: 'Infirmière avec 6 ans d’expérience en service d’urgences et de médecine. Calme sous pression, attentive aux patients et à la coordination avec les équipes.',
      },
      experiences: [
        {
          id: 'e1',
          company: 'Centre Hospitalier Régional',
          title: 'Infirmière aux urgences',
          start: '2021',
          end: null,
          current: true,
          bullets: [
            'Prise en charge de 30 à 40 patients par garde',
            'Tutrice de 8 étudiants infirmiers',
            'Participation au protocole de tri qui a réduit l’attente moyenne de 20 %',
          ],
        },
        {
          id: 'e2',
          company: 'Clinique Saint-Martin',
          title: 'Infirmière en médecine générale',
          start: '2018',
          end: '2021',
          bullets: [
            'Soins, pansements et suivi des traitements',
            'Éducation thérapeutique des patients diabétiques',
          ],
        },
      ],
      education: [
        {
          id: 'ed1',
          school: 'Institut de Formation en Soins Infirmiers',
          degree: 'Diplôme d’État',
          field: 'Soins infirmiers',
          start: '2015',
          end: '2018',
        },
      ],
      skills: skills([
        'Soins d’urgence',
        'Tri et priorisation',
        'Gestes techniques',
        'Dossier patient informatisé',
        'Éducation thérapeutique',
        'Travail en équipe',
      ]),
      languages: lang('Natif', 'Notions (A2)'),
      projects: [],
      certificates: [{ id: 'c1', name: 'AFGSU niveau 2', issuer: 'CESU', year: '2023' }],
    },
  },
  {
    slug: 'enseignant',
    label: 'Enseignant(e)',
    keywords: [
      'enseignant',
      'enseignante',
      'professeur',
      'prof',
      'formateur',
      'formatrice',
      'éducation',
      'education',
      'instituteur',
    ],
    content: {
      identity: { headline: 'Professeur de mathématiques — collège et lycée', city: 'Bamako' },
      summary: {
        text: 'Enseignant avec 7 ans d’expérience. J’adapte ma pédagogie à chaque classe et j’obtiens des résultats mesurables aux examens.',
      },
      experiences: [
        {
          id: 'e1',
          company: 'Lycée Moderne de la Cité',
          title: 'Professeur de mathématiques',
          start: '2020',
          end: null,
          current: true,
          bullets: [
            'Taux de réussite au baccalauréat de mes classes : 88 % (moyenne de l’établissement : 71 %)',
            'Création d’un club de soutien suivi par 45 élèves par an',
            'Coordination de l’équipe de mathématiques (6 enseignants)',
          ],
        },
        {
          id: 'e2',
          company: 'Collège Les Étoiles',
          title: 'Professeur de mathématiques',
          start: '2017',
          end: '2020',
          bullets: ['Enseignement en 6e et 3e (5 classes)', 'Préparation des élèves au brevet'],
        },
      ],
      education: [
        {
          id: 'ed1',
          school: 'École Normale Supérieure',
          degree: 'Master',
          field: 'Enseignement des mathématiques',
          start: '2012',
          end: '2017',
        },
      ],
      skills: skills([
        'Pédagogie différenciée',
        'Préparation aux examens',
        'Outils numériques éducatifs',
        'Gestion de classe',
        'Conception de cours',
        'Évaluation',
      ]),
      languages: lang('Natif'),
      projects: [],
      certificates: [],
    },
  },
  {
    slug: 'marketing-digital',
    label: 'Marketing digital / communication',
    keywords: [
      'marketing',
      'communication',
      'digital',
      'community manager',
      'réseaux sociaux',
      'seo',
      'contenu',
      'chargé de communication',
      'growth',
    ],
    content: {
      identity: { headline: 'Chargée de marketing digital', city: 'Casablanca' },
      summary: {
        text: 'Marketeuse digitale avec 4 ans d’expérience en acquisition et réseaux sociaux. Je pilote les campagnes par les chiffres : coût d’acquisition, conversion, rétention.',
      },
      experiences: [
        {
          id: 'e1',
          company: 'ModeShop',
          title: 'Chargée de marketing digital',
          start: '2022',
          end: null,
          current: true,
          bullets: [
            'Coût d’acquisition client réduit de 30 % sur les campagnes Meta et Google',
            'Communauté Instagram passée de 8 000 à 45 000 abonnés',
            'Mise en place de l’emailing automatisé : 12 % du chiffre d’affaires en ligne',
          ],
        },
        {
          id: 'e2',
          company: 'Agence Créative Atlas',
          title: 'Community manager',
          start: '2020',
          end: '2022',
          bullets: [
            'Gestion des réseaux sociaux de 10 clients',
            'Production de 60 contenus par mois',
          ],
        },
      ],
      education: [
        {
          id: 'ed1',
          school: 'École de Commerce et de Management',
          degree: 'Master',
          field: 'Marketing digital',
          start: '2018',
          end: '2020',
        },
      ],
      skills: skills([
        'Publicité Meta et Google Ads',
        'SEO',
        'Emailing',
        'Google Analytics',
        'Création de contenu',
        'Canva / Figma',
      ]),
      languages: lang('Natif', 'Courant (C1)'),
      projects: [],
      certificates: [{ id: 'c1', name: 'Google Ads Search', issuer: 'Google', year: '2023' }],
    },
  },
  {
    slug: 'chef-de-projet',
    label: 'Chef de projet',
    keywords: [
      'chef de projet',
      'project manager',
      'gestion de projet',
      'pmo',
      'coordinateur',
      'coordinatrice',
      'scrum',
      'product',
    ],
    content: {
      identity: { headline: 'Chef de projet — transformation et SI', city: 'Paris' },
      summary: {
        text: 'Chef de projet avec 8 ans d’expérience. Je livre des projets dans les délais en alignant métiers, équipes techniques et direction, avec un suivi clair des risques et du budget.',
      },
      experiences: [
        {
          id: 'e1',
          company: 'Banque Régionale Horizon',
          title: 'Chef de projet SI',
          start: '2020',
          end: null,
          current: true,
          bullets: [
            'Pilotage du déploiement d’une application mobile (250 000 clients) livrée dans les délais',
            'Budget de 1,2 M€ tenu à 3 % près',
            'Coordination de 4 équipes (15 personnes) en méthode agile',
          ],
        },
        {
          id: 'e2',
          company: 'Cabinet Conseil Nova',
          title: 'Consultant junior',
          start: '2016',
          end: '2020',
          bullets: [
            'Missions d’organisation pour 6 clients',
            'Animation d’ateliers avec les équipes métier',
          ],
        },
      ],
      education: [
        {
          id: 'ed1',
          school: 'École d’Ingénieurs',
          degree: 'Diplôme d’ingénieur',
          field: 'Systèmes d’information',
          start: '2011',
          end: '2016',
        },
      ],
      skills: skills([
        'Gestion de projet',
        'Agile / Scrum',
        'Planification',
        'Gestion des risques',
        'Budget',
        'Jira / MS Project',
      ]),
      languages: lang('Natif', 'Courant (C1)'),
      projects: [],
      certificates: [{ id: 'c1', name: 'PMP', issuer: 'PMI', year: '2021' }],
    },
  },
  {
    slug: 'logistique',
    label: 'Logistique / supply chain',
    keywords: [
      'logistique',
      'supply chain',
      'transport',
      'entrepôt',
      'entrepot',
      'magasinier',
      'approvisionnement',
      'achats',
      'stock',
    ],
    content: {
      identity: { headline: 'Responsable logistique et approvisionnement', city: 'Cotonou' },
      summary: {
        text: 'Logisticien avec 6 ans d’expérience en entrepôt et en transport. Je réduis les coûts et les ruptures grâce à des processus simples et des indicateurs suivis chaque semaine.',
      },
      experiences: [
        {
          id: 'e1',
          company: 'Port Logistique Services',
          title: 'Responsable d’entrepôt',
          start: '2021',
          end: null,
          current: true,
          bullets: [
            'Ruptures de stock réduites de 40 % grâce à un nouveau système de réapprovisionnement',
            'Gestion d’un entrepôt de 6 000 m² et d’une équipe de 20 personnes',
            'Coûts de transport réduits de 15 % par la renégociation des contrats',
          ],
        },
        {
          id: 'e2',
          company: 'Distribution Alimentaire du Golfe',
          title: 'Agent logistique',
          start: '2018',
          end: '2021',
          bullets: ['Préparation et expédition de 300 commandes par jour', 'Inventaires mensuels'],
        },
      ],
      education: [
        {
          id: 'ed1',
          school: 'Institut Universitaire de Technologie',
          degree: 'Licence professionnelle',
          field: 'Logistique et transport',
          start: '2015',
          end: '2018',
        },
      ],
      skills: skills([
        'Gestion des stocks',
        'Planification des transports',
        'ERP / WMS',
        'Excel avancé',
        'Management d’équipe',
        'Négociation fournisseurs',
      ]),
      languages: lang('Natif'),
      projects: [],
      certificates: [],
    },
  },
  {
    slug: 'conseiller-clientele',
    label: 'Conseiller clientèle / banque',
    keywords: [
      'conseiller',
      'conseillère',
      'clientèle',
      'clientele',
      'banque',
      'bancaire',
      'service client',
      'relation client',
      'guichet',
      'assurance',
    ],
    content: {
      identity: { headline: 'Conseiller clientèle bancaire', city: 'Libreville' },
      summary: {
        text: 'Conseiller clientèle avec 5 ans d’expérience en agence. J’accompagne les particuliers et les petites entreprises avec écoute et sens du résultat.',
      },
      experiences: [
        {
          id: 'e1',
          company: 'Banque Centrale Commerciale',
          title: 'Conseiller clientèle particuliers',
          start: '2021',
          end: null,
          current: true,
          bullets: [
            'Gestion d’un portefeuille de 450 clients',
            'Objectifs de vente de produits d’épargne atteints à 115 %',
            'Satisfaction client de l’agence passée de 78 % à 91 %',
          ],
        },
        {
          id: 'e2',
          company: 'Assurances Le Phare',
          title: 'Chargé de clientèle',
          start: '2019',
          end: '2021',
          bullets: [
            'Traitement de 50 demandes clients par jour',
            'Ouverture et suivi des contrats',
          ],
        },
      ],
      education: [
        {
          id: 'ed1',
          school: 'Université Omar Bongo',
          degree: 'Licence',
          field: 'Banque, finance et assurance',
          start: '2016',
          end: '2019',
        },
      ],
      skills: skills([
        'Relation client',
        'Produits bancaires',
        'Conformité (KYC)',
        'Vente conseil',
        'Gestion des réclamations',
        'Outils bancaires',
      ]),
      languages: lang('Natif'),
      projects: [],
      certificates: [],
    },
  },
  {
    slug: 'ingenieur-btp',
    label: 'Ingénieur BTP',
    keywords: [
      'ingénieur',
      'ingenieur',
      'btp',
      'génie civil',
      'genie civil',
      'construction',
      'chantier',
      'bâtiment',
      'travaux',
    ],
    content: {
      identity: { headline: 'Ingénieur génie civil — conduite de travaux', city: 'Ouagadougou' },
      summary: {
        text: 'Ingénieur génie civil avec 7 ans d’expérience sur des chantiers de bâtiments et de routes. Je tiens les délais, la sécurité et la qualité avec des équipes nombreuses.',
      },
      experiences: [
        {
          id: 'e1',
          company: 'Sahel Construction',
          title: 'Conducteur de travaux',
          start: '2020',
          end: null,
          current: true,
          bullets: [
            'Construction d’un immeuble de bureaux de 8 étages livré 3 semaines avant l’échéance',
            'Encadrement de 60 ouvriers et 4 sous-traitants',
            'Zéro accident avec arrêt sur 2 ans grâce au plan de sécurité',
          ],
        },
        {
          id: 'e2',
          company: 'Bureau d’Études Structures',
          title: 'Ingénieur études',
          start: '2017',
          end: '2020',
          bullets: ['Calcul de structures en béton armé', 'Métrés et devis pour 20 projets'],
        },
      ],
      education: [
        {
          id: 'ed1',
          school: 'Institut International d’Ingénierie',
          degree: 'Diplôme d’ingénieur',
          field: 'Génie civil',
          start: '2012',
          end: '2017',
        },
      ],
      skills: skills([
        'Conduite de travaux',
        'Béton armé',
        'AutoCAD / Revit',
        'Métrés et devis',
        'Sécurité chantier',
        'Planification',
      ]),
      languages: lang('Natif', 'Intermédiaire (B1)'),
      projects: [],
      certificates: [],
    },
  },
  {
    slug: 'etudiant',
    label: 'Étudiant / premier emploi',
    keywords: [
      'étudiant',
      'etudiant',
      'étudiante',
      'stage',
      'stagiaire',
      'alternance',
      'premier emploi',
      'jeune diplômé',
      'debutant',
      'débutant',
    ],
    content: {
      identity: {
        headline: 'Jeune diplômé en gestion — recherche premier emploi',
        city: 'Abidjan',
      },
      summary: {
        text: 'Jeune diplômé motivé, avec deux stages et une expérience associative. J’apprends vite et je cherche un premier poste pour mettre en pratique mes compétences en gestion.',
      },
      experiences: [
        {
          id: 'e1',
          company: 'Entreprise Agro-Industrielle',
          title: 'Stagiaire contrôle de gestion',
          start: '2024',
          end: '2024',
          bullets: [
            'Construction d’un tableau de bord mensuel des coûts de production',
            'Analyse des écarts budgétaires sur 3 sites',
          ],
        },
        {
          id: 'e2',
          company: 'Association Jeunesse Solidaire',
          title: 'Trésorier bénévole',
          start: '2022',
          end: '2024',
          bullets: [
            'Gestion d’un budget annuel de 5 millions FCFA',
            'Organisation de 3 collectes de fonds',
          ],
        },
      ],
      education: [
        {
          id: 'ed1',
          school: 'Université Félix Houphouët-Boigny',
          degree: 'Licence',
          field: 'Sciences de gestion',
          start: '2021',
          end: '2024',
        },
      ],
      skills: skills([
        'Excel',
        'Analyse de données',
        'Rédaction',
        'Travail en équipe',
        'Organisation',
        'Pack Office',
      ]),
      languages: lang('Natif', 'Intermédiaire (B1)'),
      projects: [],
      certificates: [],
    },
  },
];

/** Best example for a typed job title, or undefined when nothing matches. */
export function findExampleForRole(role: string | null | undefined): CvExample | undefined {
  const text = (role ?? '').toLowerCase().trim();
  if (!text) return undefined;
  let best: { example: CvExample; score: number } | undefined;
  for (const example of CV_EXAMPLES) {
    const score = example.keywords.reduce(
      (sum, keyword) => (text.includes(keyword) ? sum + keyword.length : sum),
      0
    );
    if (score > 0 && (!best || score > best.score)) best = { example, score };
  }
  return best?.example;
}

/** CV content for a new CV: the example (or a blank page) with the user's own identity. */
export function buildStarterContent(params: {
  example?: CvExample;
  fullName: string;
  email?: string;
  headline?: string;
  templateKey: TemplateKey;
  customization?: TemplateCustomization;
}): CvContent {
  const { example } = params;
  return {
    schemaVersion: 1,
    templateKey: params.templateKey,
    customization: params.customization,
    identity: {
      fullName: params.fullName,
      email: params.email,
      headline: params.headline || example?.content.identity.headline,
      city: example?.content.identity.city,
      photoUrl: null,
    },
    summary: { text: example?.content.summary.text ?? '' },
    experiences: example?.content.experiences ?? [],
    education: example?.content.education ?? [],
    skills: example?.content.skills ?? [],
    languages: example?.content.languages ?? [],
    projects: example?.content.projects ?? [],
    certificates: example?.content.certificates ?? [],
  };
}
