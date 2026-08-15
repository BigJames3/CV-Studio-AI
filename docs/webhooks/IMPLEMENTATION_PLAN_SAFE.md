# Implementation Plan Safe — Durcissement webhooks Stripe

**Date:** 13 août 2026  
**Contrainte:** zéro perte de paiement, zéro corruption, backwards compatible  
**Interdit:** nouveau module `stripe/`, nouvel endpoint, table DLQ parallèle, BullMQ pour cette US

Ce plan **ne réimplémente pas** la US 11.1. Il ferme les gaps de l’implémentation Étape 11 déjà en production-code.

Références: `AUDIT_WEBHOOKS_CURRENT_STATE.md`, `RISK_ASSESSMENT.md`, `PRE_IMPLEMENTATION_CHECKLIST.md`, `FALLBACK_PROCEDURE.md`.

---

## 0. Décision d’architecture (non négociable)

**Un seul chemin:**

`POST /api/v1/payments/webhook` → `PaymentsService.handleStripeWebhook` → `processEventWithRetry` → `StripeWebhookStoreService`.

Toute PR qui ajoute un second consumer du même `STRIPE_WEBHOOK_SECRET` est rejetée.

**Feature flags:** pas nécessaires si les phases 1–2 sont des correctifs de bugs (comportement plus strict, pas de nouveau side effect). Phase 3 (ordre invoice/checkout) peut se cacher derrière `STRIPE_WEBHOOK_CREATE_SUB_FROM_INVOICE=1` si on veut un roll-out.

---

## Phase 0 — Freeze & baseline (0 risque code)

**But:** pouvoir rollback et mesurer.

### Actions

1. Tag git / note de release: `webhook-baseline-<sha>`.
2. Inventaire Stripe Dashboard: URL endpoint, events cochés, status deliveries.
3. Compter en staging/dev:

```sql
SELECT status, COUNT(*) FROM stripe_webhook_events GROUP BY status;
SELECT COUNT(*) FROM stripe_webhook_events WHERE status = 'dlq';
```

4. Confirmer `SENTRY_DSN` via `GET /api/v1/health` → `observability.sentry`.
5. Exécuter les tests actuels:

```bash
pnpm --filter @cvstudio/api test -- payments.service.spec.ts
```

6. Documenter l’URL à **ne pas changer**.

### Tests Phase 0

- Tests existants verts.
- Un webhook Stripe CLI (`stripe listen --forward-to localhost:3001/api/v1/payments/webhook`) en local: signature OK.

### Rollback Phase 0

N/A (pas de diff).

### Go Phase 1

Checklist `PRE_IMPLEMENTATION_CHECKLIST.md` section Code Audit cochée.

---

## Phase 1 — Correctifs P0 (risque faible, comportement plus sûr)

**Fichiers uniquement:**

- `stripe-webhook-store.service.ts`
- `payments.service.ts`
- `subscriptions.service.ts`
- specs associés

**Pas de migration** si on peut exprimer le lock avec le schéma actuel (`status` + `updated_at`).

### 1.1 Claim lock

**Changement:**

- Insert `processing` (inchangé).
- Sur P2002:
  - `processed` → return « skip » (claimed=false, processed=true).
  - `processing` et `updated_at` < 60s → skip (autre worker).
  - `processing` stale ou `dlq` → steal: `UPDATE ... WHERE id=? AND status IN ('processing','dlq')`.
- `processEventWithRetry`: si non claimed et non processed → **return sans throw** (HTTP 200). Stripe ne storm pas.

**Test:** deux `processEventWithRetry` parallèles (mock store) ; un seul `dispatch`.

### 1.2 Plan manquant = échec

Dans `applyStripeSubscription`: remplacer `return` par `throw new Error('PLAN_NOT_FOUND_FOR_STRIPE_SYNC:' + planName)`.

**Test:** plan `findUnique` null → `pushDlq`, pas `markProcessed`.

### 1.3 `cancel_at_period_end`

`applyStripeSubscription` accepte `cancelAtPeriodEnd: boolean` depuis `stripeSub.cancel_at_period_end`.

`onSubscriptionChanged` / checkout retrieve passent le champ.

**Ne plus** écrire `cancelAtPeriodEnd: false` inconditionnel.

**Test:** sub `cancel_at_period_end: true` → row locale true après webhook.

### Rollback Phase 1

`git revert` du commit unique « fix(webhooks): P0 lock/plan/cancel ». Schéma inchangé → revert trivial.

### Deploy Phase 1

Staging d’abord. Stripe CLI: replay `evt` déjà processed (no-op), event cancel_at_period_end, event avec plan metadata garbage (doit DLQ).

