import type { CvContent } from './types';

/** Demo CV for template previews (fictional person). Never copied into a user's CV. */
export const SAMPLE_CV: CvContent = {
  schemaVersion: 1,
  identity: {
    fullName: 'Aminata Koné',
    headline: 'Cheffe de projet IT',
    email: 'aminata.kone@email.com',
    phone: '+225 07 00 00 00 00',
    city: 'Abidjan, Côte d’Ivoire',
    linkedin: 'linkedin.com/in/aminatakone',
    photoUrl: null,
  },
  summary: {
    text: 'Cheffe de projet IT avec 8 ans d’expérience dans le déploiement d’ERP et la modernisation des systèmes d’information. Pilote des équipes pluridisciplinaires, du cadrage à la mise en production, avec un fort sens de l’organisation et de la communication.',
  },
  experiences: [
    {
      id: 'e1',
      company: 'Groupe Atlantique Services',
      title: 'Cheffe de projet IT',
      location: 'Abidjan',
      start: '2022-03',
      end: null,
      current: true,
      bullets: [
        'Pilotage du déploiement d’un ERP pour 4 filiales et 350 utilisateurs',
        'Coordination d’une équipe de 9 consultants et développeurs',
        'Mise en place d’un suivi hebdomadaire des risques et du budget',
      ],
    },
    {
      id: 'e2',
      company: 'Nova Conseil',
      title: 'Consultante fonctionnelle',
      location: 'Dakar',
      start: '2018-09',
      end: '2022-02',
      bullets: [
        'Recueil des besoins et rédaction des spécifications fonctionnelles',
        'Formation de 120 utilisateurs aux nouveaux processus',
      ],
    },
  ],
  education: [
    {
      id: 'ed1',
      school: 'Université Félix Houphouët-Boigny',
      degree: 'Master',
      field: 'Systèmes d’information',
      start: '2016',
      end: '2018',
    },
  ],
  skills: [
    { id: 's1', name: 'Gestion de projet', level: 5 },
    { id: 's2', name: 'SAP S/4HANA', level: 4 },
    { id: 's3', name: 'Méthodes agiles', level: 4 },
    { id: 's4', name: 'SQL', level: 3 },
    { id: 's5', name: 'Power BI', level: 3 },
  ],
  languages: [
    { id: 'l1', name: 'Français', level: 'Langue maternelle' },
    { id: 'l2', name: 'Anglais', level: 'B2' },
  ],
  projects: [
    {
      id: 'p1',
      name: 'Portail fournisseurs',
      description: 'Dématérialisation des commandes et des factures fournisseurs du groupe.',
      url: 'https://example.com/portail',
    },
  ],
  certificates: [
    { id: 'c1', name: 'PMP — Project Management Professional', issuer: 'PMI', year: '2021' },
    { id: 'c2', name: 'Professional Scrum Master I', issuer: 'Scrum.org', year: '2020' },
  ],
  references: [{ id: 'r1', name: 'Disponibles sur demande', role: '', contact: '' }],
};
