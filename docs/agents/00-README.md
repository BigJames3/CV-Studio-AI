# Gouvernance des agents — CV Studio AI

**Statut :** ACTIVE  
**Date d'audit :** 2026-09-26  
**Mode :** lecture du dépôt. Aucun code applicatif modifié par cet audit.  
**Périmètre :** working tree lu le 2026-09-26. Un échantillon (`feature-gate.service.ts`) a le même blob que `HEAD` ; le statut git peut marquer des fichiers dirty sans delta de contenu.

Ce dossier est le pack opérationnel des 8 agents. La charte d'ingénierie reste `AGENTS.md` à la racine. En cas de tension sur **qui modifie quel fichier**, ce dossier prime. En cas de tension sur **ce que le produit fait**, le code prime sur ces documents.

## Hiérarchie des sources

```text
1. Code réel (apps/, packages/, prisma, workflows)
2. Tests réels
3. ADR (docs/adr/)
4. Specs techniques actives (*-CV-STUDIO-AI.md)
5. PRD
6. Roadmap
7. Rapports d'audit historiques
```

Une feature du PRD absente du code est `NOT_IMPLEMENTED`. Une route qui renvoie un payload statique ou un faux `jobId` n'est pas `IMPLEMENTED`.

## Les 8 agents

| ID  | Fichier                              | Rôle                                                                        |
| --- | ------------------------------------ | --------------------------------------------------------------------------- |
| 01  | [01-architect.md](./01-architect.md) | Carte, séquençage, arbitrage, docs d'architecture                           |
| 02  | [02-security.md](./02-security.md)   | Audit authz, menaces, docs sécurité. Read-only en campagne d'audit          |
| 03  | [03-qa.md](./03-qa.md)               | Tests uniquement. Ne change pas la logique métier pour faire passer un test |
| 04  | [04-backend.md](./04-backend.md)     | `apps/api` hors zones Billing exclusives                                    |
| 05  | [05-frontend.md](./05-frontend.md)   | `apps/web`, `packages/ui`, UI mobile                                        |
| 06  | [06-ai.md](./06-ai.md)               | `packages/ai-service` + module AI API                                       |
| 07  | [07-billing.md](./07-billing.md)     | Paiements, abonnements, entitlements, webhooks, Connect                     |
| 08  | [08-devops.md](./08-devops.md)       | CI/CD, Docker, Kubernetes, Terraform                                        |

