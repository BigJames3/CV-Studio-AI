# Fallback Procedure — Webhooks Stripe

**Quand l’utiliser:** un paiement Stripe existe, l’app n’a pas le bon plan, ou la DLQ grossit.  
**Ne pas:** recréer une Checkout Session « pour réparer » (risque de **deuxième** abonnement Stripe).  
**Endpoint:** `POST /api/v1/payments/webhook` uniquement.

Compléments: `docs/security/INCIDENT-RESPONSE.md` (P1 billing → IC), `docs/STRIPE-WEBHOOK-FAIL-CLOSED.md`.

---

## 1. Sévérité

| Symptôme                 | Sev | Objectif                           |
| ------------------------ | --- | ---------------------------------- |
| Tous les webhooks 5xx    | P1  | Restaurer le handler; Stripe retry |
| 1 user payé / still Free | P2  | Replay event ou sync manuel        |
| DLQ > 0 depuis > 15 min  | P2  | Comprendre; retry DLQ              |
| Signature 400 en masse   | P1  | Secret / body parsing              |
| Emails dupliqués seuls   | P3  | Rien à refund                      |

---

## 2. Diagnostic rapide (5 minutes)

### 2.1 Stripe Dashboard

Developers → Webhooks → endpoint `.../api/v1/payments/webhook`

- Derniers deliveries: 2xx / 4xx / 5xx
- Event id `evt_...`
- Type (`checkout.session.completed`, `invoice.paid`, …)

### 2.2 API health

```http
GET /api/v1/health
```

Vérifier `db=up`, `observability.sentry`.

### 2.3 Postgres

```sql
-- Event
SELECT id, type, status, attempts, last_error, processed_at, created_at
FROM stripe_webhook_events
WHERE id = 'evt_XXXX';

-- User billing
SELECT u.id, u.email, u.subscription_tier, s.status, s.stripe_subscription_id,
       s.cancel_at_period_end, s.current_period_end
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.email = 'customer@example.com';

-- Payments
SELECT id, amount, status, transaction_id, created_at
FROM payments
WHERE subscription_id = '<sub uuid>'
ORDER BY created_at DESC
LIMIT 20;

-- DLQ
SELECT id, type, attempts, left(last_error, 200), created_at
FROM stripe_webhook_events
WHERE status = 'dlq'
ORDER BY created_at ASC;
```

### 2.4 Décision arbre

```
Stripe a-t-il encaissé ?
  NON → pas un bug webhook. Checkout / carte / Radar.
  OUI → event dans stripe_webhook_events ?
    ABSENT → signature/URL/rawBody. Fix infra puis Dashboard "Resend".
    status=processed ET user Free → R3/R5. NE PAS faire confiance à processed.
    status=processing vieux (> 5 min) → lock orphelin. Steal / reset dlq.
    status=dlq → retry CLI ou resend Stripe.
```

---

## 3. Si le processing webhook est down (tous les events)

### Contain

1. Ne **pas** désactiver l’endpoint Stripe (on veut la file de retry), sauf storm de 400 (secret leak / raw body cassé).
2. Si 400 signature après un deploy: rollback image API **immédiat** (rawBody / parser).
3. Si 503 `STRIPE_NOT_CONFIGURED`: secrets `STRIPE_*` manquants — hotfix env, pas de code.

### Recover

1. Rollback ou hotfix.
2. Stripe Dashboard → Resend des events failed (24–72 h encore dans Stripe).
3. Pour events déjà `processed` à tort: §5.

### Communiquer

Status interne. Clients seulement si entitlement bloqué > 1 h: « paiement reçu, activation manuelle en cours, pas de double charge ».

---

## 4. Retry DLQ (chemin normal)

### Local / staging

```bash
pnpm --filter @cvstudio/api webhook:retry-dlq
```

Env: mêmes `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_FAIL_CLOSED` que l’API.

### Cluster (quand le CronJob est aligné)

```bash
kubectl create job --from=cronjob/stripe-webhook-retry webhook-retry-manual -n cvstudio
kubectl logs job/webhook-retry-manual -n cvstudio
```

Si le CronJob image/secret est faux (état actuel): **ne pas** s’y fier. Exec dans un pod API:

```bash
kubectl exec -it deploy/api -n cvstudio -- node dist/scripts/retry-webhook-dlq.js
```

(Adapter le nom du deploy.)

### Un event

Via SQL puis CLI global, ou resend Stripe (préférable: payload original + signature).

**Stripe CLI / Dashboard Resend** rejoue `evt_id`. Si déjà `processed`, le code skip (no-op). Pour forcer:

```sql
UPDATE stripe_webhook_events
SET status = 'dlq', processed_at = NULL
WHERE id = 'evt_XXXX';
```

Puis resend **ou** `webhook:retry-dlq`.

**Jamais** `DELETE` la row avant d’avoir copié `payload` / `last_error`.

---

## 5. Sync manuel (processed à tort / plan manquant)

**Précondition:** `plans` seed OK (`Free`, `Pro`, `Business`).

