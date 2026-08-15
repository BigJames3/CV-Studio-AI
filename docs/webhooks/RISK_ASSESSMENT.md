# Risk Assessment — Webhooks Stripe (US 11.1)

**Date:** 13 août 2026  
**Entrée:** état réel du code (voir `AUDIT_WEBHOOKS_CURRENT_STATE.md`)  
**Périmètre:** perte de paiement, corruption de données, UX billing, ops  
**Décision liée:** ne **pas** réimplémenter; durcir l’existant

---

## 1. Matrice

| ID  | Scénario                                  | Probabilité                             | Sévérité | Impact $ / data                                               | Mitigation actuelle                                         | Résiduel         | Priorité   |
| --- | ----------------------------------------- | --------------------------------------- | -------- | ------------------------------------------------------------- | ----------------------------------------------------------- | ---------------- | ---------- |
| R1  | Réimplémenter un 2e handler               | Haute si on suit le brief               | Critique | Double sub / emails / chaos                                   | Aucune (humain)                                             | **Inacceptable** | Bloquant   |
| R2  | Double processing (`status=processing`)   | Moyenne (3 replicas + retry Stripe)     | Critique | Emails ×2, writes dupliquées                                  | PK event id seulement                                       | Élevé            | P0         |
| R3  | Plan Prisma manquant → `processed` à vide | Faible (seed cassé) / Haute (typo plan) | Critique | User payé resté Free                                          | Log warn                                                    | Élevé            | P0         |
| R4  | `cancelAtPeriodEnd` reset                 | Haute (chaque `updated`)                | Haute    | User « annulé » reste facturé                                 | `cancel()` pose le flag, webhook l’efface                   | Élevé            | P0         |
| R5  | Divergence `Subscription` vs `User.tier`  | Moyenne (crash entre 2 writes)          | Critique | Entitlements faux                                             | Aucune transaction                                          | Moyen            | P1         |
| R6  | `invoice.paid` avant checkout             | Haute (ordre Stripe)                    | Haute    | DLQ au 1er paiement; delay entitlement si checkout aussi fail | Retry Stripe + DLQ                                          | Moyen            | P1         |
| R7  | CronJob mort (image/secret)               | **Certaine** en prod actuelle           | Haute    | Plus que les retries Stripe (3 jours typiques)                | Stripe retries                                              | Moyen            | P1         |
| R8  | Email payment-failed dupliqué             | Haute sur replay                        | Moyenne  | Bruit support, pas de double charge                           | `transactionId` unique sur Payment                          | Moyen            | P1         |
| R9  | Timeout Stripe 30s vs retry sync          | Faible                                  | Haute    | Delivery parallèle                                            | Idempotence partielle                                       | Moyen            | P1         |
| R10 | Throttle 429 sur webhook                  | Faible                                  | Haute    | Delay activation                                              | 120/min                                                     | Faible           | P1         |
| R11 | Redis down → webhook 500                  | Moyenne                                 | Haute    | Stripe retry; OK si DB up                                     | Redis optionnel en théorie                                  | Moyen            | P2         |
| R12 | Redis DLQ non persistante comme source    | N/A                                     | —        | Postgres est la source                                        | LPUSH cosmétique                                            | Faible           | P2         |
| R13 | Race UI 5 min / JWT stale                 | Haute                                   | Moyenne  | UX confuse, API correcte                                      | Entitlements DB                                             | Faible $         | P2         |
| R14 | Double charge Stripe                      | Très faible                             | Critique | Argent client                                                 | Stripe idempotency interne; on ne crée pas de PaymentIntent | Faible           | Surveiller |
| R15 | DLQ perdue                                | Très faible si Postgres                 | Critique | Paiement jamais appliqué                                      | Table Postgres                                              | Faible           | P2         |
| R16 | Fake webhooks                             | Très faible                             | Critique | Sub gratuite                                                  | `constructEvent`                                            | Faible           | OK         |
| R17 | Events refund ignorés                     | Moyenne si refunds                      | Haute    | Tier Pro après remboursement                                  | Unhandled                                                   | Moyen            | P2         |
| R18 | GDPR delete sans cancel Stripe            | Haute                                   | Haute    | Facturation fantôme                                           | Hors webhook mais lié                                       | Élevé            | P0 produit |