Production: rolling API (3 replicas). Pas de migrate. Surveiller Sentry tag `stripe-webhook` 30 min.

---

## Phase 2 — Consistance DB + HTTP (risque moyen, opt-in par review)

### 2.1 Transactions

Wrapper dans `applyStripeSubscription`:

```ts
await this.prisma.$transaction(async (tx) => {
  await tx.subscription.upsert(...)
  await tx.user.update(...)
})
```

`onInvoicePaid`: transaction Payment+Invoice (le `P2002` payment reste dans le try interne).

`onInvoiceFailed`: transaction status + payment create; **email après commit**.

### 2.2 Email idempotent

Si `payment.create` throw P2002 → **ne pas** renvoyer `sendPaymentFailed`.

### 2.3 SkipThrottle webhook

`@SkipThrottle()` sur `PaymentsController.webhook` (import `@nestjs/throttler`).

### 2.4 Redis non-fatal

`isProcessed` / `markProcessed`: try/catch autour de Redis; log warn; continuer sur Prisma.

Ne plus `lpush` DLQ Redis **ou** borner (`LTRIM 0 999`). Postgres reste la source.

### Tests

- Mock Redis throw → event quand même processed.
- Payment P2002 → mail not called.
- Transaction rollback: mock user.update throw → subscription unchanged (si test Prisma d’intégration dispo; sinon unit avec tx mock).

### Rollback

Revert commit Phase 2. SkipThrottle revert = 429 possible, pas de perte d’argent.

### Deploy

Staging + `STRIPE_FAIL_CLOSED=1`. Production rolling.

---

## Phase 3 — Ordre des events (risque moyen, feature flag)

**Problème:** `invoice.paid` avant checkout → DLQ.

**Option A (recommandée, minimale):** dans `onInvoicePaid`, si sub locale absente: `stripe.subscriptions.retrieve` + metadata `userId` → `applyStripeSubscription` puis payment. Idempotent avec Phase 1–2.

**Option B:** laisser throw (comportement actuel) jusqu’à ce que le CronJob soit vivant. Acceptable en closed beta si ops surveille la DLQ.

Flag: `STRIPE_INVOICE_UPSERT_SUB=1` (défaut off en prod jusqu’à tests staging).

### Tests

Event `invoice.paid` sans row locale, retrieve mocké avec metadata userId → sub créée + payment.

### Rollback

Flag off. Retour au throw + DLQ.

---

## Phase 4 — CronJob + observabilité (infra)

### 4.1 Manifest

Aligner `stripe-webhook-retry-cronjob.yaml` sur l’API:

- même image / digest (`sha-replace` / kustomize overlay)
- même `secretRef` (`api-secrets`)
- `STRIPE_FAIL_CLOSED=1`
- `WEBHOOK_DLQ_RETRY_LIMIT=50`

Overlays staging/prod: vérifier que le CronJob est bien dans `kustomization.yaml` (déjà dans `base/`).

### 4.2 Health

Ajouter `GET /api/v1/health/ready` (Prisma + Redis ping) pour la readiness probe existante. **Sans ça le probe k8s API est déjà cassé** (hors webhook mais bloque le deploy).

### 4.3 Alerting

- Sentry: alert rule `tag.module = stripe-webhook` AND `level = fatal`
- SQL cron / Grafana: `COUNT(*) FILTER (WHERE status='dlq') > 0` pendant > 10 min
- SEC-05 déjà dans `docs/security/MONITORING-ALERTS.md` (sig fail spike)

### 4.4 Unique `stripeSubscriptionId`

Migration **nullable unique** (plusieurs NULL OK en Postgres). Deploy migrate Job **avant** de compter sur l’unicité. Si doublons existants: nettoyer manuellement (voir Fallback).

### Tests infra

Job manuel:

```bash
kubectl create job --from=cronjob/stripe-webhook-retry webhook-retry-once -n cvstudio
kubectl logs job/webhook-retry-once -n cvstudio
```

### Rollback CronJob

`kubectl delete cronjob stripe-webhook-retry -n cvstudio`. Les retries Stripe restent. Pas d’impact handler.

---

## Phase 5 — Tests, UX, events secondaires (après P0–P1)

1. Test d’intégration `constructEvent` avec payload Stripe fixture + secret test.
2. Billing page: si `checkout=success`, `queryClient.invalidateQueries(queryKeys.user.me())` + poll 3× 2s. **Pas de WebSocket requis.**
3. Events: `charge.refunded` / `invoice.refunded` → downgrade ou flag support (produit).
4. Rétention: job mensuel `DELETE FROM stripe_webhook_events WHERE status='processed' AND created_at < now() - interval '90 days'` (garder `dlq`).
5. Checkout: réutiliser Stripe Customer (champ à ajouter) — **hors strict webhook**, réduit double sub.

