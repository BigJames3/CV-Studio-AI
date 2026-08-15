# Audit — État actuel des webhooks Stripe

**User Story:** 11.1 — Stripe Webhook Robustness  
**Date:** 13 août 2026  
**Périmètre:** code réel (`apps/api`, Prisma, k8s, web billing) — zéro modification  
**Décision:** **NO-GO réimplémentation** · **GO durcissement ciblé de l’existant**  
**Principe:** ne pas toucher le système de webhooks tant que l’état actuel et les risques ne sont pas compris.

---

## 0. Synthèse exécutive

La User Story 11.1 **est déjà implémentée** dans le dépôt (Étape 11, « fail-closed »). Le code proposé (nouveau `StripeWebhookService`, module `stripe/`, table `WebhookDeadLetter` séparée) **dupliquerait** un chemin de paiement vivant.

| Élément proposé                       | État réel                                                   | Verdict                               |
| ------------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| Endpoint webhook                      | `POST /api/v1/payments/webhook`                             | Existe                                |
| Vérification signature Stripe         | `constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`       | En place                              |
| Retry exponentiel 3×                  | `processEventWithRetry` — `2^attempt * 1000ms`              | En place                              |
| DLQ persistante                       | `stripe_webhook_events.status = dlq` (Postgres)             | En place                              |
| Idempotence                           | `event.id` → Postgres + cache Redis 30 j                    | En place                              |
| Alerting Sentry                       | `StripeAlertService` → `captureServerException`             | En place (si `SENTRY_DSN`)            |
| CronJob retry                         | `infrastructure/k8s/base/stripe-webhook-retry-cronjob.yaml` | Scaffold présent, **non aligné prod** |
| Module `apps/api/src/modules/stripe/` | **N’existe pas**                                            | Tout est dans `payments/`             |

**Risque n°1 si on implémente le code proposé tel quel:** deux handlers, double traitement, emails doublons, subscriptions corrompues, perte de paiement.

Les gaps restants sont des **bugs dans l’existant**, pas une absence de fondation. Ils sont documentés en §8 et traités dans `IMPLEMENTATION_PLAN_SAFE.md`.

---

## 1. Cartographie réelle (pas le brief)

Le brief d’entrée cite:

```
apps/api/src/modules/stripe/
  stripe-webhook.controller.ts
  stripe-webhook.service.ts
  stripe.module.ts
  stripe-events.ts
```

**Aucun de ces fichiers n’existe.** L’implémentation réelle est:

```
apps/api/src/modules/payments/
  payments.controller.ts          → POST /payments/webhook
  payments.service.ts             → signature, retry, dispatch, DLQ
  stripe-webhook-store.service.ts → idempotency + DLQ Postgres/Redis
  stripe-alert.service.ts         → Sentry + logs fatals
  payments.module.ts
  payments.service.spec.ts

apps/api/src/scripts/retry-webhook-dlq.ts
apps/api/prisma/schema.prisma     → StripeWebhookEvent
apps/api/prisma/migrations/20260730120000_stripe_webhook_fail_closed/
infrastructure/k8s/base/stripe-webhook-retry-cronjob.yaml
docs/STRIPE-WEBHOOK-FAIL-CLOSED.md
```

Doc ops existante: [`docs/STRIPE-WEBHOOK-FAIL-CLOSED.md`](../STRIPE-WEBHOOK-FAIL-CLOSED.md).

---

## 2. Webhooks Stripe — état actuel

### 2.1 Endpoint

| Question       | Réponse                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| Quel endpoint? | `POST /api/v1/payments/webhook`                                             |
| Préfixe global | `app.setGlobalPrefix('api')` + versioning URI `v1`                          |
| Auth           | `@Public()` — JWT global bypassé (correct: Stripe n’envoie pas de JWT)      |
| Throttle       | **Oui, 120 req/min global** (`ThrottlerGuard`) — **pas de `@SkipThrottle`** |
| Swagger        | `@ApiExcludeEndpoint()`                                                     |

Ce n’est **pas** `/webhooks/stripe`. Toute doc, dashboard Stripe, ou nouveau controller qui viserait `/webhooks/stripe` casserait la réception.

Dashboard Stripe à configurer:

```
https://<api-host>/api/v1/payments/webhook
```

### 2.2 Vérification de signature

**Présente et correcte.**

