# Pre-Implementation Checklist — Webhooks Stripe

**Date:** 13 août 2026  
**Usage:** Go / No-Go **avant tout diff** sur le chemin de paiement  
**Verdict actuel:** **NO-GO greenfield** · **GO Phase 0 puis Phase 1** (voir plan safe)

---

## Décision en une ligne

| Question                                                   | Réponse                    | Go?                          |
| ---------------------------------------------------------- | -------------------------- | ---------------------------- |
| Faut-il créer `StripeWebhookService` / `modules/stripe/` ? | Non, déjà dans `payments/` | **NO-GO**                    |
| Faut-il changer `POST /api/v1/payments/webhook` ?          | Non                        | **NO-GO**                    |
| Faut-il une table `WebhookDeadLetter` ?                    | Non, statut `dlq` existe   | **NO-GO**                    |
| Peut-on durcir lock / plan throw / cancel flag ?           | Oui, schéma compatible     | **GO** après cette checklist |

Si une case **bloquante** est non cochée → arrêter.

---

## 1. Code requirements (audit)

### Handler actuel

- [x] Controller webhook existe et reçoit les events — `PaymentsController` `POST payments/webhook`
- [x] Signature verification — `constructEvent` + `rawBody: true`
- [x] Error handling — 400 signature, 503 fail-closed, 500 après DLQ (Stripe retry)
- [ ] **Bloquant Phase 1:** claim `processing` étanche (aujourd’hui **non**)
- [ ] **Bloquant Phase 1:** `applyStripeSubscription` ne doit plus no-op + `processed`
- [ ] **Bloquant Phase 1:** `cancelAtPeriodEnd` non écrasé
- [x] Services Email / Stripe client / Subscription existent (`MailService`, clients Stripe inline, `SubscriptionsService`)
- [x] `GlobalExceptionFilter` + Nest `Logger`
- [x] Sentry helper `captureServerException` (DSN à valider **runtime**)

### Schéma

- [x] Table `subscriptions` + `stripe_subscription_id` (index)
- [x] Table `payments` + unique `transaction_id`
- [x] Table `invoices`
- [x] Table `stripe_webhook_events` (idempotency + DLQ)
- [ ] Unique `stripe_subscription_id` (Phase 4)
- [x] Indexes `status` / `created_at` sur webhook events
- [x] Pas de table DLQ séparée à créer

### Interdit de commencer Phase 1 si

- [ ] Une PR ouverte ajoute un second webhook controller
- [ ] L’URL Stripe Dashboard n’est pas inventoriée
- [ ] Personne ne peut exécuter `webhook:retry-dlq` en local

---

## 2. Infrastructure requirements

- [x] Redis **code** (`RedisService`, Compose)
- [ ] Redis **prod** (`REDIS_URL` secret) — à confirmer avant GA
- [x] Postgres source de vérité idempotency
- [x] Sentry SDK (DSN: case runtime ci-dessous)
- [x] Logger Nest
- [x] CronJob YAML présent
- [ ] CronJob **image + secret alignés** sur l’API (Phase 4, pas bloquant Phase 1)
- [ ] `GET /api/v1/health/ready` (probe k8s) — gap, hors chemin webhook strict
- [x] BullMQ **non requis** (et non branché) — ne pas en faire un prérequis
- [x] Backups: runbook RDS PITR documenté (prod visé)

### Runtime à vérifier (humain / env)

- [ ] `STRIPE_SECRET_KEY` live/test correct (pas `xxx`)
- [ ] `STRIPE_WEBHOOK_SECRET` correspond à l’endpoint Dashboard
- [ ] `STRIPE_FAIL_CLOSED=1` ou `NODE_ENV=production` sur l’API
- [ ] `SENTRY_DSN` réel → health `observability.sentry === true`
- [ ] `REDIS_URL` joignable
- [ ] SMTP ou acceptation « email log-only »

---

## 3. Test coverage requirements

### Minimum pour toucher le handler (Phase 1)

Doivent rester verts:

- [x] skip already processed
- [x] checkout.session.completed happy path
- [x] retry then success
- [x] DLQ + alert on permanent error
- [x] invoice.payment_failed → email

À **ajouter avant merge Phase 1**:

- [ ] lock: second concurrent event skipped
- [ ] plan missing → not processed, DLQ
- [ ] `cancel_at_period_end` persisté

### Pour Phase 2

- [ ] Redis throw n’empêche pas Prisma idempotency
- [ ] P2002 payment → pas de 2e email

### Pour GA

- [ ] Fixture signature `constructEvent` (intégration)
- [ ] Stripe CLI replay documenté
- [ ] Au moins un paiement test mode staging bout-en-bout
- [ ] Job CronJob manuel staging

**État actuel:** insuffisant pour GA; suffisant pour **commencer Phase 1** si les 3 tests P0 sont dans la même PR.

---

## 4. Compatibilité

- [x] Handler actuel restera le seul (si freeze respecté)
- [x] Tests existants: adapter mocks store si signature `markProcessing` change
- [x] Migration Étape 11 déjà dans le repo — pas besoin de recreer les tables
- [ ] Unique index Phase 4: vérifier 0 doublon avant migrate

```sql
SELECT stripe_subscription_id, COUNT(*)
FROM subscriptions
WHERE stripe_subscription_id IS NOT NULL
GROUP BY 1
HAVING COUNT(*) > 1;
```

---

## 5. Critères Go / No-Go

### NO-GO (stop immédiat)

1. Intention d’ajouter `modules/stripe/` ou un 2e endpoint.
2. Intention de répondre **200 sur signature invalide**.
3. Intention de DLQ Redis-only.
4. Intention d’ack 200 **avant** `markProcessing` sans queue durable (perte si crash).
5. `SENTRY_DSN` vide **et** lancement public (closed beta: acceptable si logs watchés + Stripe Dashboard).
6. Tests `payments.service.spec.ts` rouges sur `main`.

### GO Phase 0 (lecture / mesure)

Toujours **GO**. Zéro code.

### GO Phase 1 (P0 fixes)

**GO si:**

- [ ] Freeze architecture signé (ce fichier)
- [ ] Tests actuels verts
- [ ] PR limitée aux 3 fichiers (+ spec)
- [ ] Pas de change d’URL
- [ ] Plan de rollback = revert image / git revert
- [ ] Staging disponible ou Stripe CLI local

### GO Phase 4 CronJob prod

**GO si:**

- [ ] Phase 1 en prod stable ≥ 24 h
- [ ] Image CronJob = image API
- [ ] Secret = secret API
- [ ] Alerte DLQ branchée ou watch SQL manuel

### GO soft GA billing

**GO si:**

- [ ] P0 fermés
- [ ] CronJob alive **ou** process ops 24/7 sur Stripe failed deliveries
- [ ] Health Sentry true
- [ ] Runbook fallback exercé
- [ ] Unique `transaction_id` déjà en DB (oui)
- [ ] 1 paiement test mode réussi + replay idempotent

**Aujourd’hui (13 août 2026): soft GA billing = NO-GO.** Closed beta interne possible si ops surveille Stripe Dashboard et accepte R3/R4.

---

## 6. Sign-off

| Rôle    | Question                                     | Signature / date |
| ------- | -------------------------------------------- | ---------------- |
| Backend | Un seul handler confirmé                     |                  |
| DevOps  | Secrets + CronJob planifiés Phase 4          |                  |
| Produit | Acceptation delay UI 5 min ou hotfix refetch |                  |
| On-call | Sentry rule + runbook lus                    |                  |

Sans sign-off backend, **aucun diff webhook**.