Légende sévérité: Critique = argent ou corruption billing; Haute = entitlement faux durable; Moyenne = UX / support.

---

## 2. Scénarios à haut risque

### R1 — Réimplémentation du brief (le plus dangereux)

**Trigger:** ajouter `StripeWebhookController` + `StripeWebhookService` « comme proposé », tout en laissant `PaymentsController.webhook`.

**Chaîne:**

1. Stripe Dashboard pointe encore vers `/api/v1/payments/webhook` **ou** on bascule l’URL trop tôt.
2. Deux dispatches du même `event.id` si dual-path / mauvais cutover.
3. `applyStripeSubscription` 2× (souvent idempotent via upsert `userId`).
4. `onInvoiceFailed` envoie 2 emails.
5. Tests verts sur le nouveau service, prod cassée sur l’ancien.

**Impact clients:** activation aléatoire, support « j’ai payé / j’ai 2 mails », suspicion de double prélèvement (même si Stripe n’a chargé qu’une fois).

**Mitigation:** freeze architecture. Un seul `handleStripeWebhook`. Toute PR greenfield = No-Go.

**Rollback:** supprimer le nouveau module; ne jamais changer le secret/URL Stripe avant cutover unique testé.

---

### R2 — Duplicate processing concurrent

**Trigger:** Stripe timeout ou retry pendant qu’un pod est encore dans la boucle 3 tentatives (`status=processing`).

**Code:**

```ts
const claimed = await markProcessing(...)
if (!claimed && (await isProcessed(idempotencyKey))) return
// si claimed=false et status=processing → on continue
```

**Impact:**

- `onCheckoutCompleted`: upsert — souvent OK (même userId).
- `onInvoicePaid`: `P2002` swallow — OK pour Payment; Invoice upsert — OK.
- `onInvoiceFailed`: **email ×2**, Sentry ×2, `subscription.update` past_due ×2 (bénin).

**Pas de double charge carte** (pas de `invoice.pay` / nouveau PaymentIntent).

**Mitigation requise:** claim atomique:

- `UPDATE ... SET status='processing' WHERE id=? AND status IN ('dlq')` **ou**
- si `processing` et `updated_at` récent (< 60s) → return 200 sans re-dispatch
- si `processing` stale → steal lock

Réponse HTTP: **200 si un autre worker détient le lock** (éviter storm Stripe), pas 500.

---

### R3 — Paiement réussi, entitlement jamais posé

**Trigger:** seed `plans` incomplet (`Pro` / `Business` / `Free` absents) ou `planName` inattendu.

```ts
if (!plan) {
  this.logger.warn(`Plan not found for Stripe sync: ${planName}`);
  return; // puis markProcessed()
}
```

**Impact:** argent encaissé par Stripe, produit reste Free. L’event ne sera **jamais** rejoué (idempotence). **Perte d’activation, pas perte d’argent Stripe**, mais perte de confiance + charge support + obligation de replay manuel **après** reset du row `processed`.

**Mitigation:** throw (pas return) → retry/DLQ. Alert Sentry fatal. Runbook: `UPDATE stripe_webhook_events SET status='dlq' WHERE id='evt_...'`.

---

### R4 — Annulation fin de période annulée par webhook

**Trigger:** user clique Cancel → `cancelAtPeriodEnd=true` en DB + Stripe. Plus tard `customer.subscription.updated` (invoice, tax, payment method) → `applyStripeSubscription` met `cancelAtPeriodEnd: false`.

**Impact:** user croit être parti; Stripe continue (correct côté Stripe `cancel_at_period_end`); **DB menteuse**. UI peut proposer Cancel à nouveau ou afficher « actif ». À `deleted`, downgrade Free — éventuellement OK en fin de période. Pendant la période: confusion, pas de double charge.