1. Nest démarre avec `{ rawBody: true }` (`apps/api/src/main.ts`).
2. Le controller lit `req.rawBody` (fallback si `body` est déjà un `Buffer`).
3. Absence de raw body ou de header `stripe-signature` → `400 INVALID_WEBHOOK`.
4. `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`.
5. Échec de signature → `400 INVALID_WEBHOOK` (Stripe ne retry pas les 4xx de signature).

Fail-closed config:

- Prod ou `STRIPE_FAIL_CLOSED=1` + Stripe non configuré → **503** (Stripe retry — souhaitable).
- Dev → soft-ack `{ received: true, configured: false }` (pas de traitement).

### 2.3 Retry logic

**Déjà présent, synchrone, dans la requête HTTP.**

```
MAX_RETRIES = 3
delay = 2^attempt * 1000ms   → 2s puis 4s
```

Après 3 échecs:

1. `pushDlq(...)`
2. `alerts.captureException(..., level: 'fatal')`
3. **re-throw** → HTTP **500** via `GlobalExceptionFilter`

Conséquence: Stripe **rejoue** l’événement (en plus du CronJob DLQ). L’idempotence est donc obligatoire — elle existe, avec des trous (§8).

**Risque timeout Stripe (30 s):** backoff 2+4 = 6 s + appels Stripe `subscriptions.retrieve` + DB. Habituellement sous 30 s. Si timeout côté Stripe alors que le handler continue, un second delivery peut arriver pendant que le premier est encore `processing` — voir race §8.1.

### 2.4 DLQ (Dead Letter Queue)

**Présente, persistante (Postgres), pas une table séparée.**

- Table: `stripe_webhook_events`
- Statut: `processing | processed | dlq`
- Redis `LPUSH stripe:webhook:dlq` en plus — **write-only**, jamais consommé
- Lecture DLQ: `prisma.stripeWebhookEvent.findMany({ where: { status: 'dlq' } })`
- Replay: `PaymentsService.retryDlqEvent` / `retryAllDlq`
- CLI: `pnpm --filter @cvstudio/api webhook:retry-dlq`
- CronJob k8s: toutes les 5 min, `concurrencyPolicy: Forbid`

La table `WebhookDeadLetter` proposée est **redondante**. L’introduire casserait le store actuel.

### 2.5 Sync vs async

**100 % synchrone.** Le controller `return this.payments.handleStripeWebhook(...)` attend tout le retry. Réponse `{ received: true }` (enveloppée par `TransformInterceptor` → `{ success: true, data: { received: true } }`).

Stripe accepte tout 2xx. Le wrapper n’est pas un problème.

**Pas de 202 fire-and-forget.** Avantage: Stripe sait si ça a échoué. Inconvénient: timeout si le traitement s’allonge.

### 2.6 Idempotence

**Oui, hybride Redis + Postgres.**

| Couche                                            | Rôle             | TTL      |
| ------------------------------------------------- | ---------------- | -------- |
| Redis `stripe:webhook:processed:{eventId}`        | Cache hit rapide | 30 jours |
| Postgres `stripe_webhook_events.id = event.id` PK | Source de vérité | Illimité |

Flux:

1. `isProcessed` → Redis puis DB `status === 'processed'`
2. `markProcessing` → `INSERT` (unique PK) ; conflit P2002 → inspecte le statut
3. `dispatchEvent`
4. `markProcessed` → DB puis Redis

**Trou:** si le statut existant est `processing` (autre replica en cours), `markProcessing` retourne `false`, `isProcessed` est `false`, et **le second handler continue quand même**. Avec 3 replicas API (`infrastructure/k8s/base/api.yaml`), c’est un vrai risque sous retry Stripe.

**Trou:** Redis down → `redis.get` throw → webhook 500. Redis est un cache, pas la source de vérité; l’erreur ne devrait pas fail-closed le paiement.

### 2.7 Persistance des events

Oui. Payload JSON stocké dans `stripe_webhook_events.payload` (c’est `event.data`, pas l’event Stripe complet). Suffisant pour `dispatchEvent` qui lit `event.data.object`.

### 2.8 Gestion d’erreurs

