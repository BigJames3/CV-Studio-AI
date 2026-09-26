# Task board — audit 2026-09-26

Seules les tâches dont le code confirme le problème. Les hypothèses infirmées sont en bas, sans ticket.

Statut initial de toutes les lignes : `OPEN`.

Priorité produit du dépôt : P0 sécurité, P1 argent / intégrité, P2 fonctionnel, P3 UX / docs.

## P0

### SEC-001

| Champ          | Valeur                                                                                                                                                                                                                                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | SEC-001                                                                                                                                                                                                                                                                                                                                             |
| Priority       | P0                                                                                                                                                                                                                                                                                                                                                  |
| Domain         | PDF / API                                                                                                                                                                                                                                                                                                                                           |
| Description    | `GET /api/v1/cvs/exports/:jobId` et `GET .../download` exigent un JWT mais pas le propriétaire. `getJobStatus` et `getJobBuffer` ne comparent aucun `userId`. Le job enregistré n'a pas de `userId`. L'enqueue, lui, vérifie `cv.userId`. Un utilisateur authentifié qui connaît ou devine `pdf_${cvId}_${Date.now()}` peut lire le PDF d'un autre. |
| Risk           | Fuite du contenu de CV.                                                                                                                                                                                                                                                                                                                             |
| Owner          | Backend                                                                                                                                                                                                                                                                                                                                             |
| Dependencies   | Security (relecture), QA (test cross-user)                                                                                                                                                                                                                                                                                                          |
| Status         | OPEN                                                                                                                                                                                                                                                                                                                                                |
| Files          | `apps/api/src/modules/cvs/export/export.controller.ts`, `apps/api/src/modules/cvs/export/pdf-export.service.ts`                                                                                                                                                                                                                                     |
| Tests required | Utilisateur B ne peut ni poll ni download le job de A. Le cas « pas encore prêt » et « job inconnu » restent couverts. Étendre `pdf-export-auth.spec.ts`, qui ne vérifie aujourd'hui que l'absence de `@Public()` sur le rendu.                                                                                                                     |

## P1

### SEC-005

| Champ          | Valeur                                                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | SEC-005                                                                                                                                                                            |
| Priority       | P1                                                                                                                                                                                 |
| Domain         | PDF / SSRF                                                                                                                                                                         |
| Description    | `optimizeImageForPdf` fait `fetch` sur toute URL `http://` ou `https://` fournie comme photo, timeout 8s, sans allowlist. Le blocage réseau Chromium ne couvre pas cet appel Node. |
| Risk           | SSRF depuis le processus API/worker vers le réseau interne.                                                                                                                        |
| Owner          | Backend                                                                                                                                                                            |
| Dependencies   | Security                                                                                                                                                                           |
| Status         | OPEN                                                                                                                                                                               |
| Files          | `apps/api/src/modules/cvs/export/optimize-image.ts`                                                                                                                                |
| Tests required | URL non allowlist refusée ou ignorée sans requête. Data-URL légitime encore acceptée.                                                                                              |

### BILL-001

| Champ          | Valeur                                                                                                                                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | BILL-001                                                                                                                                                                                                                                                                                                                                |
| Priority       | P1                                                                                                                                                                                                                                                                                                                                      |
| Domain         | Billing                                                                                                                                                                                                                                                                                                                                 |
| Description    | Les gates lisent `User.subscriptionTier` et ignorent `subscriptionEndDate` / `currentPeriodEnd`. Aucun job sous `apps/api/src` ne référence ces dates. `expire-pending-payments.job.ts` n'expire que les paiements pending. Stripe peut encore révoquer via webhook ; CinetPay (et tout grant sans event de fin) laisse le tier payant. |
| Risk           | Droits Pro/Business après la fin de période.                                                                                                                                                                                                                                                                                            |
| Owner          | Billing                                                                                                                                                                                                                                                                                                                                 |
| Dependencies   | QA, Security (lecture)                                                                                                                                                                                                                                                                                                                  |
| Status         | OPEN                                                                                                                                                                                                                                                                                                                                    |
| Files          | `apps/api/src/modules/subscriptions/entitlements.service.ts`, `apps/api/src/modules/subscriptions/subscriptions.service.ts`, `apps/api/src/modules/payments/jobs/expire-pending-payments.job.ts`                                                                                                                                        |
| Tests required | Date de fin passée → tier `free` et `can()` faux pour `cv:export:pdf`. Stripe `cancel_at_period_end` encore honoré jusqu'à l'event ou la date, selon la règle écrite dans la tâche (ne pas inventer la règle : proposer, faire valider).                                                                                                |