### 5.1 Depuis Stripe (préféré)

1. Dashboard → customer → subscription `sub_...` status, price, `cancel_at_period_end`.
2. Metadata `userId` (posée au checkout).
3. Forcer un event:

```text
Stripe → Send test webhook / Resend `customer.subscription.updated`
```

après avoir remis la row en `dlq` si elle était `processed`.

### 5.2 SQL de dernier recours (2 eyes)

Aligner tier + subscription **dans une transaction**. Remplacer les placeholders.

```sql
BEGIN;

UPDATE subscriptions
SET plan_id = (SELECT id FROM plans WHERE name = 'Pro'),
    status = 'active',
    stripe_subscription_id = 'sub_XXXX',
    current_period_start = TIMESTAMPTZ '2026-08-13 00:00:00+00',
    current_period_end = TIMESTAMPTZ '2026-09-13 00:00:00+00',
    cancel_at_period_end = false,
    updated_at = NOW()
WHERE user_id = '<uuid>';

UPDATE users
SET subscription_tier = 'pro',
    subscription_start_date = TIMESTAMPTZ '2026-08-13 00:00:00+00',
    subscription_end_date = TIMESTAMPTZ '2026-09-13 00:00:00+00',
    updated_at = NOW()
WHERE id = '<uuid>';

COMMIT;
```

Vérifier `SELECT` avant. **Ne pas** insérer un `payments` fictif `completed` sans `transaction_id` = invoice Stripe (sinon le vrai webhook P2002 plus tard — en fait unique empêche le vrai invoice; pire). Si la ligne payment manque: laisser le resend `invoice.paid` après unlock event.

### 5.3 Double abonnement Stripe

Si le user a **deux** `sub_` actives: ne pas upsert aveugle. Annuler **dans Stripe** la sub surnuméraire (`cancel`), garder celle liée à l’invoice payée. Puis sync webhook `deleted` / `updated`.

---

## 6. Checks de consistance (après repair)

```sql
-- Tier user vs plan subscription
SELECT u.email, u.subscription_tier, p.name AS plan, s.status, s.stripe_subscription_id
FROM users u
JOIN subscriptions s ON s.user_id = u.id
JOIN plans p ON p.id = s.plan_id
WHERE u.subscription_tier::text <> lower(p.name)
   OR (s.status IN ('canceled') AND u.subscription_tier <> 'free');

-- processed sans payload utile
SELECT id, type, status FROM stripe_webhook_events
WHERE status = 'processed' AND payload IS NULL;

-- DLQ restante
SELECT count(*) FROM stripe_webhook_events WHERE status = 'dlq';
```

Côté app: user logout/login ou attendre refresh JWT; `useMe` cache 5 min — demander un hard refresh.

---

## 7. Communication client

| Situation              | Message                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| Delay < 10 min         | « L’activation peut prendre quelques minutes. Rafraîchissez la page. Vous ne serez pas débité deux fois. » |
| Repair manuel          | « Paiement bien reçu (reçu Stripe `in_...`). Compte passé en Pro. Désolé pour le délai. »                  |
| Double email failed    | « Relance automatique, un seul prélèvement. »                                                              |
| Vrai double sub Stripe | « Nous annulons le doublon; un seul abonnement reste actif. Remboursement si double facture confirmée. »   |

Preuve: `invoice.paid` Stripe + `transaction_id` local. Remboursement **uniquement** via Stripe Dashboard / Customer, jamais en recréant un webhook `invoice.paid` inverse (non géré: utiliser `refund` Dashboard).

---

## 8. Signature / raw body cassés

Symptômes: 400 `INVALID_WEBHOOK`, Stripe `Webhook signature verification failed`.

1. Confirmer `rawBody: true` dans le deploy (rollback si un middleware parse JSON trop tôt).
2. Confirmer `STRIPE_WEBHOOK_SECRET` = signing secret **de cet** endpoint (pas le secret d’un autre endpoint / CLI `whsec`).
3. Ne **pas** ack 200 pour faire taire Stripe.

Contain playbook sécu: rotation `whsec` si suspicion d’abus (`INCIDENT-RESPONSE.md` Stripe webhook abuse).

---

## 9. Après-incident

1. Marquer les `evt_` traités dans le ticket.
2. Si silent `processed`: ticket engineering P0 (plan throw).
3. Si CronJob n’a pas tourné: Phase 4 du plan safe.
4. Postmortem si P1 ou > 5 users.

---

## 10. Ce qu’il ne faut jamais faire

- Créer une nouvelle Checkout Session « de réparation »
- Pointer Stripe vers un nouvel URL tout en laissant l’ancien vivant avec la même logique dupliquée
- `DELETE FROM stripe_webhook_events` pour « débloquer » sans backup
- Passer un user en Pro SQL **sans** `sub_` Stripe si on est en live (mensonges vs facturation)
- Désactiver la vérif de signature
- Retry DLQ en boucle sur une erreur métier permanente (`PLAN_NOT_FOUND`) sans fixer le seed `plans`