| Étape                       | Comportement                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| Signature invalide          | 400, log error, pas de Sentry dédié                                                              |
| Stripe non configuré (prod) | 503 + Sentry fatal                                                                               |
| Erreur métier transitoire   | retry in-request                                                                                 |
| Erreur permanente (3×)      | DLQ + Sentry fatal + **500**                                                                     |
| Exception non HTTP          | `GlobalExceptionFilter` → 500 + Sentry si status ≥ 500                                           |
| Email SMTP down             | `MailService.send` **avale** l’erreur (log warn) — le webhook peut quand même passer `processed` |

Checklist demandée:

| Check                          | Résultat                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| Signature verification         | Oui                                                                                       |
| Try/catch autour du traitement | Oui (`processEventWithRetry`)                                                             |
| Response 200 même si erreur?   | **Non** — 500 après DLQ. Stripe retry. Correct **si** idempotence étanche.                |
| Logging des events             | NestJS `Logger` (processed, retries, unhandled types)                                     |
| DB writes transactionnelles?   | **Non** — upsert subscription puis update user, payment puis invoice, hors `$transaction` |

---

## 3. Schéma database — état actuel

Fichier: `apps/api/prisma/schema.prisma`  
Migration Étape 11: `20260730120000_stripe_webhook_fail_closed`

### 3.1 `Subscription` — existe

| Champ demandé          | Réel                            | Note                                              |
| ---------------------- | ------------------------------- | ------------------------------------------------- |
| `id`                   | UUID                            | OK                                                |
| `userId`               | `@unique`                       | 1 sub / user                                      |
| `stripeSubscriptionId` | `String?` **index, pas unique** | Gap                                               |
| `status`               | enum `SubscriptionStatus`       | `active, canceled, suspended, past_due, trialing` |
| `currentPeriodEnd`     | `DateTime`                      | + `currentPeriodStart`                            |
| `stripeCustomerId`     | **absent**                      | Nulle part dans le schéma                         |
| `cancelAtPeriodEnd`    | Boolean                         | **écrasé à `false` à chaque webhook update**      |

### 3.2 `Payment` — existe

| Champ demandé            | Réel                                                 |
| ------------------------ | ---------------------------------------------------- |
| `stripeInvoiceId` unique | **Non** — `transactionId` unique (invoice.id Stripe) |
| `amount`                 | `Decimal(12,2)` (euros/dollars, pas des cents)       |
| `status`                 | `pending \| completed \| failed \| refunded`         |
| `stripePaymentIntentId`  | optionnel                                            |

Idempotence paiement: `catch P2002` sur `transactionId`. Échec: `transactionId = ${invoice.id}:failed`.

### 3.3 `Invoice` — existe

Unique sur `invoiceNumber` (`invoice.number` Stripe, fallback `INV-{invoice.id}`). **Pas** d’ID Stripe dédié. Si `number` change entre drafts, risque de doublon logique.

### 3.4 `webhook_events` / DLQ

Pas de table `webhook_events` ni `WebhookDeadLetter`.  
Modèle unique: `StripeWebhookEvent` → table `stripe_webhook_events`.

Index: `status`, `created_at`. PK = Stripe `event.id`.

### 3.5 `User` billing fields

- `subscriptionTier` (`free | pro | business`) — **c’est la source des entitlements**
- `subscriptionStartDate` / `subscriptionEndDate`

Le plan effectif n’est **pas** lu depuis `Subscription.status` par `EntitlementsService`, mais depuis `User.subscriptionTier`. Les deux doivent rester alignés (aujourd’hui deux writes séparés).

### 3.6 Backups / rétention

- Docker local: volume `pgdata`, pas de backup automatisé.
- Prod visé: RDS PITR, RPO 5–15 min (`docs/infrastructure/DR-RUNBOOK.md`).
- Redis: cache 30 j; perte Redis = OK si Postgres intact.
- Rétention `stripe_webhook_events`: **aucune politique** (croissance illimitée).

---

## 4. Services existants

### 4.1 Mail — `MailService` (pas `EmailService`)

Fichier: `apps/api/src/mail/mail.service.ts`

| Méthode                                       | Existe                                    |
| --------------------------------------------- | ----------------------------------------- |
| `sendPaymentFailed`                           | Oui (HTML inline, pas de template engine) |
| `sendInvoice`                                 | **Non**                                   |
| `sendEmailVerification` / `sendPasswordReset` | Oui                                       |

Provider: Nodemailer SMTP (Mailpit en local). Pas de Resend. Erreurs avalées.