### BILL-002

| Champ          | Valeur                                                                                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | BILL-002                                                                                                                                                                                                                        |
| Priority       | P1                                                                                                                                                                                                                              |
| Domain         | Billing                                                                                                                                                                                                                         |
| Description    | `Subscription.userId` est unique (une ligne locale). `createCheckout` ouvre une session Stripe sans refuser un `stripeSubscriptionId` déjà actif. Deux abonnements Stripe peuvent exister ; la ligne locale n'en reflète qu'un. |
| Risk           | Double facturation, tier écrasé par le dernier webhook.                                                                                                                                                                         |
| Owner          | Billing                                                                                                                                                                                                                         |
| Dependencies   | Architect si le comportement « portail client vs refus » est ambigu — `HUMAN_DECISION_REQUIRED` sur l'UX de changement de plan, pas sur le fait du trou                                                                         |
| Status         | OPEN                                                                                                                                                                                                                            |
| Files          | `apps/api/src/modules/subscriptions/subscriptions.service.ts`                                                                                                                                                                   |
| Tests required | Second checkout alors qu'une subscription Stripe active est enregistrée : refus ou mise à jour explicite, pas une seconde souscription silencieuse.                                                                             |

### BILL-003

| Champ          | Valeur                                                                                                                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | BILL-003                                                                                                                                                                                                             |
| Priority       | P1                                                                                                                                                                                                                   |
| Domain         | Billing                                                                                                                                                                                                              |
| Description    | `onInvoiceFailed` passe `Subscription.status` à `past_due` et ne modifie pas `User.subscriptionTier`. Les entitlements continuent d'accorder le plan payant.                                                         |
| Risk           | Service payant après échec de paiement, tant que Stripe n'envoie pas une révocation.                                                                                                                                 |
| Owner          | Billing                                                                                                                                                                                                              |
| Dependencies   | QA. Règle exacte (garder l'accès en past_due ou non) : `HUMAN_DECISION_REQUIRED` si le produit veut une grâce. Le ticket peut au minimum aligner la lecture des droits sur `status` pour ne plus ignorer `past_due`. |
| Status         | OPEN                                                                                                                                                                                                                 |
| Files          | `apps/api/src/modules/payments/payments.service.ts` (`onInvoiceFailed`), `entitlements.service.ts`                                                                                                                   |
| Tests required | Après `invoice.payment_failed`, le snapshot d'entitlements correspond à la règle choisie. Replay du webhook toujours idempotent.                                                                                     |

### BILL-005

| Champ          | Valeur                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ID             | BILL-005                                                                                                                                                                                                                       |
| Priority       | P1                                                                                                                                                                                                                             |
| Domain         | Billing / CinetPay                                                                                                                                                                                                             |
| Description    | Le grant de période s'exécute avant la claim `updateMany` qui marque le paiement completed. Deux notifications concurrentes encore `pending` peuvent accorder deux fois. La vérif serveur du montant, elle, est bien présente. |
| Risk           | Double extension de période.                                                                                                                                                                                                   |
| Owner          | Billing                                                                                                                                                                                                                        |
| Dependencies   | QA                                                                                                                                                                                                                             |
| Status         | OPEN                                                                                                                                                                                                                           |
| Files          | `apps/api/src/modules/payments/gateways/cinetpay.gateway.ts`                                                                                                                                                                   |
| Tests required | Deux grants concurrents sur le même `transactionId` : une seule extension.                                                                                                                                                     |

### API-001

| Champ          | Valeur                                                                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | API-001                                                                                                                                                                                      |
| Priority       | P1                                                                                                                                                                                           |
| Domain         | Quotas CV                                                                                                                                                                                    |
| Description    | `EntitlementsService.can('cv:create')` compte les CV puis `CvsService` crée la ligne, sans transaction ni contrainte qui borne le nombre. Deux créations parallèles peuvent dépasser 1/5/20. |
| Risk           | Dépassement de quota.                                                                                                                                                                        |
| Owner          | Backend                                                                                                                                                                                      |
| Dependencies   | Billing si la contrainte doit vivre dans `EntitlementsService` — Architect séquence. QA                                                                                                      |
| Status         | OPEN                                                                                                                                                                                         |
| Files          | `apps/api/src/modules/cvs/cvs.service.ts`, `apps/api/src/modules/subscriptions/entitlements.service.ts`                                                                                      |
| Tests required | Deux creates concurrents au plafond : un seul succès.                                                                                                                                        |

### API-002

| Champ          | Valeur                                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | API-002                                                                                                                                                  |
| Priority       | P1                                                                                                                                                       |
| Domain         | Quotas AI                                                                                                                                                |
| Description    | `AiQuotaService` compte les lignes `aiHistory` du jour, puis `ai.service` insère plus tard, sans verrou. Le bucket ATS réutilise `actionType: jd_match`. |
| Risk           | Dépassement des quotas journaliers.                                                                                                                      |
| Owner          | AI                                                                                                                                                       |
| Dependencies   | QA. Ne pas changer les chiffres 0/50/200 sans décision produit.                                                                                          |
| Status         | OPEN                                                                                                                                                     |
| Files          | `apps/api/src/modules/ai/ai-quota.service.ts`, `apps/api/src/modules/ai/ai.service.ts`                                                                   |
| Tests required | Deux optimize concurrents à la limite : un seul accepté.                                                                                                 |

### FE-001

| Champ          | Valeur                                                                                                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | FE-001                                                                                                                                                                                                                                                                                |
| Priority       | P1                                                                                                                                                                                                                                                                                    |
| Domain         | Plans / catalogue                                                                                                                                                                                                                                                                     |
| Description    | `mapPlanToPublicDto` met `downloadPdf` et `share` à `included: true` pour chaque plan, y compris Free. Le seed Free dit « PDF export ». La page pricing dit « Sans watermark sur le PDF Free ». `canDownloadPDF` et `canShare` sont faux pour `free`. Aucun code de watermark trouvé. |
| Risk           | Offre affichée fausse. Encaissement sur une promesse que le serveur refuse.                                                                                                                                                                                                           |
| Owner          | Billing pour le DTO et le seed. Frontend pour le libellé pricing.                                                                                                                                                                                                                     |
| Dependencies   | Architect séquence les deux fichiers. `HUMAN_DECISION_REQUIRED` seulement si l'on veut **donner** le PDF au Free. Alignement du texte sur le runtime actuel peut partir sans changer l'offre.                                                                                         |
| Status         | OPEN                                                                                                                                                                                                                                                                                  |
| Files          | `apps/api/src/modules/plans/plans.service.ts`, `apps/api/prisma/seed.ts`, `apps/web/src/app/(marketing)/pricing/page.tsx`, catalogues web qui recopient `FALLBACK_PLANS`                                                                                                              |
| Tests required | Le DTO public Free n'annonce pas PDF ni share. Spec plans existant à mettre à jour pour le nouveau contrat, pas l'inverse.                                                                                                                                                            |

### FE-002

| Champ          | Valeur                                                                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | FE-002                                                                                                                                                                                                                                      |
| Priority       | P1                                                                                                                                                                                                                                          |
| Domain         | Templates / plans                                                                                                                                                                                                                           |
| Description    | Le catalogue met `templates` à `unlimited` pour Pro et Business. `getAvailableTemplateTypes` ne renvoie `pro` et `business` que si le tier est `business`. `canAccessProTemplates` est faux pour Pro. Le seed Pro promet « 50+ templates ». |
| Risk           | Pro paie une offre templates qu'il n'a pas.                                                                                                                                                                                                 |
| Owner          | Billing (catalogue + matrice) avec Architect. Frontend aligne l'affichage.                                                                                                                                                                  |
| Dependencies   | `HUMAN_DECISION_REQUIRED` : Pro doit-il avoir les templates pro ? Ne pas élargir `canAccessProTemplates` sans réponse.                                                                                                                      |
| Status         | OPEN                                                                                                                                                                                                                                        |
| Files          | `packages/shared-utils/src/index.ts`, `apps/api/src/modules/plans/plans.service.ts`, `apps/api/prisma/seed.ts`                                                                                                                              |
| Tests required | Le DTO et `getAvailableTemplateTypes` décrivent la même règle, quelle qu'elle soit après décision.                                                                                                                                          |

## P2

### SEC-006

| Champ          | Valeur                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | SEC-006                                                                                                                                                                                                             |
| Priority       | P2                                                                                                                                                                                                                  |
| Domain         | Templates                                                                                                                                                                                                           |
| Description    | `GET /templates/:id` et `GET /templates/category/:category` sont `@Public()` et renvoient le template stocké, y compris `designData`. La liste authentifiée filtre par plan. Le design marketplace, lui, est gated. |
| Risk           | Données de template premium lisibles sans droit.                                                                                                                                                                    |
| Owner          | Backend                                                                                                                                                                                                             |
| Dependencies   | `HUMAN_DECISION_REQUIRED` si le marketing doit montrer un aperçu public. Security                                                                                                                                   |
| Status         | OPEN                                                                                                                                                                                                                |
| Files          | `apps/api/src/modules/templates/templates.controller.ts`, `templates.service.ts`                                                                                                                                    |
| Tests required | Anonyme ne reçoit pas `designData` d'un template non free, ou la décision produit documentée est testée.                                                                                                            |

### SEC-007

| Champ          | Valeur                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | SEC-007                                                                                                                                                                                 |
| Priority       | P2                                                                                                                                                                                      |
| Domain         | PDF                                                                                                                                                                                     |
| Description    | Le chemin WYSIWYG passe le HTML client à Chromium (`setContent`). `pdf-html.builder.ts` échappe ; ce chemin non. Les requêtes réseau Chromium sont limitées, le body HTML est plafonné. |
| Risk           | HTML non fiable dans le worker PDF (contenu, charges).                                                                                                                                  |
| Owner          | Backend                                                                                                                                                                                 |
| Dependencies   | Security, Frontend si le contrat d'export change                                                                                                                                        |
| Status         | OPEN                                                                                                                                                                                    |
| Files          | `apps/api/src/modules/cvs/export/pdf-export.service.ts`, `pdf-generator.service.ts`, `pdf-html.builder.ts`                                                                              |
| Tests required | Un payload script/iframe ne sort pas exécutable, selon la politique choisie (sanitize ou refus).                                                                                        |

### BILL-004

| Champ          | Valeur                                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | BILL-004                                                                                                                                                                                                                                |
| Priority       | P2                                                                                                                                                                                                                                      |
| Domain         | Billing                                                                                                                                                                                                                                 |
| Description    | `SubscriptionsService.update` ignore `UpdateSubscriptionDto` et retourne `me()`. Il n'y a pas d'appel Stripe `subscriptions.update` pour changer de prix. Le passage Pro→Business observé dans les tests passe par un nouveau checkout. |
| Risk           | Client qui croit changer de plan via PATCH ne change rien.                                                                                                                                                                              |
| Owner          | Billing                                                                                                                                                                                                                                 |
| Dependencies   | FE-002 / BILL-002. Décision : supprimer l'endpoint, ou implémenter le changement de prix. `HUMAN_DECISION_REQUIRED` sur le parcours.                                                                                                    |
| Status         | OPEN                                                                                                                                                                                                                                    |
| Files          | `apps/api/src/modules/subscriptions/subscriptions.service.ts`, `subscriptions.controller.ts`                                                                                                                                            |
| Tests required | Le contrat publié (erreur explicite ou vrai changement) est celui testé.                                                                                                                                                                |

### AI-001

| Champ          | Valeur                                                                                                                                                                                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AI-001                                                                                                                                                                                                                                                                                                          |
| Priority       | P2                                                                                                                                                                                                                                                                                                              |
| Domain         | AI                                                                                                                                                                                                                                                                                                              |
| Description    | Neuf routes répondent un succès ou une file fictive : generate-cv, match-job (`matchScore: 68`), interview-prep, career-advice, generate-portfolio, grammar-check, skills-suggest, linkedin-import, parse-pdf. Le gateway répond `AI feature not wired yet` pour tout feature hors optimize, cover-letter, ats. |
| Risk           | Produit et support traitent un mock comme un résultat.                                                                                                                                                                                                                                                          |
| Owner          | AI                                                                                                                                                                                                                                                                                                              |
| Dependencies   | `HUMAN_DECISION_REQUIRED` : implémenter, ou répondre 501 / retirer de l'UI. Ne pas tout implémenter dans cette tâche.                                                                                                                                                                                           |
| Status         | OPEN                                                                                                                                                                                                                                                                                                            |
| Files          | `apps/api/src/modules/ai/ai.service.ts`, `packages/ai-service/src/gateway.ts`, écrans web qui appellent ces routes (Frontend, vague suivante)                                                                                                                                                                   |
| Tests required | La réponse ne peut plus être confondue avec un score réel. Les tests qui assertent `68` sont mis à jour par QA/AI ensemble.                                                                                                                                                                                     |

### AI-002

| Champ          | Valeur                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AI-002                                                                                                                                            |
| Priority       | P2                                                                                                                                                |
| Domain         | AI                                                                                                                                                |
| Description    | `queued()` fabrique `ai_${feature}_${userId}_${Date.now()}` et un message « Wire packages/ai-service + BullMQ ». Aucun worker ne consomme ces id. |
| Risk           | Clients qui pollent un job inexistant.                                                                                                            |
| Owner          | AI                                                                                                                                                |
| Dependencies   | AI-001 (même décision produit)                                                                                                                    |
| Status         | OPEN                                                                                                                                              |
| Files          | `apps/api/src/modules/ai/ai.service.ts`                                                                                                           |
| Tests required | Pas de `status: queued` sans enregistrement de job consultable, ou endpoint absent.                                                               |

### OPS-001

| Champ          | Valeur                                                                                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ID             | OPS-001                                                                                                                                                                                                                                                                                                                        |
| Priority       | P2                                                                                                                                                                                                                                                                                                                             |
| Domain         | CI/CD                                                                                                                                                                                                                                                                                                                          |
| Description    | `terraform.yml` : credentials AWS, `terraform fmt`, et `terraform apply -auto-approve` sont en `continue-on-error: true`. L'apply staging est sur push `main`. `cd-staging.yml` : `cosign sign ... \|\| true`. Des `\|\| true` de rollback existent aussi dans les CD (à ne pas confondre avec un masquage du chemin nominal). |
| Risk           | Apply ou signature cassés, check vert.                                                                                                                                                                                                                                                                                         |
| Owner          | DevOps                                                                                                                                                                                                                                                                                                                         |
| Dependencies   | Architect avant de retirer l'apply auto. Ne pas élargir les droits AWS dans la même tâche.                                                                                                                                                                                                                                     |
| Status         | OPEN                                                                                                                                                                                                                                                                                                                           |
| Files          | `.github/workflows/terraform.yml`, `.github/workflows/cd-staging.yml`                                                                                                                                                                                                                                                          |
| Tests required | Relecture YAML : l'étape critique n'a plus `continue-on-error`. Pas d'apply réel exigé pour fermer le ticket.                                                                                                                                                                                                                  |

### OPS-003

| Champ          | Valeur                                                                                                                                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | OPS-003                                                                                                                                                                                                                                                               |
| Priority       | P2                                                                                                                                                                                                                                                                    |
| Domain         | Observabilité                                                                                                                                                                                                                                                         |
| Description    | Le repo a un fragment `values-prometheus.yaml`, une config Fluent Bit, et `grafana-notes.yaml` (notes, pas des dashboards). Le module Terraform observability ne crée pas de ressources. Aucun backup AWS réel (seul un paramètre de rétention dans le scaffold RDS). |
| Risk           | Incident prod sans signal dans le repo. L'état du cluster vivant est UNKNOWN.                                                                                                                                                                                         |
| Owner          | DevOps                                                                                                                                                                                                                                                                |
| Dependencies   | Décision humaine avant de provisionner un backend managé                                                                                                                                                                                                              |
| Status         | OPEN                                                                                                                                                                                                                                                                  |
| Files          | `infrastructure/k8s/monitoring/`, `infrastructure/terraform/modules/observability/`                                                                                                                                                                                   |
| Tests required | Non applicable tant que la tâche est « documenter le manque » ou ajouter des dashboards versionnés. Un apply cloud n'est pas inclus.                                                                                                                                  |

## P3

### SEC-003

| Champ          | Valeur                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | SEC-003                                                                                                                                                 |
| Priority       | P3                                                                                                                                                      |
| Domain         | Templates                                                                                                                                               |
| Description    | `POST /templates/seed` exige un JWT, refuse `NODE_ENV=production`, et n'a pas de rôle. Tout compte hors production peut upsert les templates officiels. |
| Risk           | Dev/staging seulement.                                                                                                                                  |
| Owner          | Backend                                                                                                                                                 |
| Dependencies   | Security                                                                                                                                                |
| Status         | OPEN                                                                                                                                                    |
| Files          | `apps/api/src/modules/templates/templates.controller.ts`                                                                                                |
| Tests required | Appel non admin hors prod → 403. Prod inchangé (403).                                                                                                   |

### DOC-001

| Champ          | Valeur                                                                                                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | DOC-001                                                                                                                                                                                                                |
| Priority       | P3                                                                                                                                                                                                                     |
| Domain         | Analytics                                                                                                                                                                                                              |
| Description    | ADR-018 et `docs/ANALYTICS-CV-STUDIO-AI.md` font d'Amplitude la source produit. Le code n'a pas d'Amplitude : PostHog serveur (`apps/api/src/observability/posthog.ts`) et client web, plus la table `AnalyticsEvent`. |
| Risk           | Décisions data sur le mauvais outil.                                                                                                                                                                                   |
| Owner          | Architect                                                                                                                                                                                                              |
| Dependencies   | `HUMAN_DECISION_REQUIRED` (garder PostHog et amender l'ADR, ou implémenter Amplitude). Pas de code dans cette tâche tant que la décision n'est pas prise.                                                              |
| Status         | OPEN                                                                                                                                                                                                                   |
| Files          | `docs/adr/018-amplitude-analytics.md`, `docs/ANALYTICS-CV-STUDIO-AI.md`                                                                                                                                                |
| Tests required | Aucun jusqu'au choix.                                                                                                                                                                                                  |

### DOC-002

| Champ          | Valeur                                                                                                                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | DOC-002                                                                                                                                                                                                        |
| Priority       | P3                                                                                                                                                                                                             |
| Domain         | Données CV                                                                                                                                                                                                     |
| Description    | `docs/DATABASE-CV-STUDIO-AI.md` décrit une synchro de sections (`SyncCvSectionsCommand`). Aucun symbole correspondant dans le code. Les services écrivent `Cv.content`. ADR-013 (hybrid) n'est pas implémenté. |
| Risk           | Un agent remplit les tables `Experience` / `Education` en croyant la doc.                                                                                                                                      |
| Owner          | Architect                                                                                                                                                                                                      |
| Dependencies   | DATA-001. Ne pas migrer sans décision.                                                                                                                                                                         |
| Status         | OPEN                                                                                                                                                                                                           |
| Files          | `docs/DATABASE-CV-STUDIO-AI.md`, `docs/adr/013-hybrid-cv-storage.md`                                                                                                                                           |
| Tests required | Aucun (documentation).                                                                                                                                                                                         |

### DATA-001

| Champ          | Valeur                                                                                                                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | DATA-001                                                                                                                                                                                                       |
| Priority       | P3                                                                                                                                                                                                             |
| Domain         | Prisma                                                                                                                                                                                                         |
| Description    | Aucun `prisma.team`, `teamMember`, `portfolio`, `collabSession`, `notification`, `experience`, `education` (ni skill/project/language/certificate) dans `apps/api/src`. Les modèles sont dans `schema.prisma`. |
| Risk           | Schéma mort, ou agent qui « finit » Teams sans produit.                                                                                                                                                        |
| Owner          | Architect pour la décision. Backend seulement après accord pour une migration.                                                                                                                                 |
| Dependencies   | `HUMAN_DECISION_REQUIRED` avant tout `DROP`.                                                                                                                                                                   |
| Status         | OPEN                                                                                                                                                                                                           |
| Files          | `apps/api/prisma/schema.prisma`                                                                                                                                                                                |
| Tests required | Si une migration de retrait est un jour approuvée : déployer sur une base jetable, pas sur la prod.                                                                                                            |

## Non ouverts

| Idée                                    | Verdict                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| SEC-002 CV ownership cassé              | Faux. `CvsService.get` refuse un autre `userId`.                                                                             |
| SEC-004 bypass général des entitlements | Faux. Gates PDF, share, AI, achat marketplace, création CV. Restes : SEC-001, SEC-006, `api:access` et analytics sans route. |
| OPS-002 staging absent                  | UNKNOWN. Les workflows citent `cvstudio-staging`. AWS n'a pas été interrogé.                                                 |
| Watermark comme feature cassée          | Pas de code watermark. La promesse marketing est dans FE-001.                                                                |

## Ordre recommandé

```text
SEC-001
→ BILL-001, BILL-003, BILL-005 (Billing, pas en parallèle de Backend sur subscriptions)
→ API-002 (AI) en parallèle de SEC-001 si les fichiers ne se croisent pas
→ API-001 après accord Architect (touche entitlements = zone Billing)
→ FE-001 DTO (Billing) puis libellé pricing (Frontend)
→ OPS-001
→ AI-001 décision humaine avant code
```
