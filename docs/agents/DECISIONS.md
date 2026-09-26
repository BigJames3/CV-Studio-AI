# Décisions

Date de relevé : 2026-09-26. Les décisions « Accepted » viennent des ADR ou du code déjà livré. Rien ici n'est une nouvelle politique inventée par l'audit.

Statuts utilisés : `ACCEPTED` (ADR ou code cohérent), `PARTIAL` (ADR accepté, code incomplet), `CONFLICTING`, `DECISION_REQUIRED`.

## Décisions déjà visibles

### ADR-001 — Monorepo Turborepo

- Statut : ACCEPTED
- Preuve : `pnpm-workspace`, `turbo`, packages `@cvstudio/*`
- Source : `docs/adr/001-monorepo-turborepo.md`

### ADR-002 — Monolithe modulaire NestJS

- Statut : ACCEPTED
- Preuve : `apps/api/src/modules/*`, un seul déploiement API
- Source : `docs/adr/002-modular-monolith.md`

### ADR-005 — Contenu CV en JSONB

- Statut : ACCEPTED dans le code
- Preuve : `Cv.content` lu et écrit par `cvs.service`, l'export PDF et l'ATS
- Source : `docs/adr/005-jsonb-resume-content.md`

### ADR-013 — Stockage hybride (JSON + tables de sections)

- Statut : PARTIAL / non implémenté
- Preuve : modèles `Experience`, `Education`, `Skill`, `Project`, `Language`, `Certificate` dans le schéma ; aucun usage Prisma dans `apps/api/src`. `SyncCvSectionsCommand` cité par `docs/DATABASE-CV-STUDIO-AI.md` est absent du code.
- Suite : DOC-002, DATA-001. Ne pas implémenter la synchro ni drop les tables sans décision humaine.

### ADR-014 — Mobile offline WatermelonDB

- Statut : PARTIAL
- Preuve : `apps/mobile/src/db/` existe. L'app reste un scaffold Phase 0 (README mobile). Pas de tests.
- Source : `docs/adr/014-mobile-offline-watermelondb.md`

### ADR-015 — Mobile Stripe wallets

- Statut : PARTIAL
- Preuve : dépendance et écrans paywall présents. Parité de paiement non établie par des tests.
- Source : `docs/adr/015-mobile-stripe-wallets.md`

### ADR-016 — Baseline sécurité

- Statut : ACCEPTED comme intention. Écarts ouverts : SEC-001, SEC-005, SEC-006, SEC-007.
- Source : `docs/adr/016-security-baseline.md`

### ADR-017 — EKS, Terraform, CI/CD

- Statut : PARTIAL
- Preuve : workflows CD et manifests k8s présents. Terraform : seul `resource "aws_vpc"` trouvé. Modules EKS/RDS sans ressource cluster/instance.
- Source : `docs/adr/017-eks-terraform-cicd.md`
- Suite : OPS-001. Ne pas déclarer la prod déployée.

### ADR-018 — Amplitude analytics

- Statut : CONFLICTING
- Décision écrite : Amplitude primaire, PostHog plus tard, pas de contenu CV dans les events.
- Code : PostHog uniquement (`apps/api/src/observability/posthog.ts`, client web). Table `AnalyticsEvent`. Aucun package Amplitude trouvé.
- Suite : DOC-001. `DECISION_REQUIRED`.

### ADR-019 — Marketplace Stripe Connect, commission

- Statut : ACCEPTED sur le parcours code (onboarding Connect, checkout, job de payout hebdomadaire)
- Le pourcentage et les délais de hold sont dans le code marketplace ; ne pas les changer dans une tâche sans rapport Billing.
- Source : `docs/adr/019-marketplace-connect-30.md`

### ADR-020 — Gouvernance roadmap 24 mois

- Statut : ACCEPTED comme document de planification
- Conflit de statut d'avancement : `ROADMAP-24M-CV-STUDIO-AI.md` parle d'une Phase 0 specs vers Phase 1 ; `DELIVERY-STATUS-30-SPRINTS.md` coche des sprints comme faits. Le code est la référence de ce qui est livré (matrice dans `00-README.md`).
- Source : `docs/adr/020-roadmap-24m-governance.md`

### ADR-021 — Tailwind + shadcn, pas de CSS-in-JS

- Statut : ACCEPTED
- Preuve : `apps/web`, `packages/ui`
- Source : `docs/adr/021-tailwind-shadcn-no-css-in-js.md`

### Auth et sessions

- Statut : ACCEPTED (code + tests)
- JWT access, refresh rotatif avec détection de réutilisation, cookies httpOnly, sessions révocables, TOTP, Google, LinkedIn
- Apple : non implémenté (`auth.service`)
- Secrets de boot : `assertAuthSecrets()` dans `main.ts`

### Webhooks Stripe fail-closed

- Statut : ACCEPTED
- Preuve : `constructEvent`, stockage `StripeWebhookEvent`, doc `docs/STRIPE-WEBHOOK-FAIL-CLOSED.md`
- CinetPay : pas de HMAC du body ; vérification par API `/v2/payment/check`. Course de grant : BILL-005, pas une remise en cause de la vérif montant.

### Entitlements lus depuis la base

- Statut : ACCEPTED
- `EntitlementsService` recharge `User.subscriptionTier` (le JWT peut être périmé après un webhook)
- Écart : il ne lit pas `Subscription.status` ni la date de fin (BILL-001, BILL-003)