**Doublons email:** `onInvoiceFailed` envoie le mail **sans** garde « déjà envoyé ». Un retry Stripe ou un replay DLQ après succès partiel = 2e email. Impact: moyen (pas de double charge).

### 4.2 Stripe — pas de `StripeService` dédié

Deux clients Stripe indépendants:

- `PaymentsService` (webhooks + `subscriptions.retrieve`)
- `SubscriptionsService` (checkout + cancel)

Même `STRIPE_SECRET_KEY`, même API version `2025-02-24.acacia`. Pas de singleton partagé.

### 4.3 `SubscriptionsService`

- `checkout()` — crée la Checkout Session (`client_reference_id` + metadata `userId`/`plan`)
- `applyStripeSubscription()` — upsert `Subscription` + update `User.subscriptionTier`
- `cancel()` — Stripe `cancel_at_period_end` + flag local
- Dev bypass si pas de clé Stripe (interdit en prod / `STRIPE_FAIL_CLOSED=1`)

**Bug silencieux:** si le `Plan` Prisma (`Free`/`Pro`/`Business`) est introuvable, `applyStripeSubscription` **log un warn et return**. Le webhook marque alors `processed`. L’utilisateur a payé, le tier reste `free`. Perte de entitlement, pas de double charge — **P0 billing**.

**Bug cancel:** `applyStripeSubscription` force `cancelAtPeriodEnd: false` sur tout `subscription.updated`. Un utilisateur qui a demandé l’annulation en fin de période voit le flag reset. Confirmé dans `docs/pre-launch/GO_NO_GO_DECISION.md`.

### 4.4 Exception filter

`GlobalExceptionFilter` global. 5xx → Sentry. Webhook 500 après DLQ = double alerte (StripeAlertService + filter). Bruit, pas de corruption.

### 4.5 Sentry

`apps/api/src/observability/sentry.ts`

- Init si `SENTRY_DSN` et pas `xxx`, skip en `test`
- Dev: `beforeSend` drop sauf `SENTRY_DEV=true`
- Health expose `observability.sentry: boolean`
- **Pas de preuve runtime** que le DSN prod est branché (env example vide)

Logger: NestJS `Logger` partout. Pas de Datadog/ELK applicatif; Fluent Bit + Prometheus scaffold k8s.

### 4.6 Injection module

```typescript
@Module({
  imports: [forwardRef(() => SubscriptionsModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeWebhookStoreService, StripeAlertService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
```

`RedisModule` et `PrismaModule` sont globaux. `MailModule` importé au niveau `AppModule`.

---

## 5. Infrastructure

### 5.1 CronJobs

| Job                    | Existe                 | Alignement prod |
| ---------------------- | ---------------------- | --------------- |
| `stripe-webhook-retry` | Oui, `*/5 * * * *`     | **Non**         |
| Autres CronJobs        | Non (hors migrate Job) | —               |

Écarts CronJob vs Deployment API:

|         | API deployment                     | Webhook CronJob                          |
| ------- | ---------------------------------- | ---------------------------------------- |
| Image   | ECR `.../cvstudio/api:sha-replace` | `cvstudioai/api:latest`                  |
| Secret  | `api-secrets`                      | `cvstudio-api-secrets`                   |
| Command | `node dist/main.js` (implicite)    | `node dist/scripts/retry-webhook-dlq.js` |

Le script est bien dans `src/` donc compilé par `nest build`. Le CronJob **ne tournera pas** en prod tant que image + secret ne sont pas alignés. Filet de sécurité actuel: **retries Stripe uniquement**.

### 5.2 Redis

- Docker Compose: `redis:7-alpine` healthy
- API: `ioredis` via `REDIS_URL`
- Usage webhook: cache processed + LPUSH DLQ (non lu)
- **Pas de Redis dans les manifests k8s** (attendu: ElastiCache via secret)

### 5.3 Message queue

`bullmq` + `@nestjs/bullmq` dans `package.json`. **Aucun `BullModule` / `InjectQueue` dans `src/`.** Les webhooks n’utilisent pas de queue. Workers k8s = PDF / AI, pas billing.

Pour la US 11.1, Postgres DLQ + CronJob est le design actuel. Introduire Bull maintenant = nouveau runtime, nouveau failure mode.

### 5.4 Postgres