Ne pas faire Phase 5 avant 1–2.

---

## Mapping vs brief d’entrée

| Phase brief               | Verdict                                               |
| ------------------------- | ----------------------------------------------------- |
| Phase 1 Foundation tables | **Déjà fait** — skip                                  |
| Phase 2 Idempotency       | **Déjà fait** — seulement lock P0                     |
| Phase 3 Retry             | **Déjà fait** — ne pas empiler un 2e retry in-request |
| Phase 4 DLQ + Sentry      | **Déjà fait** — brancher CronJob + alert rules        |
| Phase 5 CronJob           | **Scaffold** — aligner image/secret                   |

Le brief « 5 phases greenfield » est **obsolète**. Suivre les phases 0–5 de **ce** document.

---

## Production deployment (séquence)

```
1. Staging migrate (si Phase 4 unique index)
2. Staging API rolling (Phase 1–2)
3. Stripe CLI replay + 1 paiement test mode
4. Vérifier stripe_webhook_events: processed, 0 dlq inattendu
5. Activer CronJob staging, injecter une row dlq de test, attendre 5 min
6. Prod migrate (fenêtre courte, lock table payments déjà unique)
7. Prod API rolling
8. CronJob prod
9. 1 paiement live $0 / coupon test si dispo
10. Watch 24h: Sentry, DLQ count, Stripe Dashboard failed deliveries
```

**Ne pas** activer `STRIPE_FAIL_CLOSED` pour la première fois le jour J sans l’avoir testé: il l’est déjà dans le code prod path (`NODE_ENV=production`).

---

## Rollback procedure (code)

| Situation                         | Action                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Bug Phase 1–2 API                 | Rollback image API (blue-green existe: `blue-green-api.yaml`). Webhooks: Stripe retry. |
| Migration unique échoue           | `prisma migrate resolve` + ne pas forcer; webhook continue sans unique                 |
| Loop 500 sur tous les events      | Scale API; `STRIPE` Dashboard pause endpoint; hotfix; `stripe events resend`           |
| Double handler déployé par erreur | Désactiver le nouvel endpoint immédiatement; garder `/payments/webhook`                |

Détail ops client: `FALLBACK_PROCEDURE.md`.

---

## Testing at each phase (résumé)

| Phase | Auto                       | Manuel                      |
| ----- | -------------------------- | --------------------------- |
| 0     | unit existants             | `stripe listen`             |
| 1     | lock / plan throw / cancel | replay evt, garbage plan    |
| 2     | redis fail, mail P2002     | Mailpit 1 seul mail         |
| 3     | invoice-first              | deux events désordonnés CLI |
| 4     | —                          | kubectl job + SQL dlq       |
| 5     | integration signature      | checkout success refetch    |

Cible couverture: ne pas descendre en dessous des 5 tests actuels; ajouter ≥ 6 cas P0/P1.

---

## Monitoring setup

| Signal                               | Source                      | Seuil                  |
| ------------------------------------ | --------------------------- | ---------------------- |
| Webhook 5xx                          | API logs / Stripe Dashboard | > 0 / 5 min → page     |
| Signature 400                        | logs `INVALID_WEBHOOK`      | SEC-05 > 10 / 5 min    |
| DLQ depth                            | SQL                         | > 0 pendant 10 min     |
| CronJob failed                       | k8s                         | 1 fail → ticket        |
| Sentry fatal `stripe-webhook`        | Sentry                      | 1 → on-call            |
| `observability.sentry=false` en prod | health                      | **bloquer le release** |

Pas de Datadog obligatoire: Stripe Dashboard + Sentry + SQL suffisent pour closed beta.

---

## Effort estimé

| Phase | Effort  | Risque deploy |
| ----- | ------- | ------------- |
| 0     | 0.5 j   | Nul           |
| 1     | 1 j     | Faible        |
| 2     | 1 j     | Faible        |
| 3     | 0.5–1 j | Moyen         |
| 4     | 0.5 j   | Infra         |
| 5     | 1–2 j   | Faible        |

**Ne pas** budgéter 2 semaines pour réécrire le handler.

---

## Critère de fin (US 11.1 réellement « done »)

- [ ] Un seul endpoint documenté dans Stripe Dashboard
- [ ] P0 fermés + tests
- [ ] DLQ Postgres rejouée par CronJob **réellement running**
- [ ] Sentry DSN live + 1 alerte test
- [ ] Runbook fallback exercé une fois (staging)
- [ ] Aucun silent `processed` sans mutation billing
