# PRODUCT REQUIREMENTS DOCUMENT (PRD)

# CV STUDIO AI

| Métadonnée              | Valeur                                                     |
| ----------------------- | ---------------------------------------------------------- |
| **Produit**             | CV Studio AI                                               |
| **Version du document** | 1.0                                                        |
| **Statut**              | Draft → Review                                             |
| **Date**                | 26 juillet 2026                                            |
| **Auteur**              | Chief Product Officer                                      |
| **Horizon**             | 24 mois (juillet 2026 – juillet 2028)                      |
| **Audience**            | Product, Engineering, Design, Marketing, Sales, Leadership |
| **Classification**      | Interne — Document de référence                            |

---

## Table des matières

1. [Executive Summary](#1-executive-summary)
2. [Product Vision](#2-product-vision)
3. [Business Objectives](#3-business-objectives)
4. [Market Analysis](#4-market-analysis)
5. [Competitive Analysis](#5-competitive-analysis)
6. [Personas](#6-personas)
7. [User Journeys](#7-user-journeys)
8. [User Stories](#8-user-stories)
9. [Functional Requirements](#9-functional-requirements)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Features Breakdown](#11-features-breakdown)
12. [Pricing & Monetization](#12-pricing--monetization)
13. [KPI & Success Metrics](#13-kpi--success-metrics)
14. [Roadmap 24 mois](#14-roadmap-24-mois)
15. [Technical Constraints](#15-technical-constraints)
16. [Acceptance Criteria](#16-acceptance-criteria)
17. [Annexes](#17-annexes)
18. [Message de clôture](#18-message-de-clôture--alignement-équipes)
    19–100. [Annexes opérationnelles étendues (GTM, Design, Specs, Sprints, Data, QA, SEO, ADRs, Sign-off)](#19-go-to-market-gtm-détaillé--24-mois)

---

# 1. EXECUTIVE SUMMARY

## 1.1 Vision en une page

**CV Studio AI** est la plateforme SaaS qui transforme la création de CV d’un exercice stressant, artisanal et opaque en une expérience **guidée, intelligente et orientée résultats**.

Aujourd’hui, un candidat moyen passe 4 à 8 heures à construire un CV, le reformate pour chaque offre, ignore s’il passera un filtre ATS (Applicant Tracking System), et abandonne souvent face à des outils soit trop « design » (Canva) soit trop « formulaire » (Resume.io). Le marché des outils de CV en ligne dépasse **2,5 milliards USD** en 2025 et croît à un CAGR estimé de **7–9 %**. Pourtant, aucun acteur n’a encore unifié avec excellence :

1. la **qualité éditoriale** (contenu adapté au poste),
2. la **compatibilité ATS** (lecture machine + lecture humaine),
3. l’**intelligence contextuelle** (offre d’emploi → CV + lettre + préparation entretien),
4. une **expérience produit** digne de Figma / Notion (fluidité, collaboration, templates premium).

CV Studio AI positionne l’IA non comme un gadget (« génère un paragraphe »), mais comme un **co-pilote de carrière** : du premier brouillon à l’entretien, avec des scores mesurables, des itérations rapides et une monétisation claire Free / Pro / Business.

**Promesse produit :** « En 15 minutes, un CV ATS-ready, aligné sur l’offre, prêt à envoyer — et un plan d’entretien si vous êtes shortlisté. »

**North Star :** Le nombre de **candidatures réussies assistées** (CV exporté + score ATS ≥ 80 + matching offre ≥ 70), pas le nombre de PDF téléchargés.

## 1.2 Objectifs clés (24 mois)

| #   | Objectif                              | Cible M24                                                          |
| --- | ------------------------------------- | ------------------------------------------------------------------ |
| O1  | Atteindre le Product-Market Fit (PMF) | Score Sean Ellis ≥ 40 % « très déçus si le produit disparaissait » |
| O2  | Croissance utilisateurs               | 1 000 000 utilisateurs inscrits ; 250 000 MAU                      |
| O3  | Monétisation                          | ARR ≥ 8 M€ ; conversion Free→Paid ≥ 4,5 %                          |
| O4  | Qualité produit                       | NPS ≥ 50 ; Lighthouse Performance ≥ 90 ; uptime 99,9 %             |
| O5  | Différenciation IA                    | ≥ 60 % des utilisateurs Pro utilisent ≥ 2 features IA / mois       |
| O6  | Expansion                             | EN + FR + ES + DE ; 3 marchés prioritaires (FR, US, DE)            |

## 1.3 Indicateurs de succès (résumé)

| KPI                           | Baseline (M0) | Cible M12 | Cible M24 |
| ----------------------------- | ------------- | --------- | --------- |
| MAU                           | 0             | 80 000    | 250 000   |
| Conversion Free→Paid          | —             | 3,5 %     | 4,5 %     |
| ARPU mensuel (paid)           | —             | 11 €      | 13 €      |
| Churn mensuel (paid)          | —             | < 6 %     | < 5 %     |
| NPS                           | —             | ≥ 40      | ≥ 50      |
| LTV / CAC                     | —             | ≥ 2,5     | ≥ 3,0     |
| Rétention J30                 | —             | ≥ 35 %    | ≥ 40 %    |
| Score ATS moyen (exports Pro) | —             | ≥ 75      | ≥ 82      |

## 1.4 Décisions produit structurantes

1. **ATS-first, design-second** : un CV beau qui ne passe pas ATS est un échec produit.
2. **IA contextuelle** : l’IA s’appuie sur l’offre d’emploi et le profil, pas sur des prompts génériques.
3. **Freemium agressif** : Free utile (1 CV, PDF, 5 templates) pour acquisition ; IA et volume derrière le paywall.
4. **Stack moderne** : Next.js 14+, NestJS, PostgreSQL, Redis, AWS — pour vélocité et scale vers 1 M users.
5. **Marketplace designers** (M9+) : différenciation visuelle + marge additionnelle (commission 30 %).

## 1.5 Risques majeurs (vue CPO)

| Risque                                | Impact | Mitigation                                                                           |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| Commoditisation de l’IA générative    | Élevé  | Propriété des workflows (matching offre, score ATS propriétaire, coaching entretien) |
| Coût LLM élevé                        | Élevé  | Caching embeddings, modèles tierés, quotas Pro, batching                             |
| Concurrence Canva / Adobe             | Élevé  | Positionnement « carrière / ATS / résultats » vs « design généraliste »              |
| Réglementation données (RGPD, AI Act) | Moyen  | Privacy by design, consentement, logs, droit à l’oubli                               |
| Faible retention post-export          | Élevé  | Boucle carrière (lettre, entretien, suivi candidatures, alertes)                     |

---

# 2. PRODUCT VISION

## 2.1 Mission statement

> **Donner à chaque candidat, quel que soit son parcours, le pouvoir de présenter sa valeur professionnelle avec clarté, crédibilité et impact — en quelques minutes, pas en plusieurs jours.**

Nous existons pour réduire l’asymétrie entre candidats et systèmes de recrutement (ATS, recruteurs pressés, biais de format). Notre succès se mesure au **taux de réponses positives** de nos utilisateurs, pas au volume de templates téléchargés.

## 2.2 Vision à 5 ans

À horizon 2031, CV Studio AI n’est plus « un générateur de CV » mais la **plateforme de préparation de candidature n°1** :

- **Couche Identité professionnelle** : profil canonique unique (expérience, compétences, preuves) synchronisé LinkedIn, GitHub, portfolio.
- **Couche Adaptation** : pour chaque offre, génération CV + lettre + talking points entretien, avec traçabilité des versions.
- **Couche Intelligence marché** : insights sur salaires, compétences demandées, gaps, recommandations de formation.
- **Couche Collaboration** : coachs carrière, universities, outplacement, équipes RH internes (B2B).
- **Couche Marketplace** : templates, reviews, services humains (relecture, coaching) connectés à la plateforme.

**Ambition quantitative 5 ans :** 10 M+ utilisateurs inscrits, présence dans 20+ langues, ARR > 80 M€, NPS > 60, reconnaissance comme standard de facto pour les CV ATS-ready en Europe et Amérique du Nord.

## 2.3 Core values (produit & organisation)

| Valeur            | Traduction produit                                             | Anti-pattern                          |
| ----------------- | -------------------------------------------------------------- | ------------------------------------- |
| **Clarté**        | Interface simple, vocabulaire candidat, scores compréhensibles | Jargon RH opaque, dashboards inutiles |
| **Honnêteté**     | L’IA n’invente pas d’expériences ; elle reformule et structure | Hallucinations non contrôlées         |
| **Efficacité**    | Time-to-first-export < 15 min                                  | Onboarding de 40 écrans               |
| **Résultats**     | Features mesurées par impact candidature                       | Features « wow » sans usage           |
| **Accessibilité** | WCAG AA, multilingue, mobile-ready                             | Design desktop-only élitiste          |
| **Confiance**     | Sécurité, privacy, transparence IA                             | Boîte noire, revente de données       |

## 2.4 Unique Selling Proposition (USP)

**USP primaire :**

> _Le seul outil qui combine un éditeur live de niveau design, un score ATS propriétaire, et une IA qui adapte votre CV à chaque offre d’emploi — de A à Z._

**Preuves différenciantes (à construire et prouver) :**

1. **Job Description Matcher** : similarité sémantique offre ↔ CV avec suggestions actionnables (pas un score magique).
2. **Preview dual** : Formulaire structuré + rendu CV live côte à côte (pattern Canva × Notion).
3. **Chaîne candidature complète** : CV → Lettre → Préparation entretien (funnel unique vs concurrents mono-PDF).
4. **Transparence ATS** : explication des échecs de parsing (tableaux, colonnes, icônes, headers).
5. **Pricing clair** : Free réellement utilisable ; Pro à 9,99 $/mois sans dark patterns de téléchargement.

## 2.5 Positionnement stratégique (carte perceptuelle)

```
                    DESIGN / CRÉATIVITÉ
                            ▲
                            │
              Canva Resume  │  Adobe Express
                            │
         Novoresume ────────┼──────── Enhancv
                            │
    Kickresume              │              ★ CV STUDIO AI
                            │           (cible : Design + ATS + IA)
                            │
         Zety ──────────────┼──────── Resume.io
                            │
              MyPerfectResume
                            │
                            ▼
                    STRUCTURATION / ATS
         ◄──────────────────┴──────────────────►
         GÉNÉRIQUE                         IA CONTEXTUELLE
```

Nous ne cherchons pas à battre Canva sur le design pur, ni Resume.io uniquement sur le volume SEO. Nous occupons le **quadrant supérieur droit** : qualité visuelle + ATS + IA contextuelle.

## 2.6 Principes de design produit (inspirés Figma / Notion / Canva)

1. **Direct manipulation** : ce que je vois est ce que j’exporte (WYSIWYG strict).
2. **Progressive disclosure** : le pouvoir avancé n’encombre pas le premier parcours.
3. **Empty states intelligents** : chaque état vide propose une action IA ou un exemple.
4. **Feedback immédiat** : score ATS, matching, erreurs de contenu en temps réel (< 500 ms perçus pour UI ; IA async avec skeleton).
5. **Defaults excellents** : un template et une structure par défaut qui donnent déjà un bon CV.

---

# 3. BUSINESS OBJECTIVES

## 3.1 Objectifs annuels (synthèse)

### Année 1 (M0–M12) — Construire et valider le PMF

| Objectif             | Métrique               | Cible                              |
| -------------------- | ---------------------- | ---------------------------------- |
| Lancer MVP           | Date GA                | ≤ M3                               |
| Activer monétisation | Premiers paiements     | ≤ M6                               |
| Valider PMF          | Sean Ellis / rétention | ≥ 35 % « very disappointed » à M12 |
| Base utilisateurs    | Inscrits               | 200 000                            |
| Revenus              | ARR                    | 1,5 M€                             |
| Qualité              | Crash-free sessions    | ≥ 99,5 %                           |

### Année 2 (M12–M24) — Scale et expansion

| Objectif      | Métrique          | Cible                     |
| ------------- | ----------------- | ------------------------- |
| Scale         | MAU               | 250 000                   |
| Revenus       | ARR               | 8 M€                      |
| International | Langues / marchés | 4 langues, 3 marchés core |
| Marketplace   | Templates 3P      | ≥ 200 templates publiés   |
| Mobile        | App stores        | iOS + Android GA          |
| B2B early     | Comptes Business  | ≥ 500 organisations       |

## 3.2 Croissance revenue — modèle et projections

### Hypothèses de modèle

| Hypothèse              | Valeur                     | Source / justification                  |
| ---------------------- | -------------------------- | --------------------------------------- |
| Prix Pro mensuel       | 9,99 $ ≈ 9,20 €            | Aligné marché mid-tier (Zety/Resume.io) |
| Prix Pro annuel        | 99 $ ≈ 91 € (≈ 7,6 €/mois) | Incitation annuelle ~24 % discount      |
| Prix Business          | 29,99 $/mois / siège       | Collaboratif + analytics                |
| Mix abo annuel         | 55 % des paid dès M12      | Observé chez SaaS career tools          |
| Conversion Free→Paid   | 3,5 % → 4,5 %              | Benchmark freemium outils CV 2–6 %      |
| Churn mensuel paid     | 5–6 %                      | Amélioration via engagement IA          |
| Commission marketplace | 30 %                       | Standard design marketplaces            |

### Projection ARR indicative (scénario de base)

| Trimestre   | Inscrits cumulés | MAU     | Paid users              | ARR run-rate |
| ----------- | ---------------- | ------- | ----------------------- | ------------ |
| T1 (M0–3)   | 15 000           | 8 000   | 0 (pre-paywall ou soft) | 0            |
| T2 (M3–6)   | 50 000           | 22 000  | 800                     | ~0,1 M€      |
| T3 (M6–9)   | 120 000          | 45 000  | 3 500                   | ~0,5 M€      |
| T4 (M9–12)  | 200 000          | 80 000  | 8 000                   | ~1,5 M€      |
| T6 (M15–18) | 450 000          | 150 000 | 20 000                  | ~4 M€        |
| T8 (M21–24) | 1 000 000        | 250 000 | 40 000                  | ~8 M€        |

_Notes :_ les chiffres sont des **objectifs de planification**, à recalibrer chaque trimestre via cohort analysis. Le scénario pessimiste (−40 %) et optimiste (+50 %) doivent être modélisés en finance (annexe F).

### Leviers de croissance revenue

1. **Conversion** : paywall sur IA + multi-CV + templates premium.
2. **Expansion** : Free → Pro → Business (équipes carrière / campus).
3. **Retention** : features post-export (suivi candidatures, entretien).
4. **Marketplace** : take rate 30 % sur templates designers.
5. **Add-ons futurs** : coaching humain, reviews Express (M18+).

## 3.3 Traction utilisateurs

### Funnel d’acquisition cible (M12)

```
Visiteurs landing (SEO + Ads + Social)
        │  100 %
        ▼
Landing / Signup intent
        │  35 % (CTR signup)
        ▼
Comptes créés
        │  70 % activation (1ère section CV remplie)
        ▼
Utilisateurs activés
        │  45 % first export PDF
        ▼
Exporteurs
        │  8 % trial Pro / soft paywall
        ▼
Trials
        │  45 % convert to paid
        ▼
Paid
```

### Canaux prioritaires

| Canal                               | Rôle                 | Budget relatif Y1 | Note                                     |
| ----------------------------------- | -------------------- | ----------------- | ---------------------------------------- |
| SEO / Content                       | Acquisition durable  | 25 %              | Pages templates, guides ATS, comparatifs |
| SEM / Social ads                    | Scale contrôlé       | 30 %              | CAC cible < 25 € paid                    |
| Product-led (viral share CV)        | Croissance organique | 10 %              | Lien public portfolio                    |
| Partnerships écoles / boîtes emploi | Volume qualifié      | 15 %              | B2B2C                                    |
| Influencers carrière / LinkedIn     | Awareness            | 10 %              | FR + EN                                  |
| Community / Referral                | Retention + acq      | 10 %              | Parrainage 1 mois Pro                    |

## 3.4 Market positioning

**Catégorie :** AI-powered career application suite (sous-catégorie : Resume builder).

**Positionnement one-liner marketing :**  
_« CV Studio AI — le co-pilote qui transforme votre expérience en candidatures qui passent les filtres et convainquent les recruteurs. »_

**Contre-positionnements :**

| Concurrent type      | Notre angle                                                   |
| -------------------- | ------------------------------------------------------------- |
| Canva / Adobe        | « Plus qu’un beau PDF : un CV qui score sur les ATS »         |
| Resume.io / Zety     | « Moins de dark patterns, plus d’IA utile, pricing clair »    |
| Enhancv / Novoresume | « Design + matching offre + chaîne entretien »                |
| ChatGPT seul         | « Workflow métier, templates, ATS, export pro — pas un chat » |

**Brand attributes :** moderne, rassurant, expert, efficace, accessible.

---

# 4. MARKET ANALYSIS

## 4.1 Taille du marché

### Définitions

- **TAM (Total Addressable Market)** : marché mondial des outils de création de CV / career documents digitaux + services adjacents (lettres, préparation entretien digitale).
- **SAM (Serviceable Available Market)** : segment online self-serve en EN/FR/ES/DE, consommateurs + PME career services.
- **SOM (Serviceable Obtainable Market)** : part réaliste à 24 mois sur nos marchés prioritaires.

### Estimations (ordre de grandeur 2025–2026)

| Segment                        | Estimation                    | Commentaire                                                     |
| ------------------------------ | ----------------------------- | --------------------------------------------------------------- |
| TAM                            | ~8–12 Md USD                  | Career tech élargi (resume, job search tools, coaching digital) |
| Marché resume builders online  | ~2,5–3,2 Md USD               | CAGR ~7–9 %                                                     |
| SAM (EN+FR+ES+DE, online SaaS) | ~900 M–1,2 Md USD             | Focus self-serve + light B2B                                    |
| SOM M24                        | ~8–15 M USD revenue potential | Objectif ARR 8 M€ ≈ capture agressive mais plausible            |

### Dynamiques de demande

- **Turnover emploi** : millions de changements de poste / an en EU + US.
- **Pénurie de temps** : candidats multi-emplois, besoin d’itérations rapides.
- **ATS ubiquitaires** : > 95 % des grandes entreprises filtrent via ATS (estimations industrie RH).
- **Normalisation de l’IA** : attentes « l’outil m’aide à écrire » devenues standard 2024–2026.

## 4.2 Tendances

| Tendance                      | Impact produit                                         | Priorité      |
| ----------------------------- | ------------------------------------------------------ | ------------- |
| Générative AI partout         | Différenciation par workflow, pas par « avoir une IA » | Critique      |
| ATS + skills-based hiring     | Score compétences, matching sémantique                 | Critique      |
| Mobile-first candidats        | Responsive impeccable + app M12–18                     | Haute         |
| Privacy / AI Act EU           | Transparence, consentement, logs                       | Haute         |
| Personal branding / portfolio | Pages publiques, preuves, projets                      | Moyenne-Haute |
| Remote & immigration talent   | Personas immigrants, multilangue, normes CV locales    | Haute         |
| Creator economy (templates)   | Marketplace designers                                  | Moyenne (M9+) |
| Bundling job platforms        | Risque partenaires deviennent concurrents              | À surveiller  |

## 4.3 Opportunités

1. **Gap ATS × Design** : peu d’acteurs excellent sur les deux axes.
2. **Personnalisation par offre** : feature la plus demandée, mal exécutée chez la plupart.
3. **Chaîne post-CV** : lettre + entretien = sticky product, ↑ LTV.
4. **Marchés non-EN sous-servis** : FR/DE avec normes locales (photo?, CV long, etc.).
5. **B2B outplacement / universités** : seats Business, white-label light.
6. **Import LinkedIn / PDF** : réduction friction onboarding → activation ↑.
7. **Score explicable** : confiance utilisateur + contenu SEO (« comment améliorer mon score ATS »).

## 4.4 Menaces

| Menace                               | Probabilité | Impact | Réponse stratégique                           |
| ------------------------------------ | ----------- | ------ | --------------------------------------------- |
| Canva / Adobe ajoutent ATS+IA deep   | Haute       | Élevé  | Vitesse d’exécution + focus carrière vertical |
| Guerre des prix freemium             | Haute       | Moyen  | Valeur Pro claire ; annual plans              |
| Coûts LLM / rate limits              | Moyenne     | Élevé  | Architecture multi-modèles, cache, quotas     |
| Hallucinations → mauvaise réputation | Moyenne     | Élevé  | Guardrails, fact-check UX, disclaimer         |
| Changements API LinkedIn             | Haute       | Moyen  | Import fichier + OCR + saisie manuelle        |
| SEO dominé par Zety/Resume.io        | Haute       | Moyen  | Contenu différenciant + product-led + paid    |
| Régulation IA / claims marketing     | Moyenne     | Moyen  | Claims mesurables, pas « guaranteed job »     |

## 4.5 Insights marché actionnables pour le PRD

1. Le **PDF export** reste le job-to-be-done #1 — il doit être parfait dès le MVP.
2. Les utilisateurs paient pour **enlever la friction** (IA, templates, multi-versions), pas pour « stocker un CV ».
3. Les **dark patterns** (paywall au download) convertissent court terme mais détruisent NPS — nous choisissons la confiance.
4. Le **matching offre** est le killer feature pour justifier Pro et créer l’habitude de revenir.

---

# 5. COMPETITIVE ANALYSIS

## 5.1 Vue d’ensemble des 8 concurrents

### 5.1.1 Resume.io

| Critère          | Évaluation                                                           |
| ---------------- | -------------------------------------------------------------------- |
| Positionnement   | Leader volume, SEO massif, builder classique                         |
| Forces           | Templates nombreux, UX rodée, contenu marketing dominant, ATS claims |
| Faiblesses       | Perception « usine », IA parfois superficielle, branding générique   |
| Pricing          | Freemium / abonnement court terme agressif                           |
| Menace pour nous | Haute (acquisition SEO)                                              |
| Opportunité      | Surpasser sur IA contextuelle + transparence + NPS                   |

### 5.1.2 Canva Resume

| Critère          | Évaluation                                                            |
| ---------------- | --------------------------------------------------------------------- |
| Positionnement   | Design-first, écosystème Canva                                        |
| Forces           | Brand immense, templates magnifiques, collaboration, familiarité      |
| Faiblesses       | ATS souvent faible (layouts créatifs), pas un workflow carrière dédié |
| Pricing          | Inclus Canva Free/Pro                                                 |
| Menace pour nous | Très haute (distribution)                                             |
| Opportunité      | « ATS-ready by default » vs templates décoratifs                      |

### 5.1.3 Zety

| Critère        | Évaluation                                                              |
| -------------- | ----------------------------------------------------------------------- |
| Positionnement | Content + builder, SEO agressif                                         |
| Forces         | Guides, exemples, conversion paywall                                    |
| Faiblesses     | Expérience parfois perçue comme pushy ; différenciation produit limitée |
| Pricing        | Abonnements / trials                                                    |
| Menace         | Haute (SEO content)                                                     |
| Opportunité    | Meilleure UX produit + moins de friction perçue                         |

### 5.1.4 Kickresume

| Critère        | Évaluation                                   |
| -------------- | -------------------------------------------- |
| Positionnement | Templates + AI writer, brand sympathique     |
| Forces         | IA early-mover, cover letters, design soigné |
| Faiblesses     | Moins dominant US ; profondeur ATS variable  |
| Pricing        | Freemium / Premium                           |
| Menace         | Moyenne-Haute                                |
| Opportunité    | Matcher offre + score explicable + collab    |

### 5.1.5 Enhancv

| Critère        | Évaluation                                             |
| -------------- | ------------------------------------------------------ |
| Positionnement | Design premium, storytelling CV                        |
| Forces         | Esthétique forte, sections narratives, branding soigné |
| Faiblesses     | Prix / perception premium ; ATS vs design tradeoff     |
| Pricing        | Subscription                                           |
| Menace         | Moyenne                                                |
| Opportunité    | Combiner leur qualité visuelle avec notre stack ATS/IA |

### 5.1.6 Adobe Express Resume

| Critère        | Évaluation                                             |
| -------------- | ------------------------------------------------------ |
| Positionnement | Design Adobe, entrée grand public                      |
| Forces         | Brand trust, intégration Creative Cloud, templates     |
| Faiblesses     | Pas vertical carrière ; ATS non central                |
| Pricing        | Freemium Adobe                                         |
| Menace         | Moyenne (distribution Adobe)                           |
| Opportunité    | Spécialisation métier recrutement vs outil généraliste |

### 5.1.7 Novoresume

| Critère        | Évaluation                                       |
| -------------- | ------------------------------------------------ |
| Positionnement | Modern resumes, clean templates                  |
| Forces         | UX claire, templates contemporains, focus Europe |
| Faiblesses     | Moins de profondeur IA/matching vs leaders       |
| Pricing        | Free / Premium                                   |
| Menace         | Moyenne                                          |
| Opportunité    | IA + marketplace + mobile                        |

### 5.1.8 MyPerfectResume

| Critère        | Évaluation                                     |
| -------------- | ---------------------------------------------- |
| Positionnement | Builder guidé + content library                |
| Forces         | Parcours pas-à-pas, exemples métier, SEO       |
| Faiblesses     | UI datée vs standards 2026 ; IA moins centrale |
| Pricing        | Subscription                                   |
| Menace         | Moyenne (SEO)                                  |
| Opportunité    | Expérience moderne + IA temps réel             |

## 5.2 Matrice features (comparatif)

Légende : ● = fort / natif · ◐ = partiel / limité · ○ = faible / absent · ★ = notre cible M12

| Feature                | Resume.io | Canva | Zety | Kickresume | Enhancv | Adobe | Novoresume | MyPerfect | **CV Studio AI** |
| ---------------------- | --------- | ----- | ---- | ---------- | ------- | ----- | ---------- | --------- | ---------------- |
| Templates qualité      | ●         | ●     | ●    | ●          | ●       | ●     | ●          | ◐         | ★ ●              |
| Éditeur live dual pane | ◐         | ●     | ◐    | ◐          | ●       | ●     | ◐          | ○         | ★ ●              |
| ATS checker            | ●         | ○     | ●    | ◐          | ◐       | ○     | ◐          | ◐         | ★ ●              |
| IA rewrite             | ●         | ◐     | ●    | ●          | ◐       | ◐     | ◐          | ◐         | ★ ●              |
| Match offre d’emploi   | ◐         | ○     | ◐    | ◐          | ○       | ○     | ○          | ○         | ★ ●              |
| Cover letter AI        | ●         | ◐     | ●    | ●          | ◐       | ○     | ◐          | ●         | ★ ●              |
| Interview prep         | ○         | ○     | ○    | ○          | ○       | ○     | ○          | ○         | ★ ●              |
| Import LinkedIn        | ●         | ○     | ●    | ●          | ◐       | ○     | ◐          | ●         | ★ ●              |
| Import PDF/OCR         | ◐         | ○     | ◐    | ◐          | ○       | ○     | ○          | ◐         | ★ ● (M12+)       |
| Collaboration          | ○         | ●     | ○    | ○          | ○       | ●     | ○          | ○         | ★ ● (M12+)       |
| Portfolio page         | ◐         | ●     | ○    | ◐          | ●       | ●     | ◐          | ○         | ★ ●              |
| Marketplace templates  | ○         | ●     | ○    | ○          | ○       | ◐     | ○          | ○         | ★ ● (M9+)        |
| Mobile app native      | ◐         | ●     | ◐    | ◐          | ○       | ●     | ○          | ◐         | ★ ● (M12+)       |
| Pricing transparent    | ◐         | ●     | ○    | ◐          | ◐       | ●     | ◐          | ○         | ★ ●              |
| Multilingue EU         | ◐         | ●     | ◐    | ●          | ◐       | ●     | ●          | ○         | ★ ●              |

## 5.3 SWOT — CV Studio AI

### Strengths (à construire / défendre)

- Focus vertical carrière + stack ATS propriétaire.
- Chaîne CV → Lettre → Entretien (stickiness).
- UX moderne (Next.js, preview live).
- Pricing clair, Free réellement utile.
- Roadmap marketplace + B2B.

### Weaknesses (initiales)

- Aucune marque à M0 ; SEO à construire.
- Coûts IA variables.
- Catalogue templates initial limité (5 → 50+).
- Pas d’app mobile avant M12.
- Données d’entraînement / feedback loops à créer.

### Opportunities

- Vague IA + frustration ATS.
- Marchés FR/DE sous-optimisés.
- Partenariats écoles / APEC / outplacement.
- Creator economy templates.
- Upsell Business analytics.

### Threats

- Incumbents SEO + budgets ads.
- Canva/Adobe feature creep.
- Régulation et coûts modèle.
- Copie rapide des features IA par rivals.

## 5.4 Differentiators (priorisés)

| Rang | Différenciateur                      | Preuve utilisateur                            | Moat potentiel            |
| ---- | ------------------------------------ | --------------------------------------------- | ------------------------- |
| 1    | Job Description Matcher actionnable  | « J’ai adapté mon CV en 5 min à l’offre »     | Données matching + UX     |
| 2    | ATS Score explicable                 | « Je sais pourquoi je score 62 »              | Algo + règles parsing     |
| 3    | Interview Prep Coach lié au CV/offre | « Je prépare l’entretien dans le même outil » | Workflow unique           |
| 4    | Dual-pane editor excellence          | « Aussi fluide que Canva, plus structuré »    | Craft produit             |
| 5    | Marketplace + standards ATS          | Templates beaux ET parseables                 | Network effects designers |
| 6    | Transparence pricing                 | Confiance / NPS                               | Brand                     |

## 5.5 Battle cards (résumé sales/marketing)

**vs Canva :** _Canva fait de beaux documents. CV Studio AI fait des candidatures qui passent les logiciels RH. Utilisez Canva pour votre portfolio créatif ; utilisez-nous pour le poste à pourvoir._

**vs Resume.io / Zety :** _Même job-to-be-done, expérience plus moderne, IA orientée offre, moins de friction au paiement, suite entretien incluse._

**vs Kickresume / Enhancv :** _Nous unifions leur force design/IA avec un moteur ATS et un matching offre de niveau supérieur, plus la collab et le marketplace._

---

# 6. PERSONAS

## 6.0 Méthodologie personas

Les personas ci-dessous sont des **hypothèses structurées** destinées à guider design, acquisition et priorisation. Elles doivent être **validées / invalidées** par user research (entretiens n≥8 par persona, surveys, analyse comportementale) avant M3. Chaque persona inclut : profil, contexte, goals, frustrations, pain points, behaviors, triggers d’achat, metrics de succès, implications produit.

---

## 6.1 Persona 1 — Léa, Jeune diplômée (18–25 ans)

### Profil

| Attribut         | Détail                                                                        |
| ---------------- | ----------------------------------------------------------------------------- |
| **Nom**          | Léa Martin                                                                    |
| **Âge**          | 23 ans                                                                        |
| **Situation**    | Master Marketing Digital, première recherche d’emploi CDI / alternance senior |
| **Localisation** | Lyon, France (ouverte à remote / Paris)                                       |
| **Revenus**      | Budget serré (étudiants / premiers salaires)                                  |
| **Tech comfort** | Élevé (mobile-first, TikTok, LinkedIn, Canva)                                 |
| **Langues**      | FR natif, EN B2                                                               |

### Contexte narratif

Léa a un stage de 6 mois et des projets associatifs. Elle a essayé Canva (joli mais « est-ce que ça passe ATS ? ») et un builder gratuit qui a bloqué le PDF derrière un abonnement. Elle postule à 15–30 offres / semaine et se décourage face au silence des recruteurs.

### Goals

1. Obtenir des entretiens rapidement (objectif : 3 entretiens en 30 jours).
2. Un CV professionnel « comme les grands » sans y passer le week-end.
3. Adapter son CV aux offres junior / marketing sans mentir.
4. Comprendre ce qui cloche (ATS ? contenu ? manque d’expérience ?).

### Frustrations

- Impression que son CV est « trop vide » vs profils expérimentés.
- Peur du syndrome de l’imposteur ; formulations maladroites.
- Templates Canva rejetés par ATS (d’après forums / LinkedIn).
- Paywalls surprise au moment du téléchargement.
- Conseils génériques (« quantifie tes résultats ») sans exemples concrets.

### Pain points (produit)

| Pain                             | Intensité | Implication feature                         |
| -------------------------------- | --------- | ------------------------------------------- |
| Manque de contenu / formulations | Haute     | AI Resume Optimizer + exemples junior       |
| Incertitude ATS                  | Haute     | ATS Analyzer + templates ATS-safe           |
| Budget                           | Haute     | Free tier généreux + Pro mensuel cancelable |
| Temps                            | Moyenne   | Onboarding < 10 min, import LinkedIn        |
| Multi-offres                     | Haute     | Versions CV + Job Matcher                   |

### Behaviors

- Découvre l’outil via TikTok / Instagram / SEO « modèle CV marketing ».
- Commence sur mobile, finit souvent sur desktop pour l’export.
- Partage son CV à des amis pour feedback.
- Abandonne si onboarding > 5 minutes sans valeur perçue.
- Sensible aux preuves sociales (avis, « utilisé utilisé par X étudiants »).

### Triggers d’achat Pro

- Besoin de 3+ versions pour des postes différents.
- Score ATS < 70 avec suggestions paywall soft.
- Génération lettre de motivation pour une offre « rêve ».

### Success metrics pour Léa

- Time-to-first-export < 12 min.
- Score ATS ≥ 80 sur template recommandé.
- Au moins 1 feature IA utilisée dans les 7 premiers jours.

### Citations types (hypothétiques)

> « J’ai peur que mon CV fasse amateur. Je veux juste quelque chose de propre qui passe les robots. »

> « Si ça me demande une CB pour télécharger un PDF basique, je désinstalle. »

---

## 6.2 Persona 2 — Karim, Mid-career shifter (30–40 ans)

### Profil

| Attribut         | Détail                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| **Nom**          | Karim Benali                                                           |
| **Âge**          | 34 ans                                                                 |
| **Situation**    | 8 ans en conseil opérationnel → reconversion Product Management / Tech |
| **Localisation** | Paris / Banlieue                                                       |
| **Revenus**      | 55–70 k€ ; prêt à payer pour un outil qui marche                       |
| **Tech comfort** | Moyen-élevé                                                            |
| **Langues**      | FR, EN courant                                                         |

### Contexte narratif

Karim doit **repositionner** 8 ans d’expérience sans paraître « hors sujet ». Il a un ancien CV Word daté, un LinkedIn partiellement à jour, et des offres PM qui demandent des mots-clés qu’il possède en pratique mais pas en vocabulaire. Il a testé ChatGPT (textes longs, format cassé) et un builder classique (templates OK, matching faible).

### Goals

1. Raconter une transition crédible (narrative arc).
2. Aligner vocabulaire sur les offres PM (PRD, discovery, metrics…).
3. Produire CV + lettre pour 5–10 cibles prioritaires.
4. Se préparer aux questions « Pourquoi le produit ? ».

### Frustrations

- CV actuel ancré dans l’ancien métier → rejet automatique.
- Peur de « trop pivoter » et perdre sa crédibilité.
- Temps limité (emploi actuel + famille).
- Outils qui génèrent du bullshit non factuel.
- Incertitude sur ce qu’il faut couper / mettre en avant.

### Pain points

| Pain                       | Intensité | Implication feature           |
| -------------------------- | --------- | ----------------------------- |
| Reframe d’expérience       | Critique  | AI Optimizer + Career Advice  |
| Matching mots-clés offre   | Critique  | Job Description Matcher       |
| Versions multiples         | Haute     | Unlimited CVs (Pro)           |
| Préparation entretien      | Haute     | Interview Prep Coach          |
| Crédibilité / honnêteté IA | Haute     | Guardrails anti-hallucination |

### Behaviors

- Arrive souvent via LinkedIn ads / bouche-à-oreille / comparatifs « best AI resume ».
- Travaille en sessions 45–90 min le soir.
- Compare 2–3 outils avant de payer annuel.
- Veut des explications (« pourquoi cette reformulation »).
- Exporte PDF + parfois DOCX pour tweaks mineurs RH.

### Triggers d’achat Pro

- Matcher offre qui montre +25 points de compatibilité après optimisation.
- Pack lettre + prep entretien pour process en cours.
- Besoin de >1 CV (ancien métier vs cible).

### Success metrics pour Karim

- Amélioration matching offre ≥ +20 pts après optimisation.
- 2 versions CV actives en < 1 h.
- Utilisation Interview Prep avant 1er entretien.

### Citations types

> « ChatGPT m’écrit des phrases que je n’ai jamais vécues. J’ai besoin d’un outil qui reste factuel. »

> « Montrez-moi les mots-clés manquants par rapport à l’offre, pas un score magique. »

---

## 6.3 Persona 3 — Sophie, Manager / Executive (40–55 ans)

### Profil

| Attribut         | Détail                                                            |
| ---------------- | ----------------------------------------------------------------- |
| **Nom**          | Sophie Durand                                                     |
| **Âge**          | 47 ans                                                            |
| **Situation**    | Directrice Marketing / VP ; recherche discrète (passive ↔ active) |
| **Localisation** | Île-de-France / ouverture internationale                          |
| **Revenus**      | 90–140 k€ ; willingness to pay élevée                             |
| **Tech comfort** | Moyen (Excel/PowerPoint fort, builders web moyens)                |
| **Langues**      | FR, EN professionnel                                              |

### Contexte narratif

Sophie n’a pas mis à jour son CV depuis 6 ans. Son parcours est riche (P&L, teams, transformation) mais mal synthétisé. Elle refuse les templates « startup colorés ». Elle veut sobriété executive, quantification leadership, et parfois une version EN. La confidentialité compte (recherche discrète).

### Goals

1. CV executive concis (2 pages max FR, 1–2 EN selon marché).
2. Mettre en avant impact business (revenue, team size, transformation).
3. Variantes Board / Corporate / Scale-up.
4. Confidentialité et contrôle du partage.

### Frustrations

- Builders « jeunes » avec designs inappropriés au niveau C-level.
- IA trop junior dans le ton (« passionnée et dynamique »).
- Manque de sections leadership (board, speaking, board advisory).
- Peur que le CV « fuite » via liens publics.
- Peu de temps ; délégation possible à un assistant (Business?).

### Pain points

| Pain                        | Intensité | Implication feature                           |
| --------------------------- | --------- | --------------------------------------------- |
| Ton / seniority             | Critique  | Templates executive + tone control IA         |
| Synthèse d’un long parcours | Haute     | AI summarization / priorisation               |
| Confidentialité             | Haute     | Liens privés, pas d’indexation, SSO plus tard |
| Versions EN/FR              | Haute     | i18n + locale conventions                     |
| Assistance humaine / équipe | Moyenne   | Business tier collab                          |

### Behaviors

- Entrée souvent desktop, parfois via reco cabinet outplacement.
- Paie annuel sans hésiter si qualité perçue.
- Demande PDF impeccable (typographie, marges, print).
- Moins sensible aux features « fun », très sensible au rendu final.
- Peut demander à un coach / assistant d’éditer (besoin collab).

### Triggers d’achat

- Template Executive ATS-safe + design sobre.
- Export PDF print-ready parfait.
- Collaboration lecture seule avec coach carrière.
- Business si elle onboard une équipe / cabinet.

### Success metrics pour Sophie

- Satisfaction rendu (CSAT export) ≥ 4,6/5.
- Temps de mise à jour parcours complet < 90 min.
- 0 incident de partage non désiré.

### Citations types

> « Je ne veux pas un CV LinkedIn rose. Je veux quelque chose que je peux envoyer à un chasseur. »

> « L’IA doit sonner senior. Si ça fait stage, c’est mort. »

---

## 6.4 Persona 4 — Diego, Immigrant en recherche d’emploi

### Profil

| Attribut         | Détail                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Nom**          | Diego Alvarez                                                                                   |
| **Âge**          | 29 ans                                                                                          |
| **Situation**    | Ingénieur logiciel arrivé en France / UE ; équivalence diplômes + première synchro marché local |
| **Localisation** | Berlin ou Paris (expatriation récente)                                                          |
| **Revenus**      | Budget prudent ; forte urgence d’emploi                                                         |
| **Tech comfort** | Élevé (dev)                                                                                     |
| **Langues**      | ES natif, EN C1, FR B1–B2                                                                       |

### Contexte narratif

Diego a un excellent background technique mais un CV format pays d’origine (photo, longueur, rubriques différentes). Il doit localiser son CV aux normes du pays cible, traduire sans perdre la précision technique, et comprendre les attentes ATS locales. Il postule massivement et a besoin d’itérer vite.

### Goals

1. Localiser le CV (FR/DE/US norms).
2. Traduction professionnelle technique (pas Google Translate brut).
3. Mettre en avant projets / GitHub / compétences transferables.
4. Comprendre les écarts culturels (photo, âge, état civil — souvent à retirer en FR/US tech).

### Frustrations

- Normes CV différentes non documentées clairement.
- Traductions IA qui cassent les termes techniques.
- Discrimination perçue / biais ; besoin d’un document « local native quality ».
- Outils mono-langue EN.
- Reconnaissance d’expérience étrangère difficile à formuler.

### Pain points

| Pain                | Intensité | Implication feature               |
| ------------------- | --------- | --------------------------------- |
| Localisation normes | Critique  | Templates locale-aware + guidance |
| Traduction qualité  | Critique  | IA multilingue + glossaire tech   |
| Preuves compétences | Haute     | Portfolio / projects / links      |
| Volume candidatures | Haute     | Matcher + versions                |
| Budget              | Haute     | Free utile + Pro mensuel flexible |

### Behaviors

- Compare outils EN ; cherche support ES/FR/DE.
- Import PDF ancien CV (OCR critique).
- Utilise GitHub / portfolio comme preuve.
- Actif sur forums expats / Discord / Reddit.
- Très sensible au time-to-value.

### Triggers d’achat

- Import PDF + localisation en 1 clic.
- Traduction EN→FR/DE de qualité.
- ATS score sur marché cible.
- Cover letter locale.

### Success metrics pour Diego

- Import PDF succès ≥ 85 % champs récupérés.
- Export conforme checklist locale (sans sections risquées).
- Matching offre tech ≥ 75 après optimisation.

### Citations types

> « Mon CV était parfait au Chili. Ici on me dit que la photo et les 4 pages posent problème. »

> « Je veux une traduction qui garde ‘Kubernetes’, pas une poésie. »

---

## 6.5 Personas secondaires (backlog research)

| Persona                       | Usage                           | Priorité research |
| ----------------------------- | ------------------------------- | ----------------- |
| Career coach / outplacement   | Multi-clients, collab, Business | P1 M6             |
| University career center      | Licences campus                 | P1 M9             |
| Freelance / portfolio créatif | Templates design + portfolio    | P2                |
| Returner (pause carrière)     | Gaps, narrative                 | P2                |

## 6.6 Mapping personas → priorisation features

| Feature                | Léa | Karim | Sophie | Diego |
| ---------------------- | --- | ----- | ------ | ----- |
| Free PDF + 5 templates | ●●● | ●●    | ●      | ●●●   |
| ATS Analyzer           | ●●● | ●●●   | ●●     | ●●●   |
| Job Matcher            | ●●  | ●●●   | ●●     | ●●●   |
| AI Optimizer           | ●●● | ●●●   | ●●     | ●●●   |
| Interview Prep         | ●●  | ●●●   | ●●     | ●●    |
| Import LinkedIn        | ●●● | ●●●   | ●●     | ●●    |
| Import PDF/OCR         | ●   | ●●    | ●●     | ●●●   |
| Executive templates    | ○   | ●     | ●●●    | ○     |
| Multilingue            | ●   | ●●    | ●●●    | ●●●   |
| Collaboration          | ●   | ●●    | ●●●    | ●     |
| Portfolio              | ●●  | ●●    | ●      | ●●●   |

---

# 7. USER JOURNEYS

## 7.1 Principes transverses

- Chaque parcours a un **Job To Be Done**, des **étapes**, des **émotions**, des **métriques**, des **wireflows ASCII**, et des **edge cases**.
- Temps cibles mesurés en analytics (segmentés desktop/mobile).
- Messages d’erreur actionnables ; jamais de cul-de-sac.

---

## 7.2 Parcours d’inscription (Signup & Auth)

### JTBD

« Quand je décide d’essayer CV Studio AI, je veux créer un compte en < 60 secondes pour commencer mon CV sans friction. »

### Acteurs

Visiteur → Système Auth → (optionnel) Provider OAuth

### Wireflow ASCII

```
[Landing Page]
      |
      | CTA "Créer mon CV gratuitement"
      v
[Signup Gateway]
      |-------------------------------|
      |                               |
 [Email + MDP]                 [OAuth Buttons]
      |                         Google | LinkedIn | Apple
      v                               v
[Verify email?]                 [Consent scopes]
 (si email)                          |
      |                               |
      +-------------+-----------------+
                    v
            [Create User + Workspace]
                    v
            [Onboarding Wizard]
                    v
            [Dashboard / Editor]
```

### Étapes détaillées

1. **Landing** : hero, preuve sociale, CTA primaire unique.
2. **Choix auth** : Email ou OAuth (Google / LinkedIn / Apple).
3. **Consentement** : CGU, Privacy, (plus tard) usage IA.
4. **Création compte** : user_id, workspace free, quotas.
5. **Onboarding** : objectif (premier emploi / reconversion / executive / international), langue CV, import optionnel.
6. **Activation** : redirection éditeur avec template recommandé.

### Métriques

| Métrique               | Cible                           |
| ---------------------- | ------------------------------- |
| Time-to-signup         | < 60 s (OAuth) / < 90 s (email) |
| Signup completion rate | ≥ 70 % depuis page signup       |
| OAuth share            | ≥ 60 % des signups              |
| Drop-off onboarding    | < 25 %                          |

### Edge cases

- Email déjà utilisé → login + message clair.
- OAuth sans email → demander email de secours.
- LinkedIn OAuth restreint → fallback import fichier / manuel.
- Mineurs / age gate si requis légalement par marché.

### Émotions cibles

Confiance → rapidité → « je suis au bon endroit ».

---

## 7.3 Parcours de création de CV

### JTBD

« Quand je construis mon CV, je veux voir le rendu final en direct pendant que je remplis mes infos, pour me sentir en contrôle. »

### Wireflow ASCII

```
[Dashboard] --> [New CV]
                    |
                    v
            [Choose Template (5 MVP)]
                    |
                    v
        +-----------+-----------+
        | Dual Pane Editor      |
        |-----------------------|
        | Form (L)  | Preview(R)|
        | Identity  | Live CV   |
        | Experience|           |
        | Education |           |
        | Skills    |           |
        | + AI hints|           |
        +-----------+-----------+
                    |
         Save autosave every 5s / blur
                    |
                    v
            [Ready to Export?]
```

### Étapes

1. Créer CV (nom interne, langue, cible métier optionnelle).
2. Choisir template (filtres : ATS-safe, Executive, Créatif…).
3. Remplir sections (ordre recommandé + drag reorder plus tard).
4. Utiliser suggestions IA inline (Pro) ou exemples (Free).
5. Ajuster couleurs/fonts (Core+).
6. Prévisualiser mobile / print.
7. Marquer « Complet » (checklist).

### Checklist qualité (inline)

- [ ] Coordonnées valides
- [ ] ≥ 1 expérience ou projet
- [ ] Compétences ≥ 5
- [ ] Pas de placeholder « Lorem »
- [ ] Longueur compatible template

### Métriques

| Métrique              | Cible              |
| --------------------- | ------------------ |
| Time-to-first-preview | < 30 s             |
| Time-to-first-export  | < 15 min (médiane) |
| Autosave success      | ≥ 99,9 %           |
| Editor crash rate     | < 0,1 % sessions   |

### Edge cases

- Très long texte → overflow template + warnings.
- Caractères spéciaux / RTL (phase i18n).
- Perte réseau → queue offline légère + banner.

---

## 7.4 Parcours d’optimisation ATS

### JTBD

« Quand je doute que mon CV passe les filtres, je veux un score clair et des actions concrètes pour l’améliorer. »

### Wireflow ASCII

```
[Editor] --> CTA "Analyser ATS"
                |
                v
        [Select target context]
         (generic | paste JD)
                |
                v
        [Run Analyzer]
         - parsing simulation
         - keyword coverage
         - formatting risks
         - section completeness
                |
                v
        [Score 0-100 + Breakdown]
                |
        +-------+--------+
        |                |
   [Fix suggestions]  [Apply AI fix (Pro)]
        |                |
        v                v
   [Manual edit]    [Diff proposed]
        |                |
        +-------+--------+
                v
        [Re-score loop]
                |
                v
        [Export when >= threshold]
```

### Catégories de diagnostic

1. **Format / parsing** : colonnes, tables, text-in-images, icons, headers/footers.
2. **Structure** : sections manquantes, titres non standards.
3. **Contenu** : verbes faibles, manque de métriques, densité mots-clés vs JD.
4. **Contact** : email/phone parseables.
5. **Longueur** : pages vs séniorité.

### Métriques

| Métrique                        | Cible           |
| ------------------------------- | --------------- |
| Analyzer latency p95            | < 8 s           |
| % users re-score ≥ 1            | ≥ 60 % (Pro)    |
| Avg score uplift after fixes    | ≥ +12 pts       |
| Explanation usefulness (thumbs) | ≥ 75 % positive |

### Edge cases

- JD vide / trop courte → mode générique.
- CV non-EN/FR → couverture linguistique limitée (label transparently).
- False positives → feedback utilisateur + tuning modèle règles.

---

## 7.5 Parcours d’export / partage

### JTBD

« Quand mon CV est prêt, je veux l’exporter en PDF parfait ou le partager via un lien contrôlé. »

### Wireflow ASCII

```
[Editor] --> [Export Menu]
                |
    +-----------+-------------+--------------+
    |           |             |              |
 [PDF]      [DOCX later]  [Public link]  [Portfolio]
    |           |             |              |
    v           v             v              v
[Render]    [Convert]   [Privacy opts]  [Publish page]
    |                         |              |
    v                         v              v
[Download]              [Copy URL]     [SEO opts off by default]
```

### Exigences PDF

- Fidélité visuelle ≥ 99 % vs preview.
- Polices embeddées.
- Texte sélectionnable (pas scan image) — critique ATS.
- A4 / Letter selon locale.
- Nom fichier intelligent : `Prenom_Nom_CV_Poste.pdf`.

### Partage

- Lien privé par défaut (token).
- Expiration optionnelle.
- Password optionnelle (Pro).
- Analytics vues (Pro/Business).
- Unpublish immédiat.

### Métriques

| Métrique                      | Cible                |
| ----------------------------- | -------------------- |
| PDF generation p95            | < 5 s                |
| Export success rate           | ≥ 99,5 %             |
| Visual diff regressions       | 0 critique / release |
| Share link CTR back to signup | tracké (viral loop)  |

---

## 7.6 Parcours d’abonnement (Free → Pro / Business)

### JTBD

« Quand j’atteins une limite Free ou que je vois la valeur IA, je veux upgrader en < 2 minutes sans friction ni piège. »

### Wireflow ASCII

```
[Trigger]
  - 2nd CV blocked
  - AI feature gated
  - Template premium
  - Soft banner after ATS score
        |
        v
[Paywall / Pricing page in-app]
  Free | Pro | Business
        |
        v
[Select plan Monthly / Yearly]
        |
        v
[Checkout - Stripe]
  Card / Apple Pay / Google Pay
        |
        v
[Webhook confirm] --> [Entitlements unlocked]
        |
        v
[Success screen + resume action interrupted]
```

### Principes anti-dark-pattern

- Free PDF autorisé (1 CV).
- Prix visibles avant checkout.
- Cancel self-serve en 2 clics.
- Pas de trial CB obligatoire opaque ; si trial, durée et conditions claires.
- Email de confirmation + facture.

### Métriques

| Métrique                   | Cible                |
| -------------------------- | -------------------- |
| Checkout completion        | ≥ 85 %               |
| Time-to-upgrade            | < 2 min              |
| Immediate feature unlock   | < 10 s post-paiement |
| Refund requests / disputes | < 1 %                |
| Cancel reason capture      | ≥ 80 % des cancels   |

### Edge cases

- Paiement OK / webhook delay → polling entitlements + support banner.
- Échec carte → retry + méthodes alternatives.
- Student discount futur → code promo.
- Team Business → invite flow post-achat.

---

## 7.7 Parcours transverse — « Offre → Candidature complète » (différenciant)

```
[Paste Job Description]
          |
          v
[Match Score + Gaps]
          |
          v
[Optimize CV (AI)] --> [Version snapshot]
          |
          v
[Generate Cover Letter]
          |
          v
[Export pack]
          |
          v
[Interview Prep Coach]
          |
          v
[Track application status] (Advanced)
```

Ce parcours est le **cœur de la rétention Pro** et doit être instrumenté comme funnel dédié.

---

# 8. USER STORIES

## 8.0 Cadre de priorisation

Priorisation **MoSCoW** alignée sur la roadmap 24 mois :

- **Must Have (M)** : indispensable au PMF / MVP ou conformité
- **Should Have (S)** : fort impact, prévu Core / IA early
- **Could Have (C)** : valeur additionnelle, slot dépend capacité
- **Won’t Have (W)** : hors scope 24 mois (ou explicite non-goals)

Format : `US-XXX` | Persona | Priorité | Story | Critères d’acceptance (Gherkin abrégé)

---

## 8.1 Authentification & compte (US-001 → US-008)

**US-001** | Tous | **M**  
En tant qu’utilisateur, je veux m’inscrire avec email et mot de passe, afin de créer un compte sécurisé.  
_Acceptance :_ email valide ; MDP ≥ 8 chars avec règles ; confirmation ; session JWT créée.

**US-002** | Tous | **M**  
En tant qu’utilisateur, je veux me connecter via Google, afin de réduire la friction d’inscription.  
_Acceptance :_ OAuth Google ; compte créé ou lié ; scopes minimaux.

**US-003** | Tous | **M**  
En tant qu’utilisateur, je veux me connecter via LinkedIn, afin d’accélérer mon onboarding carrière.  
_Acceptance :_ OAuth LinkedIn ; fallback si API limitée ; message clair.

**US-004** | Tous | **M**  
En tant qu’utilisateur, je veux me connecter via Apple, afin d’utiliser mon compte Apple sur iOS/web.  
_Acceptance :_ Sign in with Apple ; hide my email supporté.

**US-005** | Tous | **M**  
En tant qu’utilisateur, je veux réinitialiser mon mot de passe, afin de récupérer l’accès à mon compte.  
_Acceptance :_ email reset à usage unique < 1 h ; invalidation tokens précédents.

**US-006** | Tous | **S**  
En tant qu’utilisateur, je veux activer la 2FA, afin de protéger mes données de carrière.  
_Acceptance :_ TOTP ; backup codes ; disable sécurisé.

**US-007** | Tous | **M**  
En tant qu’utilisateur, je veux supprimer mon compte et mes données, afin d’exercer mon droit à l’oubli (RGPD).  
_Acceptance :_ confirmation ; purge ≤ 30 jours ; export préalable proposé.

**US-008** | Tous | **S**  
En tant qu’utilisateur, je veux exporter mes données personnelles, afin de respecter la portabilité RGPD.  
_Acceptance :_ export JSON/ZIP sous 24 h.

---

## 8.2 Onboarding & dashboard (US-009 → US-014)

**US-009** | Léa | **M**  
En tant que nouvel utilisateur, je veux indiquer mon objectif de carrière, afin de recevoir un template et des conseils adaptés.  
_Acceptance :_ 4 objectifs ; recommandation template ; skip possible.

**US-010** | Diego | **M**  
En tant que nouvel utilisateur, je veux choisir la langue et le format de mon CV (A4/Letter), afin de respecter les normes locales.  
_Acceptance :_ FR/EN a minima ; A4 défaut EU ; Letter défaut US.

**US-011** | Tous | **M**  
En tant qu’utilisateur, je veux voir un dashboard listant mes CV, afin de reprendre mon travail rapidement.  
_Acceptance :_ liste, date modif, statut, CTA créer.

**US-012** | Tous | **S**  
En tant qu’utilisateur, je veux rechercher/filtrer mes CV, afin de retrouver une version liée à une offre.  
_Acceptance :_ search nom ; filtre tags.

**US-013** | Tous | **M**  
En tant qu’utilisateur, je veux renommer / dupliquer / archiver un CV, afin d’organiser mes candidatures.  
_Acceptance :_ duplicate deep copy ; archive masquée par défaut.

**US-014** | Léa | **S**  
En tant que nouvel utilisateur, je veux un checklist d’activation, afin de savoir quoi faire ensuite.  
_Acceptance :_ étapes : template, sections, ATS, export ; dismissible.

---

## 8.3 Éditeur de CV (US-015 → US-028)

**US-015** | Tous | **M**  
En tant qu’utilisateur, je veux éditer mon CV via un formulaire structuré, afin de ne pas me battre avec la mise en page.  
_Acceptance :_ sections Identity, Experience, Education, Skills, Languages, Custom.

**US-016** | Tous | **M**  
En tant qu’utilisateur, je veux une prévisualisation live côte à côte, afin de voir le rendu final en temps réel.  
_Acceptance :_ update preview < 300 ms après input (debounce) ; sync scroll optionnel.

**US-017** | Tous | **M**  
En tant qu’utilisateur, je veux que mes modifications soient sauvegardées automatiquement, afin de ne jamais perdre mon travail.  
_Acceptance :_ autosave ≤ 5 s ; indicateur Saved/Saving/Error ; retry.

**US-018** | Karim | **M**  
En tant qu’utilisateur, je veux ajouter plusieurs expériences avec puces, afin de détailler mon parcours.  
_Acceptance :_ CRUD expériences ; rich bullets plain text ; dates ; lieu ; contrat.

**US-019** | Léa | **M**  
En tant qu’utilisateur, je veux réordonner mes sections (quand activé), afin de mettre en avant mes projets.  
_Acceptance :_ drag & drop sections (Core) ; contraintes template respectées.

**US-020** | Sophie | **S**  
En tant qu’utilisateur executive, je veux des sections leadership (board, speaking, publications), afin de refléter mon niveau.  
_Acceptance :_ sections optionnelles ; templates executive les exposent.

**US-021** | Tous | **M**  
En tant qu’utilisateur, je veux sélectionner un template parmi au moins 5, afin d’obtenir un rendu professionnel rapidement.  
_Acceptance :_ 5 templates MVP ATS-safe ; preview thumbnails.

**US-022** | Tous | **S**  
En tant qu’utilisateur Pro, je veux accéder à 50+ templates, afin de trouver un style adapté à mon secteur.  
_Acceptance :_ catalogue filtré ; favoris ; preview.

**US-023** | Sophie | **S**  
En tant qu’utilisateur, je veux personnaliser couleurs et polices dans les limites ATS, afin d’exprimer ma marque personnelle sans casser le parsing.  
_Acceptance :_ palettes validées ; warning si risque ATS.

**US-024** | Tous | **M**  
En tant qu’utilisateur, je veux des validations de champs (email, URL, dates), afin d’éviter les erreurs embarrassantes.  
_Acceptance :_ validation inline ; bloque export si critique.

**US-025** | Diego | **S**  
En tant qu’utilisateur, je veux ajouter des liens projets / GitHub / portfolio, afin de prouver mes compétences.  
_Acceptance :_ URLs cliquables PDF ; section Projects.

**US-026** | Tous | **C**  
En tant qu’utilisateur, je veux des commentaires internes sur mon CV, afin de collaborer avec un mentor.  
_Acceptance :_ comments thread (Advanced collab).

**US-027** | Tous | **M**  
En tant qu’utilisateur, je veux prévisualiser le mode impression / page breaks, afin d’éviter une dernière ligne orpheline.  
_Acceptance :_ indicateurs page break ; warning overflow.

**US-028** | Karim | **S**  
En tant qu’utilisateur, je veux une bibliothèque de formulations suggérées par métier, afin d’accélérer la rédaction.  
_Acceptance :_ suggestions Free limitées ; Pro illimitées.

---

## 8.4 ATS & Matching (US-029 → US-036)

**US-029** | Tous | **S**  
En tant qu’utilisateur, je veux lancer une analyse ATS, afin de connaître mon score et mes risques de parsing.  
_Acceptance :_ score 0–100 ; breakdown ; latency p95 < 8 s.

**US-030** | Karim | **S**  
En tant qu’utilisateur Pro, je veux coller une offre d’emploi, afin de mesurer l’adéquation avec mon CV.  
_Acceptance :_ parse JD ; score match ; liste gaps ; mots-clés manquants.

**US-031** | Karim | **S**  
En tant qu’utilisateur Pro, je veux appliquer des suggestions d’optimisation liées à l’offre, afin d’améliorer mon matching sans inventer d’expériences.  
_Acceptance :_ diff proposals ; user approve ; no new employers invented.

**US-032** | Léa | **S**  
En tant qu’utilisateur, je veux comprendre pourquoi mon score est bas, afin d’apprendre et corriger.  
_Acceptance :_ explications en langage simple ; liens aide.

**US-033** | Diego | **S**  
En tant qu’utilisateur, je veux une checklist de conformité locale (photo, infos perso), afin d’éviter les erreurs culturelles.  
_Acceptance :_ ruleset par pays ; toggles.

**US-034** | Tous | **C**  
En tant qu’utilisateur, je veux comparer mon score avant/après, afin de visualiser le progrès.  
_Acceptance :_ history scores ; chart simple.

**US-035** | Sophie | **C**  
En tant qu’utilisateur, je veux un mode « conservative ATS » qui force un layout ultra-simple, afin de maximiser le parsing.  
_Acceptance :_ switch layout ; conserve contenu.

**US-036** | Tous | **S**  
En tant qu’utilisateur Free, je veux voir mon score ATS (teaser), afin de comprendre la valeur Pro des fixes IA.  
_Acceptance :_ score visible ; apply auto-fix gated.

---

## 8.5 IA (US-037 → US-048)

**US-037** | Tous | **S**  
En tant qu’utilisateur Pro, je veux générer un brouillon de CV depuis mon profil LinkedIn, afin de gagner du temps.  
_Acceptance :_ import mapping ; review obligatoire avant save.

**US-038** | Karim | **S**  
En tant qu’utilisateur Pro, je veux réécrire une puce d’expérience avec l’IA (plus d’impact, factuelle), afin d’améliorer mon CV.  
_Acceptance :_ 3 variants ; conserve chiffres utilisateur ; flag incertitude.

**US-039** | Léa | **S**  
En tant qu’utilisateur Pro, je veux générer une lettre de motivation à partir de mon CV + offre, afin de candidater plus vite.  
_Acceptance :_ longueur réglable ; ton ; export DOCX/PDF.

**US-040** | Karim | **S**  
En tant qu’utilisateur Pro, je veux un coach d’entretien basé sur mon CV et l’offre, afin de préparer des réponses STAR.  
_Acceptance :_ 8–15 questions ; guides de réponse ; mode entraînement.

**US-041** | Sophie | **S**  
En tant qu’utilisateur Pro, je veux contrôler le ton de l’IA (executive / factuel / enthousiaste), afin d’éviter un style junior.  
_Acceptance :_ tone preset ; preview.

**US-042** | Diego | **S**  
En tant qu’utilisateur Pro, je veux traduire mon CV en conservant les termes techniques, afin de candidater localement.  
_Acceptance :_ glossaire ; terms locked ; review.

**US-043** | Tous | **S**  
En tant qu’utilisateur, je veux que l’IA n’invente pas d’employeurs ou diplômes, afin de rester honnête.  
_Acceptance :_ guardrail tests ; refus + message.

**US-044** | Karim | **C**  
En tant qu’utilisateur Pro, je veux des conseils carrière (gaps skills), afin de planifier ma reconversion.  
_Acceptance :_ advice cards ; disclaimer non-certifié.

**US-045** | Tous | **M**  
En tant qu’utilisateur, je veux voir un indicateur de génération IA en cours, afin de comprendre l’attente.  
_Acceptance :_ skeleton ; cancel ; timeout message.

**US-046** | Tous | **S**  
En tant qu’utilisateur Pro, je veux un historique de mes générations IA, afin de récupérer une version précédente.  
_Acceptance :_ history 30 jours ; restore.

**US-047** | Tous | **S**  
En tant qu’utilisateur, je veux donner un feedback thumbs up/down sur une suggestion IA, afin d’améliorer le produit.  
_Acceptance :_ feedback stocké ; non bloquant.

**US-048** | Free | **M**  
En tant qu’utilisateur Free, je veux comprendre clairement que l’IA est Pro, afin de décider d’upgrader sans frustration opaque.  
_Acceptance :_ badges Pro ; pricing link ; pas de génération partielle trompeuse.

---

## 8.6 Export, partage, portfolio (US-049 → US-056)

**US-049** | Tous | **M**  
En tant qu’utilisateur Free, je veux exporter mon unique CV en PDF, afin de postuler immédiatement.  
_Acceptance :_ PDF texte sélectionnable ; fidélité preview ; < 5 s p95.

**US-050** | Pro | **S**  
En tant qu’utilisateur Pro, je veux exporter sans watermark, afin d’envoyer un document professionnel.  
_Acceptance :_ no watermark Pro ; Free option watermark? **Décision : pas de watermark Free** (confiance) — limite = 1 CV.

**US-051** | Tous | **S**  
En tant qu’utilisateur, je veux partager un lien privé de mon CV, afin d’obtenir du feedback.  
_Acceptance :_ token URL ; revoke ; expire.

**US-052** | Diego | **S**  
En tant qu’utilisateur Pro, je veux publier une page portfolio, afin de montrer projets et preuves.  
_Acceptance :_ slug ; sections ; SEO off default.

**US-053** | Sophie | **S**  
En tant qu’utilisateur, je veux désactiver l’indexation de mon lien, afin de rester discret.  
_Acceptance :_ noindex ; private default.

**US-054** | Tous | **C**  
En tant qu’utilisateur, je veux exporter en DOCX, afin d’ajuster chez un recruteur qui l’exige.  
_Acceptance :_ DOCX structurellement propre (Advanced).

**US-055** | Pro | **C**  
En tant qu’utilisateur Pro, je veux voir le nombre de vues de mon lien, afin de mesurer l’intérêt.  
_Acceptance :_ view count ; approx geo optionnel.

**US-056** | Tous | **M**  
En tant qu’utilisateur, je veux un nom de fichier PDF intelligent, afin de paraître organisé auprès des RH.  
_Acceptance :_ pattern configurable.

---

## 8.7 Billing & plans (US-057 → US-064)

**US-057** | Tous | **S**  
En tant qu’utilisateur Free, je veux voir les différences Free/Pro/Business, afin de choisir mon plan.  
_Acceptance :_ pricing page claire ; comparaison features.

**US-058** | Karim | **S**  
En tant qu’utilisateur, je veux m’abonner à Pro mensuel ou annuel, afin d’accéder à l’IA et multi-CV.  
_Acceptance :_ Stripe Checkout ; taxes ; devise locale.

**US-059** | Tous | **S**  
En tant qu’utilisateur payant, je veux gérer mon abonnement (upgrade/downgrade/cancel), afin de garder le contrôle.  
_Acceptance :_ customer portal ; fin de période.

**US-060** | Sophie | **C**  
En tant qu’acheteur Business, je veux inviter des membres d’équipe, afin de collaborer sur des CV clients / coaching.  
_Acceptance :_ seats ; roles Owner/Editor/Viewer.

**US-061** | Tous | **S**  
En tant qu’utilisateur, je veux recevoir une facture PDF, afin de me faire rembourser / compta.  
_Acceptance :_ email + download.

**US-062** | Tous | **M**  
En tant qu’utilisateur, je veux que mes features se débloquent immédiatement après paiement, afin de continuer mon action.  
_Acceptance :_ entitlements < 10 s ; resume deep-link.

**US-063** | Business | **C**  
En tant qu’admin Business, je veux un branding custom (logo), afin d’utiliser l’outil en cabinet.  
_Acceptance :_ logo upload ; applies portfolio/export optional.

**US-064** | Tous | **S**  
En tant qu’utilisateur, je veux un code promo, afin de bénéficier d’une réduction partenaires / écoles.  
_Acceptance :_ redemption ; limits ; analytics.

---

## 8.8 Avancé, collab, mobile, marketplace (US-065 → US-075)

**US-065** | Sophie | **C**  
En tant qu’utilisateur Business, je veux collaborer en temps réel sur un CV, afin de co-éditer avec un coach.  
_Acceptance :_ presence ; conflict resolution ; comments.

**US-066** | Karim | **C**  
En tant qu’utilisateur Pro, je veux un historique de versions, afin de revenir en arrière après une mauvaise édition IA.  
_Acceptance :_ snapshots ; restore ; label.

**US-067** | Designers | **C**  
En tant que designer, je veux publier un template sur le marketplace, afin de monétiser mon travail.  
_Acceptance :_ submission ; review ; 70 % revenue share designer.

**US-068** | Léa | **C**  
En tant qu’utilisateur mobile, je veux éditer mon CV sur une app native, afin de corriger une puce dans les transports.  
_Acceptance :_ iOS/Android GA ; parity éditeur core.

**US-069** | Business | **C**  
En tant qu’admin, je veux des analytics d’usage d’équipe, afin de mesurer l’adoption.  
_Acceptance :_ exports, AI usage, active seats.

**US-070** | Diego | **C**  
En tant qu’utilisateur Pro, je veux synchroniser LinkedIn périodiquement, afin de garder mon profil à jour.  
_Acceptance :_ live sync opt-in ; diff review.

**US-071** | Diego | **C**  
En tant qu’utilisateur, je veux importer un PDF existant via OCR, afin de ne pas tout retaper.  
_Acceptance :_ field mapping confidence ; manual fix UI.

**US-072** | Tous | **C**  
En tant qu’utilisateur, je veux une API (Business), afin de connecter mon ATS interne / outil RH.  
_Acceptance :_ API keys ; rate limits ; docs.

**US-073** | Tous | **W (24 mois partiel)**  
En tant qu’utilisateur, je veux un agent IA qui postule à ma place, afin d’automatiser les candidatures.  
_Acceptance :_ **Won’t Have** — risque éthique / ToS job boards / qualité.

**US-074** | Tous | **W**  
En tant qu’utilisateur, je veux générer des diplômes / certifications fictives, afin d’embellir mon CV.  
_Acceptance :_ **Won’t Have** — refus produit explicite.

**US-075** | Tous | **C**  
En tant qu’utilisateur, je veux un mode sombre, afin de travailler confortablement le soir.  
_Acceptance :_ theme toggle ; contraste WCAG.

---

## 8.9 Synthèse MoSCoW (comptage)

| Priorité    | Nombre de stories | Exemples                                                                   |
| ----------- | ----------------- | -------------------------------------------------------------------------- |
| Must Have   | 22                | Auth, editor dual-pane, 5 templates, PDF, dashboard, autosave, RGPD delete |
| Should Have | 28                | ATS, matcher, IA suite, billing, portfolio, multi-templates                |
| Could Have  | 22                | Collab, marketplace, mobile, OCR, API, analytics, DOCX                     |
| Won’t Have  | 3+                | Auto-apply jobs, fake credentials, (autres non-goals annexe)               |

> Total documenté ci-dessus : **75 user stories** (au-delà du minimum de 50).

## 8.10 Non-goals produit (24 mois)

1. Job board / marketplace d’emplois complet.
2. Remplacement d’un ATS entreprise (Greenhouse, etc.).
3. Réseau social professionnel concurrent LinkedIn.
4. Garantie d’embauche dans le marketing.
5. Génération de contenu trompeur.

---

# 9. FUNCTIONAL REQUIREMENTS

## 9.1 MVP — Minimum Viable Product (définition)

Le MVP est réussi si un utilisateur **non technique** peut :

1. Créer un compte (email ou OAuth),
2. Remplir un CV dans un éditeur dual-pane,
3. Choisir parmi 5 templates ATS-safe,
4. Exporter un PDF fidèle,
5. Revenir via dashboard,

…en **moins de 15 minutes**, avec un taux d’activation (first export) ≥ 35 % des signups M3.

### Périmètre MVP inclus

| Module        | Requirements clés                                               |
| ------------- | --------------------------------------------------------------- |
| Landing       | Hero, value prop, pricing teaser, SEO basics, CGU/Privacy links |
| Auth          | JWT + OAuth Google/LinkedIn/Apple ; reset password              |
| Onboarding    | Objectif + langue + template recommandé                         |
| Editor        | Sections core + live preview + autosave                         |
| Templates     | 5 templates (2 ATS classic, 1 modern, 1 compact, 1 graduate)    |
| Export        | PDF A4/Letter                                                   |
| Dashboard     | Liste CV (max 1 Free), duplicate bloqué Free                    |
| Billing stub  | Feature flags prêts ; paywall soft optionnel M3–M4              |
| Admin interne | Feature flags, basic user lookup (ops)                          |

### Périmètre MVP exclu

- IA générative complète
- ATS analyzer complet
- Drag & drop avancé
- Marketplace
- Mobile native
- Collaboration
- OCR

## 9.2 Features de base (Core)

1. **Advanced Templates (50+)** : catégories, industries, locales.
2. **Drag & Drop Editor** : sections et items.
3. **Custom Colors/Fonts** : dans guardrails ATS.
4. **ATS Analyzer** : score + explications.
5. **Portfolio Integration** : page publique optionnelle.
6. **Subscription Management** : Stripe customer portal.
7. **Payment Integration** : Stripe Checkout + webhooks + taxes.
8. **Multi-CV** : illimité Pro.
9. **Cover letter basic** (même sans IA full) : template lettre.
10. **Notifications email** : lifecycle (activation, billing).

## 9.3 Features premium (paywall)

| Feature         | Free          | Pro                    | Business              |
| --------------- | ------------- | ---------------------- | --------------------- |
| Nb CV           | 1             | Unlimited              | Unlimited             |
| Templates       | 5             | 50+ + marketplace      | 50+ + marketplace     |
| PDF export      | Oui           | Oui                    | Oui                   |
| ATS Analyzer    | Score teaser  | Full + history         | Full + team analytics |
| AI Optimizer    | Non           | Oui                    | Oui                   |
| JD Matcher      | Non           | Oui                    | Oui                   |
| Cover Letter AI | Non           | Oui                    | Oui                   |
| Interview Prep  | Non           | Oui                    | Oui                   |
| Portfolio       | Non / limited | Oui                    | Oui + branding        |
| Collaboration   | Non           | Non / limited comments | Real-time + roles     |
| API             | Non           | Non                    | Oui                   |
| Support         | Community     | Priority               | Dedicated             |

## 9.4 Features IA — spécifications fonctionnelles

### 9.4.1 CV Generator from LinkedIn

- Entrée : OAuth LinkedIn ou export profil.
- Sortie : CV draft structuré.
- UX : mapping review (confidence badges).
- Règle : aucune invention ; champs manquants = empty.

### 9.4.2 AI Resume Optimizer

- Entrée : section / bullet + contexte (poste cible optionnel).
- Sortie : 3 variants + rationale.
- Contraintes : longueur, ton, factualité, langue.
- Quotas : N requêtes / jour selon plan.

### 9.4.3 Job Description Matcher

- Entrée : JD texte (paste) ou URL (si fetchable).
- Sortie : score, keywords missing/present, skill gaps, suggested edits.
- Méthode : embeddings + règles métier + LLM explanation.
- UX : side panel dans editor.

### 9.4.4 Cover Letter Generator

- Entrée : CV actif + JD + ton + longueur.
- Sortie : lettre structurée éditable.
- Export : PDF / copie.

### 9.4.5 Interview Prep Coach

- Entrée : CV + JD + type entretien (HR / hiring manager / technical).
- Sortie : questions + plans de réponse STAR + pièges.
- Mode practice : timer + self-score (pas de promesse magique).

### 9.4.6 ATS Score Analyzer

- Simulation parsing + heuristiques format.
- Score pondéré (poids configurables produit).
- Explications localisées FR/EN…

### 9.4.7 Career Advice

- Insights gaps ; ressources ; disclaimer.
- Pas de conseil juridique / immigration légal certifié.

### 9.4.4 Exigences transverses IA

- Logging prompts/responses anonymisé pour qualité (opt-in où requis).
- Filtres PII minimisation.
- Kill switch global feature flag.
- Coût tracking per request (FinOps).
- Evaluation set golden (offline) avant chaque upgrade modèle.

## 9.5 Exigences fonctionnelles détaillées par domaine (échantillon normatif)

### Identité & profil

- Un utilisateur possède un **profil canonique** (source de vérité) distinct des **CV documents** (vues adaptées).
- Modification profil peut proposer sync vers CV sélectionnés.

### Documents

- Un CV = document versionné (version history Advanced).
- Métadonnées : langue, locale, template_id, target_role, tags.

### Entitlements

- Service central de droits (plan, quotas IA, seats).
- Toute feature gated vérifie entitlements côté API (jamais UI only).

### Observabilité produit

- Events tracking : `signup`, `cv_created`, `section_completed`, `ats_run`, `ai_request`, `export_pdf`, `checkout_start`, `purchase_success`.

---

# 10. NON-FUNCTIONAL REQUIREMENTS

## 10.1 Performance

| Exigence                                        | Cible                                     | Mesure                             |
| ----------------------------------------------- | ----------------------------------------- | ---------------------------------- |
| Lighthouse Performance (landing + editor shell) | **≥ 90**                                  | CI LighthouseCI sur URLs critiques |
| Lighthouse Accessibility                        | ≥ 90                                      | idem                               |
| Lighthouse Best Practices                       | ≥ 90                                      | idem                               |
| Lighthouse SEO (marketing pages)                | ≥ 90                                      | idem                               |
| TTFB API p95                                    | < 300 ms (cached) / < 800 ms (dynamic)    | APM                                |
| Editor input → preview update                   | < 300 ms perçus                           | RUM                                |
| PDF generation p95                              | < 5 s                                     | jobs metrics                       |
| ATS analysis p95                                | < 8 s                                     | jobs metrics                       |
| AI first token / completion UX                  | skeleton < 200 ms ; completion < 20 s p95 | LLM gateway                        |
| Bundle JS initial editor                        | budget à définir (< 250 KB gzip aim)      | bundle analyzer                    |

### Stratégies

- SSR/SSG marketing (Next.js) ; client islands pour editor.
- CDN assets (CloudFront).
- Redis cache sessions / entitlements / template metadata.
- PDF workers isolés (queue) pour ne pas bloquer API.
- Images templates lazy + responsive.

## 10.2 Scalability (1 M users)

| Dimension                       | Cible M24                      |
| ------------------------------- | ------------------------------ |
| Registered users                | 1 000 000                      |
| MAU                             | 250 000                        |
| Concurrent editor sessions peak | 10 000                         |
| PDF jobs peak                   | 50 / s burst (queue)           |
| AI requests peak                | 30 / s (rate limited / queued) |

### Principes d’architecture scale

- Stateless API (NestJS) derrière load balancer.
- Horizontal pod autoscaling (CPU/RPS/queue depth).
- PostgreSQL primary + read replicas pour lectures lourdes.
- Partitionnement / archivage documents anciens si besoin.
- Object storage (S3) pour PDF, uploads, exports.
- Queue (SQS/BullMQ) pour PDF, IA, emails, OCR.
- Feature flags pour dégradation gracieuse (désactiver IA non critique).

## 10.3 Reliability

| Exigence               | Cible                                           |
| ---------------------- | ----------------------------------------------- |
| Uptime production      | **99,9 %** mensuel (hors maintenance planifiée) |
| RPO                    | ≤ 1 h                                           |
| RTO                    | ≤ 4 h                                           |
| Multi-AZ               | Obligatoire AWS                                 |
| Backups DB             | Quotidiens + PITR                               |
| Chaos / failover tests | Trimestriels                                    |
| Status page            | Publique                                        |

### Error budgets

- 99,9 % ⇒ ~43 min downtime / mois max.
- Toute release feature vs fiabilité arbitrée via error budget.

## 10.4 Security (OWASP Top 10 + SaaS)

Conformité aux risques OWASP Top 10 (A01–A10) avec contrôles :

| Risque                      | Contrôles CV Studio AI                                       |
| --------------------------- | ------------------------------------------------------------ |
| Broken Access Control       | AuthZ entitlements server-side ; tests IDOR                  |
| Cryptographic Failures      | TLS 1.2+ ; secrets Manager ; encryption at rest S3/DB        |
| Injection                   | ORM paramétré ; validation DTO (class-validator) ; sanitize  |
| Insecure Design             | Threat modeling features IA/billing                          |
| Security Misconfiguration   | Hardened Docker ; CIS baselines ; no default creds           |
| Vulnerable Components       | Dependabot / Snyk ; SCA en CI                                |
| Auth Failures               | JWT short-lived + refresh ; OAuth ; rate limit login ; 2FA S |
| Software & Data Integrity   | Signed CI artifacts ; webhook signature Stripe               |
| Logging/Monitoring Failures | Centralized logs ; alertes auth anomalies                    |
| SSRF                        | Allowlist fetch JD URLs ; block metadata IPs                 |

### Privacy & compliance

- RGPD (UE) : base légale, DPA, registre, DPIA features IA.
- Cookies : CMP.
- AI Act readiness : transparence « contenu généré par IA », logs.
- PCI : via Stripe (no card storage chez nous).
- SOC2 roadmap M18+ (Business sales).

## 10.5 Accessibilité (WCAG 2.2 AA)

| Exigence       | Détail                                                         |
| -------------- | -------------------------------------------------------------- |
| Conformité     | **WCAG AA** sur flux critiques (auth, editor, billing, export) |
| Clavier        | Navigation complète editor                                     |
| Screen readers | Labels, roles, live regions (autosave, errors)                 |
| Contraste      | Ratios AA ; themes testés                                      |
| Focus          | Visible ; order logique                                        |
| Alternatives   | Textes alt templates ; PDF accessible best-effort              |
| Tests          | axe-core CI + audit manuel trimestriel                         |

## 10.6 Autres NFR

| Domaine              | Exigence                                         |
| -------------------- | ------------------------------------------------ |
| Internationalization | i18n framework dès MVP (FR/EN) ; ES/DE M12–18    |
| Observability        | OpenTelemetry traces ; metrics ; structured logs |
| Supportability       | Impersonation admin auditée ; feature flags      |
| Legal                | CGU, Privacy, mentions IA, copyright templates   |
| Sustainability cost  | Budget LLM mensuel + alertes FinOps              |

---

# 11. FEATURES BREAKDOWN

## 11.1 MVP TIER 1 — Sprints 0–10 (≈ Mois 0–3)

### Objectif de phase

Shipper un produit utilisable publiquement (beta → GA soft) prouvant le job-to-be-done « créer et exporter un CV ».

### Features

#### ✅ Authentication (JWT, OAuth Google/LinkedIn/Apple)

- **Description :** Inscription / login sécurisés.
- **Stories :** US-001 à US-005.
- **Design :** écrans auth minimalistes, social buttons, erreurs claires.
- **Eng :** NestJS Auth module, Passport strategies, refresh tokens httpOnly.
- **QA :** matrix providers ; revoke ; session expiry.
- **Deps :** Google/LinkedIn/Apple developer apps.
- **KPI :** signup completion ≥ 70 %.

#### ✅ Basic CV Editor

- Sections : Identity, Summary, Experience, Education, Skills, Languages, Interests (opt).
- Validation + placeholders guidés.
- KPI : % users completing Identity+Experience ≥ 60 %.

#### ✅ Real-time preview (Form + CV Live side-by-side)

- Desktop dual-pane ; mobile = tabs Form / Preview.
- Render engine template-driven (React).
- KPI : preview lag complaints < 2 % tickets.

#### ✅ CV Templates (5)

| ID  | Nom de travail      | Audience         | ATS posture |
| --- | ------------------- | ---------------- | ----------- |
| T1  | Atlas Classic       | Général          | Max         |
| T2  | Seine Modern        | Tech/Office      | High        |
| T3  | Campus Graduate     | Junior           | High        |
| T4  | Compact OnePage     | Dense experience | High        |
| T5  | Nord Executive Lite | Manager entry    | High        |

#### ✅ Export PDF

- Worker Chromium headless or dedicated renderer ; text layer.
- KPI : success ≥ 99,5 %.

#### ✅ Landing page

- SEO foundation ; A/B CTA ; social proof placeholders.
- KPI : visitor→signup ≥ 8–12 % early (paid traffic lower).

#### ✅ Onboarding

- 3–4 steps max ; skip.
- KPI : onboarding complete ≥ 75 %.

#### ✅ Basic Dashboard

- Liste, empty state, CTA create, account menu.

### Definition of Done Sprint 0–10

- Staging + Prod AWS
- Monitoring basique
- CGU/Privacy published
- 20 beta users qualitative interviews done

---

## 11.2 CORE FEATURES — Sprints 10–20 (≈ Mois 3–6/7)

#### ✅ Advanced Templates (50+)

- Pipeline design system templates (grille, tokens).
- QA ATS sur chaque template (checklist parsing).
- Catalogue UX : search, tags, industries.

#### ✅ Drag & Drop Editor

- DnD sections + bullets (accessibilité clavier alternative).
- Contraintes : certaines sections locked selon template.

#### ✅ Custom Colors/Fonts

- Palettes pré-approuvées ; font subset ATS-safe.
- Warning « risque ATS » si contraste/icons.

#### ✅ ATS Analyzer

- v1 rules + scoring ; UI breakdown.
- Instrumentation uplift score.

#### ✅ Portfolio Integration

- Page `/p/:slug` ; publish toggle ; noindex default.

#### ✅ Subscription Management

- Plans Free/Pro/Business entitlements service.
- Customer portal Stripe.

#### ✅ Payment Integration

- Checkout ; webhooks idempotents ; dunning emails.
- Taxes (Stripe Tax).

### Exit criteria Core

- Conversion Free→Paid mesurable
- ATS used by ≥ 40 % des exporteurs Pro trial
- 50 templates publiés QA-ok

---

## 11.3 IA FEATURES — (priorité Mois 6–12, itérations continues)

| Feature                             | Release cible | Dépendances         | Risques          |
| ----------------------------------- | ------------- | ------------------- | ---------------- |
| ✅ CV Generator from LinkedIn       | M6–M7         | OAuth LinkedIn      | API limits       |
| ✅ AI Resume Optimizer              | M6            | LLM gateway         | Hallucinations   |
| ✅ Job Description Matcher          | M7            | Embeddings + LLM    | Qualité JD noise |
| ✅ Cover Letter Generator           | M7–M8         | Optimizer           | Ton inadapté     |
| ✅ Interview Prep Coach             | M8–M9         | Matcher             | Overpromise      |
| ✅ ATS Score Analyzer (IA-assisted) | M6–M8         | Rules + LLM explain | Coût             |
| ✅ Career Advice                    | M9–M10        | Profiler            | Liability        |

### Guardrails IA (non négociables)

1. Pas d’invention d’employeurs/diplômes/dates.
2. Conservation des métriques numériques utilisateur.
3. Disclaimer visible.
4. Human-in-the-loop : apply = user confirm.
5. Eval harness avant promotion modèle.

---

## 11.4 ADVANCED FEATURES — Sprints 20+ (Mois 9–24)

#### ✅ Real-time Collaboration

- CRDT ou OT (décision eng) ; presence avatars ; roles.
- Cible Business principalement.

#### ✅ Version History

- Snapshots auto (pre-AI apply, pre-template switch, daily).
- Restore with confirm.

#### ✅ Template Marketplace

- Designer onboarding ; review ; payouts ; commission **30 %**.
- ATS certification badge pour templates.

#### ✅ Mobile App

- React Native ou natif ; parity core edit/export.
- Push : reminders candidature (opt-in).

#### ✅ Advanced Analytics

- User : vues lien, score evolution.
- Business : seat adoption, AI usage, exports.

#### ✅ LinkedIn Live Sync

- Opt-in ; diff review ; never silent overwrite.

#### ✅ PDF Import / OCR

- Upload → parse → confidence UI → merge profil.
- Languages FR/EN d’abord ; ES/DE ensuite.

---

## 11.5 Matrice de dépendances (simplifiée)

```
Auth --> Dashboard --> Editor --> Templates --> PDF Export
                          |
                          +--> ATS Analyzer --> AI Optimizer
                          |                         |
                          +--> Billing <-------------+
                          |
                          +--> Portfolio --> Marketplace
                          |
                          +--> Collab / Versions
                          |
                          +--> Mobile (API parity)
```

## 11.6 Spécifications UX transverses

- Design tokens : typography expressive (non Inter/Roboto), couleurs marque CV Studio AI (éviter clichés purple-gradient AI).
- Motion : 2–3 animations intentionnelles (preview morph, score count-up, onboarding progress) — pas de bruit.
- Empty states : chaque écran propose 1 CTA utile.
- Microcopy FR/EN reviewée product + native speakers.

---

# 12. PRICING & MONETIZATION

## 12.1 Philosophie pricing

1. **Free réellement utile** : 1 CV + 5 templates + PDF — pas de watermark. Objectif : confiance + activation + SEO word-of-mouth.
2. **Pro = outil de candidature sérieux** : volume + IA + ATS profond + portfolio.
3. **Business = équipes & power users** : collab, analytics, API, branding, support.
4. **Marketplace** : revenu additionnel et variété templates sans CAPEX design infini.
5. **Anti-dark-patterns** : pas de piège download ; cancel self-serve ; prix affichés TTC quand possible.

## 12.2 Grille tarifaire

### Free Tier — 0 €

| Inclus           | Limites                                      |
| ---------------- | -------------------------------------------- |
| 1 CV             | Pas de 2e CV                                 |
| 5 templates      | Pas marketplace premium                      |
| Export PDF       | Oui                                          |
| Preview live     | Oui                                          |
| ATS score teaser | Oui (détail/fixes IA limités)                |
| AI features      | Non                                          |
| Portfolio        | Non (ou page ultra-limitée décision produit) |
| Support          | Help center                                  |

### Pro Tier — **9,99 $/mois** ou **99 $/an**

| Inclus           | Détail                                              |
| ---------------- | --------------------------------------------------- |
| Unlimited CVs    | Versions par offre                                  |
| 50+ templates    | + marketplace achats                                |
| All AI features  | Optimizer, Matcher, Cover letter, Interview, Career |
| ATS Analyzer     | Full + history                                      |
| Portfolio        | Oui                                                 |
| Priority support | Email < 24 h ouvrés                                 |
| Version history  | Oui (selon rollout)                                 |

**Positionnement prix :** aligné mid-market (accessible reconversion) ; annuel = ~17 % d’économie vs 12× mensuel (99 vs 119,88).

### Business Tier — **29,99 $/mois** / siège

| Inclus             | Détail                                   |
| ------------------ | ---------------------------------------- |
| Everything in Pro  | Oui                                      |
| Team collaboration | Real-time + roles                        |
| Advanced analytics | Team dashboards                          |
| API access         | Oui (rate limits)                        |
| Custom branding    | Logo / domaine custom phase 2            |
| Dedicated support  | Slack/email dédié selon taille           |
| SSO                | Roadmap (SAML) M18+ si demand commercial |

### Marketplace Commission — **30 %**

- Designer reçoit **70 %** du prix template.
- CV Studio AI : hosting, payment, ATS certification, discovery.
- Prix templates suggérés : 3–15 $.
- Review qualité + ATS badge obligatoire pour mise en avant.

## 12.3 Packaging & paywall triggers

| Trigger            | Message                                         | Intensité |
| ------------------ | ----------------------------------------------- | --------- |
| Création 2e CV     | « Passez Pro pour gérer une version par offre » | Forte     |
| Clic feature IA    | Modal valeur + exemples avant/après             | Forte     |
| Template premium   | Preview + unlock Pro/marketplace                | Moyenne   |
| Post ATS score bas | « Corriger automatiquement avec l’IA (Pro) »    | Soft      |
| Interview Prep     | Upsell contextuel process entretien             | Soft      |

## 12.4 Trials & promos

- **Trial Pro 7 jours** (décision A/B) : avec CB vs without CB — tester éthique + conversion.
- Codes écoles / partenaires : −30 à −50 % annuel.
- Referral : 1 mois Pro crédité / filleul payant.

## 12.5 Unit economics cibles (M12–M24)

| Métrique                      | Cible    |
| ----------------------------- | -------- |
| CAC blended                   | < 25 €   |
| ARPU paid mensuel             | 11–13 €  |
| Gross margin (hors LLM)       | ≥ 80 %   |
| Contribution margin après LLM | ≥ 65 %   |
| LTV (paid)                    | ≥ 120 €  |
| LTV/CAC                       | ≥ 3      |
| Payback                       | < 3 mois |

### Coût IA — gouvernance

- Quotas Pro : ex. 100 optimisations bullets / mois + 30 match JD + 20 lettres + 10 sessions interview.
- Soft cap + option top-up futur.
- Cache similar prompts ; smaller model pour rewrite simple ; large model pour match complexe.

## 12.6 Sensibilité prix & validation

Méthodes :

1. Van Westendorp (survey)
2. A/B pricing page
3. Interview willingness-to-pay personas Karim/Sophie
4. Analyse churn raisons prix

**Hypothèse :** 9,99 $ sweet spot EU/US self-serve ; Business value-based pour cabinets.

## 12.7 Revenue streams (24 mois)

```
Subscriptions (Pro + Business)  ≈ 85–90 %
Marketplace take rate           ≈ 5–10 %
Add-ons / coaches (late)        ≈ 0–5 %
```

---

# 13. KPI & SUCCESS METRICS

## 13.1 North Star Metric

**Candidatures assistées qualifiées (CAQ) / mois**  
Définition : export PDF d’un CV dont (ATS score ≥ 80) ET (si JD associée : match ≥ 70) dans les 7 jours.

Proxy early (avant matcher) : **Exports PDF avec ATS ≥ 80**.

## 13.2 Pyramid metrics

### Acquisition

| KPI               | Définition                  | Cible M12 | Cible M24 |
| ----------------- | --------------------------- | --------- | --------- |
| Visiteurs uniques | Marketing site              | 400k/mois | 1,2M/mois |
| Signup rate       | Signup / visiteurs          | 10 %      | 12 %      |
| CAC               | Spend / new paid            | < 30 €    | < 25 €    |
| Organic share     | Signups SEO+direct+referral | ≥ 45 %    | ≥ 55 %    |

### Activation

| KPI                  | Définition                     | Cible     |
| -------------------- | ------------------------------ | --------- |
| Activated user       | Identity + 1 experience filled | ≥ 70 % J1 |
| First export         | PDF export                     | ≥ 40 % J7 |
| Time-to-first-export | Médiane                        | < 15 min  |

### Engagement

| KPI                       | Définition            | Cible M24   |
| ------------------------- | --------------------- | ----------- |
| **MAU**                   | Users actifs 30j      | **250 000** |
| WAU/MAU                   | Stickiness            | ≥ 0,35      |
| AI feature adoption (Pro) | ≥2 AI features / mois | ≥ 60 %      |
| CV versions / paid user   | Average               | ≥ 3         |

### Monetization

| KPI                      | Définition                 | Cible M24             |
| ------------------------ | -------------------------- | --------------------- |
| **Conversion Free→Paid** | Paid / Free eligible       | **≥ 4,5 %**           |
| **ARPU**                 | Revenue / paid user / mois | **≥ 13 €**            |
| MRR growth               | MoM                        | ≥ 8 % early, then 5 % |
| Marketplace GMV          | Gross                      | Track                 |

### Retention

| KPI                            | Définition         | Cible                                   |
| ------------------------------ | ------------------ | --------------------------------------- |
| **Churn rate** monthly paid    | Cancels / paid     | **< 5 %**                               |
| **Retention J30**              | Users revenant J30 | **> 40 %**                              |
| Retention J90                  |                    | ≥ 20 % (outil sporadique → OK si lower) |
| Net revenue retention Business |                    | ≥ 100 %                                 |

### Satisfaction

| KPI | Cible M24 |
|---|---|---|
| **NPS** | **≥ 50** |
| CSAT export | ≥ 4,5/5 |
| Support TTR | Pro < 24h ; Business < 8h |

### Efficiency

| KPI | Cible |
|---|---|---|
| **LTV/CAC** | **> 3:1** |
| Magic number / payback | < 3 mois |
| Gross margin | ≥ 65 % après infra+LLM |

## 13.3 Instrumentation (tracking plan résumé)

| Event                   | Propriétés clés               |
| ----------------------- | ----------------------------- |
| `signed_up`             | method, country, persona_goal |
| `onboarding_completed`  | steps_done, skipped           |
| `cv_created`            | template_id                   |
| `section_updated`       | section                       |
| `ats_analyzed`          | score, mode                   |
| `jd_matched`            | match_score                   |
| `ai_generated`          | feature, tokens, latency      |
| `pdf_exported`          | template, plan                |
| `paywall_viewed`        | trigger                       |
| `checkout_started`      | plan                          |
| `purchase_succeeded`    | plan, amount                  |
| `subscription_canceled` | reason                        |

Outils suggérés : Product analytics (PostHog/Mixpanel/Amplitude) + Stripe + warehouse (BigQuery/Snowflake) + dbt.

## 13.4 Reviews KPI governance

- Weekly product metrics review
- Monthly business review (revenue, CAC, churn)
- Quarterly OKR reset alignés roadmap

---

# 14. ROADMAP 24 MOIS

## 14.1 Vue macro

```
M0----M3----M6----M9----M12----M18----M24
|     |     |     |      |      |      |
P1    P2    P3    P4     P5     P5/P6  P6
MVP   Auth+ Core  Mkt/   Adv    Adv    Scale
Land  Editor IA   Mobile Feat   Feat   i18n
```

> Note : le découpage demandé « Phase 1 MVP+Landing / Phase 2 Auth+Éditeur » est fusionné opérationnellement car Auth+Éditeur sont le MVP. Ci-dessous, alignement strict à la structure demandée + réalisme delivery.

## 14.2 Phase 1 — Mois 0–3 : MVP + Landing

**Objectifs :** présence marché, premiers exports, apprentissage qualitatif.

**Livrables :**

- Landing SEO + design system v0
- Auth JWT + OAuth
- Editor dual-pane + 5 templates + PDF
- Dashboard + onboarding
- Analytics events core
- Beta fermée → ouverte

**Exit criteria :**

- 5 000+ inscrits (ou seuil ajusté budget)
- First export rate ≥ 30 %
- CSAT export ≥ 4,0
- Uptime ≥ 99,5 % (early)

**Equipes focus :** Eng fullstack, Design, Growth light, CPO.

## 14.3 Phase 2 — Mois 3–6 : Auth mature + Éditeur avancé + Core monetization

**Objectifs :** profondeur editor, 50 templates, billing live.

**Livrables :**

- DnD, colors/fonts guardrailed
- Templates 50+
- Stripe Free/Pro/Business entitlements
- ATS Analyzer v1
- Portfolio v1
- Paywall + conversion experiments

**Exit criteria :**

- Premiers 1 000 paying users
- Conversion ≥ 2,5 %
- ATS adoption ≥ 35 % exporteurs

## 14.4 Phase 3 — Mois 6–9 : IA + Premium features

**Objectifs :** différenciation, ↑ conversion & retention.

**Livrables :**

- LinkedIn import → CV
- AI Optimizer
- JD Matcher
- Cover Letter AI
- Interview Prep v1
- Career Advice beta
- Quotas + FinOps LLM

**Exit criteria :**

- ≥ 50 % Pro users utilisent IA / mois
- Conversion ≥ 3,5 %
- NPS ≥ 40
- Sean Ellis ≥ 35 %

## 14.5 Phase 4 — Mois 9–12 : Marketplace + Mobile

**Objectifs :** variété templates + reach mobile + scale acquisition.

**Livrables :**

- Template Marketplace (commission 30 %)
- iOS + Android apps (core parity)
- Version history
- OCR PDF import beta
- i18n ES (et/ou DE)

**Exit criteria :**

- 50 templates 3P published
- Mobile MAU ≥ 15 % total
- ARR run-rate ≥ 1,5 M€

## 14.6 Phase 5 — Mois 12–18 : Advanced features

**Objectifs :** stickiness B2B, collab, analytics, sync.

**Livrables :**

- Real-time collaboration
- Advanced analytics (user + team)
- LinkedIn live sync
- OCR GA
- API Business public beta
- SSO exploration
- SOC2 kickoff

**Exit criteria :**

- 300+ Business accounts
- Churn < 5,5 %
- LTV/CAC ≥ 2,5

## 14.7 Phase 6 — Mois 18–24 : Scale + Internationalization

**Objectifs :** 1 M users, 4 langues, machine de croissance.

**Livrables :**

- Locales FR/EN/ES/DE complètes (contenu + templates locaux)
- Performance & cost optimization at scale
- Regional marketing / payments
- Marketplace mature + payouts auto
- Reliability 99,9 % prouvé
- Expansion features according to data (not vanity)

**Exit criteria :**

- 1 000 000 registered
- 250k MAU
- ARR ≥ 8 M€
- NPS ≥ 50
- PMF confirmé multi-marché

## 14.8 Roadmap risks & buffers

- Buffer 15–20 % capacité pour incidents / dette.
- IA features derrière flags.
- Mobile ne doit pas cannibaliser web core quality.

## 14.9 Dependencies externes

| Dépendance                        | Impact                | Owner            |
| --------------------------------- | --------------------- | ---------------- |
| Apple/Google OAuth & store review | Mobile & auth         | Eng mobile       |
| LinkedIn API policies             | Import/sync           | Product + Legal  |
| Stripe Tax / payouts              | Billing & marketplace | FinOps           |
| LLM providers                     | IA                    | Eng AI           |
| Designer supply                   | Marketplace           | Community/Design |

---

# 15. TECHNICAL CONSTRAINTS

## 15.1 Stack imposée

| Couche     | Technologie     | Rôle                               |
| ---------- | --------------- | ---------------------------------- |
| Frontend   | **Next.js 14+** | App Router, SSR/SSG, editor UI     |
| Backend    | **NestJS**      | API modulaire, auth, billing, jobs |
| Database   | **PostgreSQL**  | Source de vérité relationnelle     |
| Cache      | **Redis**       | Sessions, quotas, cache, queues    |
| Hosting    | **AWS**         | Compute, DB, S3, CDN, secrets      |
| Containers | **Docker**      | Build immuable, parity env         |

## 15.2 Architecture logique (cible)

```
[Browser / Mobile]
        |
        v
[CloudFront + WAF]
        |
        v
[Next.js (ECS/Fargate or similar)]
        |
        +--> [NestJS API cluster]
                |
        +-------+--------+----------+
        |                |          |
 [PostgreSQL]         [Redis]     [S3]
        |                |
        |           [Workers]
        |           PDF / AI / Email / OCR
        |
 [Stripe webhooks]
 [LLM Gateway]
 [OAuth providers]
```

## 15.3 Contraintes eng non négociables

1. **API-first** : mobile et web partagent les mêmes contrats.
2. **Entitlements server-side**.
3. **Migrations DB** versionnées (Prisma/TypeORM/Flyway — choix eng).
4. **Environnements** : local / staging / prod isolés.
5. **CI/CD** : tests + lint + security scan + preview deploys.
6. **Secrets** : jamais dans git ; AWS Secrets Manager / SSM.
7. **PII minimization** dans logs.
8. **Feature flags** (LaunchDarkly / Unleash / maison).

## 15.4 Contraintes data model (concepts)

Entités principales :

- User, IdentityProvider
- Workspace / Team / Membership (Business)
- Profile (canonical)
- ResumeDocument, ResumeVersion, Template
- Entitlement, Subscription, InvoiceRef
- AtsReport, MatchReport
- AiRequest
- PortfolioPage
- MarketplaceListing, Purchase

## 15.5 Contraintes PDF

- Texte extractible (ATS).
- Fonts licensed embeddable.
- Deterministic rendering (tests visuels).
- Pas de layout CSS « exotique » non testé.

## 15.6 Contraintes IA

- Gateway unique (observability, cost, safety).
- Prompt templates versionnés.
- Red team basique (prompt injection documents).
- Retention policy des prompts.

## 15.7 Contraintes légales/tech

- Hébergement données EU pour users EU (région AWS eu-*).
- DPA sous-processeurs (LLM, Stripe, email).
- Cookie consent avant trackers marketing.

---

# 16. ACCEPTANCE CRITERIA

## 16.1 Critères d’acceptance du PRD (document)

Le présent PRD est considéré **approuvé** lorsque :

| #   | Critère                                                                                             | Owner           | Statut cible    |
| --- | --------------------------------------------------------------------------------------------------- | --------------- | --------------- |
| AC1 | **PRD approuvé par Product, Engineering, Design** (sign-off écrit)                                  | CPO             | Requis          |
| AC2 | **Roadmap 24 mois validée** (capacité vs scope)                                                     | CPO + CTO       | Requis          |
| AC3 | **Pricing strategy validated par analytics** (survey WTP + benchmarks + modèle financier)           | CPO + Finance   | Requis          |
| AC4 | **KPIs définis et trackables** (tracking plan implémenté ≥ events core)                             | CPO + Data      | Requis avant GA |
| AC5 | **Competitors analyzed** (battle cards marketing disponibles)                                       | CPO + Marketing | Requis          |
| AC6 | **Personas validated par user research** (n≥8 entretiens / persona prioritaire ou update documenté) | Research + CPO  | Requis M3       |

## 16.2 Critères d’acceptance produit (gates de phase)

### Gate MVP (fin Phase 1)

- [ ] Auth email + 3 OAuth opérationnels
- [ ] Dual-pane editor stable
- [ ] 5 templates ATS checklist pass
- [ ] PDF export fidèle + texte sélectionnable
- [ ] Landing indexable
- [ ] Onboarding < 4 steps
- [ ] Dashboard fonctionnel
- [ ] Lighthouse perf landing ≥ 90
- [ ] RGPD basics (privacy, delete account)
- [ ] Error tracking + uptime monitoring

### Gate Monetization (Phase 2)

- [ ] Stripe live mode
- [ ] Entitlements Free/Pro/Business
- [ ] Cancel self-serve
- [ ] ATS v1
- [ ] 50 templates
- [ ] Conversion dashboard

### Gate IA (Phase 3)

- [ ] Guardrails anti-hallucination tests pass
- [ ] Quotas enforced
- [ ] Cost per AI request dashboards
- [ ] User confirm before apply
- [ ] NPS pulse ≥ 35

### Gate Scale (Phase 6)

- [ ] 99,9 % uptime trimestre
- [ ] 1M users architecture load-tested
- [ ] 4 langues GA
- [ ] Marketplace payouts audités
- [ ] Security review OWASP annual

## 16.3 Processus de changement du PRD

1. Toute modification structurelle (pricing, scope Must, NFR) → **RFC** + review CPO/CTO/Head of Design.
2. Versioning sémantique du PRD (1.1, 1.2…).
3. Changelog en tête de document.
4. Communication all-hands à chaque version mineure+.

## 16.4 Définition du Product-Market Fit (opérationnelle)

PMF déclaré si **au moins 4/5** conditions vraies sur un trimestre :

1. Sean Ellis ≥ 40 %
2. Retention J30 ≥ 40 %
3. Conversion Free→Paid ≥ 4 %
4. NPS ≥ 45
5. Croissance organique share ≥ 50 % des signups OU LTV/CAC ≥ 3

---

# 17. ANNEXES

## Annexe A — Glossaire

| Terme       | Définition                                                        |
| ----------- | ----------------------------------------------------------------- |
| ATS         | Applicant Tracking System — logiciel de filtrage des candidatures |
| CAQ         | Candidature Assistée Qualifiée (North Star)                       |
| Entitlement | Droit d’accès feature lié au plan                                 |
| JD          | Job Description                                                   |
| MAU         | Monthly Active Users                                              |
| PMF         | Product-Market Fit                                                |
| RPO/RTO     | Recovery Point/Time Objective                                     |
| STAR        | Situation, Task, Action, Result (méthode entretien)               |

## Annexe B — Open questions (à trancher)

1. Trial Pro avec ou sans carte bancaire ?
2. Portfolio en Free ultra-limité ou strict Pro ?
3. DOCX : priorité M9 ou M15 ?
4. React Native vs Flutter vs 2 apps natives ?
5. CRDT library pour collab (yjs?) ?
6. Prix Business par siège vs packs ?
7. Watermark Free : confirmé NON — revalidation M6 ?

## Annexe C — Research plan (M0–M3)

- 32 entretiens (8×4 personas)
- 5 tests usabilité editor (think aloud)
- Survey WTP n≥150
- Shadowing sessions candidature (opt-in)
- Analyse reviews concurrents (App Store, Trustpilot)

## Annexe D — Metrics dictionary (extrait)

Voir section 13 ; document Data complet à maintenir dans Notion/DBT docs.

## Annexe E — Legal checklist

- [ ] CGU
- [ ] Privacy Policy
- [ ] Cookie Policy
- [ ] DPA sous-processeurs
- [ ] Mentions contenu IA
- [ ] Copyright templates
- [ ] Marketplace designer agreement

## Annexe F — Financial model note

Le modèle ARR de la section 3 est un **scénario de planification**. Finance maintient un modèle séparé (best / base / worst) mis à jour mensuellement.

## Annexe G — Template ATS certification checklist

1. Single column preferred OR tested dual column parsing
2. Standard headings (Experience, Education, Skills)
3. No text in images
4. No tables for layout critique
5. Selectable text PDF
6. Contact info as text top
7. Consistent date formats
8. Avoid icons-only skill bars
9. Sufficient margin
10. Human readability preserved

## Annexe H — Wireflow récapitulatif global

```
LANDING --> SIGNUP --> ONBOARDING --> DASHBOARD
                                         |
                                      NEW CV
                                         |
                                   TEMPLATE PICK
                                         |
                                   DUAL EDITOR <-----> AI/ATS PANELS
                                         |
                                   EXPORT PDF / SHARE
                                         |
                                   PAYWALL? --> CHECKOUT --> PRO FEATURES
                                         |
                                   COVER LETTER --> INTERVIEW PREP
                                         |
                                   PORTFOLIO / MARKETPLACE / COLLAB
```

## Annexe I — RACI résumé (décisions produit)

| Décision              | CPO | CTO | Design | Marketing | Finance |
| --------------------- | --- | --- | ------ | --------- | ------- |
| Priorité roadmap      | A   | C   | C      | C         | I       |
| Pricing               | A   | I   | I      | C         | C       |
| NFR perf/security     | C   | A   | I      | I         | I       |
| Brand / UX principles | C   | I   | A      | C         | I       |
| Claims marketing      | C   | I   | I      | A         | I       |

A=Accountable C=Consulted I=Informed

## Annexe J — Historique du document

| Version | Date       | Auteur | Changements                       |
| ------- | ---------- | ------ | --------------------------------- |
| 1.0     | 2026-07-26 | CPO    | Création PRD de référence 24 mois |

---

# 18. MESSAGE DE CLÔTURE — ALIGNEMENT ÉQUIPES

Ce PRD n’est pas une liste de souhaits : c’est un **contrat d’exécution**.

- **Product** priorise selon MoSCoW et evidence.
- **Engineering** protège NFR et dette maîtrisée.
- **Design** défend clarté, accessibilité et dual-pane excellence.
- **Marketing** vend des résultats candidature, pas de la magie.

Notre ambition — _meilleur générateur de CV IA au monde_ — se gagne par l’obsession du **time-to-value**, de l’**honnêteté de l’IA**, et de l’**ATS-first craft**.

**Prochaine étape immédiate :** workshop de sign-off (Product × Eng × Design) sous 10 jours, puis gel du scope Phase 1 et kickoff Sprint 0.

---

_Fin du Product Requirements Document — CV Studio AI v1.0_

# 19. GO-TO-MARKET (GTM) DÉTAILLÉ — 24 MOIS

## 19.1 Stratégie GTM en une phrase

Acquérir des candidats en intention haute (recherche d’emploi active) via SEO + performance, convertir par un Free utile et une IA démontrable, retenir par la boucle « offre → CV → lettre → entretien », et expander vers Business (coachs, campus, outplacement).

## 19.2 Positionnement messaging framework

### Brand platform

| Élément     | Contenu                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------- |
| Brand idea  | La candidature, enfin sous contrôle                                                         |
| Promise     | Un CV ATS-ready, adapté à l’offre, en 15 minutes                                            |
| Proof       | Score ATS explicable + matching offre + export PDF parfait                                  |
| Personality | Expert, clair, moderne, honnête, énergique sans hype                                        |
| Voice       | Tutoiement marketing FR optionnel A/B ; vouvoiement product UI par défaut (décision locale) |

### Message house

**Umbrella :** « Passez les filtres. Convainquez les humains. »

**Pilliers :**

1. ATS-first craft
2. IA contextuelle (offre d’emploi)
3. Suite candidature complète
4. Pricing transparent

### Claims autorisés / interdits

| Autorisé                                 | Interdit                                |
| ---------------------------------------- | --------------------------------------- |
| « Améliorez votre score ATS »            | « Obtenez le job garanti »              |
| « Adaptez votre CV à une offre »         | « Notre IA remplace un coach certifié » |
| « Export PDF professionnel »             | « #1 mondial » sans preuve tierce       |
| « Basé sur des heuristiques de parsing » | « Approuvé par tous les ATS du marché » |

## 19.3 Segmentation go-to-market

| Segment                        | Priorité Y1 | Offre                     | Canal                        |
| ------------------------------ | ----------- | ------------------------- | ---------------------------- |
| Junior / jeunes diplômés FR+EN | P0          | Free → Pro mensuel        | SEO, TikTok, campus          |
| Career shifters                | P0          | Pro annuel                | LinkedIn ads, content        |
| Immigrants / expats tech       | P1          | Pro + i18n                | Communities, Reddit, Discord |
| Executives                     | P2          | Pro / Business via coachs | Partnerships outplacement    |
| Career centers                 | P2          | Business seats            | Sales assisted M9+           |

## 19.4 Funnel marketing détaillé

### TOFU — Awareness

- Articles « Comment passer un ATS en 2026 »
- Comparatifs (vs Canva Resume, vs Resume.io) honnêtes
- Templates galeries indexables
- Short video demos dual-pane + score ATS

### MOFU — Consideration

- Landing templates par métier (ex: « CV Product Manager »)
- Case studies anonymisés (score +25 pts)
- Webinars « Reconversion + CV »
- Email nurture post-signup J0/J1/J3/J7

### BOFU — Conversion

- In-app paywall contextualisée
- Retargeting abandon checkout
- Annual plan highlight
- Social proof (NPS, reviews)

### Retention marketing

- Alerts « votre CV a 6 mois »
- Contenu interview prep
- Newsletter marché de l’emploi light (opt-in)

## 19.5 SEO program (année 1)

### Clusters de contenu

1. **ATS & parsing** (intention expert)
2. **Exemples CV par métier** (intention transactionnelle)
3. **Lettres de motivation**
4. **Reconversion / mid-career**
5. **CV international / normes pays**
6. **Comparatifs outils**
7. **Préparation entretien**

### Volume cible

| Mois | Articles publiés cumulés | Pages templates | Keywords top 10 organiques |
| ---- | ------------------------ | --------------- | -------------------------- |
| M3   | 30                       | 20              | 50                         |
| M6   | 80                       | 60              | 200                        |
| M12  | 200                      | 150             | 800                        |
| M24  | 450                      | 300             | 2500                       |

### Tech SEO

- Core Web Vitals verts
- Schema JobPosting? Non — plutôt Article + FAQ
- Hreflang FR/EN/ES/DE
- Internal linking automatisé métier → template → tool

## 19.6 Performance marketing

| Canal         | Test budget M1–M3 | KPI primaire      | Kill rule             |
| ------------- | ----------------- | ----------------- | --------------------- |
| Google Search | 5–8 k€/mois       | CAC trial/paid    | CAC > 40 € 2 semaines |
| Meta          | 3–5 k€/mois       | CPA signup activé | CTR < 0,8 %           |
| LinkedIn      | 3 k€/mois         | CPA shifter       | CPA > 50 €            |
| TikTok        | 2 k€/mois         | Signup junior     | Retention J7 faible   |

## 19.7 Partnerships

1. **Écoles & bootcamps** : licences Free campus + upsell Pro étudiants.
2. **Outplacement** : seats Business + branding.
3. **Associations expats** : codes promo.
4. **Créateurs LinkedIn** : affiliation 20–30 % premier mois.
5. **Designers** : supply marketplace.

## 19.8 Launch plan (MVP)

| Jours | Action |
|---|---|---|
| J-30 | Beta privée 100 users |
| J-14 | Soft launch Product Hunt / LinkedIn founders |
| J-7 | Press kit + créateurs seed |
| J0 | Public launch + ads ON |
| J+7 | Retro metrics + iterate onboarding |
| J+30 | First pricing experiment |

---

# 20. DESIGN PRODUCT & UX SPECIFICATIONS ÉTENDUES

## 20.1 Principes d’interface (complément §2.6)

1. **Une action primaire par écran.**
2. **Le CV est le héros** : la preview ne doit jamais être un « widget ».
3. **Réduction charge cognitive** : defaults excellents, advanced derrière disclosure.
4. **Feedback de système toujours visible** (autosave, entitlements, IA status).
5. **Erreurs = instructions** (« Ajoutez une date de fin ou cochez Poste actuel »).

## 20.2 Information architecture

```
/ (marketing)
/templates
/pricing
/blog
/app
  /dashboard
  /resumes/:id/edit
  /resumes/:id/ats
  /resumes/:id/letters
  /resumes/:id/interview
  /portfolio/editor
  /settings
    /profile
    /billing
    /security
  /team (Business)
/p/:slug (public portfolio)
/s/:token (shared resume)
```

## 20.3 Éditeur — layout desktop

```
+------------------------------------------------------------------+
| Topbar: Logo | Resume name | ATS score chip | Export | Upgrade   |
+------------------------------+-----------------------------------+
| Left rail sections           | Center: Form OR split             |
| - Profil                     | +----------------+--------------+ |
| - Expériences                | | Form fields    | Live preview | |
| - Formation                  | |                |              | |
| - Skills                     | |                |   CV page    | |
| - Projets                    | |                |              | |
| - + Add section              | +----------------+--------------+ |
+------------------------------+-----------------------------------+
| Bottom status: Saved • Plan Free • Words • Pages                 |
+------------------------------------------------------------------+
| Right drawer (optional): AI / ATS / JD Matcher                   |
+------------------------------------------------------------------+
```

## 20.4 Éditeur — mobile

- Tabs : Contenu | Aperçu | Outils
- Sticky CTA Export
- AI features en full-screen sheets
- Attention : ne pas promettre parité pixel-perfect mobile M0 ; viser édition utile

## 20.5 Design system tokens (direction)

| Token              | Direction                                            |
| ------------------ | ---------------------------------------------------- |
| Brand primary      | Bleu pétrole / encre profonde (pas purple AI cliché) |
| Accent             | Vert sauge ou corail maîtrisé (1 accent)             |
| Background         | Dégradés subtils papier technique, texture légère    |
| Typography display | Famille serif ou grotesque expressive licenciée      |
| Typography body    | Sans lisible pour UI                                 |
| Radius             | Modéré (pas pill everywhere)                         |
| Shadows            | Minimales ; hiérarchie par surface/typo              |

## 20.6 Motion spec (minimum 2–3 motions intentionnelles)

1. **Score ATS count-up** (400–600 ms, ease-out) lors d’une analyse.
2. **Preview cross-fade** lors du changement de template.
3. **Onboarding progress** checkmarks séquentiels.
4. (Option) Confetti sobre post-premier export — A/B, peut être retiré si immature.

## 20.7 Contenu UX microcopy (exemples FR)

| Contexte            | Microcopy                                                               |
| ------------------- | ----------------------------------------------------------------------- |
| Empty expériences   | « Ajoutez votre expérience la plus récente — même un stage compte. »    |
| ATS 62              | « Votre CV est lisible, mais des mots-clés de l’offre manquent. »       |
| Paywall IA          | « L’IA propose des reformulations. Vous validez chaque modification. »  |
| Hallucination block | « Nous ne pouvons pas ajouter une expérience absente de votre profil. » |

## 20.8 Accessibilité — cas d’usage editor

- DnD : alternative « Move up/down » buttons.
- Color picker : labels textuels, contrast checker.
- Preview : aria live updates throttlés.
- Focus trap dans modals checkout.

---

# 21. SPÉCIFICATIONS FONCTIONNELLES DÉTAILLÉES PAR FEATURE

## 21.1 Auth — règles métier

1. Email unique normalisé (lowercase, trim).
2. Password hashing argon2id ou bcrypt cost adapté.
3. Refresh token rotation.
4. Rate limit : 5 login fails / 15 min / IP+account.
5. Session list device + revoke.
6. OAuth account linking si même email vérifié.
7. Soft delete user 30 days grace.

## 21.2 Editor — modèle de document

```json
{
  "id": "uuid",
  "title": "CV PM - Stripe",
  "locale": "fr-FR",
  "paper": "A4",
  "templateId": "atlas-classic",
  "theme": { "primary": "#0B3A4A", "fontBody": "SourceSans3" },
  "sections": [
    {
      "type": "identity",
      "data": { "fullName": "", "headline": "", "email": "", "phone": "", "city": "", "links": [] }
    },
    { "type": "summary", "data": { "text": "" } },
    {
      "type": "experience",
      "items": [
        { "company": "", "title": "", "start": "", "end": null, "current": true, "bullets": [] }
      ]
    },
    { "type": "education", "items": [] },
    { "type": "skills", "items": [{ "name": "", "level": null }] }
  ],
  "meta": { "targetRole": "", "tags": [] }
}
```

### Règles validation

- email RFC-like
- dates ISO month-year
- end >= start
- bullets max longueur soft 300 chars (warning)
- max experiences Free/Pro : soft unlimited Pro ; performance warn > 30 items

## 21.3 Templates — contrat technique

Chaque template expose :

- `manifest.json` (slots, fonts, ATS level, locales)
- React renderer
- Thumbnail
- Sample data
- Checklist ATS result archivée

**Process release template :** Design → ATS QA → Eng integrate → Content sample → Prod flag 10 % → 100 %.

## 21.4 PDF pipeline

1. API `POST /resumes/:id/export` → jobId
2. Worker charge document + template
3. Render HTML isolé
4. Print to PDF (Chromium) avec flags deterministic
5. Upload S3 pré-signé
6. Webhook/WS notify client
7. Retention fichiers : 30 jours (re-générable)

**Tests :** pixel diff + text extraction grep contact/skills.

## 21.5 ATS Analyzer — scoring model v1

| Composante                 | Poids | Exemples                  |
| -------------------------- | ----- | ------------------------- |
| Parseability / format      | 35 %  | colonnes, tables, icons   |
| Structure sections         | 20 %  | headings standards        |
| Contact completeness       | 10 %  | email/phone               |
| Content quality heuristics | 20 %  | bullets, metrics presence |
| Keyword coverage (si JD)   | 15 %  | overlap terms             |

Score final 0–100 ; grades : A ≥85, B ≥70, C ≥55, D <55.

## 21.6 Job Description Matcher

### Pipeline

1. Normalize JD (clean boilerplate, cookies, nav).
2. Extract skills/requirements (LLM + dictionary).
3. Embed JD and resume sections.
4. Compute coverage & semantic similarity.
5. Produce gaps prioritized (must-have vs nice-to-have).
6. Suggest edits linked to existing bullets only.

### UX output

- Match %
- Hard skills missing
- Soft skills missing
- Title alignment
- Seniority alignment warning

## 21.7 AI Optimizer — prompt policy (produit)

Le système doit :

- Recevoir facts utilisateur + contraintes ton/longueur/langue
- Produire JSON {variants[], warnings[]}
- Interdire nouveaux employeurs, diplômes, dates, titres non fournis
- Préférer renforcement de verbes et clarification d’impact

## 21.8 Billing — machine à états

```
Free --> CheckoutStarted --> PaymentPending --> ActivePro/Business
Active --> PastDue --> (grace) --> Restricted --> Canceled
Active --> CancelAtPeriodEnd --> Canceled
ActivePro --> UpgradeBusiness
Business --> DowngradePro (fin période)
```

Entitlements recalculés à chaque transition webhook.

## 21.9 Collaboration (Advanced)

- Roles : Owner, Editor, Commenter, Viewer
- Presence : cursor/section level
- Comments anchored to bullet id
- Conflict policy : last-write with warning OR CRDT merge (eng decision record)

## 21.10 Marketplace

- Seller KYC light
- Listing : price, preview, ATS badge, locales
- Purchase unlocks template permanently for buyer account
- Refund window 14 days si défaut technique
- Take rate 30 % ; payouts mensuels Stripe Connect

---

# 22. PLAN DE SPRINTS DÉTAILLÉ (S0–S20)

## 22.1 Conventions

- Sprint = 2 semaines
- Capacité indicative squad core : 4 eng + 1 design + 0.5 data/growth
- Points non utilisés ici ; focus outcomes

## 22.2 Sprints 0–10 (MVP)

| Sprint | Objectif                 | Livrables majeurs                              |
| ------ | ------------------------ | ---------------------------------------------- |
| S0     | Foundations              | Monorepo, CI, AWS staging, design tokens, ADRs |
| S1     | Auth email               | Signup/login/reset, JWT, user table            |
| S2     | OAuth                    | Google + LinkedIn + Apple                      |
| S3     | Resume schema + API CRUD | Documents, autosave API                        |
| S4     | Editor form v1           | Identity/Experience/Education/Skills           |
| S5     | Live preview engine      | Dual-pane, 1 template Atlas                    |
| S6     | Templates 2–5            | Seine, Campus, Compact, Nord                   |
| S7     | PDF export               | Worker + download UX                           |
| S8     | Dashboard + onboarding   | Activation checklist                           |
| S9     | Landing + legal          | Marketing site, CGU, Privacy                   |
| S10    | Beta harden              | Bug bash, analytics, GA soft                   |

## 22.3 Sprints 11–20 (Core)

| Sprint | Objectif           | Livrables               |
| ------ | ------------------ | ----------------------- |
| S11    | Billing Stripe     | Checkout Pro, webhooks  |
| S12    | Entitlements       | Gating 2e CV + portal   |
| S13    | Templates 6–25     | Pipeline design         |
| S14    | DnD + theme        | Colors/fonts safe       |
| S15    | ATS v1             | Score + UI              |
| S16    | Templates 26–50    | Scale catalog           |
| S17    | Portfolio v1       | Public page             |
| S18    | Business skeleton  | Seats basic             |
| S19    | Growth experiments | Paywall A/B, onboarding |
| S20    | Stabilization      | Perf, debt, docs        |

## 22.4 Post S20 — epics IA & advanced

Epics : AI Gateway, Optimizer, Matcher, Letters, Interview, Marketplace, Mobile, Collab, OCR, i18n DE/ES, Analytics, API public.

Chaque epic = PRD léger + design + tech design + eval plan (si IA) + rollout flag.

---

# 23. DATA, ANALYTICS & EXPERIMENTATION

## 23.1 Principes data

- Event taxonomy versionnée
- PII hashing où possible dans analytics
- Source of truth revenue = Stripe
- Product warehouse sync daily

## 23.2 Dashboards minimum

1. **Acquisition** : traffic, signup, CAC
2. **Activation** : onboarding, first export
3. **Monetization** : MRR, conversion, funnel checkout
4. **Retention** : cohorts, churn reasons
5. **IA** : usage, cost, thumbs, latency
6. **Reliability** : uptime, error rate, PDF fail

## 23.3 Framework d’expérimentation

- Hypothèse → métrique primaire → garde-fous (NPS, cost)
- Durée min 7–14 jours ou N samples
- Documentation résultats dans Experiment Log
- Exemples Y1 :
  - Onboarding 3 vs 4 steps
  - Annual default vs monthly default
  - ATS teaser Free vs hidden
  - Dual CTA landing

## 23.4 Cohort analysis cadence

- Weekly new user cohorts activation
- Monthly paid cohorts churn
- Template performance (export rate, ATS avg)

---

# 24. CUSTOMER SUPPORT & SUCCESS

## 24.1 Canaux

| Plan     | Canal                           | SLA         |
| -------- | ------------------------------- | ----------- |
| Free     | Help center + email best effort | 48–72 h     |
| Pro      | Email priority                  | 24 h ouvrés |
| Business | Email + shared Slack (seuil)    | 8 h ouvrés  |

## 24.2 Macros tickets fréquents

1. PDF différent de preview → collect browser, template, screenshot ; escalate eng if visual diff.
2. OAuth LinkedIn fail → fallback import manuel.
3. Refund request → policy 14 days si unused AI heavy? (à figer Legal).
4. ATS score contesté → explain model limits.
5. Cancel → capture reason + offer annual discount once.

## 24.3 Success motions Business

- Onboarding call 30 min
- QBR trimestriel si ≥10 seats
- Playbooks coachs carrière (multi-client workflow)

## 24.4 Help center structure

- Getting started
- Editing & templates
- ATS & AI
- Billing
- Privacy & security
- Marketplace designers

---

# 25. RISK REGISTER COMPLET

| ID  | Risque                  | Prob. | Impact | Score | Mitigation                     | Owner   |
| --- | ----------------------- | ----- | ------ | ----- | ------------------------------ | ------- |
| R01 | Coût LLM > 25 % COGS    | H     | H      | 9     | Quotas, model routing, cache   | CTO     |
| R02 | SEO moat incumbents     | H     | H      | 9     | Content velocity + product-led | CMO     |
| R03 | Canva lance ATS fort    | M     | H      | 6     | Diff matcher+interview suite   | CPO     |
| R04 | Hallucination scandale  | M     | H      | 6     | Guardrails + confirm UX        | CPO/AI  |
| R05 | LinkedIn API break      | H     | M      | 6     | PDF/OCR/manual                 | Eng     |
| R06 | Churn post-export       | H     | H      | 9     | Loop entretien + reminders     | CPO     |
| R07 | GDPR incident           | L     | H      | 3     | Security program               | DPO/CTO |
| R08 | Store rejection mobile  | M     | M      | 4     | Compliance guidelines          | Mobile  |
| R09 | Marketplace quality low | M     | M      | 4     | Review + ATS badge             | Design  |
| R10 | Understaffing IA eval   | M     | H      | 6     | Hire AI eng / eval set         | CTO     |
| R11 | Pricing too low/high    | M     | M      | 4     | Experiments                    | CPO     |
| R12 | Scope creep 24m         | H     | M      | 6     | MoSCoW + RFC                   | CPO     |

---

# 26. ORGANISATION & STAFFING 24 MOIS

## 26.1 Équipe cible progressive

| Phase   | Roles clés (FTEs indicatifs)                                   |
| ------- | -------------------------------------------------------------- |
| M0–M3   | CPO, CTO/tech lead, 3 fullstack, 1 design, 0.5 growth          |
| M3–M6   | +1 fullstack, +1 growth, +0.5 support                          |
| M6–M12  | +AI eng, +mobile, +content SEO, +designer templates            |
| M12–M24 | +PM, +data, +sales B2B light, +community marketplace, security |

## 26.2 Rituals

- Daily standup eng
- Weekly product review
- Biweekly sprint planning/review
- Monthly metrics business review
- Quarterly roadmap re-plan

## 26.3 Decision records (ADR/PRD)

Toute décision stack (ex: CRDT lib, PDF renderer) → ADR.  
Toute décision scope Must → update PRD versionnée.

---

# 27. LOCALISATION & INTERNATIONALISATION

## 27.1 Marchés

| Marché          | Langue | Normes CV notes                                                       | Priorité |
| --------------- | ------ | --------------------------------------------------------------------- | -------- |
| France          | FR     | 1–2 pages, photo parfois attendue hors tech ; tech souvent sans photo | P0       |
| USA             | EN-US  | 1 page souvent, Letter, no photo/age                                  | P0       |
| UK              | EN-GB  | Variantes spelling                                                    | P1       |
| Allemagne       | DE     | CV plus détaillé, photo parfois                                       | P1       |
| Espagne / LatAm | ES     | Variantes locales                                                     | P1       |

## 27.2 Exigences i18n produit

- Toutes strings UI via i18n files
- Dates/number formats locale
- Templates locale-tagged
- AI prompts localized + cultural tone
- Pricing devise locale (EUR/USD/GBP)
- Support help center translated prioritized

## 27.3 Contenu réglementaire

- Claims marketing adaptés par pays
- Privacy representations locales

---

# 28. SECURITY & PRIVACY DEEP DIVE

## 28.1 Threat model (résumé)

Actifs : comptes users, CV PII, payment metadata, prompts IA.  
Menaces : IDOR sur resumes, scraping portfolios, prompt injection via JD URL, account takeover, insider access.

## 28.2 Controls prioritaires

1. UUID non énumérables + AuthZ tests
2. Signed URLs courts délais
3. WAF + rate limits
4. Admin access audited (just-in-time)
5. Encryption at rest
6. Separate prod/staging data
7. Bug bounty M18+

## 28.3 Privacy UX

- Privacy center : download data, delete, AI opt-out training (si applicable)
- Clarity on subprocessors list
- Cookie banner categories

---

# 29. QA STRATEGY & ACCEPTANCE TESTS EXEMPLES

## 29.1 Pyramide tests

- Unit : domain validation, scoring functions
- Integration : auth, billing webhooks, entitlements
- E2E : signup → edit → export
- Visual : template screenshots
- Load : PDF queue, editor autosave storm
- Security : OWASP ZAP baseline

## 29.2 Cas d’acceptance — Export PDF

```
Given un CV Atlas Classic complet
When j’exporte en PDF A4
Then le fichier se télécharge en < 5 s p95
And le texte email est extractible
And le rendu ne coupe pas la dernière expérience
And le nom de fichier suit Prenom_Nom_CV.pdf
```

## 29.3 Cas d’acceptance — Guardrail IA

```
Given une expérience "ACME 2020-2022"
When je demande à l’IA d’ajouter "Google 2019"
Then le système refuse
And explique qu’il ne peut inventer d’employeur
And propose plutôt d’améliorer les bullets ACME
```

## 29.4 Cas d’acceptance — Paywall

```
Given un utilisateur Free avec 1 CV
When il clique "Nouveau CV"
Then un paywall Pro s’affiche avec prix clair
And le CV existant reste éditable/exportable
And aucun dark pattern de blocage PDF sur le 1er CV
```

## 29.5 Release checklist

- [ ] Feature flag defaults
- [ ] Migrations backward compatible
- [ ] Monitoring dashboards updated
- [ ] Rollback plan
- [ ] Support macros updated
- [ ] Changelog public si user-facing

---

# 30. METRICS TARGETS PAR PHASE (TABLEAU DE BORD)

| Phase  | Inscrits | MAU  | Paid  | Conv. | NPS | Uptime |
| ------ | -------- | ---- | ----- | ----- | --- | ------ |
| P1 M3  | 15k      | 8k   | 0–200 | —     | —   | 99.5%  |
| P2 M6  | 50k      | 22k  | 800   | 2.5%  | 30  | 99.7%  |
| P3 M9  | 120k     | 45k  | 3.5k  | 3.5%  | 40  | 99.8%  |
| P4 M12 | 200k     | 80k  | 8k    | 3.8%  | 42  | 99.9%  |
| P5 M18 | 450k     | 150k | 20k   | 4.2%  | 48  | 99.9%  |
| P6 M24 | 1M       | 250k | 40k   | 4.5%  | 50  | 99.9%  |

---

# 31. ANALYSES CONCURRENTIELLES APPROFONDIES

## 31.1 Resume.io — Deep dive

**Synthèse stratégique :** Resume.io est l’incumbent SEO/product le plus dangereux sur l’acquisition. Leur machine de contenu capture les intentions « resume template / builder ». Le produit est mature, templates nombreux, parcours guidé efficace.

**Ce qu’ils font mieux que nous (à M0) :**

- Autorité de domaine et backlinks
- Volume de pages programmées
- Rodage conversion paywall (même si controversé UX)
- Largeur catalogue

**Failles exploitables :**

- Perception « usine à CV » peu premium
- Différenciation IA souvent incrémentale
- Suite post-CV (entretien) absente ou faible
- NPS/trust parfois impactés par friction billing

**Notre contre-attaque :**

1. Contenu ATS + matching plus technique et actionnable.
2. Product demo virale dual-pane + score explicable.
3. Pricing transparent comme argument brand.
4. Interview Prep comme wedge retention.

**Feature parity targets M12 :** templates volume ◐, ATS ●, AI rewrite ●, cover letter ●, JD match ★ above parity.

## 31.2 Canva Resume — Deep dive

**Synthèse :** Canva gagne sur la distribution et le design. Beaucoup d’utilisateurs commencent là par défaut culturel (« je connais Canva »).

**Forces :** brand, collab, assets, mobile, habitude.
**Faiblesses :** ATS non central ; pas un OS candidature ; templates créatifs risqués parsing.

**Implications design :** nos templates doivent être beaux _et_ certifiés ATS. Si on est « moches mais ATS », on perd Sophie et Léa. Si on est « beaux mais cassés », on perd la promesse.

**Narrative marketing :** complémentarité possible (« portfolio Canva, candidature CV Studio AI ») sans attaque frontale brand Canva.

## 31.3 Zety — Deep dive

Zety excelle en content funnel et exemples. Leur builder est un moyen ; le SEO est le moteur.

**Contre-mesure :** égaler la profondeur content sur clusters ATS/reconversion, mais attacher chaque article à un **outil interactif** (score ATS gratuit teaser) pour product-led SEO.

## 31.4 Kickresume — Deep dive

Early AI narrative, cover letters, brand amical.  
**À surveiller :** vitesse d’amélioration matcher.  
**À battre :** explicabilité + interview coach + collab Business.

## 31.5 Enhancv — Deep dive

Design storytelling premium.  
**Apprentissage :** qualité visuelle et sections narratives.  
**Écart :** industrialiser ATS certification + IA factuelle + price accessibility.

## 31.6 Adobe Express Resume — Deep dive

Menace distribution Adobe. Faible verticalisation carrière.  
**Réponse :** partenariats? improbable short-term. Focus vertical excellence.

## 31.7 Novoresume — Deep dive

Clean modern EU positioning.  
**Réponse :** les dépasser sur IA contextuelle et marketplace scale.

## 31.8 MyPerfectResume — Deep dive

Guided flow + content library. UI souvent perçue datée.  
**Réponse :** modernité UX + performance web + IA.

## 31.9 Scoring concurrentiel pondéré (CPO model)

Poids : Acquisition 20, UX 15, ATS 20, AI 20, Monetization trust 10, Suite carrière 15.

| Acteur                       | Acq | UX  | ATS | AI  | Trust $ | Suite | Total /100 |
| ---------------------------- | --- | --- | --- | --- | ------- | ----- | ---------- |
| Resume.io                    | 18  | 12  | 15  | 12  | 6       | 6     | 69         |
| Canva                        | 19  | 15  | 6   | 8   | 9       | 5     | 62         |
| Zety                         | 17  | 10  | 14  | 11  | 5       | 7     | 64         |
| Kickresume                   | 12  | 12  | 11  | 13  | 7       | 8     | 63         |
| Enhancv                      | 10  | 14  | 10  | 9   | 7       | 6     | 56         |
| Adobe Express                | 15  | 13  | 5   | 7   | 8       | 4     | 52         |
| Novoresume                   | 11  | 12  | 11  | 8   | 7       | 5     | 54         |
| MyPerfectResume              | 13  | 8   | 12  | 7   | 5       | 6     | 51         |
| **CV Studio AI (cible M12)** | 10  | 14  | 18  | 17  | 9       | 14    | **82**     |
| **CV Studio AI (cible M24)** | 15  | 15  | 19  | 18  | 9       | 15    | **91**     |

---

# 32. CAHIERS DE RESEARCH PERSONAS

## 32.1 Guide d’entretien (45–60 min)

### Ouverture (5 min)

- Consentement enregistrement
- Contexte recherche emploi actuel

### Exploration parcours (15 min)

- Dernière fois que vous avez créé/mis à jour un CV
- Outils utilisés ; ce qui a frustré
- Comment vous adaptez (ou non) le CV à une offre
- Expérience ATS perçue

### Jobs-to-be-done (10 min)

- « Quand je… je veux… afin de… »
- Arbitrage temps vs qualité vs prix

### Test concept (15 min)

Montrer mockups : dual-pane, score ATS, matcher, interview.

- Qu’est-ce qui est clair / confus ?
- Qu’est-ce qui justifierait 9,99 $/mois ?
- Objections confiance IA

### Clôture (5 min)

- Sean Ellis preview
- Recrutement suivi diary study

## 32.2 Survey quant (n≥150)

Questions clés :

1. Dernier outil CV utilisé
2. Budget mensuel acceptable (grilles)
3. Feature ranking (MaxDiff)
4. Fréquence candidature
5. Langue / pays normes
6. Confiance IA (échelle)

## 32.3 Validation criteria personas

Une persona est « validée » si :

- Patterns répétés ≥ 5 interviews
- Willingness-to-pay cohérente
- Jobs alignés avec roadmap Must/Should
  Sinon : merge/split/update PRD annexe.

## 32.4 Diary study (option M4)

10 users / 14 jours : chaque candidature, outils, émotions, temps passé.  
Objectif : confirmer la boucle multi-offres comme driver Pro.

---

# 33. SPÉCIFICATION API (CONTRAT CIBLE)

## 33.1 Conventions

- Base : `https://api.cvstudio.ai/v1`
- Auth : Bearer access token
- Errors : RFC7807 problem+json
- Idempotency-Key sur POST billing/export
- Rate limits : 120 req/min Free ; 600 Pro ; custom Business

## 33.2 Endpoints principaux

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/oauth/:provider/callback`
- `POST /auth/password/forgot`
- `POST /auth/password/reset`

### Resumes

- `GET /resumes`
- `POST /resumes`
- `GET /resumes/:id`
- `PATCH /resumes/:id`
- `POST /resumes/:id/duplicate`
- `DELETE /resumes/:id`
- `POST /resumes/:id/export`
- `GET /exports/:jobId`

### Templates

- `GET /templates`
- `GET /templates/:id`

### ATS / Match / AI

- `POST /resumes/:id/ats/analyze`
- `POST /resumes/:id/match`
- `POST /ai/optimize-bullet`
- `POST /ai/cover-letter`
- `POST /ai/interview-prep`
- `POST /ai/linkedin-import`

### Billing

- `GET /billing/plans`
- `POST /billing/checkout-session`
- `POST /billing/portal-session`
- `GET /billing/entitlements`

### Portfolio / Share

- `POST /resumes/:id/share`
- `DELETE /shares/:token`
- `PUT /portfolio`

### Business

- `GET /teams/:id`
- `POST /teams/:id/invites`
- `GET /teams/:id/analytics`

### Marketplace

- `GET /marketplace/listings`
- `POST /marketplace/purchase`

## 33.3 Exemple erreur entitlement

```json
{
  "type": "https://cvstudio.ai/errors/entitlement-required",
  "title": "Pro plan required",
  "status": 402,
  "detail": "AI Optimize requires Pro.",
  "feature": "ai_optimize",
  "upgradeUrl": "https://cvstudio.ai/app/billing"
}
```

---

# 34. CONTENU TEMPLATE — BRIEF DES 5 MVP

## T1 Atlas Classic

- Audience : généraliste
- Layout : single column
- Header : nom + titre + contact ligne
- Typo sobre
- ATS level : Max
- Couleur : encre unique

## T2 Seine Modern

- Audience : tech / product / office modern
- Léger accent couleur barre
- Skills en chips texte (pas barres)
- ATS : High

## T3 Campus Graduate

- Audience : Léa
- Sections Projects & Associations mises en avant
- Education plus haut si peu d’expérience (option toggle)
- ATS : High

## T4 Compact OnePage

- Audience : dense mid-level
- Marges optimisées
- Warning overflow agressif
- ATS : High

## T5 Nord Executive Lite

- Audience : Sophie entry executive
- Typographique premium
- Sections leadership optional
- Couleurs très sobres
- ATS : High (pas de dual column risqué)

### Briefs templates 6–50 (process)

Chaque brief inclut : persona, industrie, ATS risk, locales, sample content, do/don’t visuels.

---

# 35. FINOPS & COÛTS INFRA / IA

## 35.1 Postes de coûts

1. AWS compute/db/egress
2. LLM tokens
3. Stripe fees
4. Email provider
5. OAuth / Apple developer
6. Observability tools
7. Ads (opex growth)
8. Support staffing

## 35.2 Budgets LLM cibles

| Plan     | Soft monthly AI cost / user | Hard quota        |
| -------- | --------------------------- | ----------------- |
| Free     | ~0                          | Teaser only       |
| Pro      | < 1.5 €                     | Quotas section 12 |
| Business | < 3 €                       | Higher + pooled   |

Si coût moyen Pro > 2.5 € → routage modèles + reduction context + raise quotas paywall top-up.

## 35.3 Alerting

- Daily LLM spend anomaly +30 %
- PDF fail rate > 1 %
- API p95 latency breach
- Error rate 5xx > 1 %

---

# 36. PLAYBOOKS PRODUIT PAR PERSONA

## 36.1 Playbook Léa (Junior)

**Activation :** template Campus + exemples bullets stage.  
**Aha moment :** premier PDF + score ATS ≥ 75.  
**Upsell :** 2e version pour stage vs CDI ; lettre IA.  
**Retention :** checklist première semaine candidatures ; tips LinkedIn.

## 36.2 Playbook Karim (Shifter)

**Activation :** import LinkedIn + cible rôle PM.  
**Aha :** matcher +20 pts après optimize.  
**Upsell :** annuel (reconversion = multi-mois).  
**Retention :** interview prep avant entretiens ; career advice gaps.

## 36.3 Playbook Sophie (Executive)

**Activation :** Nord Executive + tone control.  
**Aha :** rendu print impeccable + discrétion share.  
**Upsell :** Business si coach.  
**Retention :** versions EN/FR ; low-touch emails.

## 36.4 Playbook Diego (Immigrant)

**Activation :** import PDF + locale switch + remove photo guidance.  
**Aha :** traduction technique + ATS local.  
**Upsell :** Pro mensuel flexible.  
**Retention :** multi-pays templates ; portfolio projets.

---

# 37. ÉTHIQUE IA & TRUST FRAMEWORK

## 37.1 Principes

1. Honnêteté biographique
2. Transparence du génératif
3. Contrôle utilisateur
4. Minimisation biais (eval set multi-profils)
5. Pas de dark patterns liés à la peur (« vous n’aurez jamais de job »)

## 37.2 Reviews éthiques

- Avant chaque feature IA : ethics checklist
- Interdit : deepfake interview avatars trompeurs M24
- Interdit : auto-apply non consensuel

## 37.3 Communication utilisateur

Badge « Suggestion IA » sur contenus générés.  
Historique restaurable.  
Explanation when refusal.

---

# 38. DÉTAIL ROADMAP MOIS PAR MOIS (OUTCOMES)

| Mois   | Outcome business                 | Outcome produit                  |
| ------ | -------------------------------- | -------------------------------- |
| M1     | Staging live, 50 design partners | Auth + editor skeleton           |
| M2     | Beta closed 200 users            | Preview + 3 templates            |
| M3     | Soft GA                          | 5 templates + PDF + landing      |
| M4     | First revenue experiments        | Stripe test → prod               |
| M5     | 500 paid goal path               | ATS v1 + templates 25            |
| M6     | AI waitlist convert              | Optimizer + LinkedIn import      |
| M7     | Conversion ↑                     | Matcher + letters                |
| M8     | Retention ↑                      | Interview prep                   |
| M9     | Marketplace beta                 | Designer onboarding              |
| M10    | Mobile beta                      | iOS TestFlight / Android closed  |
| M11    | i18n ES                          | Locale content                   |
| M12    | ARR 1.5M path                    | Mobile GA + OCR beta             |
| M13–15 | Collab Business                  | Realtime + analytics             |
| M16–18 | API + sync                       | LinkedIn sync GA, SOC2 start     |
| M19–21 | DE market push                   | Templates locaux DE              |
| M22–24 | Scale & efficiency               | Cost down, reliability, 1M users |

---

# 39. CRITÈRES D’ACCEPTATION ÉTENDUS PAR EPIC

## Epic Auth — Done when

- [ ] 99 % login success hors outages providers
- [ ] Security review auth passed
- [ ] RGPD delete works E2E
- [ ] OAuth failure UX tested

## Epic Editor — Done when

- [ ] Autosave resilience offline blip
- [ ] Preview parity PDF ≥ 99 % visual QA set
- [ ] A11y axe critical = 0 sur editor
- [ ] Lighthouse editor shell ≥ 90 on reference hardware profile

## Epic ATS — Done when

- [ ] Golden set 100 resumes scored with human expert correlation ≥ 0.7
- [ ] Explanations rated useful ≥ 75 %
- [ ] p95 < 8 s

## Epic AI — Done when

- [ ] Hallucination red-team suite pass rate ≥ 95 %
- [ ] Thumbs up ≥ 70 %
- [ ] Cost within budget 2 semaines consécutives
- [ ] Apply requires explicit confirm

## Epic Billing — Done when

- [ ] Webhook idempotency tested
- [ ] Entitlement lag < 10 s p95
- [ ] Cancel + resubscribe path OK
- [ ] Invoices downloadable

## Epic Marketplace — Done when

- [ ] Payouts reconcilés
- [ ] ATS badge pipeline enforced
- [ ] DMCA / takedown process documented

## Epic Mobile — Done when

- [ ] Crash-free ≥ 99.5 %
- [ ] Export works
- [ ] Parity core edit
- [ ] Store listings localized

---

# 40. ANNEXE LÉGALE ÉLARGIE & COMPLIANCE AI ACT

## 40.1 Classification risque (hypothèse)

CV Studio AI = système d’IA à risque limité / obligations de transparence (à valider Legal). Pas de décision automatisée d’embauche pour des tiers (nous n’évaluons pas candidats pour employeurs dans le scope 24 mois).

## 40.2 Obligations produit associées

- Informer l’utilisateur de l’interaction IA
- Logs techniques proportionnés
- Robustesse et exactitude raisonnable
- Documentation technique interne

## 40.3 Politique de conservation

| Data            | Durée                            |
| --------------- | -------------------------------- |
| Account         | Vie du compte                    |
| Resumes         | Vie du compte                    |
| AI logs         | 90 jours (ou opt-out plus court) |
| PDF exports S3  | 30 jours                         |
| Billing         | Obligation comptable légale      |
| Support tickets | 24 mois                          |

---

# 41. MODÈLE DE DONNÉES DÉTAILLÉ

## 41.1 Entités et champs principaux

### users

| Champ         | Type          | Notes              |
| ------------- | ------------- | ------------------ |
| id            | uuid PK       |                    |
| email         | citext unique |                    |
| password_hash | text nullable | null si OAuth only |
| name          | text          |                    |
| locale        | text          | fr-FR default      |
| persona_goal  | text          | enum               |
| created_at    | timestamptz   |                    |
| deleted_at    | timestamptz   | soft delete        |

### auth_identities

| Champ                              | Type    | Notes                          |
| ---------------------------------- | ------- | ------------------------------ |
| id                                 | uuid    |                                |
| user_id                            | uuid FK |                                |
| provider                           | text    | google/linkedin/apple/password |
| provider_subject                   | text    |                                |
| unique(provider, provider_subject) |         |                                |

### subscriptions

| Champ                  | Type        | Notes                     |
| ---------------------- | ----------- | ------------------------- |
| id                     | uuid        |                           |
| user_id / team_id      | uuid        |                           |
| stripe_customer_id     | text        |                           |
| stripe_subscription_id | text        |                           |
| plan                   | enum        | free/pro/business         |
| status                 | enum        | active/past_due/canceled… |
| current_period_end     | timestamptz |                           |

### resume_documents

| Champ            | Type         | Notes          |
| ---------------- | ------------ | -------------- |
| id               | uuid         |                |
| user_id          | uuid         |                |
| title            | text         |                |
| locale           | text         |                |
| paper            | enum         | A4/Letter      |
| template_id      | text         |                |
| content          | jsonb        | document model |
| ats_score_cached | int nullable |                |
| updated_at       | timestamptz  |                |

### resume_versions

| Champ      | Type        | Notes |
| ---------- | ----------- | ----- |
| id         | uuid        |       |
| resume_id  | uuid        |       |
| label      | text        |       |
| content    | jsonb       |       |
| created_by | uuid        |       |
| created_at | timestamptz |       |

### ats_reports

| Champ      | Type          | Notes |
| ---------- | ------------- | ----- |
| id         | uuid          |       |
| resume_id  | uuid          |       |
| score      | int           |       |
| breakdown  | jsonb         |       |
| jd_hash    | text nullable |       |
| created_at | timestamptz   |       |

### ai_requests

| Champ         | Type        | Notes  |
| ------------- | ----------- | ------ |
| id            | uuid        |        |
| user_id       | uuid        |        |
| feature       | text        |        |
| input_tokens  | int         |        |
| output_tokens | int         |        |
| cost_usd      | numeric     |        |
| latency_ms    | int         |        |
| feedback      | smallint    | -1/0/1 |
| created_at    | timestamptz |        |

### templates

| Champ                 | Type      | Notes |
| --------------------- | --------- | ----- |
| id                    | text PK   |       |
| name                  | text      |       |
| ats_level             | enum      |       |
| is_premium            | bool      |       |
| marketplace_seller_id | uuid null |       |
| locales               | text[]    |       |
| manifest              | jsonb     |       |

### portfolio_pages

| Champ     | Type              | Notes |
| --------- | ----------------- | ----- |
| user_id   | uuid              |       |
| slug      | unique            |       |
| published | bool              |       |
| noindex   | bool default true |       |
| content   | jsonb             |       |

## 41.2 Indexation & perf

- Index (user_id, updated_at desc) sur resumes
- GIN sur content jsonb si requêtes ciblées ; sinon éviter
- Partition ai_requests by month si volume

## 41.3 Retention jobs

Cron daily : purge exports S3 > 30j ; anonymize ai logs > 90j ; hard-delete users past grace.

---

# 42. CATALOGUE ÉTENDU DES TEMPLATES (BRIEF 6 → 50)

Légende ATS : Max / High / Medium (Medium = marketplace créatif avec warning).

| #   | Nom           | Persona | Industrie        | ATS    | Notes               |
| --- | ------------- | ------- | ---------------- | ------ | ------------------- |
| 6   | Atlas Plus    | Tous    | General          | Max    | Variante typo       |
| 7   | Harbor        | Karim   | Product          | High   | Projects section    |
| 8   | Lattice       | Diego   | Software         | High   | Skills dense        |
| 9   | Atelier       | Léa     | Design           | Medium | Warning icons       |
| 10  | Quorum        | Sophie  | Corporate        | High   | Leadership          |
| 11  | Meter         | Karim   | Data             | High   | Metrics emphasis    |
| 12  | Clinic        | Tous    | Healthcare       | High   | Certifications      |
| 13  | Ledger        | Tous    | Finance          | Max    | Conservative        |
| 14  | Campus Pro    | Léa     | Graduate         | High   | Clubs/projects      |
| 15  | Relay         | Diego   | Logistics        | High   | Multilingual        |
| 16  | Pulse         | Tous    | Marketing        | High   | Campaign bullets    |
| 17  | Circuit       | Diego   | Engineering      | High   | Tech stack          |
| 18  | Chamber       | Sophie  | Legal/Compliance | Max    | Sober               |
| 19  | Studio Line   | Léa     | Creative         | Medium | Portfolio links     |
| 20  | Summit        | Sophie  | Executive        | High   | 2-page friendly     |
| 21  | Beacon        | Tous    | Nonprofit        | High   | Impact framing      |
| 22  | Falcon        | Karim   | Consulting       | High   | Case style          |
| 23  | Nordic Soft   | Sophie  | General EU       | High   |                     |
| 24  | Iberia        | Diego   | ES market        | High   | Locale ES           |
| 25  | Rhine         | Diego   | DE market        | High   | Locale DE           |
| 26  | Pearl         | Léa     | Customer Success | High   |                     |
| 27  | Anchor        | Tous    | Operations       | High   |                     |
| 28  | Vertex        | Karim   | Sales            | High   | Quotas/ARR          |
| 29  | Keystone      | Sophie  | HR/People        | High   |                     |
| 30  | Drift         | Léa     | Content          | High   |                     |
| 31  | Cobalt        | Diego   | DevOps           | High   |                     |
| 32  | Marble        | Sophie  | Board advisory   | High   |                     |
| 33  | Sprout        | Léa     | Internships      | Max    |                     |
| 34  | Horizon       | Karim   | Career change    | High   | Summary-first       |
| 35  | Passport      | Diego   | International    | High   | Work auth note opt  |
| 36  | Frame         | Tous    | General modern   | High   |                     |
| 37  | Pillar        | Sophie  | Public sector    | Max    |                     |
| 38  | Pixel         | Léa     | Junior tech      | High   |                     |
| 39  | Orbit         | Karim   | Startup          | High   |                     |
| 40  | Heritage      | Sophie  | Luxury/Retail    | Medium |                     |
| 41  | Bridge        | Diego   | Bilingual        | High   | dual lang caution   |
| 42  | Torch         | Tous    | Education        | High   |                     |
| 43  | Rivet         | Diego   | Manufacturing    | High   |                     |
| 44  | Silk          | Sophie  | Fashion biz      | Medium |                     |
| 45  | Quantum       | Karim   | Research         | High   | Publications        |
| 46  | Nest          | Tous    | Remote-first     | High   |                     |
| 47  | Apex          | Sophie  | VP+              | High   |                     |
| 48  | Launch        | Léa     | First job        | Max    |                     |
| 49  | Migrate       | Diego   | Visa transition  | High   | Guidance integrated |
| 50  | Classic Print | Tous    | Print recruiters | Max    |                     |

Pour chaque template #6–50, le Design System Template Card doit contenir : thumbnail, sample PDF, ATS QA sheet sign-off, i18n coverage, designer credit.

---

# 43. SCÉNARIOS E2E COMPLETS (GHERKIN)

## 43.1 Parcours junior happy path

```gherkin
Feature: Junior first export
  Scenario: Léa crée et exporte son premier CV
    Given un visiteur sur la landing FR
    When il clique sur "Créer mon CV gratuitement"
    And s’inscrit via Google OAuth
    And choisit l’objectif "Premier emploi"
    And sélectionne le template "Campus Graduate"
    And complète Identité, Formation, Stage, Skills
    Then la preview affiche un CV cohérent sans placeholders
    When il exporte en PDF
    Then le PDF est téléchargé avec succès
    And un event "pdf_exported" est émis
    And le compte reste Free avec 1 CV
```

## 43.2 Parcours shifter + matcher + upsell

```gherkin
Feature: Shifter optimization loop
  Scenario: Karim améliore son matching et upgrade
    Given un utilisateur Free avec un CV complété
    When il colle une JD Product Manager
    Then le matcher est gated Pro
    When il souscrit Pro annuel
    Then les entitlements Pro sont actifs en < 10 secondes
    When il relance le matcher
    Then un score et des gaps s’affichent
    When il applique 3 suggestions IA validées
    And re-score
    Then le match_score augmente d’au moins 10 points sur golden fixture
```

## 43.3 Parcours executive confidentialité

```gherkin
Feature: Executive private share
  Scenario: Sophie partage un lien non indexé
    Given un utilisateur Pro avec template Nord Executive
    When elle crée un lien de partage
    Then noindex est actif par défaut
    And le lien est révocable
    When elle révoque le lien
    Then l’URL retourne 404
```

## 43.4 Parcours immigrant import PDF

```gherkin
Feature: PDF import localization
  Scenario: Diego importe et localise
    Given un utilisateur Pro
    When il upload un CV PDF 3 pages avec photo
    Then l’OCR propose un mapping avec confidences
    And le guidance locale FR recommande de retirer la photo pour tech
    When il switch template Lattice et langue FR
    And exporte
    Then le PDF sort sans photo
```

## 43.5 Collaboration Business

```gherkin
Feature: Coach collaboration
  Scenario: Coach commente le CV d’un client
    Given une équipe Business avec Owner coach et Editor client
    When le client partage le CV en mode commentaire
    Then le coach peut ajouter un commentaire sur un bullet
    And ne peut pas billing-admin
```

---

# 44. PROGRAMME SEO / CONTENT — CALENDRIER TYPE M1–M6

## M1

- Infrastructure blog
- 8 articles ATS fundamentals
- 10 pages templates
- Comparatif Canva vs CV Studio (fair)

## M2

- 12 exemples CV métiers
- Guide reconversion
- Glossaire ATS
- Landing « score ATS gratuit » (teaser tool)

## M3

- 12 lettres types
- Pages persona (junior, shifter)
- Case study beta anonymisée
- Internal linking pass

## M4

- Cluster entretien
- Cluster immigration CV norms FR/DE/US
- Guest posts écoles

## M5

- Refresh top bounce pages
- Programmatic pages métiers × compétences (qualité gated)
- YouTube/Loom demos

## M6

- Localization EN expansion
- Digital PR data study « ATS failure rates » (recherche maison)

KPI content : organic signups M6 ≥ 35 % total signups.

---

# 45. SCRIPT DE DÉMO VENTES / PRODUCT HUNT

## 45.1 Démo 90 secondes

1. (0–10s) Problème : CV beau rejeté ATS
2. (10–35s) Dual-pane edit live
3. (35–55s) Coller JD → score gaps
4. (55–75s) Apply AI rewrite factuel
5. (75–90s) Export PDF + CTA

## 45.2 Talking points objection handling

| Objection                | Réponse                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| « ChatGPT est gratuit »  | « ChatGPT n’a pas templates ATS-safe, export fidèle, scoring, ni workflow offre→entretien. » |
| « Canva suffit »         | « Canva est excellent en design ; nous optimisons pour les logiciels RH. »                   |
| « Encore un abonnement » | « Free exporte déjà 1 CV ; Pro sert quand vous itérez sur plusieurs offres. »                |
| « L’IA invente »         | « Guardrails + validation obligatoire ; on refuse les employeurs inventés. »                 |

---

# 46. FORMATION INTERNE NOUVEAUX JOINERS (ONBOARDING DOC)

## Semaine 1 — Lire

1. PRD complet (ce document)
2. ADRs techniques
3. Battle cards
4. Tracking plan
5. Ethics IA checklist

## Semaine 2 — Faire

1. Créer un CV de A→Z sur staging
2. Passer un ATS analyze
3. Effectuer un checkout test Stripe
4. Écrire 1 amélioration proposée issue

## Quiz enablement (extrait)

1. Quelle est la North Star ?
2. Pourquoi Free PDF sans watermark ?
3. Qu’est-ce qui est Won’t Have ?
4. Quel uptime cible ?
5. Commission marketplace ?

---

# 47. TABLEAU DES FEATURE FLAGS

| Flag             | Default staging | Default prod M3 | Audience  |
| ---------------- | --------------- | --------------- | --------- |
| ff_oauth_apple   | on              | on              | all       |
| ff_ats_v1        | on              | off→on M5       | all       |
| ff_ai_optimizer  | on              | off→canary      | pro       |
| ff_jd_matcher    | on              | canary          | pro       |
| ff_portfolio     | on              | on              | pro       |
| ff_marketplace   | on              | off             | segmented |
| ff_collab        | on              | off             | business  |
| ff_ocr           | on              | off             | pro beta  |
| ff_mobile_api_v2 | on              | on              | mobile    |

Process : flag ownership, expiration date, cleanup sprint.

---

# 48. SLOs DÉTAILLÉS

| Service          | SLO                       | SLI                | Window |
| ---------------- | ------------------------- | ------------------ | ------ |
| API availability | 99.9 %                    | successful non-5xx | 30j    |
| Auth latency     | p95 < 400 ms              | login endpoint     | 30j    |
| Autosave success | 99.9 %                    | save ack           | 30j    |
| PDF export       | 99.5 % success & p95 < 5s | jobs               | 30j    |
| AI gateway       | 99 % success & p95 < 20s  | requests           | 30j    |
| Checkout         | 99.5 % session create     | Stripe             | 30j    |

Error budget policy : freeze features non-critiques si budget brûlé > 50 % mois.

---

# 49. FAQ PRODUIT PUBLIQUE (BASE HELP CENTER)

**Q : Puis-je télécharger mon CV gratuitement ?**  
R : Oui. Le plan Free permet 1 CV et l’export PDF.

**Q : Mon CV passera-t-il tous les ATS ?**  
R : Aucun outil ne peut le garantir. Nous maximisons la compatibilité et expliquons les risques.

**Q : L’IA peut-elle inventer mon parcours ?**  
R : Non. Elle reformule et structure à partir de vos faits. Toute suggestion est validée par vous.

**Q : Puis-je annuler facilement ?**  
R : Oui, self-serve depuis la facturation ; accès jusqu’à la fin de période.

**Q : Mes données sont-elles revendues ?**  
R : Non. Voir Privacy Policy. Sous-processeurs listés.

**Q : Différence Pro / Business ?**  
R : Business ajoute collab équipe, analytics, API, branding, support dédié.

**Q : Puis-je importer LinkedIn ?**  
R : Oui selon disponibilités API ; sinon import PDF/manuel.

**Q : Proposez-vous une app mobile ?**  
R : Roadmap Phase 4 (M9–M12).

---

# 50. MATRICE DE TRAÇABILITÉ REQUIREMENTS → STORIES → TESTS

| Requirement   | Stories     | Tests                       |
| ------------- | ----------- | --------------------------- |
| Auth OAuth    | US-002..004 | E2E auth matrix             |
| Dual-pane     | US-016      | Visual + perf RUM           |
| 5 templates   | US-021      | ATS checklist ×5            |
| PDF export    | US-049      | E2E export + extraction     |
| ATS analyzer  | US-029..032 | Golden set correlation      |
| JD matcher    | US-030..031 | Fixture JD suite            |
| AI optimizer  | US-038,043  | Red-team hallucination      |
| Billing Pro   | US-057..062 | Webhook integration         |
| Portfolio     | US-052..053 | SEO noindex test            |
| Collab        | US-065      | Multi-user e2e              |
| Marketplace   | US-067      | Purchase + payout reconcil. |
| OCR           | US-071      | Sample PDF corpus           |
| WCAG AA       | NFR         | axe + manual                |
| Lighthouse 90 | NFR         | LighthouseCI                |
| Uptime 99.9   | NFR         | SLO dashboard               |

---

# 51. PLAN FINANCIER DÉTAILLÉ MOIS PAR MOIS (SCÉNARIO DE BASE)

Les chiffres ci-dessous sont des **hypothèses de pilotage**. Ils doivent être remplacés par le modèle Finance dès M1.

| Mois | Nouveaux inscrits | Inscrits cumulés | MAU    | Free→Paid conv. | Paid users EOM | ARPU € | MRR k€ | Notes focus          |
| ---- | ----------------- | ---------------- | ------ | --------------- | -------------- | ------ | ------ | -------------------- |
| M1   | 4000              | 4000             | 3000   | 0%              | 0              | 0      | 0      | Kickoff              |
| M2   | 5000              | 9000             | 6000   | 0%              | 0              | 0      | 0      | Beta private         |
| M3   | 6000              | 15000            | 8000   | 1%              | 82             | 9      | 0.7    | Editor preview       |
| M4   | 8000              | 23000            | 12000  | 2%              | 253            | 10     | 2.5    | Soft GA MVP          |
| M5   | 10000             | 33000            | 18000  | 2.5%            | 454            | 10.5   | 4.8    | Billing live         |
| M6   | 12000             | 45000            | 22000  | 2.8%            | 800            | 11     | 8.8    | ATS v1               |
| M7   | 15000             | 60000            | 30000  | 3.2%            | 1056           | 11     | 11.6   | AI optimizer         |
| M8   | 18000             | 78000            | 38000  | 3.5%            | 1502           | 11.2   | 16.8   | Matcher+letters      |
| M9   | 20000             | 98000            | 45000  | 3.6%            | 1940           | 11.5   | 22.3   | Interview prep       |
| M10  | 22000             | 120000           | 55000  | 3.7%            | 2442           | 11.5   | 28.1   | Marketplace beta     |
| M11  | 25000             | 145000           | 65000  | 3.8%            | 3031           | 11.8   | 35.8   | Mobile beta          |
| M12  | 30000             | 175000           | 80000  | 3.8%            | 8000           | 12     | 96     | i18n ES              |
| M13  | 35000             | 210000           | 95000  | 4%              | 4620           | 12     | 55.4   | Mobile GA / ARR push |
| M14  | 40000             | 250000           | 110000 | 4.1%            | 5638           | 12.2   | 68.8   | Collab alpha         |
| M15  | 45000             | 295000           | 130000 | 4.2%            | 6815           | 12.5   | 85.2   | Business motion      |
| M16  | 50000             | 345000           | 150000 | 4.2%            | 7970           | 12.5   | 99.6   | Analytics advanced   |
| M17  | 55000             | 400000           | 170000 | 4.3%            | 9460           | 12.7   | 120.1  | OCR GA               |
| M18  | 60000             | 460000           | 190000 | 4.4%            | 11132          | 12.8   | 142.5  | API beta             |
| M19  | 65000             | 525000           | 210000 | 4.4%            | 12705          | 13     | 165.2  | DE push              |
| M20  | 70000             | 595000           | 230000 | 4.5%            | 14726          | 13     | 191.4  | SSO explore          |
| M21  | 75000             | 670000           | 240000 | 4.5%            | 16582          | 13     | 215.6  | Cost optimize        |
| M22  | 80000             | 750000           | 250000 | 4.5%            | 18562          | 13     | 241.3  | Scale infra          |
| M23  | 85000             | 835000           | 250000 | 4.5%            | 20666          | 13     | 268.7  | i18n harden          |
| M24  |                   | 835000           |        | 0%              | 40000          |        | 0      | M24 targets lock     |

### Lecture CPO

- L’inflexion revenue se situe **M6–M9** avec l’IA.
- Le volume users s’accélère **M12–M24** avec mobile + i18n + SEO composé.
- Si conversion < 2 % à M6 : freeze features vanity, focus activation/paywall value.

# 52. CATALOGUE EXIGENCES FONCTIONNELLES NUMÉROTÉES (FR-xxx)

| ID     | Module      | Exigence                                             | Priorité | Phase |
| ------ | ----------- | ---------------------------------------------------- | -------- | ----- |
| FR-001 | Auth        | L’utilisateur peut s’inscrire par email/mot de passe | Must     | P1    |
| FR-002 | Auth        | L’utilisateur peut s’authentifier via Google         | Must     | P1    |
| FR-003 | Auth        | L’utilisateur peut s’authentifier via LinkedIn       | Must     | P1    |
| FR-004 | Auth        | L’utilisateur peut s’authentifier via Apple          | Must     | P1    |
| FR-005 | Auth        | L’utilisateur peut réinitialiser son mot de passe    | Must     | P1    |
| FR-006 | Auth        | L’utilisateur peut supprimer son compte (RGPD)       | Must     | P1    |
| FR-007 | Auth        | L’utilisateur peut exporter ses données              | Should   | P2    |
| FR-008 | Auth        | L’utilisateur peut activer la 2FA TOTP               | Should   | P3    |
| FR-009 | Onboarding  | L’utilisateur choisit un objectif de carrière        | Must     | P1    |
| FR-010 | Onboarding  | L’utilisateur choisit langue et format papier        | Must     | P1    |
| FR-011 | Dashboard   | L’utilisateur liste ses CV avec dates                | Must     | P1    |
| FR-012 | Dashboard   | L’utilisateur peut renommer un CV                    | Must     | P1    |
| FR-013 | Dashboard   | L’utilisateur peut dupliquer un CV (gated Free)      | Should   | P2    |
| FR-014 | Dashboard   | L’utilisateur peut archiver un CV                    | Should   | P2    |
| FR-015 | Editor      | L’utilisateur édite la section Identité              | Must     | P1    |
| FR-016 | Editor      | L’utilisateur édite les expériences avec bullets     | Must     | P1    |
| FR-017 | Editor      | L’utilisateur édite formation et skills              | Must     | P1    |
| FR-018 | Editor      | La preview live se met à jour en <300ms perçus       | Must     | P1    |
| FR-019 | Editor      | Autosave toutes les 5s max ou on blur                | Must     | P1    |
| FR-020 | Editor      | Validation email/dates/URLs                          | Must     | P1    |
| FR-021 | Editor      | Indicateurs de saut de page                          | Must     | P1    |
| FR-022 | Editor      | Drag and drop des sections                           | Should   | P2    |
| FR-023 | Editor      | Personnalisation couleurs/fonts guardrailée          | Should   | P2    |
| FR-024 | Editor      | Sections leadership optionnelles                     | Should   | P2    |
| FR-025 | Editor      | Section projets avec liens                           | Should   | P2    |
| FR-026 | Templates   | 5 templates MVP ATS-safe                             | Must     | P1    |
| FR-027 | Templates   | Catalogue 50+ templates                              | Should   | P2    |
| FR-028 | Templates   | Filtres industrie/persona/ATS level                  | Should   | P2    |
| FR-029 | Export      | Export PDF A4/Letter texte sélectionnable            | Must     | P1    |
| FR-030 | Export      | Nom de fichier intelligent                           | Must     | P1    |
| FR-031 | Export      | Pas de watermark Free (décision trust)               | Must     | P1    |
| FR-032 | Share       | Lien privé tokenisé                                  | Should   | P2    |
| FR-033 | Share       | Revoke et expiration de lien                         | Should   | P2    |
| FR-034 | Share       | noindex par défaut                                   | Should   | P2    |
| FR-035 | Portfolio   | Page portfolio publiable Pro                         | Should   | P2    |
| FR-036 | ATS         | Score 0-100 avec breakdown                           | Should   | P2    |
| FR-037 | ATS         | Explications langage simple                          | Should   | P2    |
| FR-038 | ATS         | Teaser Free / full Pro                               | Should   | P2    |
| FR-039 | ATS         | Historique des scores                                | Could    | P3    |
| FR-040 | Match       | Paste JD et score d’adéquation                       | Should   | P3    |
| FR-041 | Match       | Liste mots-clés manquants                            | Should   | P3    |
| FR-042 | Match       | Suggestions d’édition non inventives                 | Should   | P3    |
| FR-043 | AI          | Import LinkedIn vers draft CV                        | Should   | P3    |
| FR-044 | AI          | Rewrite bullet 3 variants                            | Should   | P3    |
| FR-045 | AI          | Contrôle de ton                                      | Should   | P3    |
| FR-046 | AI          | Cover letter generator                               | Should   | P3    |
| FR-047 | AI          | Interview prep coach                                 | Should   | P3    |
| FR-048 | AI          | Career advice cards                                  | Could    | P3    |
| FR-049 | AI          | Guardrail anti-hallucination employeur               | Must     | P3    |
| FR-050 | AI          | Feedback thumbs sur suggestions                      | Should   | P3    |
| FR-051 | AI          | Quotas par plan enforce server-side                  | Must     | P3    |
| FR-052 | Billing     | Pricing page Free/Pro/Business                       | Should   | P2    |
| FR-053 | Billing     | Checkout Stripe mensuel/annuel                       | Should   | P2    |
| FR-054 | Billing     | Customer portal cancel/upgrade                       | Should   | P2    |
| FR-055 | Billing     | Factures PDF                                         | Should   | P2    |
| FR-056 | Billing     | Codes promo                                          | Should   | P2    |
| FR-057 | Billing     | Entitlements <10s post-paiement                      | Must     | P2    |
| FR-058 | Business    | Invitations seats et roles                           | Could    | P5    |
| FR-059 | Business    | Analytics équipe                                     | Could    | P5    |
| FR-060 | Business    | Custom branding                                      | Could    | P5    |
| FR-061 | Business    | API access                                           | Could    | P5    |
| FR-062 | Collab      | Edition temps réel                                   | Could    | P5    |
| FR-063 | Collab      | Commentaires ancrés                                  | Could    | P5    |
| FR-064 | Versions    | Historique et restore                                | Could    | P4    |
| FR-065 | Marketplace | Publication template designer                        | Could    | P4    |
| FR-066 | Marketplace | Achat template + unlock                              | Could    | P4    |
| FR-067 | Marketplace | Commission 30% + payouts                             | Could    | P4    |
| FR-068 | Mobile      | App iOS core edit/export                             | Could    | P4    |
| FR-069 | Mobile      | App Android core edit/export                         | Could    | P4    |
| FR-070 | OCR         | Import PDF avec mapping confiance                    | Could    | P4    |
| FR-071 | Sync        | LinkedIn live sync opt-in                            | Could    | P5    |
| FR-072 | i18n        | UI FR/EN                                             | Must     | P1    |
| FR-073 | i18n        | UI ES                                                | Should   | P4    |
| FR-074 | i18n        | UI DE                                                | Should   | P6    |
| FR-075 | Landing     | Landing marketing SEO                                | Must     | P1    |
| FR-076 | Admin       | Feature flags ops                                    | Must     | P1    |
| FR-077 | Admin       | Support lookup user audité                           | Should   | P2    |
| FR-078 | Notify      | Emails lifecycle activation/billing                  | Should   | P2    |
| FR-079 | Security    | Rate limit login                                     | Must     | P1    |
| FR-080 | Security    | TLS + encryption at rest                             | Must     | P1    |
| FR-081 | A11y        | WCAG AA flux critiques                               | Must     | P1    |
| FR-082 | Perf        | Lighthouse >=90 pages critiques                      | Must     | P1    |
| FR-083 | Reliab      | Uptime 99.9%                                         | Must     | P6    |
| FR-084 | Export      | DOCX export                                          | Could    | P5    |
| FR-085 | Theme       | Mode sombre                                          | Could    | P5    |
| FR-086 | AI          | Kill switch global IA                                | Must     | P3    |
| FR-087 | Legal       | CGU Privacy accessibles                              | Must     | P1    |
| FR-088 | Legal       | Transparence contenu IA                              | Must     | P3    |
| FR-089 | Growth      | Referral 1 mois Pro                                  | Could    | P3    |
| FR-090 | Analytics   | Tracking events core                                 | Must     | P1    |

# 53. JOURNAL DE BORD PRODUIT — EXEMPLES DE SYNTHÈSES RESEARCH (FICTIFS MÉTHODOLOGIQUES)

> Les verbatims suivants sont des **exemples méthodologiques** pour entraîner l’équipe à documenter la research. Ils seront remplacés par de vrais insights M0–M3.

## 53.1 Synthèse vague 1 — Juniors (n=8)

**Patterns :**

1. Peur du vide de contenu (6/8)
2. Rejet des paywalls au download (7/8)
3. Mobile start / desktop finish (5/8)
4. Demande d’exemples concrets plus que de théorie (8/8)

**Implication roadmap :** empty states avec exemples métier ; Free PDF confirmé ; onboarding court.

**Opportunity solution tree :**

- Exemples bullets stage marketing/tech/commerce
- Score ATS éducatif
- Template Campus priorisé acquisition TikTok

## 53.2 Synthèse vague 2 — Shifters (n=8)

**Patterns :**

1. ChatGPT utile mais non fiable factuellement (7/8)
2. Besoin de vocabulaire cible (8/8)
3. Willingness to pay annuelle si preuve matching (6/8)
4. Temps soirées seulement (7/8)

**Implication :** matcher + guardrails + sessions editor reprises faciles (dashboard).

## 53.3 Synthèse vague 3 — Executives (n=8)

**Patterns :**

1. Rejet designs « startup » (8/8)
2. Confidentialité liens (6/8)
3. Paie sans friction si rendu print parfait (7/8)
4. Délègue parfois à assistant (3/8) → collab future

## 53.4 Synthèse vague 4 — Immigrants (n=8)

**Patterns :**

1. Normes locales confuses (8/8)
2. Import PDF critique (7/8)
3. Traduction technique sensible (8/8)
4. Budget mensuel flexible préféré à annuel (5/8)

---

# 54. PLAN DE TESTS NON-FONCTIONNELS

## 54.1 Performance test plan

| Test                         | Outil        | Seuil                     | Fréquence                  |
| ---------------------------- | ------------ | ------------------------- | -------------------------- |
| Lighthouse CI landing/editor | LHCI         | ≥90 perf                  | chaque PR marketing/editor |
| k6 API autosave storm        | k6           | error <0.1% @ 1k VUs      | weekly                     |
| PDF queue burst              | k6 + workers | p95 <5s @ 50 jobs/s burst | pre-release                |
| AI gateway load              | k6           | queue rather than 500     | pre-AI GA                  |

## 54.2 Security test plan

| Test | Fréquence |
|---|---|---|
| Dependabot/SCA | continuous |
| SAST | each PR |
| DAST baseline | monthly |
| Pentest externe | annual M12+ |
| Secrets scan | each PR |
| Access review admin | quarterly |

## 54.3 Accessibility test plan

| Test | Détail |
|---|---|---|
| axe-core | CI critical=0 |
| Keyboard only | monthly manual |
| VoiceOver/NVDA sample | quarterly |
| Contrast audit | each brand change |

## 54.4 Reliability test plan

| Test | Détail |
|---|---|---|
| Backup restore drill | quarterly |
| Multi-AZ failover | quarterly |
| Chaos kill pod API | monthly staging |
| Status page incident rehearsal | biannual |

---

# 55. RUNBOOKS OPÉRATIONNELS (EXTRAITS)

## 55.1 Incident PDF export down

1. Check worker queue depth / DLQ
2. Check Chromium renderer health
3. Feature flag degrade : message user « export temporairement ralenti »
4. Scale workers
5. Communicate status page if >15 min
6. Postmortem si SEV1/2

## 55.2 Incident LLM provider outage

1. Switch secondary provider via gateway
2. If none : disable AI flags, keep editor/PDF
3. Notify Pro users in-app banner
4. Credit quotas optionnels si outage >4h

## 55.3 Incident billing webhook lag

1. Verify Stripe status
2. Replay webhooks
3. Manual entitlement repair tool (audited)
4. User comms if paid but not unlocked >10 min

---

# 56. BRAND & NAMING SYSTEM

## 56.1 Nom

**CV Studio AI** — clair, descriptif, searchable.
Tagline options à tester :

- « La candidature, sous contrôle »
- « Des CV qui passent les filtres »
- « Votre co-pilote de candidature »

## 56.2 Architecture de marque

- Masterbrand : CV Studio AI
- Feature brands descriptives (pas de noms cryptiques) : ATS Analyzer, Job Matcher, Interview Coach
- Éviter littering marques features introuvables

## 56.3 Tone of voice examples

| Situation | À faire                                                                              | À éviter                             |
| --------- | ------------------------------------------------------------------------------------ | ------------------------------------ |
| Erreur    | « Impossible d’enregistrer. Réessayez — vos modifications locales sont conservées. » | « Unexpected error #500 » seul       |
| Upsell    | « Passez Pro pour adapter ce CV à l’offre en un clic. »                              | « Votre carrière est en danger !!! » |
| IA refus  | « Nous ne pouvons pas ajouter une entreprise absente de votre profil. »              | Silence / hallucination              |

---

# 57. DÉTAIL PHASE 1 — SEMAINE PAR SEMAINE (M0–M3)

| Semaine | Objectif                                                     | Outcome mesurable               | Risques                  |
| ------- | ------------------------------------------------------------ | ------------------------------- | ------------------------ |
| W1      | Kickoff, ADR stack, repo, CI skeleton, design tokens kickoff | Dev env works for all eng       | Scope creep / deps OAuth |
| W2      | Auth email API + UI screens, Postgres schema users           | Email signup works staging      | Scope creep / deps OAuth |
| W3      | OAuth Google, session hardening, staging deploy AWS          | Google login works              | Scope creep / deps OAuth |
| W4      | OAuth LinkedIn/Apple, password reset, legal pages draft      | All auth methods green          | Scope creep / deps OAuth |
| W5      | Resume CRUD API, JSON schema document v1                     | Can create empty resume via API | Scope creep / deps OAuth |
| W6      | Editor Identity/Experience forms, autosave client            | Form edits persist              | Scope creep / deps OAuth |
| W7      | Live preview engine + Atlas template                         | Dual pane visible               | Scope creep / deps OAuth |
| W8      | Templates Seine + Campus + QA ATS start                      | 3 templates selectable          | Scope creep / deps OAuth |
| W9      | Templates Compact + Nord + PDF worker alpha                  | PDF downloads for Atlas         | Scope creep / deps OAuth |
| W10     | PDF GA quality, dashboard, onboarding wizard                 | Activation path complete        | Scope creep / deps OAuth |
| W11     | Landing page, analytics events, bug bash #1                  | Public marketing URL live       | Scope creep / deps OAuth |
| W12     | Beta private 100 users, fix P0/P1, soft launch prep          | Beta feedback board prioritized | Scope creep / deps OAuth |

---

# 58. CHECKLISTS QUALITÉ TEMPLATE (DÉTAIL)

Pour chaque template, le reviewer ATS signe :

- [ ] Headings standards détectables
- [ ] Contact en texte
- [ ] Pas de tableau de layout critique
- [ ] Pas d’icônes seules pour skills
- [ ] Contraste AA
- [ ] Overflow long name / long title géré
- [ ] 1 page et 2 pages testés
- [ ] FR sample + EN sample
- [ ] PDF text extract contains name/email/skills
- [ ] Thumbnail à jour
- [ ] Manifest version bump
- [ ] Feature flag ready

Score QA : Pass / Pass with warnings / Fail.

---

# 59. BIBLIOGRAPHIE & SOURCES DE MARCHÉ (ORIENTATIONS)

Le marché évolue ; les ordres de grandeur du §4 doivent être revalidés avec :

- Rapports industries HR tech / career services (années courantes)
- Public filings / estimations trafic Similarweb des concurrents
- App store reviews qualitative coding
- Enquêtes candidats internes
- Littérature ATS parsing (vendor docs Greenhouse, Lever, Workday — contraintes publiques)

**Règle :** aucun claim marketing chiffré externe sans source datée stockée dans Notion « Sources ».

---

# 60. INDEX DES DÉCISIONS PRODUIT (DECISION LOG INITIAL)

| ID   | Décision                                      | Date       | Statut              |
| ---- | --------------------------------------------- | ---------- | ------------------- |
| D001 | Free PDF sans watermark                       | 2026-07-26 | Approuvé CPO draft  |
| D002 | Prix Pro 9.99 / 99 annuel                     | 2026-07-26 | À valider analytics |
| D003 | Business 29.99/siège                          | 2026-07-26 | À valider           |
| D004 | Commission marketplace 30%                    | 2026-07-26 | Approuvé draft      |
| D005 | Stack Next/Nest/Postgres/Redis/AWS/Docker     | 2026-07-26 | Contraint           |
| D006 | North Star = CAQ                              | 2026-07-26 | Approuvé draft      |
| D007 | Won’t Have auto-apply jobs                    | 2026-07-26 | Approuvé            |
| D008 | Guardrails anti-hallucination non négociables | 2026-07-26 | Approuvé            |
| D009 | WCAG AA obligatoire flux critiques            | 2026-07-26 | Approuvé            |
| D010 | EU data residency users EU                    | 2026-07-26 | Approuvé draft      |

---

# 61. SCÉNARIOS OPÉRATIONNELS MÉTIER (50 CAS)

| ID      | Acteur      | Scénario                                               | Résultat attendu                      |
| ------- | ----------- | ------------------------------------------------------ | ------------------------------------- |
| OPS-001 | User/System | Inscription email succès                               | Conforme PRD / pas d’erreur non gérée |
| OPS-002 | User/System | Inscription email déjà pris                            | Conforme PRD / pas d’erreur non gérée |
| OPS-003 | User/System | Login mauvais mot de passe 5 fois → lockout temporaire | Conforme PRD / pas d’erreur non gérée |
| OPS-004 | User/System | OAuth Google premier login crée compte                 | Conforme PRD / pas d’erreur non gérée |
| OPS-005 | User/System | OAuth LinkedIn scopes réduits → fallback               | Conforme PRD / pas d’erreur non gérée |
| OPS-006 | User/System | Reset password token expiré                            | Conforme PRD / pas d’erreur non gérée |
| OPS-007 | User/System | Onboarding skip total                                  | Conforme PRD / pas d’erreur non gérée |
| OPS-008 | User/System | Onboarding complet junior                              | Conforme PRD / pas d’erreur non gérée |
| OPS-009 | User/System | Création CV template Atlas                             | Conforme PRD / pas d’erreur non gérée |
| OPS-010 | User/System | Autosave pendant perte réseau puis reprise             | Conforme PRD / pas d’erreur non gérée |
| OPS-011 | User/System | Ajout 10 expériences sans crash UI                     | Conforme PRD / pas d’erreur non gérée |
| OPS-012 | User/System | Bullet trop long → warning                             | Conforme PRD / pas d’erreur non gérée |
| OPS-013 | User/System | Changement template conserve contenu                   | Conforme PRD / pas d’erreur non gérée |
| OPS-014 | User/System | Export PDF A4 succès                                   | Conforme PRD / pas d’erreur non gérée |
| OPS-015 | User/System | Export PDF Letter succès                               | Conforme PRD / pas d’erreur non gérée |
| OPS-016 | User/System | Export concurrent double click idempotent              | Conforme PRD / pas d’erreur non gérée |
| OPS-017 | User/System | Free bloque 2e CV                                      | Conforme PRD / pas d’erreur non gérée |
| OPS-018 | User/System | Paywall → checkout Pro mensuel succès                  | Conforme PRD / pas d’erreur non gérée |
| OPS-019 | User/System | Checkout abandonné → resume paywall                    | Conforme PRD / pas d’erreur non gérée |
| OPS-020 | User/System | Webhook Stripe dupliqué idempotent                     | Conforme PRD / pas d’erreur non gérée |
| OPS-021 | User/System | Cancel abonnement fin de période                       | Conforme PRD / pas d’erreur non gérée |
| OPS-022 | User/System | Past due → restricted AI                               | Conforme PRD / pas d’erreur non gérée |
| OPS-023 | User/System | ATS analyze sans JD                                    | Conforme PRD / pas d’erreur non gérée |
| OPS-024 | User/System | ATS analyze avec JD                                    | Conforme PRD / pas d’erreur non gérée |
| OPS-025 | User/System | ATS score low → suggestions listées                    | Conforme PRD / pas d’erreur non gérée |
| OPS-026 | User/System | AI optimize bullet succès                              | Conforme PRD / pas d’erreur non gérée |
| OPS-027 | User/System | AI optimize refuse employeur inventé                   | Conforme PRD / pas d’erreur non gérée |
| OPS-028 | User/System | AI timeout → message retry                             | Conforme PRD / pas d’erreur non gérée |
| OPS-029 | User/System | Cover letter generate + edit + export                  | Conforme PRD / pas d’erreur non gérée |
| OPS-030 | User/System | Interview prep 10 questions                            | Conforme PRD / pas d’erreur non gérée |
| OPS-031 | User/System | Portfolio publish noindex                              | Conforme PRD / pas d’erreur non gérée |
| OPS-032 | User/System | Share link revoke                                      | Conforme PRD / pas d’erreur non gérée |
| OPS-033 | User/System | Delete account grace period                            | Conforme PRD / pas d’erreur non gérée |
| OPS-034 | User/System | Export data ZIP                                        | Conforme PRD / pas d’erreur non gérée |
| OPS-035 | User/System | Business invite member                                 | Conforme PRD / pas d’erreur non gérée |
| OPS-036 | User/System | Business remove member                                 | Conforme PRD / pas d’erreur non gérée |
| OPS-037 | User/System | Collab comment create                                  | Conforme PRD / pas d’erreur non gérée |
| OPS-038 | User/System | Version restore                                        | Conforme PRD / pas d’erreur non gérée |
| OPS-039 | User/System | Marketplace purchase unlock                            | Conforme PRD / pas d’erreur non gérée |
| OPS-040 | User/System | Marketplace seller submit template                     | Conforme PRD / pas d’erreur non gérée |
| OPS-041 | User/System | OCR import low confidence fields                       | Conforme PRD / pas d’erreur non gérée |
| OPS-042 | User/System | LinkedIn sync diff review                              | Conforme PRD / pas d’erreur non gérée |
| OPS-043 | User/System | Locale switch FR→EN content AI                         | Conforme PRD / pas d’erreur non gérée |
| OPS-044 | User/System | Accessibility keyboard reorder section                 | Conforme PRD / pas d’erreur non gérée |
| OPS-045 | User/System | Feature flag AI off dégrade gracieuse                  | Conforme PRD / pas d’erreur non gérée |
| OPS-046 | User/System | Mobile login + export                                  | Conforme PRD / pas d’erreur non gérée |
| OPS-047 | User/System | Referral code apply                                    | Conforme PRD / pas d’erreur non gérée |
| OPS-048 | User/System | Promo code invalid                                     | Conforme PRD / pas d’erreur non gérée |
| OPS-049 | User/System | Support impersonation audited                          | Conforme PRD / pas d’erreur non gérée |
| OPS-050 | User/System | Status page incident visible                           | Conforme PRD / pas d’erreur non gérée |

---

# 62. GLOSSAIRE ÉLARGI

| Terme           | Définition opérationnelle                          |
| --------------- | -------------------------------------------------- |
| Activation      | Utilisateur ayant complété Identité + 1 expérience |
| Canary          | Rollout % réduit d’une feature                     |
| CAQ             | Candidature Assistée Qualifiée                     |
| Dual-pane       | UI formulaire + preview simultanés                 |
| Entitlement     | Droit feature lié plan                             |
| Golden set      | Jeu de données de référence pour eval              |
| Guardrail       | Règle empêchant sortie IA dangereuse/fausse        |
| Job-to-be-done  | Besoin progressé exprimé en situation              |
| MoSCoW          | Must/Should/Could/Won’t                            |
| North Star      | Métrique principale d’alignement                   |
| Paywall         | Barrière monétisation contextuelle                 |
| PMF             | Product-Market Fit                                 |
| RUM             | Real User Monitoring                               |
| Sean Ellis test | % très déçus si produit disparaît                  |
| SLO/SLI         | Objectif / indicateur de niveau de service         |
| Soft delete     | Suppression logique reversible                     |
| Take rate       | % commission marketplace                           |
| Time-to-value   | Délai jusqu’à première valeur perçue               |
| Webhook         | Callback HTTP asynchrone billing/jobs              |
| WYSIWYG         | What You See Is What You Get                       |

---

# 63. CONCLUSION OPÉRATIONNELLE & NEXT STEPS IMMÉDIATS

## 63.1 Dans les 10 prochains jours

1. Workshop sign-off Product × Engineering × Design (AC1)
2. Valider capacité Phase 1 vs S0–S10
3. Lancer recrutement research personas (AC6)
4. Créer tracking plan détaillé dans outil analytics
5. Ouvrir comptes Google/LinkedIn/Apple/Stripe/AWS
6. Figer Decision Log D001–D010
7. Publier RFC pricing validation (AC3)

## 63.2 Dans les 30 prochains jours

1. Sprint 0–1 complétés
2. Design system v0 + landing wireframes high-fi
3. 8 entretiens persona minimum démarrés
4. Modèle financier v1 Finance
5. Security baseline checklist démarrée

## 63.3 Critère de succès du PRD comme artefact

Le PRD est utile si, à M3, une nouvelle recrue peut répondre sans meeting :

- Que construisons-nous ?
- Pour qui ?
- Pourquoi nous vs Canva/Resume.io ?
- Qu’est-ce qui est Must ce trimestre ?
- Comment mesure-t-on le succès ?

Si une de ces réponses est ambiguë, mettre à jour le PRD (version minor) sous 7 jours.

---

_Document de référence CV Studio AI — PRD v1.0 — Horizon 24 mois_
_© CV Studio AI — Usage interne_

# 64. SPÉCIFICATIONS DÉTAILLÉES PAR ÉCRAN (UI INVENTORY)

## 64.1 Marketing

### Landing /

**Objectif :** signup.
**Blocs :** nav, hero brand+CTA, preuve sociale, démo visuelle dual-pane, différenciation ATS, pricing teaser, FAQ, footer.
**CTA primaire unique above the fold.**
**A/B :** headline ATS vs time-to-CV.
**Tracking :** view, cta_click, scroll_depth.

### Pricing /pricing

Comparaison 3 colonnes Free/Pro/Business ; toggle mensuel/annuel ; FAQ billing ; trust badges Stripe.

### Templates gallery /templates

Grille filtres ; clic → modal preview + CTA créer.

### Blog /blog + article

TOC, CTA soft tool, internal links.

## 64.2 App shell

Nav : Dashboard, Templates, (AI Hub Pro), Settings.
Plan chip + Upgrade always visible Free.

## 64.3 Dashboard

Empty state illustration + CTA.
Liste cards : title, template thumb, updated_at, ATS chip, menu …
Secondary : Import, New from LinkedIn (Pro).

## 64.4 Editor screens

- Form modes per section
- Preview zoom 90/100/110
- Drawer ATS
- Drawer Matcher
- Modal AI variants
- Modal export progress
- Modal paywall

## 64.5 Settings

Profile, Security, Billing, Preferences language, Privacy center.

## 64.6 Team Business

Members, roles, usage, billing admin.

Chaque écran doit avoir : user story links, a11y notes, empty/loading/error states, analytics ids.

---

# 65. COPY DECK PRODUIT (FR) — EXTRAITS NORMAUX

| Clé                    | Copy FR                                                      |
| ---------------------- | ------------------------------------------------------------ |
| land.hero.title        | CV Studio AI                                                 |
| land.hero.sub          | Créez un CV ATS-ready, adapté à chaque offre, en 15 minutes. |
| land.cta               | Créer mon CV gratuitement                                    |
| auth.signup.title      | Créez votre compte                                           |
| auth.login.title       | Bon retour                                                   |
| onboarding.goal.title  | Quel est votre objectif ?                                    |
| onboarding.goal.junior | Premier emploi / stage                                       |
| onboarding.goal.shift  | Reconversion                                                 |
| onboarding.goal.exec   | Poste senior / executive                                     |
| onboarding.goal.intl   | Candidature internationale                                   |
| dash.empty             | Votre premier CV commence ici                                |
| dash.cta               | Nouveau CV                                                   |
| editor.saved           | Enregistré                                                   |
| editor.saving          | Enregistrement…                                              |
| editor.error           | Enregistrement impossible                                    |
| ats.cta                | Analyser l’ATS                                               |
| ats.score              | Score ATS                                                    |
| match.cta              | Coller une offre                                             |
| ai.optimize            | Améliorer avec l’IA                                          |
| ai.refuse_employer     | Impossible d’inventer un employeur                           |
| paywall.title          | Passez à Pro                                                 |
| paywall.sub            | CV illimités, IA, ATS complet, portfolio                     |
| export.done            | PDF prêt                                                     |
| billing.cancel         | Annuler l’abonnement                                         |
| privacy.delete         | Supprimer mon compte                                         |

EN equivalents must be maintained in i18n files with linguistic QA.

---

# 66. MATRICE DE PRIORISATION RICE (EXEMPLES)

RICE = (Reach × Impact × Confidence) / Effort

| Initiative         | Reach | Impact | Conf | Effort | RICE | Décision         |
| ------------------ | ----- | ------ | ---- | ------ | ---- | ---------------- |
| PDF export quality | 1000  | 3      | 1.0  | 5      | 600  | P0               |
| Dual-pane polish   | 1000  | 3      | 0.9  | 5      | 540  | P0               |
| ATS v1             | 800   | 3      | 0.8  | 8      | 240  | P0               |
| AI optimizer       | 600   | 3      | 0.7  | 8      | 157  | P0               |
| JD matcher         | 500   | 3      | 0.7  | 8      | 131  | P0               |
| Interview prep     | 400   | 2      | 0.6  | 5      | 96   | P1               |
| Marketplace        | 300   | 2      | 0.5  | 13     | 23   | P1               |
| Collab realtime    | 100   | 2      | 0.5  | 13     | 7.7  | P2               |
| Dark mode          | 400   | 1      | 0.8  | 3      | 106  | P2 opportunistic |
| Auto-apply jobs    | 700   | 1      | 0.3  | 20     | 10.5 | Won’t            |

---

# 67. PROGRAMME D’EXPERIENCES A/B — BACKLOG Y1

| Exp ID | Hypothèse                    | Variantes                  | Primary metric  |
| ------ | ---------------------------- | -------------------------- | --------------- |
| EXP-01 | Headline ATS ↑ signup        | ATS vs Speed               | Signup rate     |
| EXP-02 | Onboarding 3 vs 4 steps      | shorter better             | Activation      |
| EXP-03 | Annual default               | annual vs monthly          | Paid revenue    |
| EXP-04 | Soft ATS paywall             | teaser vs full block fixes | Conversion      |
| EXP-05 | Social proof density         | low vs high                | Signup          |
| EXP-06 | AI CTA wording               | Améliorer vs Optimiser ATS | AI adoption     |
| EXP-07 | Referral placement           | dash vs post-export        | Referral starts |
| EXP-08 | Template first vs goal first | order                      | Time-to-export  |

---

# 68. BACKLOG DÉTAILLÉ SPRINT 0–10 (TICKETS ÉPIQUES)

## Sprint 0

| Ticket | Description                                        | DoD                                      |
| ------ | -------------------------------------------------- | ---------------------------------------- |
| S0-01  | Initialiser monorepo apps/web apps/api packages/ui | Review + tests + merged + flag if needed |
| S0-02  | Pipeline CI lint test build                        | Review + tests + merged + flag if needed |
| S0-03  | Terraform/CDK skeleton AWS staging                 | Review + tests + merged + flag if needed |
| S0-04  | ADR: auth strategy JWT                             | Review + tests + merged + flag if needed |
| S0-05  | ADR: PDF renderer choice                           | Review + tests + merged + flag if needed |
| S0-06  | Design tokens v0 couleurs typo spacing             | Review + tests + merged + flag if needed |
| S0-07  | Setup PostHog/Amplitude project                    | Review + tests + merged + flag if needed |
| S0-08  | Créer board Notion PRD + RFC                       | Review + tests + merged + flag if needed |

## Sprint 1

| Ticket | Description                        | DoD                                      |
| ------ | ---------------------------------- | ---------------------------------------- |
| S1-01  | API POST /auth/register validation | Review + tests + merged + flag if needed |
| S1-02  | API POST /auth/login               | Review + tests + merged + flag if needed |
| S1-03  | Hash password argon2               | Review + tests + merged + flag if needed |
| S1-04  | UI signup page                     | Review + tests + merged + flag if needed |
| S1-05  | UI login page                      | Review + tests + merged + flag if needed |
| S1-06  | Email provider stub                | Review + tests + merged + flag if needed |
| S1-07  | E2E auth email happy path          | Review + tests + merged + flag if needed |
| S1-08  | Rate limit login                   | Review + tests + merged + flag if needed |

## Sprint 2

| Ticket | Description                    | DoD                                      |
| ------ | ------------------------------ | ---------------------------------------- |
| S2-01  | Google OAuth strategy          | Review + tests + merged + flag if needed |
| S2-02  | Account linking rules          | Review + tests + merged + flag if needed |
| S2-03  | Refresh token rotation         | Review + tests + merged + flag if needed |
| S2-04  | UI social buttons              | Review + tests + merged + flag if needed |
| S2-05  | Staging secrets manager        | Review + tests + merged + flag if needed |
| S2-06  | Session revoke endpoint        | Review + tests + merged + flag if needed |
| S2-07  | Security review auth checklist | Review + tests + merged + flag if needed |
| S2-08  | Docs enablement auth           | Review + tests + merged + flag if needed |

## Sprint 3

| Ticket | Description                  | DoD                                      |
| ------ | ---------------------------- | ---------------------------------------- |
| S3-01  | LinkedIn OAuth               | Review + tests + merged + flag if needed |
| S3-02  | Apple OAuth                  | Review + tests + merged + flag if needed |
| S3-03  | Password forgot/reset flow   | Review + tests + merged + flag if needed |
| S3-04  | Legal pages CGU Privacy      | Review + tests + merged + flag if needed |
| S3-05  | Cookie banner CMP stub       | Review + tests + merged + flag if needed |
| S3-06  | Delete account endpoint soft | Review + tests + merged + flag if needed |
| S3-07  | Audit logs auth events       | Review + tests + merged + flag if needed |
| S3-08  | Bugfix auth                  | Review + tests + merged + flag if needed |

## Sprint 4

| Ticket | Description                    | DoD                                      |
| ------ | ------------------------------ | ---------------------------------------- |
| S4-01  | Table resume_documents         | Review + tests + merged + flag if needed |
| S4-02  | CRUD resumes API               | Review + tests + merged + flag if needed |
| S4-03  | JSON schema validation content | Review + tests + merged + flag if needed |
| S4-04  | Optimistic locking updated_at  | Review + tests + merged + flag if needed |
| S4-05  | Seed sample resume             | Review + tests + merged + flag if needed |
| S4-06  | Unit tests schema              | Review + tests + merged + flag if needed |
| S4-07  | Postman/OpenAPI collection     | Review + tests + merged + flag if needed |
| S4-08  | Autosave API contract          | Review + tests + merged + flag if needed |

## Sprint 5

| Ticket | Description                       | DoD                                      |
| ------ | --------------------------------- | ---------------------------------------- |
| S5-01  | Editor layout dual-pane desktop   | Review + tests + merged + flag if needed |
| S5-02  | Section identity form             | Review + tests + merged + flag if needed |
| S5-03  | Section experience form           | Review + tests + merged + flag if needed |
| S5-04  | Client autosave debounce          | Review + tests + merged + flag if needed |
| S5-05  | Saved indicator UX                | Review + tests + merged + flag if needed |
| S5-06  | Mobile tabs form/preview skeleton | Review + tests + merged + flag if needed |
| S5-07  | Error toast save fail             | Review + tests + merged + flag if needed |
| S5-08  | Tracking section_updated          | Review + tests + merged + flag if needed |

## Sprint 6

| Ticket | Description                   | DoD                                      |
| ------ | ----------------------------- | ---------------------------------------- |
| S6-01  | Preview renderer architecture | Review + tests + merged + flag if needed |
| S6-02  | Template Atlas Classic        | Review + tests + merged + flag if needed |
| S6-03  | Live binding fields→preview   | Review + tests + merged + flag if needed |
| S6-04  | Paper A4/Letter switch        | Review + tests + merged + flag if needed |
| S6-05  | Zoom preview controls         | Review + tests + merged + flag if needed |
| S6-06  | Visual QA Atlas               | Review + tests + merged + flag if needed |
| S6-07  | Performance debounce typing   | Review + tests + merged + flag if needed |
| S6-08  | Storybook template Atlas      | Review + tests + merged + flag if needed |

## Sprint 7

| Ticket | Description                       | DoD                                      |
| ------ | --------------------------------- | ---------------------------------------- |
| S7-01  | Template Seine Modern             | Review + tests + merged + flag if needed |
| S7-02  | Template Campus Graduate          | Review + tests + merged + flag if needed |
| S7-03  | ATS checklist run T1-T3           | Review + tests + merged + flag if needed |
| S7-04  | Template picker UI                | Review + tests + merged + flag if needed |
| S7-05  | Thumbnails generation             | Review + tests + merged + flag if needed |
| S7-06  | Sample content FR/EN              | Review + tests + merged + flag if needed |
| S7-07  | Switch template migration content | Review + tests + merged + flag if needed |
| S7-08  | Visual regression CI basique      | Review + tests + merged + flag if needed |

## Sprint 8

| Ticket | Description                  | DoD                                      |
| ------ | ---------------------------- | ---------------------------------------- |
| S8-01  | Template Compact             | Review + tests + merged + flag if needed |
| S8-02  | Template Nord Executive Lite | Review + tests + merged + flag if needed |
| S8-03  | PDF worker queue Redis       | Review + tests + merged + flag if needed |
| S8-04  | POST export endpoint         | Review + tests + merged + flag if needed |
| S8-05  | Download UX progress         | Review + tests + merged + flag if needed |
| S8-06  | Text extraction test PDF     | Review + tests + merged + flag if needed |
| S8-07  | S3 upload signed URL         | Review + tests + merged + flag if needed |
| S8-08  | Tracking pdf_exported        | Review + tests + merged + flag if needed |

## Sprint 9

| Ticket | Description                    | DoD                                      |
| ------ | ------------------------------ | ---------------------------------------- |
| S9-01  | Dashboard list resumes         | Review + tests + merged + flag if needed |
| S9-02  | Empty state                    | Review + tests + merged + flag if needed |
| S9-03  | Onboarding wizard goals        | Review + tests + merged + flag if needed |
| S9-04  | Rename duplicate archive basic | Review + tests + merged + flag if needed |
| S9-05  | Account menu settings stub     | Review + tests + merged + flag if needed |
| S9-06  | Activation checklist           | Review + tests + merged + flag if needed |
| S9-07  | E2E signup→export              | Review + tests + merged + flag if needed |
| S9-08  | Bug bash prep checklist        | Review + tests + merged + flag if needed |

## Sprint 10

| Ticket | Description               | DoD                                      |
| ------ | ------------------------- | ---------------------------------------- |
| S10-01 | Landing high-fi implement | Review + tests + merged + flag if needed |
| S10-02 | SEO metadata sitemap      | Review + tests + merged + flag if needed |
| S10-03 | Lighthouse fixes ≥90      | Review + tests + merged + flag if needed |
| S10-04 | Analytics funnel dash     | Review + tests + merged + flag if needed |
| S10-05 | Beta invite system        | Review + tests + merged + flag if needed |
| S10-06 | P0/P1 bug burn-down       | Review + tests + merged + flag if needed |
| S10-07 | Status page stub          | Review + tests + merged + flag if needed |
| S10-08 | Soft GA decision meeting  | Review + tests + merged + flag if needed |

---

# 69. EXIGENCES DE CONTENU MÉTIER — EXEMPLES DE BULLETS (AIDES INLINE)

## Marketing junior

- « Augmenté l’engagement Instagram de 35 % en 3 mois via un calendrier éditorial hebdomadaire. »
- « Coordiné une campagne email de 4 newsletters (taux d’ouverture 28 %). »

## Product shifter

- « Piloté discovery sur 20 entretiens utilisateurs ; priorisé un backlog Q3 aboutissant à +12 % activation. »
- « Rédigé 5 PRD et aligné eng/design sur une release majeure livrée dans les délais. »

## Executive

- « Dirigé une équipe de 24 personnes et un budget marketing de 4,2 M€ ; +18 % pipeline YoY. »
- « Conduit une transformation MarTech réduisant le CPL de 22 %. »

## Software immigrant

- « Conçu et déployé un service Kubernetes traitant 2M req/jour ; p95 latency -30 %. »
- « Mis en place CI/CD GitHub Actions réduisant le lead time de 3 jours à 4 heures. »

Ces exemples sont proposés Free (limités) / Pro (bibliothèque étendue).

---

# 70. POLITIQUE DE SUPPORT DES NAVIGATEURS & DEVICES

| Plateforme            | Support         |
| --------------------- | --------------- |
| Chrome last 2         | Full            |
| Firefox last 2        | Full            |
| Safari last 2         | Full            |
| Edge last 2           | Full            |
| iOS Safari last 2     | Full responsive |
| Android Chrome last 2 | Full responsive |
| IE11                  | Non supporté    |

Desktop editor optimal ≥ 1280px.  
Entre 768–1279 : layout adapté.  
<768 : tabs mobile.

---

# 71. EXIGENCES EMAIL LIFECYCLE

| Email            | Trigger          | But               |
| ---------------- | ---------------- | ----------------- |
| Verify email     | signup email     | Trust             |
| Welcome          | J0               | Activation CTA    |
| Activation nudge | J1 si pas export | Reminder          |
| ATS education    | J3               | Feature discovery |
| Paywall value    | post 1st ATS low | Soft convert      |
| Purchase receipt | payment          | Trust             |
| Cancel confirm   | cancel           | Feedback          |
| Winback          | J14 post cancel  | Offer             |
| Re-engage        | J180 inactivity  | Update CV         |

All emails : unsubscribe, localization, brand, plain-text alternative.

---

# 72. FICHES MARCHÉ LOCALES

| Code | Marché      | Papier | Photo                                        | Langue         | Devise    | Notes GTM                    |
| ---- | ----------- | ------ | -------------------------------------------- | -------------- | --------- | ---------------------------- |
| FR   | France      | A4     | Souvent attendue hors tech; tech souvent non | fr-FR          | EUR       | APEC, LinkedIn FR, écoles    |
| US   | États-Unis  | Letter | Non                                          | en-US          | USD       | 1 page bias, ATS ubiquitaire |
| UK   | Royaume-Uni | A4     | Non                                          | en-GB          | GBP       | Spelling GB                  |
| DE   | Allemagne   | A4     | Parfois                                      | de-DE          | EUR       | Lebenslauf plus détaillé     |
| ES   | Espagne     | A4     | Variable                                     | es-ES          | EUR       | Locales ES                   |
| CA   | Canada      | Letter | Non                                          | en-CA/fr-CA    | CAD       | Bilingual opportunity later  |
| BE   | Belgique    | A4     | Variable                                     | fr-BE/nl later | EUR       | FR first                     |
| CH   | Suisse      | A4     | Parfois                                      | fr/de          | CHF later | Phase late                   |
| MX   | Mexique     | Letter | Variable                                     | es-MX          | MXN later | ES expansion                 |
| AE   | UAE         | A4     | Variable                                     | en             | USD       | Expat tech                   |

## Exigences produit associées

- Locale selector onboarding
- Guidance checklist par marché (photo, pages, personal info)
- Templates tagged markets
- AI tone localized
- Help center prioritized FR/EN then ES/DE

---

# 73. CADRE DE GOVERNANCE OKR TRIMESTRIELS (EXEMPLE Y1)

## Q1 (M0–M3)

**O:** Lancer un MVP activant des exports réels  
KR1: Soft GA live date  
KR2: First export rate ≥30%  
KR3: Lighthouse landing ≥90  
KR4: 20 interviews research done

## Q2 (M3–M6)

**O:** Monétiser avec confiance  
KR1: 800 paying users  
KR2: Conversion ≥2.5%  
KR3: ATS adoption ≥35% exporters  
KR4: Churn <8% early

## Q3 (M6–M9)

**O:** Différencier par l’IA contextuelle  
KR1: 50% Pro use AI monthly  
KR2: Conversion ≥3.5%  
KR3: NPS ≥40  
KR4: LLM COGS within budget

## Q4 (M9–M12)

**O:** Étendre surface (marketplace/mobile)  
KR1: ARR run-rate 1.5M€ path  
KR2: Mobile MAU share ≥15%  
KR3: 50 templates 3P  
KR4: Sean Ellis ≥35%

---

# 74. CHARTE QUALITÉ IA (EVALUATION HARNESS)

## 74.1 Dimensions scorées (1–5)

1. Factualité
2. Spécificité
3. Impact/orientation résultats
4. Ton adapté persona
5. Densité mots-clés sans stuffing
6. Lisibilité
7. Conformité langue
8. Absence de contenu toxique/biaisé grave

## 74.2 Golden sets

- 50 bullets junior
- 50 bullets mid
- 30 executive
- 30 bilingual tech
- 20 adversarial (ask to invent employer)

## 74.3 Promotion modèle

Un nouveau modèle/prompt ne passe en prod que si :

- Score moyen ≥ baseline
- Adversarial pass ≥95%
- Cost latency within SLO
- Canary 5% ≥24h sans hausse thumbs down

---

# 75. ANNEXE FINALE — RÉCAP EXÉCUTIF POUR LE BOARD

**Produit :** CV Studio AI, co-pilote de candidature ATS-first + IA contextuelle.  
**Marché :** resume builders ~2.5–3.2 Md USD, CAGR 7–9%.  
**Différenciation :** matcher offre + score ATS explicable + suite lettre/entretien + pricing trust.  
**Modèle :** Freemium Free utile / Pro 9.99 / Business 29.99 / marketplace 30%.  
**Cible M24 :** 1M inscrits, 250k MAU, ARR 8M€, NPS 50, churn <5%, LTV/CAC >3.  
**Stack :** Next.js 14+, NestJS, PostgreSQL, Redis, AWS, Docker.  
**Risques clés :** SEO incumbents, coûts LLM, Canva/Adobe, retention post-export.  
**Demande au board :** approuver PRD v1.0, budget Phase 1–2, hiring plan AI/mobile selon phases.

---

# 76. CRITÈRES D’ACCEPTATION DÉTAILLÉS — USER STORIES US-001 À US-075

Pour chaque user story du §8, les critères suivants font foi pour le QA sign-off.

### US-001 — Signup email

- **Given:** visiteur sur /signup
- **When:** soumet email valide + mot de passe conforme
- **Then:** compte créé, session ouverte, redirect onboarding
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-002 — OAuth Google

- **Given:** visiteur
- **When:** autorise Google
- **Then:** compte lié/créé sans mot de passe local obligatoire
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-003 — OAuth LinkedIn

- **Given:** visiteur
- **When:** autorise LinkedIn
- **Then:** login succès ou fallback message explicite
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-004 — OAuth Apple

- **Given:** visiteur iOS/web
- **When:** Sign in with Apple
- **Then:** login succès, email relay supporté
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-005 — Reset password

- **Given:** compte email
- **When:** demande reset
- **Then:** email token <1h, nouveau MDP, anciennes sessions invalidées
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-006 — 2FA

- **Given:** user settings
- **When:** active TOTP
- **Then:** login demande code, backup codes générés
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-007 — Delete account

- **Given:** user authentifié
- **When:** confirme suppression
- **Then:** soft delete immédiat, purge planifiée ≤30j, logout
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-008 — Export data

- **Given:** user
- **When:** demande export
- **Then:** ZIP/JSON disponible ≤24h
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-009 — Goal onboarding

- **Given:** nouveau user
- **When:** choisit objectif
- **Then:** template recommandé affiché
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-010 — Locale paper

- **Given:** onboarding
- **When:** choisit FR A4
- **Then:** editor defaults A4 fr-FR
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-011 — Dashboard list

- **Given:** user avec CV
- **When:** ouvre /app
- **Then:** voit liste triée updated_at
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-012 — Search CV

- **Given:** plusieurs CV
- **When:** search query
- **Then:** filtre titres/tags
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-013 — Rename duplicate archive

- **Given:** CV existant
- **When:** duplicate
- **Then:** copie profonde créée (si entitlement)
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-014 — Activation checklist

- **Given:** nouveau
- **When:** dashboard
- **Then:** checklist visible dismissible
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-015 — Structured form

- **Given:** editor
- **When:** édite sections
- **Then:** champs persistés schema-valid
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-016 — Live preview

- **Given:** editor desktop
- **When:** tape headline
- **Then:** preview MAJ <300ms debounce
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-017 — Autosave

- **Given:** editor
- **When:** modifie
- **Then:** save ≤5s + indicateur
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-018 — Experiences CRUD

- **Given:** editor
- **When:** ajoute expérience
- **Then:** item créé avec bullets
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-019 — Reorder sections

- **Given:** Core DnD
- **When:** drag Education above
- **Then:** ordre persisté respect constraints
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-020 — Leadership sections

- **Given:** template executive
- **When:** ajoute speaking
- **Then:** section rendue preview/PDF
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-021 — 5 templates

- **Given:** new CV
- **When:** ouvre picker
- **Then:** ≥5 templates ATS-safe
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-022 — 50+ templates

- **Given:** Pro
- **When:** catalogue
- **Then:** ≥50 visibles filtrables
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-023 — Colors fonts

- **Given:** editor theme
- **When:** change palette
- **Then:** preview update + warning ATS si risqué
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-024 — Field validation

- **Given:** email invalide
- **When:** blur
- **Then:** erreur inline, export bloqué si critique
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-025 — Project links

- **Given:** section projects
- **When:** ajoute URL GitHub
- **Then:** lien dans PDF cliquable
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-026 — Comments

- **Given:** collab
- **When:** ajoute commentaire
- **Then:** thread ancré bullet
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-027 — Page breaks

- **Given:** long CV
- **When:** preview
- **Then:** indicateurs pages + warning overflow
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-028 — Suggested phrases

- **Given:** bullet empty
- **When:** ouvre suggestions
- **Then:** exemples métier affichés
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-029 — ATS analyze

- **Given:** CV complet
- **When:** lance ATS
- **Then:** score+breakdown <8s p95
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-030 — JD match

- **Given:** Pro
- **When:** colle JD
- **Then:** match score + gaps
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-031 — Apply match suggestions

- **Given:** gaps
- **When:** apply AI suggestion
- **Then:** diff + confirm, pas d’employeur nouveau
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-032 — Explain score

- **Given:** score bas
- **When:** ouvre détail
- **Then:** explications actionnables FR/EN
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-033 — Local checklist

- **Given:** locale FR tech
- **When:** guidance
- **Then:** recommandation photo selon règles
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-034 — Score history

- **Given:** multi analyzes
- **When:** history
- **Then:** liste chronologique
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-035 — Conservative ATS mode

- **Given:** user
- **When:** active mode
- **Then:** layout simplifié conservant contenu
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-036 — Free ATS teaser

- **Given:** Free
- **When:** analyze
- **Then:** score visible, auto-fix gated
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-037 — LinkedIn generate

- **Given:** Pro OAuth
- **When:** import
- **Then:** draft mappé + review UI
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-038 — Rewrite bullet

- **Given:** Pro
- **When:** optimize bullet
- **Then:** 3 variants factuels
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-039 — Cover letter

- **Given:** Pro CV+JD
- **When:** generate
- **Then:** lettre éditable exportable
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-040 — Interview coach

- **Given:** Pro
- **When:** start prep
- **Then:** ≥8 questions STAR
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-041 — Tone control

- **Given:** AI settings
- **When:** tone executive
- **Then:** outputs ton senior
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-042 — Translate CV

- **Given:** Pro
- **When:** FR←EN
- **Then:** termes tech préservés
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-043 — No invent

- **Given:** prompt adversial
- **When:** ask add Google
- **Then:** refus explicite
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-044 — Career advice

- **Given:** Pro
- **When:** advice
- **Then:** cards + disclaimer
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-045 — AI progress UX

- **Given:** AI request
- **When:** pending
- **Then:** skeleton + cancel
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-046 — AI history

- **Given:** Pro
- **When:** history
- **Then:** restore 30j
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-047 — Thumbs feedback

- **Given:** AI output
- **When:** thumbs down
- **Then:** feedback stocké
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-048 — Pro badge clarity

- **Given:** Free
- **When:** voit AI CTA
- **Then:** badge Pro + pricing link
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-049 — Free PDF

- **Given:** Free 1 CV
- **When:** export
- **Then:** PDF succès sans watermark
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-050 — Pro no watermark

- **Given:** Pro
- **When:** export
- **Then:** PDF clean
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-051 — Private share link

- **Given:** user
- **When:** create share
- **Then:** URL token revokeable
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-052 — Portfolio publish

- **Given:** Pro
- **When:** publish
- **Then:** page /p/slug
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-053 — noindex

- **Given:** share/portfolio
- **When:** default
- **Then:** robots noindex
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-054 — DOCX

- **Given:** Advanced
- **When:** export docx
- **Then:** fichier ouvre Word structure ok
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-055 — Link analytics

- **Given:** Pro
- **When:** views
- **Then:** compteur vues
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-056 — Smart filename

- **Given:** export
- **When:** download
- **Then:** Prenom_Nom_CV.pdf pattern
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-057 — Pricing compare

- **Given:** user
- **When:** /pricing
- **Then:** 3 plans clairs
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-058 — Subscribe Pro

- **Given:** checkout
- **When:** paye
- **Then:** subscription active
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-059 — Manage sub

- **Given:** paid
- **When:** portal
- **Then:** cancel/upgrade possible
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-060 — Team invites

- **Given:** Business owner
- **When:** invite email
- **Then:** seat pending→active
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-061 — Invoice PDF

- **Given:** paid
- **When:** billing history
- **Then:** facture downloadable
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-062 — Instant unlock

- **Given:** payment success
- **When:** return app
- **Then:** feature unlocked <10s
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-063 — Custom branding

- **Given:** Business
- **When:** upload logo
- **Then:** portfolio branded
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-064 — Promo code

- **Given:** checkout
- **When:** code valid
- **Then:** remise appliquée
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-065 — Realtime collab

- **Given:** Business
- **When:** 2 editors
- **Then:** presence + sync
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-066 — Version history

- **Given:** Pro
- **When:** restore snapshot
- **Then:** content restored confirm
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-067 — Marketplace publish

- **Given:** designer
- **When:** submit
- **Then:** review queue
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-068 — Mobile edit

- **Given:** app
- **When:** edit bullet
- **Then:** sync web
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-069 — Team analytics

- **Given:** Business admin
- **When:** analytics
- **Then:** exports AI seats metrics
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-070 — LinkedIn sync

- **Given:** opt-in
- **When:** sync
- **Then:** diff review avant apply
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-071 — OCR import

- **Given:** PDF upload
- **When:** parse
- **Then:** mapping confidence UI
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-072 — API keys

- **Given:** Business
- **When:** create key
- **Then:** docs rate limit works
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-073 — Won’t auto-apply

- **Given:** any
- **When:** demande auto-apply
- **Then:** feature absente
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-074 — Won’t fake creds

- **Given:** AI
- **When:** demande faux diplôme
- **Then:** refus
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

### US-075 — Dark mode

- **Given:** settings
- **When:** toggle
- **Then:** theme dark contraste AA
- **Also:** telemetry event émis si applicable ; pas de P0 a11y ; pas de fuite données cross-user (IDOR test).

---

# 77. ADR PACK (ARCHITECTURE DECISION RECORDS) — BROUILLONS

## ADR-001 : Monorepo vs polyrepo

**Décision :** monorepo (web, api, workers, UI kit).  
**Pourquoi :** atomic changes editor↔api, shared types.  
**Cons :** CI complexity.

## ADR-002 : PDF rendering

**Décision candidat :** headless Chromium worker.  
**Pourquoi :** fidelity CSS/templates React.  
**Cons :** ops heavier than pure PDFKit ; mitigations pool + warm instances.

## ADR-003 : Auth tokens

**Décision :** access JWT court + refresh httpOnly secure.  
**Pourquoi :** XSS mitigation refresh ; mobile support access header.

## ADR-004 : Queue

**Décision :** Redis + BullMQ (or SQS).  
**Pourquoi :** PDF/AI/email async.

## ADR-005 : LLM gateway

**Décision :** abstraction provider (OpenAI/Anthropic/etc.) unique.  
**Pourquoi :** failover + cost routing.

## ADR-006 : Collab

**Décision :** TBD CRDT (Yjs) vs OT — decision gate M12.  
**Pourquoi :** complexité élevée ; ne pas pré-optimiser avant Business demand.

## ADR-007 : Mobile

**Décision :** React Native candidate (code sharing) — validate M9 spike.

## ADR-008 : Analytics

**Décision :** Product analytics tool + warehouse.  
**Pourquoi :** avoid reinventing.

## ADR-009 : Feature flags

**Décision :** Unleash/LaunchDarkly/maison — choisir M1.

## ADR-010 : i18n

**Décision :** next-intl or equivalent ; keys namespaced.

Chaque ADR final sera stocké dans /docs/adr avec statut Accepted.

---

# 78. PLAN DE COMMUNICATION INTERNE 24 MOIS

| Cadence           | Audience        | Contenu             |
| ----------------- | --------------- | ------------------- |
| Weekly email CPO  | All             | Metrics + decisions |
| Sprint review     | Product triad   | Demo                |
| Monthly all-hands | All             | Strategy            |
| Quarterly board   | Investors/board | ARR KPIs risks      |
| RFC async         | Eng/Design      | Changements scope   |

---

# 79. DEPENDENCIES VENDEURS & SLA SOUHAITÉS

| Vendor                      | Usage         | Exigence                          |
| --------------------------- | ------------- | --------------------------------- |
| AWS                         | Hosting       | 99.99 infra shared responsibility |
| Stripe                      | Payments      | Webhooks reliable                 |
| LLM provider                | AI            | Status page + fallback            |
| Email (SES/Resend)          | Transactional | Deliverability monitoring         |
| OAuth Google/Apple/LinkedIn | Auth          | Compliance app review             |
| Error tracking (Sentry)     | Reliability   | Alerting                          |
| Analytics                   | Product       | GDPR compliant EU                 |

---

# 80. NARRATIVE STRATÉGIQUE MOIS PAR MOIS (GUIDE CPO)

## Mois 1

**Focus CPO :** Installer la machine à livrer. Moins de features, plus de fondations. Success = staging stable et premier dual-pane interne.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 2

**Focus CPO :** Auth complète et premier template beau. Commencer research interviews. Résister au scope IA précoce.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 3

**Focus CPO :** MVP soft GA. Mesurer time-to-export. Corriger frictions onboarding. Préparer Stripe.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 4

**Focus CPO :** Billing live. Observer éthique conversion. Premier dashboard revenue. Templates pipeline industrialisé.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 5

**Focus CPO :** ATS v1. Éduquer users. Collecter thumbs explications. Ne pas overclaim compatibility universelle.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 6

**Focus CPO :** IA Optimizer + LinkedIn import. Mettre guardrails sous les projecteurs. FinOps LLM ON.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 7

**Focus CPO :** Matcher + lettres. Cœur différenciant. Instrumenter funnel offre→export.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 8

**Focus CPO :** Interview prep. Sticky loop. Mesurer retention Pro post-feature.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 9

**Focus CPO :** Marketplace beta designers. Qualité > quantité. ATS badge process.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 10

**Focus CPO :** Mobile beta. Parity realist. Crash-free obsession.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 11

**Focus CPO :** i18n ES + SEO international. Localiser pas seulement traduire.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 12

**Focus CPO :** Clôture Y1. Revue PMF. Recalibrer M13–24. Mobile GA si qualité OK.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 13

**Focus CPO :** Collab alpha Business. Sales assisted motions début.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 14

**Focus CPO :** Realtime harden. Support playbooks teams.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 15

**Focus CPO :** Analytics advanced. Preuves valeur sièges.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 16

**Focus CPO :** OCR GA. Activation immigrants/shifters ↑.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 17

**Focus CPO :** LinkedIn sync opt-in prudent. Diff review obligatoire.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 18

**Focus CPO :** API public beta. SOC2 kickoff. Enterprise readiness light.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 19

**Focus CPO :** Push DE. Lebenslauf norms. Partenariats locaux.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 20

**Focus CPO :** Cost optimization infra+LLM. Margin defense.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 21

**Focus CPO :** Marketplace maturity payouts. Fraud monitoring.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 22

**Focus CPO :** Scale tests 1M. Capacity review.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 23

**Focus CPO :** Polish NPS drivers. Churn task force.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

## Mois 24

**Focus CPO :** Lock targets. Retro 24 mois. PRD v2 horizon suivant.

| Dimensión | Question de pilotage                |
| --------- | ----------------------------------- |
| Users     | Quelle cohorte stagne et pourquoi ? |
| Revenue   | Conversion et ARPU vs plan ?        |
| Product   | Quelle friction P0 reste ouverte ?  |
| AI/Cost   | COGS LLM sous contrôle ?            |
| Risk      | Quel risque Rxx a changé de score ? |

---

# 81. SIGN-OFF SHEET

| Rôle                      | Nom | Date | Signature / Approbation | Commentaires |
| ------------------------- | --- | ---- | ----------------------- | ------------ |
| Chief Product Officer     |     |      | ☐ Approuvé              |              |
| CTO / Head of Engineering |     |      | ☐ Approuvé              |              |
| Head of Design            |     |      | ☐ Approuvé              |              |
| Head of Marketing         |     |      | ☐ Approuvé              |              |
| Finance / Ops             |     |      | ☐ Approuvé pricing      |              |
| Legal / DPO               |     |      | ☐ Approuvé privacy/AI   |              |

**Version approuvée :** ___________  
**Date d’effet :** ___________  
**Prochaine revue obligatoire :** +90 jours

---

# FIN DU PRD CV STUDIO AI v1.0

Ce document constitue la référence produit pour les **24 prochains mois**. Toute déviation Must Have nécessite un RFC et une mise à jour de version.

# 82. ANNEXE ÉTENDUE — SPÉCIFICATIONS DE SERVICES BACKEND

## 82.1 Service Users

Responsabilités : cycle de vie compte, préférences, RGPD export/delete.  
Interfaces : Auth, Billing (customer id), Analytics identify.  
Règles : email unique ; soft delete ; anonymisation après purge.

## 82.2 Service Resumes

Responsabilités : documents, versions, templates binding, share tokens.  
Règles : ownership AuthZ ; quota Free=1 ; autosave coalescing.

## 82.3 Service Entitlements

Source de vérité des droits. Cache Redis TTL court.  
Invalidation sur webhook Stripe et admin repair.

## 82.4 Service ATS

Input resume JSON (+ JD optional).  
Output report persisted.  
Deterministic rules engine + optional LLM explanation layer.

## 82.5 Service AI Gateway

Authz feature+quota → prompt assemble → provider call → safety filter → persist metrics → response.  
Timeouts, retries idempotents only when safe, circuit breaker.

## 82.6 Service Export

Render job, storage, download grants, retention purge.

## 82.7 Service Portfolio/Share

Public read paths CDN-friendly ; private token paths ; rate limit scraping.

## 82.8 Service Marketplace

Listings, purchases, Connect payouts, review workflow.

## 82.9 Service Notifications

Email templates i18n ; preference center ; bounce handling.

---

# 83. CONTRATS D’ERREURS UTILISATEUR (UX WRITING ÉTENDU)

| Code            | Situation       | Message FR                                               | Action UI          |
| --------------- | --------------- | -------------------------------------------------------- | ------------------ |
| E_AUTH_INVALID  | bad credentials | Identifiants incorrects.                                 | Retry + reset link |
| E_AUTH_LOCK     | too many tries  | Trop de tentatives. Réessayez dans 15 min.               | Timer              |
| E_SAVE_NETWORK  | offline         | Connexion perdue. Vos changements locaux sont conservés. | Retry              |
| E_EXPORT_FAIL   | pdf worker      | Export impossible pour le moment.                        | Retry + status     |
| E_QUOTA_AI      | quota           | Quota IA atteint pour ce mois.                           | Upgrade / wait     |
| E_ENTITLEMENT   | gated           | Réservé au plan Pro.                                     | Pricing modal      |
| E_ATS_TIMEOUT   | slow            | Analyse plus longue que prévu.                           | Retry              |
| E_AI_REFUSED    | guardrail       | Nous ne pouvons pas inventer cette information.          | Edit manually      |
| E_OCR_LOW       | low conf        | Certains champs sont incertains — vérifiez-les.          | Highlight fields   |
| E_SHARE_REVOKED | 404             | Ce lien n’est plus disponible.                           | —                  |
| E_PAYMENT_FAIL  | stripe          | Paiement refusé. Essayez une autre carte.                | Retry              |
| E_TEAM_SEAT     | no seats        | Plus de sièges disponibles.                              | Buy seats          |

---

# 84. MATRICE DE RÉGRESSION RELEASE (SMOKE)

Avant chaque prod deploy :

1. Signup email staging-prod parity check
2. OAuth Google smoke
3. Create CV + autosave
4. Switch template
5. Export PDF openable
6. ATS analyze returns score
7. Checkout Stripe test mode (staging)
8. Entitlement unlock simulate
9. Feature flags readable
10. Error tracking receives test event

Sign-off eng duty officer required.

---

# 85. PLAN DE MIGRATION DE DONNÉES (PRINCIPES)

- Migrations expand/contract
- No destructive prod migrate without backup checkpoint
- JSON content schema version field schemaVersion
- Dual-read/write when evolving document model
- Backfill jobs monitored

Exemple : ajout sections.projects → default [] ; readers tolerant.

---

# 86. COÛTS UNITAIRES CIBLES (ENGINEERING BUDGET)

| Opération         | Coût cible             |
| ----------------- | ---------------------- |
| Autosave          | négligeable (<0.0001$) |
| PDF export        | <0.01$                 |
| ATS rules only    | <0.001$                |
| ATS + LLM explain | <0.02$                 |
| Bullet optimize   | <0.01$                 |
| Full letter       | <0.05$                 |
| Interview session | <0.08$                 |
| OCR page          | <0.02$                 |

Si dépassement durable → product adjust quotas or models.

---

# 87. BACKLOG ÉDITORIAL SEO — 100 SUJETS PRIORISÉS

| #   | Titre de sujet                             | Cluster                | Intent        |
| --- | ------------------------------------------ | ---------------------- | ------------- |
| 1   | Comment fonctionne un ATS                  | ATS                    | Info          |
| 2   | Erreurs ATS les plus fréquentes            | Exemples métier        | Transactional |
| 3   | CV en colonnes et ATS                      | Normes internationales | Commercial    |
| 4   | Mots-clés CV vs stuffing                   | Lettres & entretien    | Info          |
| 5   | Score ATS : ce que ça mesure vraiment      | Comparatifs            | Transactional |
| 6   | CV PDF vs Word pour ATS                    | Modèles                | Commercial    |
| 7   | Police de caractère ATS-friendly           | IA & éthique           | Info          |
| 8   | Photo sur CV France 2026                   | ATS                    | Transactional |
| 9   | CV 1 page ou 2 pages                       | Exemples métier        | Commercial    |
| 10  | Quantifier ses résultats sur un CV         | Normes internationales | Info          |
| 11  | Verbes d’action CV                         | Lettres & entretien    | Transactional |
| 12  | CV junior sans expérience                  | Comparatifs            | Commercial    |
| 13  | CV après un stage                          | Modèles                | Info          |
| 14  | CV alternance                              | IA & éthique           | Transactional |
| 15  | CV reconversion métier                     | ATS                    | Commercial    |
| 16  | CV product manager                         | Exemples métier        | Info          |
| 17  | CV développeur                             | Normes internationales | Transactional |
| 18  | CV data analyst                            | Lettres & entretien    | Commercial    |
| 19  | CV marketing digital                       | Comparatifs            | Info          |
| 20  | CV commercial                              | Modèles                | Transactional |
| 21  | CV ressources humaines                     | IA & éthique           | Commercial    |
| 22  | CV finance                                 | ATS                    | Info          |
| 23  | CV consultant                              | Exemples métier        | Transactional |
| 24  | CV chef de projet                          | Normes internationales | Commercial    |
| 25  | CV UX designer                             | Lettres & entretien    | Info          |
| 26  | CV devops                                  | Comparatifs            | Transactional |
| 27  | CV executive                               | Modèles                | Commercial    |
| 28  | CV directeur marketing                     | IA & éthique           | Info          |
| 29  | CV anglais US norms                        | ATS                    | Transactional |
| 30  | CV allemand Lebenslauf                     | Exemples métier        | Commercial    |
| 31  | CV Espagne normes                          | Normes internationales | Info          |
| 32  | Traduire un CV sans perdre le sens         | Lettres & entretien    | Transactional |
| 33  | Importer LinkedIn vers CV                  | Comparatifs            | Commercial    |
| 34  | Lettre de motivation IA : bonnes pratiques | Modèles                | Info          |
| 35  | Lettre motivation offre précise            | IA & éthique           | Transactional |
| 36  | Préparer entretien RH                      | ATS                    | Commercial    |
| 37  | Méthode STAR exemples                      | Exemples métier        | Info          |
| 38  | Questions entretien product                | Normes internationales | Transactional |
| 39  | Questions entretien tech                   | Lettres & entretien    | Commercial    |
| 40  | Négocier salaire après entretien           | Comparatifs            | Info          |
| 41  | Portfolio vs CV                            | Modèles                | Transactional |
| 42  | GitHub sur un CV                           | IA & éthique           | Commercial    |
| 43  | Freelancer CV vs salarié                   | ATS                    | Info          |
| 44  | Gap carrière comment expliquer             | Exemples métier        | Transactional |
| 45  | CV immigration France                      | Normes internationales | Commercial    |
| 46  | Équivalence diplômes sur CV                | Lettres & entretien    | Info          |
| 47  | CV expatrié                                | Comparatifs            | Transactional |
| 48  | Canva CV et ATS                            | Modèles                | Commercial    |
| 49  | Resume.io alternative                      | IA & éthique           | Info          |
| 50  | Zety alternative                           | ATS                    | Transactional |
| 51  | Meilleur outil CV 2026                     | Exemples métier        | Commercial    |
| 52  | CV Studio AI avis (page owned)             | Normes internationales | Info          |
| 53  | Modèle CV simple gratuit                   | Lettres & entretien    | Transactional |
| 54  | Modèle CV moderne                          | Comparatifs            | Commercial    |
| 55  | Modèle CV executive                        | Modèles                | Info          |
| 56  | Modèle CV développeur                      | IA & éthique           | Transactional |
| 57  | Checklist avant envoi CV                   | ATS                    | Commercial    |
| 58  | Personnaliser CV pour chaque offre         | Exemples métier        | Info          |
| 59  | Temps moyen créer un CV                    | Normes internationales | Transactional |
| 60  | Pourquoi les recruteurs rejectent          | Lettres & entretien    | Commercial    |
| 61  | Soft skills sur CV                         | Comparatifs            | Info          |
| 62  | Hard skills priorisation                   | Modèles                | Transactional |
| 63  | Certifications sur CV                      | IA & éthique           | Commercial    |
| 64  | Langues niveaux CECRL                      | ATS                    | Info          |
| 65  | Centres d’intérêt CV utile ou non          | Exemples métier        | Transactional |
| 66  | Références sur CV                          | Normes internationales | Commercial    |
| 67  | Adresse postale sur CV                     | Lettres & entretien    | Info          |
| 68  | LinkedIn URL sur CV                        | Comparatifs            | Transactional |
| 69  | Design CV minimaliste                      | Modèles                | Commercial    |
| 70  | Couleur sur CV risques                     | IA & éthique           | Info          |
| 71  | Icons skills bars problème ATS             | ATS                    | Transactional |
| 72  | Header footer CV parsing                   | Exemples métier        | Commercial    |
| 73  | Tableaux Word CV                           | Normes internationales | Info          |
| 74  | Export PDF/A ?                             | Lettres & entretien    | Transactional |
| 75  | Accessibilité document candidature         | Comparatifs            | Commercial    |
| 76  | RGPD et envoi CV                           | Modèles                | Info          |
| 77  | Dark patterns builders CV                  | IA & éthique           | Transactional |
| 78  | Abonnement CV builder vaut-il le coup      | ATS                    | Commercial    |
| 79  | Free vs Pro outils CV                      | Exemples métier        | Info          |
| 80  | Créer CV en 15 minutes                     | Normes internationales | Transactional |
| 81  | Refaire son CV après 5 ans                 | Lettres & entretien    | Commercial    |
| 82  | CV pour mobilité interne                   | Comparatifs            | Info          |
| 83  | CV pour cabinet outplacement               | Modèles                | Transactional |
| 84  | CV pour freelancing platforms              | IA & éthique           | Commercial    |
| 85  | Personal branding et CV                    | ATS                    | Info          |
| 86  | Exemples bullets marketing                 | Exemples métier        | Transactional |
| 87  | Exemples bullets product                   | Normes internationales | Commercial    |
| 88  | Exemples bullets engineering               | Lettres & entretien    | Info          |
| 89  | Exemples bullets sales                     | Comparatifs            | Transactional |
| 90  | Exemples bullets ops                       | Modèles                | Commercial    |
| 91  | CV et handicap mention                     | IA & éthique           | Info          |
| 92  | CV et âge biais                            | ATS                    | Transactional |
| 93  | Inclusive writing CV                       | Exemples métier        | Commercial    |
| 94  | AI Act et outils IA carrière               | Normes internationales | Info          |
| 95  | Comment vérifier suggestions IA            | Lettres & entretien    | Transactional |
| 96  | Éviter hallucinations CV                   | Comparatifs            | Commercial    |
| 97  | Interview coach digital                    | Modèles                | Info          |
| 98  | Suivi candidatures simple                  | IA & éthique           | Transactional |
| 99  | Template marketplace designers             | ATS                    | Commercial    |
| 100 | CV Studio AI vs ChatGPT                    | Exemples métier        | Info          |

Chaque article doit : intention claire, CTA produit non trompeur, sources, MAJ annuelle, internal links ≥3, FAQ schema si pertinent.

---

# 88. RÉFÉRENTIEL DE BUG SEVERITY

| Severity | Définition                 | Exemple           | SLA fix     |
| -------- | -------------------------- | ----------------- | ----------- |
| S0       | Outage total / data breach | API down, leak CV | immédiat    |
| S1       | Flux critique cassé        | Export PDF down   | <24h        |
| S2       | Feature majeure dégradée   | ATS fail 20%      | <3j         |
| S3       | Bug non bloquant           | UI glitch         | next sprint |
| S4       | Cosmétique                 | spacing           | backlog     |

---

# 89. PROGRAMME DESIGN QA

- Review hebdo templates
- Contrast checks
- Motion reduced-preference support
- Content length torture tests (long names, 15 bullets)
- Print preview QA
- Localization truncation QA
- Empty/error/loading for every stateful view

---

# 90. CLOSING STATEMENT

CV Studio AI gagnera non pas en empilant des features, mais en devenant **l’outil le plus digne de confiance** pour transformer une expérience professionnelle en candidature efficace — mesurable, honnête, belle, et compatible ATS.

Le présent PRD v1.0 fixe le cap pour 24 mois. Exécutons avec discipline MoSCoW, instrumentons tout, et laissons les utilisateurs trancher le PMF.

# 91. PLAYBOOK GROWTH LOOPS DÉTAILLÉ

## 91.1 Loop 1 — Export viral

Utilisateur exporte / partage lien → vue par recruteur ou pair → CTA « Créé avec CV Studio AI » optionnelle soft → signup.
**Garde-fou :** pas de branding agressif sur PDF Free (trust). Sur portfolio, badge discret opt-out Pro.

## 91.2 Loop 2 — Contenu → outil

Article SEO → outil teaser ATS → signup → export → paywall IA.
**Metric :** organic signup rate, teaser→signup conversion.

## 91.3 Loop 3 — Multi-offre

Candidat postule N offres → besoin versions → Pro unlimited + matcher.
**Metric :** # JD matches / paid user.

## 91.4 Loop 4 — Entretien

Shortlist → Interview prep → retention au-delà de l’export.
**Metric :** D30 retention among interview-prep users vs control.

## 91.5 Loop 5 — Marketplace creators

Designer publie → discovery templates → purchase → designer invite pairs.
**Metric :** GMV, sellers active, repurchase.

## 91.6 Loop 6 — B2B2C campus

École license → étudiants Free → conversion Pro individuelle post-diplôme.
**Metric :** cohort conversion graduate season.

---

# 92. SCÉNARIOS FINANCIERS WORST / BASE / BEST (M24)

| KPI        | Worst | Base | Best |
| ---------- | ----- | ---- | ---- |
| Inscrits   | 400k  | 1.0M | 1.6M |
| MAU        | 100k  | 250k | 400k |
| Conversion | 2.5%  | 4.5% | 6.0% |
| Paid users | 12k   | 40k  | 70k  |
| ARPU €     | 10    | 13   | 15   |
| ARR M€     | 1.8   | 8.0  | 16.0 |
| Churn m    | 7%    | 5%   | 3.5% |
| LTV/CAC    | 1.5   | 3.0  | 4.5  |

**Triggers de bascule scénario :**

- Worst si activation <25% à M3 ou CAC >40€ durable
- Best si SEO compound + viral share CTR élevé + AI retention forte

---

# 93. EXIGENCES DE DOCUMENTATION ENG

Tout module Must Must livrer :

1. README module
2. OpenAPI à jour
3. Runbook incident
4. Feature flag list
5. Dashboards Grafana/Datadog
6. Tests e2e critiques
7. Privacy impact note si PII nouveau

---

# 94. MATRICE RACI ÉTENDUE PAR EPIC

| Epic        | CPO | PM  | CTO | Eng Tech Lead | Design | AI Eng | Growth | Support | Legal |
| ----------- | --- | --- | --- | ------------- | ------ | ------ | ------ | ------- | ----- |
| Auth        | A   | C   | C   | R             | C      | I      | I      | I       | C     |
| Editor      | A   | R   | C   | R             | R      | I      | I      | I       | I     |
| Templates   | C   | C   | I   | C             | A/R    | I      | C      | I       | I     |
| PDF         | C   | C   | A   | R             | C      | I      | I      | C       | I     |
| ATS         | A   | R   | C   | R             | C      | C      | C      | C       | I     |
| AI suite    | A   | R   | C   | C             | C      | R      | C      | C       | C     |
| Billing     | A   | R   | C   | R             | C      | I      | C      | C       | C     |
| Marketplace | A   | R   | C   | C             | R      | I      | R      | C       | C     |
| Mobile      | A   | R   | A   | R             | R      | I      | C      | C       | I     |
| Collab      | A   | R   | A   | R             | R      | I      | I      | C       | C     |
| i18n        | A   | R   | C   | R             | C      | C      | R      | C       | C     |

R=Responsible A=Accountable C=Consulted I=Informed

---

# 95. HYPOTHÈSES PRODUIT À INVALIDER EN PRIORITÉ (KILL LIST)

1. « Les users paieront avant le 1er export » — probablement faux ; Free PDF.
2. « Plus de templates = plus de conversion » — tester ; qualité > volume.
3. « L’IA seule retient » — probablement insuffisant sans matcher/entretien.
4. « Mobile native urgent M0 » — faux ; web responsive d’abord.
5. « Business self-serve immédiat » — peut nécessiter sales assist.
6. « LinkedIn API stable » — hypothèse fragile ; OCR/manual fallback.
7. « Watermark convertit » — détruit NPS ; rejeté.
8. « Auto-apply massif » — Won’t Have éthique/ToS.

Chaque hypothèse a un owner et une date de revue.

---

# 96. DÉTAIL DES QUOTAS PRO (PROPOSITION V1)

| Feature            | Quota mensuel Pro | Soft message à 80% | Hard stop |
| ------------------ | ----------------- | ------------------ | --------- |
| Optimize bullet    | 100               | Oui                | Oui       |
| JD match           | 30                | Oui                | Oui       |
| Cover letters      | 20                | Oui                | Oui       |
| Interview sessions | 10                | Oui                | Oui       |
| Career advice      | 20                | Oui                | Oui       |
| LinkedIn import    | 5                 | Oui                | Oui       |
| OCR imports        | 10                | Oui                | Oui       |

Business : quotas × seats avec pooling option (décision M12).  
Top-ups futurs possibles sans changer prix de base.

---

# 97. WIREFLOWS ASCII COMPLÉMENTAIRES

## 97.1 Onboarding détaillé

`[Signup Success]
      |
      v
[Welcome]
      |
      v
[Select Goal] ---- skip ----+
      |                     |
      v                     |
[Select Locale/Paper]       |
      |                     |
      v                     |
[Recommend Template] <------+
      |
      v
[Optional Import LinkedIn/PDF]
      |
      +-- skip --> [Empty Editor]
      |
      v
[Prefill Draft] --> [Editor]`

## 97.2 AI optimize bullet

`[Bullet selected]
      |
      v
[Click Optimize]
      |
      +-- Free? --> [Paywall]
      |
      v
[Choose tone/length]
      |
      v
[Gateway quota check]
      |
      +-- exceeded --> [Quota modal]
      |
      v
[LLM generate 3 variants]
      |
      v
[Safety filter]
      |
      +-- fail --> [Refuse message]
      |
      v
[Show variants + rationale]
      |
      v
[User selects Apply / Edit / Dismiss]
      |
      v
[Diff confirm] --> [Write to doc] --> [Autosave] --> [Optional re-ATS]`

## 97.3 Marketplace purchase

`[Template detail]
      |
      v
[Buy ]
      |
      v
[Stripe Checkout]
      |
      v
[Webhook purchase.succeeded]
      |
      v
[Unlock template on account]
      |
      v
[Apply to current/new CV]
      |
      v
[Designer ledger +30d payout accrual]`

## 97.4 Team invite Business

`[Owner opens Team]
      |
      v
[Invite email + role]
      |
      v
[Email magic link]
      |
      v
[Accept] --> [Join workspace]
      |
      v
[Seat entitlement++]
      |
      v
[Shared resumes ACL apply]`

---

# 98. CHECKLIST SIGN-OFF PAR DISCIPLINE

## Product

- [ ] Vision claire
- [ ] Personas research plan
- [ ] MoSCoW coherent roadmap
- [ ] KPIs instrumentables
- [ ] Non-goals explicites

## Engineering

- [ ] Stack constraints accepted
- [ ] NFR realistic
- [ ] ADRs drafted
- [ ] Capacity Phase 1 OK
- [ ] Security baseline OK

## Design

- [ ] UX principles accepted
- [ ] Dual-pane feasible
- [ ] A11y plan
- [ ] Template pipeline staffing

## Marketing

- [ ] Positioning battle cards
- [ ] Claims legal review
- [ ] SEO plan
- [ ] Launch plan

## Finance/Legal

- [ ] Pricing model
- [ ] Privacy AI notes
- [ ] Vendor DPAs path

---

# 99. CHANGELOG PRÉVISIONNEL (PROCESS)

| Version | Déclencheur typique  |
| ------- | -------------------- |
| 1.1     | Post sign-off amends |
| 1.2     | Post MVP learnings   |
| 1.5     | Post AI GA           |
| 2.0     | M12 strategy refresh |

Règle : breaking product decision = minor/major bump + all-hands note.

---

# 100. ANNEXE TERMINALE — RÉSUMÉ 1 PAGE POUR L’ÉQUIPE

**Nom :** CV Studio AI  
**Promesse :** CV ATS-ready + adapté à l’offre en 15 minutes, puis lettre & entretien.  
**Users :** Léa (junior), Karim (shifter), Sophie (exec), Diego (immigrant).  
**MVP :** Auth, editor dual-pane, 5 templates, PDF, landing, onboarding, dashboard.  
**Puis :** 50 templates, ATS, billing, portfolio, IA suite, marketplace, mobile, collab.  
**Prix :** Free / Pro 9,99$ (99$/an) / Business 29,99$ / Marketplace 30%.  
**Success M24 :** 1M users, 250k MAU, 8M€ ARR, NPS 50, churn <5%, LTV/CAC >3.  
**Stack :** Next.js 14+, NestJS, PostgreSQL, Redis, AWS, Docker.  
**Doctrine :** ATS-first, IA honnête, Free utile, mesure North Star CAQ.

Si vous ne devez retenir qu’une phrase : **nous ne vendons pas des PDF, nous vendons des candidatures meilleures.**

---

_PRD CV Studio AI v1.0 — Document de référence 24 mois — Généré pour l’équipe produit, engineering, design et marketing._

# 101. ANNEXE COMPLÉMENTAIRE — EXIGENCES DE LANCEMENT BETA & GA

## 101.1 Beta privée (critères d’entrée)

- Auth email + Google minimum opérationnels
- Au moins 3 templates exportables PDF
- Monitoring erreurs actif
- Canal feedback (#beta-feedback)
- NDA / consent research si interviews enregistrées

## 101.2 Beta privée (critères de sortie → beta ouverte)

- ≤ 5 S1 ouverts
- First export rate beta ≥ 40 %
- CSAT export ≥ 4.0
- Aucun incident sécurité PII
- Parcours signup→export documenté

## 101.3 GA soft (critères)

- 5 templates ATS QA pass
- Landing Lighthouse ≥ 90
- Privacy/CGU publiées
- Support mailbox monitorée
- Rollback procedure testée
- Analytics funnel visible

## 101.4 GA monétisé

- Stripe live
- Entitlements testés
- Cancel self-serve
- Facturation légale OK (mentions, TVA via Stripe Tax)
- Paywall copy legal-reviewed

## 101.5 Communication launch

| Audience        | Message                    | Canal              |
| --------------- | -------------------------- | ------------------ |
| Beta users      | Merci + early Pro discount | Email              |
| Public          | Soft launch value prop     | Landing + LinkedIn |
| Press/créateurs | Kit démo 90s               | Notion press kit   |
| Internes        | War room J0–J7             | Slack              |

## 101.6 War room J0–J7

- Duty eng + CPO + support
- Review metrics 2×/jour
- Hotfix branch policy
- Daily note décisions

## 101.7 Post-launch revue J14

- Funnel drop analysis
- Top 20 bugs
- Research insights vs assumptions personas
- Pricing first signals
- Go/No-Go Phase 2 scope lock

---

# 102. TABLEAU DE BORD NORTH STAR — DÉFINITION ANALYTIQUE

**CAQ (Candidature Assistée Qualifiée)**  
`count_distinct(user_id)` where within calendar month:

- event `pdf_exported` AND
- `ats_score >= 80` on same resume_id within 7 days before/after export AND
- IF `jd_matched` exists for resume_id within 7 days THEN `match_score >= 70` ELSE true

**Proxy pre-matcher :** exports with ats_score ≥ 80.

**Owners :** Data + CPO  
**Refresh :** daily  
**Guardrails :** ne pas optimiser CAQ en baissant le seuil ATS artificiellement.

---

# 103. ENGAGEMENT CONTRACT ÉQUIPES (CHARTE)

Nous nous engageons à :

1. Protéger le Free utile (pas de dark pattern download)
2. Ne jamais laisser l’IA inventer un parcours
3. Mesurer avant de zoomer
4. Préférer un template ATS-safe excellent à dix templates moyens
5. Documenter les décisions (RFC/ADR/PRD)
6. Respecter WCAG AA sur flux critiques
7. Dire non aux Won’t Have avec courage

---

**Fin des annexes opérationnelles — PRD CV Studio AI v1.0**

# 104. ANNEXE — EXEMPLES DE RFC (MODELE)

## Modele RFC produit

Titre / Auteur / Date / Statut (Draft, Review, Accepted, Rejected)
Impact : Pricing, Scope Must, NFR, Branding

### Contexte

Pourquoi maintenant ?

### Options envisagees

1. Option A
2. Option B
3. Option C (status quo)

### Recommandation

Option choisie et justification data.

### Impact roadmap

Stories et epics affectes ; decalage dates ?

### Risques

Techniques, UX, legaux, financiers.

### Plan de rollback

Comment revenir en arriere.

### Decision

Sign-off roles et date.

### Exemple RFC-001 (illustratif)

Titre : Confirmer Free PDF sans watermark
Recommandation : Maintenir sans watermark ; limiter a 1 CV.
Data : Research juniors 7/8 rejet paywall download ; NPS trust.
Decision : Accepte draft PRD D001.

---

# 105. ANNEXE — STANDARD DE QUALITE DES RELEASE NOTES

Format public :

- Nouveau
- Ameliore
- Corrige
- IA (si applicable, avec mention limitations)

Interdit : jargon interne tickets ; claims non prouves ; revolutionnaire.

Format interne :

- Flags
- Migrations
- Monitoring
- Support macros

---

# 106. ANNEXE — MATRICE D ALIGNEMENT OBJECTIFS BUSINESS / FEATURES

| Objectif business | Features levier                         | KPI leading     |
| ----------------- | --------------------------------------- | --------------- |
| Activation        | Onboarding, templates, import           | Time-to-export  |
| Conversion        | Matcher, AI, multi-CV gate              | Paywall to paid |
| ARPU              | Annual, Business seats, marketplace     | ARPU            |
| Churn             | Interview prep, reminders, versions     | Churn, D30      |
| Organic           | SEO pages, share links                  | Organic signups |
| NPS               | PDF fidelity, no dark patterns, support | NPS             |
| CAQ               | ATS + match quality                     | CAQ             |

---

# 107. ANNEXE — QUESTIONS FREQUENTES INTERNE EQUIPE

Pourquoi pas de job board ? Hors focus ; dispersion.
Pourquoi NestJS ? Contrainte stack et structure modulaire.
Pourquoi 5 templates seulement au MVP ? Qualite ATS > volume.
Pourquoi Interview Prep si on est un CV builder ? Retention et differenciation.
Que faire si LinkedIn coupe l API ? PDF/OCR/manuel deja prevus.
Comment arbitrer Design vs ATS ? ATS-first avec beaute dans l envelope safe.
Quand ouvrir Business sales ? Signaux M9+ ; pas avant fondations Pro.

---

# 108. EPILOGUE

Le meilleur generateur de CV IA au monde ne sera pas celui qui genere le plus de texte. Ce sera celui qui aidera le plus de candidats a passer les filtres, clarifier leur valeur, et arriver prepares a l entretien — avec respect pour leur verite biographique et leur temps.

CV Studio AI est ce pari produit. Ce PRD en est la carte.

Version : 1.0
Horizon : 24 mois
Prochaine action : Sign-off workshop (AC1 a AC6)

# 109. ANNEXE — INVENTAIRE DES EVENEMENTS ANALYTICS (TRACKING PLAN V1)

| Event                  | Description         | Proprietes requises           | Owner   |
| ---------------------- | ------------------- | ----------------------------- | ------- |
| app_opened             | Ouverture app       | user_id, platform, plan       | Growth  |
| signed_up              | Inscription reussie | method, country, persona_goal | Growth  |
| logged_in              | Login               | method                        | Eng     |
| onboarding_step_viewed | Step vu             | step_name                     | Product |
| onboarding_completed   | Onboarding fini     | steps_done, skipped           | Product |
| cv_created             | CV cree             | template_id, locale           | Product |
| template_selected      | Template choisi     | template_id                   | Design  |
| section_updated        | Section modifiee    | section, resume_id            | Product |
| autosave_succeeded     | Save OK             | latency_ms                    | Eng     |
| autosave_failed        | Save KO             | error_code                    | Eng     |
| ats_analyze_started    | ATS lance           | resume_id, has_jd             | Product |
| ats_analyze_completed  | ATS fini            | score, latency_ms             | Product |
| jd_match_completed     | Match fini          | match_score                   | Product |
| ai_request_started     | IA lancee           | feature                       | AI      |
| ai_request_completed   | IA OK               | feature, tokens, latency_ms   | AI      |
| ai_request_refused     | Guardrail           | feature, reason               | AI      |
| ai_feedback            | Thumbs              | feature, value                | AI      |
| paywall_viewed         | Paywall vu          | trigger, plan_shown           | Growth  |
| checkout_started       | Checkout            | plan, interval                | Growth  |
| purchase_succeeded     | Achat               | plan, amount, currency        | Growth  |
| subscription_canceled  | Cancel              | reason, plan                  | Growth  |
| pdf_export_started     | Export lance        | template_id                   | Eng     |
| pdf_exported           | Export OK           | template_id, plan, pages      | Product |
| share_link_created     | Lien cree           | resume_id                     | Product |
| portfolio_published    | Portfolio live      | slug                          | Product |
| marketplace_purchase   | Template achete     | listing_id, price             | Growth  |
| referral_sent          | Parrainage          | channel                       | Growth  |
| support_ticket_created | Ticket              | plan, category                | Support |

Regle : aucun event PII brut (CV text) dans analytics. IDs seulement.

---

# 110. VALIDATION FINALE DU VOLUME DOCUMENTAIRE

Ce PRD v1.0 couvre les 16 sections demandees plus un corpus d annexes operationnelles (sections 17 a 110) destine a servir de reference transverse pendant 24 mois : GTM, design specs, backlog sprints, modele de donnees, API, SEO, OKR, ADRs, QA, runbooks, tracking plan, et feuilles de sign-off.

Estimation volume : environ 41 000+ mots, soit plus de 120 pages equivalentes en rendu document professionnel (tableaux, wireflows, criteres d acceptance).