Source de vérité billing + DLQ. Backups: runbook RDS PITR (prod visé), volume Docker (local).

---

## 6. Dépendances (Phase 2)

### 6.1 Qui dépend du webhook?

| Consommateur                                   | Comment                                                    |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `SubscriptionsService.applyStripeSubscription` | Seul writer « payé » du tier                               |
| `EntitlementsService`                          | Lit `User.subscriptionTier` (DB, pas JWT)                  |
| `EntitlementsGuard`                            | Feature gates (`cv:create`, AI, etc.)                      |
| `CvsService`                                   | Quota 1 CV en Free                                         |
| `AiQuotaService`                               | Quotas AI par tier                                         |
| `MailService.sendPaymentFailed`                | `invoice.payment_failed`                                   |
| Page billing web                               | `useMe()` → `subscriptionTier`                             |
| JWT                                            | `subscriptionTier` **figé dans le token** jusqu’au refresh |

Checkout **n’attend pas** le webhook côté serveur: il retourne `session.url`. Le client redirige vers Stripe puis `?checkout=success`. **Aucun polling** du plan après retour. `useMe` a `staleTime: 5 minutes` — l’UI peut rester Free jusqu’à 5 min (ou reload).

Race documentée (user paie, ouvre l’éditeur avant webhook): les entitlements serveur sont live (DB). L’UI et le JWT peuvent mentir. Impact UX, pas de double charge. Un second CV Free serait **bloqué côté API** si le webhook a déjà passé; l’inverse (webhook lent) autorise encore Free.

### 6.2 Sync Stripe ↔ DB

Unidirectionnel: Stripe → webhook → DB. Pas de job de réconciliation (`stripe.subscriptions.list`). Si un event est `processed` à tort (plan manquant), **aucune auto-réparation**.

Ordre Stripe classique: `invoice.paid` peut arriver **avant** `checkout.session.completed`. Aujourd’hui `onInvoicePaid` throw si la subscription locale n’existe pas → retry → DLQ → CronJob/Stripe retry. Le retry sauve le cas **si** checkout finit par créer la row. C’est volontairement fail-closed, mais ça remplit la DLQ au premier paiement.

### 6.3 Emails

Un seul email billing: payment failed. Pas d’email « bienvenue Pro » ni facture. Risque doublon sur retry, pas de charge Stripe en double.

---

## 7. Compatibilité avec le code proposé

Le brief propose un **nouveau** `StripeWebhookService` + table DLQ + store Redis/DB. Mapping:

| Proposé                   | Déjà là                                 | Action sûre                                                          |
| ------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| `StripeWebhookService`    | `PaymentsService.processEventWithRetry` | **Ne pas créer**                                                     |
| Controller `/stripe`      | `/payments/webhook`                     | **Ne pas changer l’URL** sans migration Stripe Dashboard + dual-path |
| Idempotency store         | `StripeWebhookStoreService`             | Étendre, pas remplacer                                               |
| DLQ table dédiée          | statut `dlq` sur la même table          | Garder                                                               |
| Retry `2^retries * 1000`  | Identique                               | Garder                                                               |
| Sentry `captureException` | `StripeAlertService`                    | Garder                                                               |
| K8s CronJob               | Existe, mal câblé                       | Aligner image/secret                                                 |

**Backwards compatibility:** un second handler sur le même secret Stripe = double dispatch. Interdit.

---

## 8. Gaps (bugs de l’existant — pas de greenfield)

Classés par sévérité. Détail scénarios: `RISK_ASSESSMENT.md`.

### P0 — ne pas ship live sans les fermer

1. **Claim lock incomplet** (`processing` n’exclut pas un second worker).
2. **`applyStripeSubscription` no-op si Plan manquant** puis `markProcessed`.
3. **`cancelAtPeriodEnd: false` forcé** sur chaque `subscription.updated`.

### P1

4. Pas de `$transaction` (subscription vs user tier divergents).
5. `invoice.paid` avant checkout → DLQ systématique au premier achat.
6. CronJob image/secret ≠ API — replay interne mort en prod.
7. Email payment-failed non idempotent.
8. Throttle 120/min sur l’endpoint webhook (pas de skip).

### P2