**Mitigation:** mapper `stripeSub.cancel_at_period_end` vers le champ local. Ne jamais forcer `false`.

---

### R5 — Transaction manquante

**Trigger:** crash Node / kill pod entre:

```ts
await prisma.subscription.upsert(...)
await prisma.user.update({ subscriptionTier })
```

**Impact:**

- Sub Pro en table `subscriptions`, user encore Free → **paywall API** (entitlements lisent le user). Client a payé, features bloquées.
- Inverse impossible dans cet ordre.

`onInvoicePaid`: Payment créé, Invoice upsert fail → Payment orphelin mais unique `transactionId` empêche le doublon; Invoice peut se réparer au retry **sauf** si déjà `processed`.

**Mitigation:** `prisma.$transaction`. Idempotence ne protège pas un succès partiel déjà `processed`.

---

### R6 — Ordre des events checkout

Stripe n’offre pas d’ordre. `invoice.paid` / `customer.subscription.created` souvent avant `checkout.session.completed`.

Aujourd’hui `onInvoicePaid` **exige** la row locale. Échec → 3 retries in-request (checkout n’aura pas magiquement fini) → DLQ.

Puis checkout arrive → sub créée → CronJob/Stripe rejoue invoice → OK.

**Si CronJob mort (R7) et retries Stripe épuisés (~3 jours):** paiement Stripe OK, **ligne Payment/Invoice locale absente**. Tier peut quand même être Pro via checkout. Comptabilité interne fausse.

**Mitigation (phase ultérieure):** upsert subscription depuis l’invoice (retrieve Stripe sub) **ou** requeue invoice sans marquer processed; ne pas DLQ au 1er miss.

---

### R7 — DLQ processor inopérant

CronJob `image: cvstudioai/api:latest` + `secretRef: cvstudio-api-secrets` vs API `sha-replace` + `api-secrets`.

**Impact:** filet interne absent. On dépend de Stripe (retry exponentiel ~3 jours puis abandon). Events en `dlq` jamais reclaim.

**Mitigation:** aligner le manifest **sans** changer le handler. Ops: CLI manuel `webhook:retry-dlq` depuis un pod API sain.

---

### R8 — Emails dupliqués

Pas de table `email_sends`. `send()` swallow. Replay = nouvel email.

**Impact client:** anxiété (« on me relance »), pas de double prélèvement.

**Mitigation:** envoyer seulement si `payment.create` n’a pas hit P2002 (première insertion = premier mail).

---

### R14 — Double charge (money loss)

Le handler **ne crée pas** de charge. Il réagit à des events Stripe déjà comptabilisés.

Double charge réelle nécessiterait:

- deux Checkout Sessions (user double-clic) — Stripe + metadata `userId`; upsert **une** sub locale, mais **deux** abonnements Stripe possibles (`stripeSubscriptionId` **non unique**).
- ou replay qui appellerait `stripe.invoices.pay` — **n’existe pas** dans le code.

**Risque réel:** deux subscriptions Stripe pour un même user si double checkout avant le premier webhook. Hors strict webhook, mais aggravé par l’absence d’unicité `stripeSubscriptionId` et l’absence de Customer Portal.

**Mitigation produit:** Stripe Customer + `customer` réutilisé au checkout; unique index; bloquer checkout si sub active.

Ce n’est **pas** introduit par le retry/DLQ actuel.

---

## 3. Impact données

| Entité                    | Mode d’écriture webhook | Idempotent?         | Corruption possible                         |
| ------------------------- | ----------------------- | ------------------- | ------------------------------------------- |
| `stripe_webhook_events`   | insert/upsert statut    | PK event id         | Lock `processing` faible                    |
| `subscriptions`           | upsert `userId`         | Oui par user        | Flag cancel; stripe id écrasé               |
| `users.subscription_tier` | update séparé           | Non atomique        | Désync vs subscription                      |
| `payments`                | create + P2002          | Oui `transactionId` | Rows failed vs completed coexistent (voulu) |
| `invoices`                | upsert `invoiceNumber`  | Partiel             | Doublon si number change                    |
| Redis keys                | SET processed           | Cache               | Perte = fallback DB                         |
| Redis list DLQ            | LPUSH                   | Non lu              | Croissance infinie                          |