### Quotas CV runtime

- Statut : ACCEPTED dans le code, CONFLICTING avec le PRD
- Code et tests : Free 1, Pro 5, Business 20 (`packages/shared-utils`, seed, specs)
- PRD §9.3 : Pro et Business illimités
- Ce n'est pas un bug silencieux à « corriger » vers l'illimité. `DECISION_REQUIRED` si le produit veut changer.

### PDF et partage Free

- Statut : CONFLICTING
- Runtime : refusés pour `free` (`canDownloadPDF` / `canShare`)
- Catalogue, seed, page pricing : PDF (et partage) inclus, promesse sans watermark
- `DECISION_REQUIRED` pour changer l'offre. Voir FE-001.

### Templates Pro

- Statut : CONFLICTING
- Runtime : types premium réservés à Business
- Catalogue : Pro illimité / seed « 50+ templates »
- `DECISION_REQUIRED`. Voir FE-002.

### DOCX

- Statut : ACCEPTED comme non livré
- Commentaire dans `entitlements.service.ts` : générateur pas prêt, entitlement vide
- `cvs.service` lève `FEATURE_UNAVAILABLE`

### Devise affichée

- Statut : CONFLICTING
- API publique : `currency: 'EUR'`, prix 0 / 9,99 / 29,99
- PRD : montants en dollars
- `DECISION_REQUIRED` avant tout changement de prix

### Quotas AI

- Statut : ACCEPTED comme mécanisme journalier dans le code
- Chiffres : optimize 0/50/200, cover 0/20/100, ats-explain 1/20/100 par jour
- PRD : tableau mensuel différent
- `DECISION_REQUIRED` avant d'aligner les nombres

### AI optimize

- Statut : ACCEPTED
- Provider OpenAI si clé ou `AI_PROVIDER=openai`, sinon heuristique, avec repli heuristique si l'appel échoue

### Cover letter et ATS

- Statut : ACCEPTED comme heuristiques, pas comme LLM
- Ne pas les documenter comme modèles distants tant que `gateway.ts` ne les appelle pas

### Gouvernance des 8 agents

- Statut : ACCEPTED
- Charte : `AGENTS.md`
- Pack opérationnel : `docs/agents/`
- Un agent n'édite pas la zone d'un autre sans l'Architect
- Security reste en lecture pendant une campagne d'audit

### Numérotation des ADR

- Les identifiants 003, 004, 006–012 ne sont pas dans `docs/adr/`. Ne pas les inventer. Le prochain ADR prend le prochain numéro libre après 021, sauf si un fichier manquant est retrouvé.

## Décisions requises (humain)

Ne pas coder ces choix dans une tâche technique.

| ID                    | Sujet                                                     | Options observées, pas un choix                                                                                                                                                                                                                             |
| --------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HUMAN-PRICING-PDF     | PDF et partage Free                                       | Runtime refuse. Catalogue et pricing accordent. Watermark absent des deux côtés du code.                                                                                                                                                                    |
| HUMAN-CV-CAP          | Caps CV                                                   | Code 1/5/20. PRD illimité en Pro/Business.                                                                                                                                                                                                                  |
| HUMAN-TEMPLATES       | Templates du plan Pro                                     | Runtime = Business seulement. Catalogue = illimité.                                                                                                                                                                                                         |
| HUMAN-CURRENCY        | Devise                                                    | EUR dans l'API. USD dans le PRD.                                                                                                                                                                                                                            |
| HUMAN-AI-QUOTA        | Unité des quotas AI                                       | Journalier dans le code. Mensuel dans le PRD.                                                                                                                                                                                                               |
| HUMAN-AI-SCOPE        | Neuf routes scaffold/mock                                 | Les garder visibles, répondre non implémenté, ou les construire. Pas les trois à la fois.                                                                                                                                                                   |
| HUMAN-ANALYTICS       | Outil produit                                             | ADR Amplitude. Code PostHog.                                                                                                                                                                                                                                |
| HUMAN-STORAGE         | Tables de sections et Teams/Collab/Notification/Portfolio | Les laisser, les implémenter, ou planifier un retrait. Pas de DROP dans cet audit.                                                                                                                                                                          |
| HUMAN-UPGRADE         | Changement de plan                                        | PATCH no-op. Checkout crée une nouvelle session. Risque de second abonnement Stripe (BILL-002). **Le correctif `8a992bb` (non mergé) a choisi : changement sur place, upgrade facturé immédiatement, downgrade crédité. À valider ou refuser avant merge.** |
| HUMAN-PAST-DUE        | Accès pendant `past_due`                                  | Aujourd'hui le tier payant reste. Faut-il une grâce ? **Le correctif `a8fadb2` (non mergé) a choisi : 7 jours en `past_due`, 72 h après `currentPeriodEnd`. À valider ou ajuster avant merge.**                                                             |
| HUMAN-TERRAFORM       | Appliquer le scaffold                                     | Les modules ne créent pas EKS/RDS. L'apply CI est en `continue-on-error`. Ne pas lancer un apply réel sur cette base sans revue.                                                                                                                            |
| HUMAN-TEMPLATE-PUBLIC | `designData` public                                       | SEC-006. Aperçu marketing ou refus.                                                                                                                                                                                                                         |

## Ce qui n'est pas une décision

- SEC-002 n'est pas ouvert.
- L'existence du cluster de staging n'est pas tranchée (UNKNOWN).