9. Redis throw casse le webhook (cache traité comme dépendance dure).
10. Redis DLQ list non drainée (fuite mémoire Redis).
11. `stripeSubscriptionId` non unique.
12. Pas de `stripeCustomerId`.
13. UI `staleTime` 5 min + JWT stale.
14. Probe k8s `/api/v1/health/ready` **n’existe pas** (seul `/health`).
15. Events manquants: refunds, `checkout.session.async_payment_*`, `customer.subscription.created`.
16. Tests: pas d’intégration signature, pas de test store P2002/`processing`, pas de test CronJob.
17. Pas de rétention / archive `stripe_webhook_events`.
18. BullMQ inutilisé (ne pas l’introduire pour cette US).

---

## 9. Tests existants

`payments.service.spec.ts` couvre:

- skip si déjà processed
- `checkout.session.completed` → `applyStripeSubscription` + `markProcessed`
- retry transitoire puis succès
- DLQ + alert sur erreur permanente
- `invoice.payment_failed` → email

**Ne couvre pas:** `constructEvent`, raw body, fail-closed 503, race `processing`, `onInvoicePaid` P2002, `retryDlqEvent`, plan manquant, `cancelAtPeriodEnd`.

E2E web `payment-flow.spec.ts`: checkout **dev_bypass** (pas de Stripe live, pas de webhook).

---

## 10. Réponses aux questions critiques

| #   | Question                                           | Réponse                                                                                                                            |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Redis healthy?                                     | Local Compose oui. K8s: via `REDIS_URL` secret, pas de manifest Redis. Idempotence **doit rester Postgres-first**. TTL cache 30 j. |
| 2   | Transactions?                                      | Non. Indexes webhook: PK event id + status + created_at. `payments.transaction_id` unique (migration 11).                          |
| 3   | Webhook actuel working?                            | Logique complète en code; signature OK. Prod CronJob non aligné. Soft-ack en dev.                                                  |
| 4   | Sentry?                                            | SDK branché. DSN prod non vérifié ici. Pas d’on-call billing dédié au-delà du playbook sécu.                                       |
| 5   | Tests?                                             | Unitaires handler oui. Pas de simulateur réseau réel, pas de seed webhook.                                                         |
| 6   | Backwards compatible si on ajoute le code proposé? | **Non.** Le handler actuel doit rester le seul.                                                                                    |

---

## 11. Recommandations

1. **Geler** toute création de `modules/stripe/` et de `StripeWebhookService`.
2. **Ne pas** changer l’URL webhook.
3. **Ne pas** ajouter une table DLQ parallèle.
4. Traiter les P0 de l’existant (plan `IMPLEMENTATION_PLAN_SAFE.md`) derrière tests.
5. Utiliser Stripe Dashboard retries + CLI `webhook:retry-dlq` comme fallback ops (voir `FALLBACK_PROCEDURE.md`).
6. Avant soft GA: aligner CronJob, SkipThrottle, claim atomique, plus de silent success.

**Confiance pour implémenter le brief proposé tel quel: 0%.**  
**Confiance que l’existant est une base durcissable: élevée**, sous réserve des P0.

---

## Annexes

### A. Events dispatchés

| Event                                        | Handler                 | Effet                                           |
| -------------------------------------------- | ----------------------- | ----------------------------------------------- |
| `checkout.session.completed`                 | `onCheckoutCompleted`   | retrieve sub Stripe + `applyStripeSubscription` |
| `customer.subscription.updated`              | `onSubscriptionChanged` | sync / éventuellement Free                      |
| `customer.subscription.deleted`              | idem                    | canceled + Free                                 |
| `invoice.paid` / `invoice.payment_succeeded` | `onInvoicePaid`         | Payment + Invoice upsert                        |
| `invoice.payment_failed`                     | `onInvoiceFailed`       | `past_due` + Payment failed + email + alert     |
| autres                                       | log debug               | ignorés (ack 200 si pas d’erreur)               |

### B. Variables d’environnement

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_{PLAN}_{MONTHLY|YEARLY}`, `STRIPE_FAIL_CLOSED`, `SENTRY_DSN`, `REDIS_URL`, `DATABASE_URL`, `WEBHOOK_DLQ_RETRY_LIMIT`, `SMTP_*`, `MAIL_FROM`.

### C. Fichiers à ne pas dupliquer

Toute PR « add StripeWebhookService » doit être rejetée tant que ce document n’est pas invalidé par un diff qui **supprime** `PaymentsService.handleStripeWebhook`.