Domaines secondaires (pas d'agent permanent) :

| Domaine                            | Propriétaire                           | Secondaires                                              |
| ---------------------------------- | -------------------------------------- | -------------------------------------------------------- |
| PDF export                         | Backend                                | Security, QA                                             |
| Marketplace HTTP / listings        | Backend                                | Billing (argent), Frontend (UI), Security                |
| Stripe Connect, transfers, payouts | Billing                                | Backend, Security, QA                                    |
| Analytics                          | Backend (persistance) + Frontend (SDK) | Architect pour le choix d'outil                          |
| Prisma / migrations                | Backend                                | Architect (approbation), Billing si modèles d'abonnement |
| Mobile                             | Frontend                               | Backend pour le contrat API                              |
| `docs/architecture`, `docs/adr`    | Architect                              | Tous en lecture                                          |
| `docs/security`                    | Security                               | Architect                                                |
| `docs/ai`                          | AI                                     | Architect                                                |
| `docs/webhooks`                    | Billing                                | Backend                                                  |
| `docs/e2e`                         | QA                                     | Tous                                                     |
| `docs/agents`                      | Architect                              | Tous en lecture                                          |

## Règle anti-conflit

Un agent ne modifie jamais en même temps une zone dont il n'est pas propriétaire, sans coordination de l'Architect.

```text
Backend   → apps/api (sauf modules billing listés dans 07-billing.md)
Frontend  → apps/web, packages/ui, apps/mobile
AI        → packages/ai-service, apps/api/src/modules/ai
Billing   → payments, subscriptions, plans, invoices, webhooks, Connect/payouts
DevOps    → infrastructure/, .github/, Docker de déploiement
QA        → tests (*.spec.ts, *.e2e-spec.ts, apps/web/e2e, packages/ui tests)
Security  → audit + tests de sécurité + docs/security
```

Tout changement qui traverse deux zones propriétaires demande une approbation Architect **avant** le premier diff. Exemple interdit : Backend et Billing éditent `subscriptions/` dans la même vague.

Ordre type d'une correction cross-cutting :

```text
Architect découpe
→ Security confirme le risque (lecture)
→ propriétaire implémente
→ QA ajoute les tests dans sa zone
→ Architect vérifie le diff
```

## Workflow et définition de done

```text
DISCOVER → ANALYZE → PLAN → IMPLEMENT → TEST → SECURITY REVIEW → REGRESSION → DOCUMENT
```

Done : code terminé, tests ajoutés, tests ciblés verts, pas de régression connue, autorisation vérifiée, erreurs validées, diff limité au ticket, pas de secret dans le rapport.

Format de rapport obligatoire : voir chaque fichier agent, section « Reporting format ».

## Carte du dépôt (2026-09-26)

| Zone                       | Réalité                                                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`                 | Next.js 14 App Router. Groupes `(marketing)`, `(auth)`, `(app)`, pages publiques `p/` et `s/`. Éditeur `editor/[resumeId]`, billing, marketplace, seller, dashboard. Zustand + TanStack Query. Gates client dans `useFeatureGate` / catalogue. |
| `apps/api`                 | NestJS, préfixe `/api`, version `v1`. Modules : auth, users, cvs (+ export PDF), templates, subscriptions, plans, payments, invoices, ai, analytics, marketplace, health, geo. Guards globaux JWT + throttler.                                 |
| `apps/mobile`              | Expo ~52, écrans auth/éditeur/paywall/sync WatermelonDB. README : scaffold Phase 0. Pas de tests trouvés.                                                                                                                                      |
| `packages/ai-service`      | Gateway réel pour `optimize-resume` (OpenAI ou heuristique), `cover-letter` et `ats` (heuristique seulement). Autres features : `AI feature not wired yet`.                                                                                    |
| `packages/ui`              | Design system. Un test Vitest bouton.                                                                                                                                                                                                          |
| `packages/shared-utils`    | **Source runtime des quotas CV et gates PDF/share/templates** (`CV_LIMIT_BY_TIER`, `canDownloadPDF`, `getAvailableTemplateTypes`).                                                                                                             |
| `apps/api/prisma`          | Schéma riche. Plusieurs modèles sans usage service (voir ci-dessous).                                                                                                                                                                          |
| `infrastructure/terraform` | Un seul `resource "aws_*"` trouvé : `aws_vpc`. Pas de `aws_eks_cluster` ni `aws_db_instance`.                                                                                                                                                  |
| `infrastructure/k8s`       | Manifests API/web/workers, probes health, cron paiements, fragment Prometheus, notes Grafana.                                                                                                                                                  |
| `.github/workflows`        | `ci.yml` est le CI principal. `cd-staging.yml` / `cd-prod.yml` décrivent un déploiement EKS. `lint.yml`, `test.yml`, `build.yml` recouvrent des tranches en `workflow_dispatch`.                                                               |
| `docs/0x-*.md`             | Index courts vers les specs `*-CV-STUDIO-AI.md`.                                                                                                                                                                                               |
| `docs/adr`                 | 001, 002, 005, 013–021. Pas de 003, 004, 006–012.                                                                                                                                                                                              |

### Routes web présentes

Marketing : `/`, `/pricing`, `/templates`, `/marketplace`, `/marketplace/[id]`, `/privacy`, `/terms`.  
Auth : `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/oauth/linkedin/callback`.  
App : `/dashboard`, `/dashboard/templates`, `/dashboard/profile`, `/editor/[resumeId]`, `/account/*`, `/seller`, `/seller/listings/new`, `/seller/analytics`, `/seller/payouts`.  
Public : `/p/[slug]`, `/s/[slug]`.

### API (contrôleurs)

Auth (register, login, refresh, logout, OAuth Google/LinkedIn/Apple, 2FA, reset, verify, sessions), users, cvs (+ publish, duplicate, share, versions, export pdf/docx), export PDF async (`exports/:jobId`), templates, ai (13 POST), subscriptions, plans, payments + webhooks Stripe/CinetPay, invoices, marketplace, analytics, geo, health.

### Prisma — modèles sans usage `prisma.<model>` dans `apps/api/src`

`Team`, `TeamMember`, `Portfolio`, `CollabSession`, `CollabSnapshot`, `Notification`, `Experience`, `Education`, `Skill`, `Project`, `Language`, `Certificate`.

Le CV vivant est `Cv.content` (JSON). Les tables de sections existent dans le schéma et ne sont pas lues par les services.

## Matrice de fonctionnalités

États : `IMPLEMENTED` (comportement réel + tests présents), `PARTIAL`, `SCAFFOLD`, `MOCK`, `NOT_IMPLEMENTED`.

| Fonctionnalité                                                | Documentation        | Code                                              | Tests                                | État            | Plan annoncé                          | Risque                                      |
| ------------------------------------------------------------- | -------------------- | ------------------------------------------------- | ------------------------------------ | --------------- | ------------------------------------- | ------------------------------------------- |
| Auth email, JWT, refresh, sessions, cookies                   | Oui                  | Oui                                               | Oui (unit + e2e)                     | IMPLEMENTED     | Tous                                  | Low                                         |
| 2FA TOTP                                                      | Oui                  | Oui                                               | Oui                                  | IMPLEMENTED     | Tous                                  | Low                                         |
| OAuth Google                                                  | Oui                  | Oui                                               | Oui                                  | IMPLEMENTED     | Tous                                  | Low                                         |
| OAuth LinkedIn                                                | Oui                  | Oui                                               | Oui                                  | IMPLEMENTED     | Tous                                  | Low                                         |
| Reset mot de passe                                            | Oui                  | Oui                                               | Oui (auth)                           | IMPLEMENTED     | Tous                                  | Low                                         |
| Vérification email                                            | Oui                  | Oui                                               | Oui (auth)                           | IMPLEMENTED     | Tous                                  | Low                                         |
| CV CRUD, versions, restore                                    | Oui                  | Oui                                               | Oui                                  | IMPLEMENTED     | Tous (quota)                          | Low                                         |
| Isolation ownership CV                                        | Oui                  | Oui `cvs.service.get`                             | Partiel (pas d'e2e cross-user dédié) | IMPLEMENTED     | Tous                                  | Medium (trou de test)                       |
| CV public par slug                                            | Oui                  | Oui, `isPublic`                                   | Partiel                              | IMPLEMENTED     | Pro+ à l'exécution                    | Low                                         |
| Éditeur web                                                   | Oui                  | Oui (`editor-shell`, sections, templates)         | Playwright éditeur                   | IMPLEMENTED     | Tous                                  | Low                                         |
| Gates branchés (PDF, share, AI, achat, création CV)           | Oui                  | Oui                                               | Oui (entitlements, feature-gate)     | IMPLEMENTED     | Voir matrice plans                    | Medium (désaligné du catalogue)             |
| Stripe Checkout + signature + idempotence                     | Oui                  | Oui                                               | Oui (unit + e2e)                     | IMPLEMENTED     | Pro/Business                          | Medium                                      |
| Essai Stripe 14 jours                                         | Oui                  | Oui si tier free et pas de `stripeSubscriptionId` | Partiel                              | IMPLEMENTED     | Payant                                | Low                                         |
| Annulation fin de période                                     | Oui                  | Oui (`cancel_at_period_end`)                      | Partiel                              | IMPLEMENTED     | Payant                                | Medium                                      |
| Marketplace catalogue, achat, vendeur, Connect, payouts hebdo | Oui                  | Oui                                               | Oui (`marketplace.service.spec`)     | IMPLEMENTED     | Achat Pro+                            | Medium                                      |
| Factures lecture / download                                   | Oui                  | Oui                                               | Partiel                              | IMPLEMENTED     | Payant                                | Low                                         |
| Health / ready                                                | Oui                  | Oui                                               | Couvert par probes + contrôleur      | IMPLEMENTED     | Ops                                   | Low                                         |
| Catalogue plans API                                           | Oui                  | Oui, **écrase** `cvLimit` via `getCvLimit`        | Oui                                  | IMPLEMENTED     | Tous                                  | High (DTO marketing)                        |
| Export PDF (rendu)                                            | Oui                  | Puppeteer + file d'attente                        | Partiel                              | PARTIAL         | Catalogue : tous ; runtime : pas Free | High (IDOR job)                             |
| AI optimize-resume                                            | Oui                  | OpenAI si clé, sinon heuristique                  | Oui                                  | PARTIAL         | Pro+                                  | Medium                                      |
| AI cover-letter                                               | Oui                  | Heuristique seulement                             | Oui                                  | PARTIAL         | Pro+                                  | Medium                                      |
| AI ATS (score mots-clés + explain heuristique)                | Oui                  | Oui, local                                        | Oui                                  | PARTIAL         | Free teaser / tous les tiers en code  | Medium                                      |
| Cycle CinetPay                                                | Oui                  | Vérif serveur `/v2/payment/check`                 | Oui                                  | PARTIAL         | Géolocalisé                           | High (pas d'expiration, course notify)      |
| Templates officiels                                           | Oui                  | Liste filtrée si authentifié ; GET public complet | Partiel                              | PARTIAL         | Pro « illimité » vs runtime Business  | High                                        |
| Analytics produit                                             | Amplitude dans l'ADR | PostHog + table `AnalyticsEvent`                  | Partiel                              | PARTIAL         | Business dans le PRD, pas de gate     | Medium                                      |
| Quotas IA journaliers                                         | PRD mensuel          | 3 features, check-then-insert                     | Oui (pas de course)                  | PARTIAL         | Pro/Business                          | High (course)                               |
| App mobile                                                    | Oui (Phase 4)        | Écrans Expo, pas de parité                        | Non                                  | PARTIAL         | —                                     | Medium                                      |
| Manifests K8s + workflows CD                                  | Oui                  | YAML présent                                      | CI lint/build                        | PARTIAL         | Prod                                  | High (cluster non vérifié, Terraform creux) |
| Observabilité dans le repo                                    | Oui                  | Fragment Prometheus, notes Grafana, PostHog       | `posthog.spec`                       | PARTIAL         | Prod                                  | Medium                                      |
| OAuth Apple                                                   | Oui                  | `NOT_IMPLEMENTED`                                 | —                                    | NOT_IMPLEMENTED | —                                     | Low                                         |
| Export DOCX                                                   | Oui                  | `FEATURE_UNAVAILABLE`                             | Oui (refus)                          | NOT_IMPLEMENTED | —                                     | Low                                         |
| Teams                                                         | Oui                  | Schéma seul                                       | Non                                  | NOT_IMPLEMENTED | Business                              | High (vendu au catalogue)                   |
| Collab temps réel                                             | Oui                  | Schéma seul                                       | Non                                  | NOT_IMPLEMENTED | Business                              | High                                        |
| Portfolio (modèle Prisma)                                     | Oui                  | Schéma seul ; endpoint AI scaffold                | Non                                  | NOT_IMPLEMENTED | Pro (seed)                            | Medium                                      |
| Notifications                                                 | Oui                  | Schéma seul                                       | Non                                  | NOT_IMPLEMENTED | —                                     | Low                                         |
| Tables de sections CV                                         | ADR-013 / DATABASE   | Schéma seul, JSON utilisé                         | Non                                  | NOT_IMPLEMENTED | —                                     | Medium                                      |
| `api:access`                                                  | Oui                  | Matrice seulement, aucune route                   | Non                                  | NOT_IMPLEMENTED | Business                              | Medium                                      |
| Domaine / branding custom                                     | Oui                  | Colonne plan, pas d'enforcement                   | Non                                  | NOT_IMPLEMENTED | Business                              | Medium                                      |
| Expiration locale d'abonnement                                | Implicite            | Aucun job sur `subscriptionEndDate`               | Non                                  | NOT_IMPLEMENTED | Payant                                | High                                        |
| Upgrade / downgrade sur place                                 | Oui                  | `PATCH me` ignore le DTO                          | Non                                  | NOT_IMPLEMENTED | Payant                                | High                                        |
| AI generate-cv                                                | Oui                  | Faux `jobId`                                      | Scaffold dans les tests              | SCAFFOLD        | Pro+                                  | Medium                                      |
| AI generate-portfolio                                         | Oui                  | Faux `jobId`                                      | Scaffold                             | SCAFFOLD        | Pro+                                  | Low                                         |
| AI grammar-check                                              | Oui                  | Écho du texte                                     | Scaffold                             | SCAFFOLD        | Pro+                                  | Low                                         |
| AI skills-suggest                                             | Oui                  | Suggestions vides                                 | Scaffold                             | SCAFFOLD        | Pro+                                  | Low                                         |
| AI linkedin-import                                            | Oui                  | Faux `jobId`                                      | Scaffold                             | SCAFFOLD        | Pro+                                  | Low                                         |
| AI parse-pdf                                                  | Oui                  | Faux `jobId`                                      | Scaffold                             | SCAFFOLD        | Pro+                                  | Medium                                      |
| AI match-job                                                  | Oui                  | `matchScore: 68` statique                         | Scaffold                             | MOCK            | Pro+                                  | High (score fictif)                         |
| AI interview-prep                                             | Oui                  | Questions statiques                               | Scaffold                             | MOCK            | Pro+                                  | Medium                                      |
| AI career-advice                                              | Oui                  | Cartes statiques                                  | Scaffold                             | MOCK            | Pro+                                  | Medium                                      |

Comptage de cette matrice : **18 IMPLEMENTED**, **11 PARTIAL**, **20** lignes SCAFFOLD / MOCK / NOT_IMPLEMENTED.

Watermark PDF : cité par la page pricing et le PRD. Aucune implémentation de watermark trouvée. Le PDF Free est refusé par le gate, donc le watermark n'est pas un contournement actuel.

## Matrice des plans

Runtime = `packages/shared-utils` + `EntitlementsService`. Le catalogue public (`mapPlanToPublicDto`) et le seed **ne sont pas** la source d'exécution. `EntitlementsService.getTier` lit `User.subscriptionTier`, pas `Subscription.status` ni les dates.

| Feature                                    | Free (runtime)         | Pro                    | Business                 | Frontend catalogue                                                        | Backend                                         | Réalité                                                                            |
| ------------------------------------------ | ---------------------- | ---------------------- | ------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Nombre de CV                               | 1                      | 5                      | 20                       | 1 / 5 / 20 (`getCvLimit`)                                                 | Enforce `cv:create`                             | PRD : Pro/Business illimités. Code : 5 / 20.                                       |
| PDF                                        | Refusé                 | Autorisé               | Autorisé                 | `downloadPdf` included **pour tous**, y compris Free (`plans.service.ts`) | `@FeatureGate('downloadPDF')` + `assertCan`     | Conflit. Seed Free : « PDF export ». Pricing : « Sans watermark sur le PDF Free ». |
| Partage                                    | Refusé                 | Autorisé               | Autorisé                 | `share` included pour tous                                                | `@FeatureGate('share')` + `assertCan` si public | Conflit catalogue vs gate.                                                         |
| Templates premium                          | Types `free` seulement | Types `free` seulement | free+pro+business        | Catalogue : Free 5, Pro/Business `unlimited`                              | `templates:pro` = Business seulement            | Conflit. Pro n'a pas les templates pro.                                            |
| AI generate / optimize / cover / interview | Refusé                 | Autorisé               | Autorisé                 | `aiFeatures` false/true/true                                              | `@RequireEntitlement`                           | Aligné, sauf endpoints scaffold.                                                   |
| ATS                                        | Autorisé, quota 1/jour | 20/jour                | 100/jour                 | Pas distingué de « AI »                                                   | `ai:ats` tous tiers                             | PRD : pas d'AI Free, teaser ATS. Code : ATS Free réel (heuristique).               |
| Quotas optimize / cover                    | 0 / 0 par jour         | 50 / 20                | 200 / 100                | Non audité ligne à ligne dans l'UI                                        | `AiQuotaService`                                | PRD : quotas **mensuels** différents.                                              |
| Achat marketplace                          | Refusé                 | Autorisé               | Autorisé                 | `marketplaceAccess`                                                       | `@RequireEntitlement('marketplace:buy')`        | Aligné.                                                                            |
| Analytics dashboard                        | Pas de gate            | Pas de gate            | Pas de gate              | Pas de gate trouvé                                                        | Contrôleur authentifié sans entitlement         | PRD Business non appliqué.                                                         |
| Teams / collaborate                        | Non                    | Non                    | Flag catalogue seulement | `collaborate` Business                                                    | Aucun module team                               | NOT_IMPLEMENTED.                                                                   |
| API access                                 | Non                    | Non                    | Matrice `api:access`     | Flag Business                                                             | Aucune route ne l'exige                         | NOT_IMPLEMENTED.                                                                   |
| DOCX                                       | Personne               | Personne               | Personne                 | Absent du catalogue                                                       | Tableau vide + exception                        | NOT_IMPLEMENTED.                                                                   |
| Custom domain                              | Non                    | Non                    | Colonne plan             | Flag Business                                                             | Pas d'enforcement                               | NOT_IMPLEMENTED.                                                                   |
| Prix                                       | 0                      | 9,99 / 99              | 29,99 / 299              | EUR (`currency: 'EUR'`)                                                   | Montants serveur, pas le client                 | PRD en dollars.                                                                    |
| Watermark                                  | Non implémenté         | Non implémenté         | Non implémenté           | Promesse « sans watermark Free »                                          | Aucun code watermark                            | Promesse sans feature.                                                             |

## Documents

| Document                                                                                    | Classe                                                                                            |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `PRD-CV-STUDIO-AI.md`                                                                       | ACTIVE comme intention produit. Conflits chiffrés avec le code (CV, PDF, quotas, devise).         |
| `ARCHITECTURE-CV-STUDIO-AI.md`, `03-ARCHITECTURE.md`                                        | ACTIVE. Le fichier numéroté est un index.                                                         |
| `DATABASE-CV-STUDIO-AI.md`                                                                  | CONFLICTING. Décrit une synchro de sections (`SyncCvSectionsCommand`) absente du code.            |
| `04-DATABASE.md`, `docs/prisma/README.md`                                                   | ACTIVE comme pointeurs. Pas une copie du schéma.                                                  |
| `API-CV-STUDIO-AI.md`, `05-BACKEND-API.md`                                                  | ACTIVE / PARTIAL. La surface contrôleurs existe ; le détail marketplace dépasse le tableau court. |
| `FRONTEND-CV-STUDIO-AI.md`, `06-FRONTEND.md`                                                | ACTIVE. Fidélité ligne à ligne non revalidée en entier.                                           |
| `AI-FEATURES-CV-STUDIO-AI.md`, `07-AI.md`                                                   | ACTIVE comme spec. Le code ne réalise pas la majorité des features.                               |
| `SECURITY-CV-STUDIO-AI.md`, `docs/security/*`                                               | ACTIVE comme politique. L'IDOR PDF n'est pas clos par le code.                                    |
| `INFRASTRUCTURE-CV-STUDIO-AI.md`                                                            | ACTIVE comme cible. Terraform réel = scaffold.                                                    |
| `MOBILE-CV-STUDIO-AI.md`                                                                    | ACTIVE comme cible. App = PARTIAL.                                                                |
| `MARKETPLACE-CV-STUDIO-AI.md`                                                               | ACTIVE. L'API marketplace est largement implémentée (avance sur un pur roadmap).                  |
| `ANALYTICS-CV-STUDIO-AI.md`, ADR-018                                                        | CONFLICTING avec PostHog dans le code.                                                            |
| `ROADMAP-24M-CV-STUDIO-AI.md`                                                               | ACTIVE comme plan. Dit Phase 0 specs → Phase 1.                                                   |
| `DELIVERY-STATUS-30-SPRINTS.md`                                                             | CONFLICTING. Coches optimistes vs roadmap et vs scaffolds AI.                                     |
| `STRUCTURE-AUDIT-REPORT.md`, `ANALYSE-COMPLETE-CV-STUDIO-AI.md`, `PLAN-ACTION-BOOTSTRAP.md` | HISTORICAL (juillet 2026, bootstrap).                                                             |
| `VALIDATION_REPORT.md`                                                                      | HISTORICAL. Affirmait l'absence du module plans ; `apps/api/src/modules/plans/` existe.           |
| ADR 001, 002, 005, 014–017, 019–021                                                         | ACTIVE. ADR-013 PARTIAL (JSON seul). ADR-018 CONFLICTING.                                         |
| `AGENTS.md` racine                                                                          | ACTIVE (charte). Ce dossier l'opérationnalise.                                                    |

Ne pas supprimer ni déplacer ces fichiers sans décision Architect.

## Risques classés (résumé)

Détail et propriétaires : [TASK_BOARD.md](./TASK_BOARD.md).

| ID       | Priorité | Fait vérifié                                                                                                                                    |
| -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-001  | P0       | `GET cvs/exports/:jobId` et `/download` ne prennent pas l'utilisateur. Le job ne stocke pas `userId`.                                           |
| SEC-005  | P1       | `optimizeImageForPdf` fait `fetch` sur tout `http(s)` `photoUrl`.                                                                               |
| BILL-001 | P1       | Aucun job n'expire `subscriptionEndDate` / `currentPeriodEnd`. Les gates lisent seulement le tier.                                              |
| BILL-002 | P1       | Une ligne `Subscription` par user (`userId` unique) mais chaque Checkout Stripe crée une session sans bloquer un abonnement Stripe déjà actif.  |
| BILL-003 | P1       | `invoice.payment_failed` passe la subscription en `past_due` sans changer `User.subscriptionTier`.                                              |
| BILL-005 | P1       | Grant CinetPay avant la claim d'idempotence.                                                                                                    |
| API-001  | P1       | Comptage CV puis `create`, sans transaction.                                                                                                    |
| API-002  | P1       | Comptage `aiHistory` puis insert, sans verrou.                                                                                                  |
| FE-001   | P1       | Catalogue et pricing contredisent les gates PDF/share/Free.                                                                                     |
| FE-002   | P1       | Pro affiché « templates illimités » ; le runtime ne donne que les types `free`.                                                                 |
| SEC-006  | P2       | `GET /templates/:id` et `category/:category` sont `@Public()` et renvoient le template, dont `designData`.                                      |
| SEC-007  | P2       | Le chemin WYSIWYG passe le HTML client à Chromium. Le builder échappe ; ce chemin non.                                                          |
| BILL-004 | P2       | `SubscriptionsService.update` retourne `me()` et ignore le DTO.                                                                                 |
| AI-001   | P2       | Neuf endpoints AI scaffold ou mock.                                                                                                             |
| AI-002   | P2       | `queued()` fabrique un `jobId` sans file BullMQ.                                                                                                |
| OPS-001  | P2       | `terraform.yml` : `continue-on-error` sur fmt, credentials, et `terraform apply -auto-approve`. `cd-staging.yml` : `cosign sign ... \|\| true`. |
| OPS-003  | P2       | Observabilité repo incomplète (notes Grafana). Cluster vivant non vérifié.                                                                      |
| SEC-003  | P3       | `POST /templates/seed` : tout JWT hors production, pas de rôle admin.                                                                           |
| DOC-001  | P3       | ADR-018 Amplitude vs PostHog dans le code.                                                                                                      |
| DOC-002  | P3       | Doc hybrid storage vs JSON seul.                                                                                                                |
| DATA-001 | P3       | Modèles Prisma inutilisés. Ne pas drop sans décision humaine.                                                                                   |

Hypothèses **non** confirmées, donc **sans** tâche :

- SEC-002 (ownership CV cassé) : **faux**. `CvsService.get` refuse `cv.userId !== userId`.
- SEC-004 (bypass général des plans) : **faux comme énoncé**. Les gates existent. Les écarts réels sont SEC-001, SEC-006, et les features non branchées (`api:access`, analytics, teams).
- OPS-002 (staging absent) : **UNKNOWN**. Les workflows nomment `cvstudio-staging`. L'existence du cluster AWS n'a pas été vérifiée.

## Décisions humaines

Liste complète : [DECISIONS.md](./DECISIONS.md). Ne pas trancher seul le pricing, le provider analytics, la suppression de modèles, ni quelles routes AI mock supprimer ou implémenter.

## Limites de cet audit

- Tests non exécutés.
- AWS, Stripe live, et le cluster EKS non interrogés.
- Les très longs documents produit ont été échantillonnés (en-têtes, chiffres de plans, contradictions recherchées), pas relus ligne à ligne.
- Profondeur du workflow litiges marketplace : endpoints présents ; machine d'état complète non rejouée.

## Journal

[CHANGELOG.md](./CHANGELOG.md)