Pas de wipe. Pas de migration destructive requise pour durcir.

---

## 4. Impact clients

| Symptôme user                 | Cause probable                      | Argent                              | Action support                                     |
| ----------------------------- | ----------------------------------- | ----------------------------------- | -------------------------------------------------- |
| « J’ai payé, je suis Free »   | R3, R5, webhook lent + UI cache, R6 | Encaissé, entitlement faux          | Vérifier Stripe + `stripe_webhook_events` + replay |
| « Mon annulation a disparu »  | R4                                  | Continuité Stripe (souvent correct) | Recancel; ne pas refund panic                      |
| 2 emails payment failed       | R2, R8                              | Non                                 | Expliquer; ne pas restorer                         |
| Limite 1 CV après upgrade     | R13 (5 min) ou R3                   | Variable                            | Hard refresh; si DB Free → replay                  |
| Timeout checkout success page | Pas de polling                      | —                                   | Billing refetch                                    |

Pas de WebSocket / event bus aujourd’hui. Mitiger R13 par invalidation `useMe` sur `?checkout=success`, pas par une queue.

---

## 5. Stratégie de mitigation (ordre)

1. **Organisationnel:** freeze greenfield webhook. Review obligatoire de toute PR `payments/` / `stripe`.
2. **P0 code:** claim lock, throw si plan manquant, respecter `cancel_at_period_end`.
3. **P1:** `$transaction`, SkipThrottle, CronJob aligné, email si insert Payment.
4. **P1 data:** unique `stripeSubscriptionId` (nullable unique PostgreSQL), checkout réutilise customer.
5. **P2:** events refund, rétention events, health/ready, Redis try/catch.
6. **Ops:** alert Sentry tag `module=stripe-webhook` → on-call; dashboard DLQ count; runbook `FALLBACK_PROCEDURE.md`.

Aucune mitigation n’exige BullMQ ni une nouvelle table DLQ.

---

## 6. Ce que le retry/DLQ actuel ne casse pas

- Signature: inchangée, 400 sur fake.
- Unique `payments.transaction_id`: empêche double ligne `completed`.
- Upsert subscription par `userId`: pas de 2 rows locales.
- Fail-closed prod: pas de faux `{ received: true }` si Stripe off.
- Sentry: bruit possible, pas de silent drop en prod si DSN set.

Le risque « ajouter retry sans idempotence » du brief **est déjà traité** (avec le trou `processing`). **Ajouter un second retry layer** (nouveau service) réouvre R1.

---

## 7. Go / No-Go risques

| Action                                   | Go?                                   |
| ---------------------------------------- | ------------------------------------- |
| Merger un nouveau `StripeWebhookService` | **NO-GO**                             |
| Changer l’URL webhook                    | **NO-GO** sans dual-write + Dashboard |
| DLQ Redis-only                           | **NO-GO** (déjà évité)                |
| Durcir lock + plan throw + cancel flag   | **GO** (risque faible, tests d’abord) |
| Aligner CronJob                          | **GO** (infra, pas de logique métier) |
| Introduire BullMQ pour cette US          | **NO-GO** (surface inutile)           |

---

## 8. Residual risk après P0 (cible soft GA)

| Residual                                | Niveau acceptable?                               |
| --------------------------------------- | ------------------------------------------------ |
| Delay activation < 1 min (Stripe retry) | Oui                                              |
| UI stale 5 min                          | Oui si refetch success URL                       |
| Refunds manuels                         | Non pour GA si refunds offerts; sinon documenter |
| Double sub Stripe (double checkout)     | À traiter checkout, pas webhook                  |
| Sentry DSN oublié                       | Check health `observability.sentry` au deploy    |
