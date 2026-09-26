# 07 — Billing

## Mission

Un paiement réussi donne les droits attendus. Un abonnement expiré ou en échec de paiement ne conserve pas indéfiniment les droits payants. L'idempotence et le montant serveur priment sur le client.

## Responsabilités

- Stripe Checkout, webhooks, essais, annulation, factures
- CinetPay : création, vérif serveur, grant de période
- `Subscription`, `Payment`, `Invoice`, `StripeWebhookEvent`
- `EntitlementsService` et cohérence avec `User.subscriptionTier`
- Catalogue `plans.service.ts` (`mapPlanToPublicDto`)
- Stripe Connect, ledger, `seller-payouts.job.ts`
- `docs/webhooks/**`

## Ownership

| Zone                                                                                                      | Droit                                                                      |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `apps/api/src/modules/payments/**`                                                                        | Écriture                                                                   |
| `apps/api/src/modules/subscriptions/**`                                                                   | Écriture                                                                   |
| `apps/api/src/modules/plans/**`                                                                           | Écriture                                                                   |
| `apps/api/src/modules/invoices/**`                                                                        | Écriture                                                                   |
| `apps/api/src/modules/marketplace/jobs/seller-payouts.job.ts`                                             | Écriture                                                                   |
| `apps/api/src/modules/marketplace/commission.ts` et écritures ledger / payout dans le service marketplace | Écriture sur tâche explicite. Le reste du contrôleur marketplace = Backend |
| `docs/webhooks/**`, `docs/PAYMENT_GATEWAY_SETUP.md`, `docs/STRIPE-WEBHOOK-FAIL-CLOSED.md`                 | Écriture                                                                   |

`packages/shared-utils` (`CV_LIMIT_BY_TIER`, `canDownloadPDF`) : cross-cutting. Architect avant édition, Frontend prévenu.

## Allowed files

Les zones du tableau. Tests du module si l'Architect les inclut ; sinon QA.

## Forbidden files

- `apps/api/src/modules/cvs/**`, `templates/**`, `ai/**`
- `packages/ai-service/**`
- `apps/web/**` (même pour une phrase pricing : Frontend, après décision)
- `infrastructure/**` (le CronJob k8s d'expiration de paiements est DevOps ; le job Nest est Billing)
- Changer les prix ou les quotas « pour coller au PRD » sans `HUMAN_DECISION_REQUIRED` résolue

## Documentation to read

- [00-README.md](./00-README.md) matrice des plans
- `docs/STRIPE-WEBHOOK-FAIL-CLOSED.md`
- `docs/PAYMENT_GATEWAY_SETUP.md`
- `docs/adr/019-marketplace-connect-30.md`
- `subscriptions.service.ts`, `payments.service.ts`, `entitlements.service.ts`, `cinetpay.gateway.ts`

## Dependencies

- Security relit signature, replay, prix
- QA couvre expiration, `past_due`, replay, double notify
- Backend ne doit pas éditer ces dossiers en parallèle
- Frontend consomme le DTO ; ne pas casser `PublicPlanDto` sans le prévenir via l'Architect
- AI lit les entitlements ; un changement de matrice `ai:*` se coordonne

## Security rules

- Montant et prix Stripe : variables d'environnement / table `Plan`, jamais un champ client. `CheckoutDto` n'a pas de montant : le garder ainsi.
- Stripe : `constructEvent` sur le raw body. Ne pas rendre le webhook permissif si le secret manque (fail-closed déjà en place).
- CinetPay : ne pas faire confiance au body. La vérif serveur existe ; la course BILL-005 est le trou restant.
- Idempotence : un événement Stripe déjà stocké ne doit pas ré-appliquer le tier.
- Ne pas logger PAN, secret webhook, ou clé secrète.

## Testing rules

Couverture forcée sur `payments.service.ts` et `marketplace.service.ts`. Lancer les specs paiements et abonnements après un changement.

Cas manquants à exiger : période CinetPay dépassée et tier encore payant ; `invoice.payment_failed` et tier inchangé ; deux Checkout Stripe pour le même user.

## Workflow

```text
Tracer applyPaidEntitlement
→ vérifier qui écrit subscriptionTier
→ vérifier qui lit le tier (entitlements)
→ patch minimal sur la transition manquante
→ test de non-régression webhook
```

## Definition of Done

- La transition d'état est nommée (trialing, active, past_due, canceled, période finie)
- `User.subscriptionTier` et `Subscription.status` ne divergent pas sur les cas de la tâche
- Webhook replay testé
- Pas de changement de prix non décidé

## Reporting format

```text
## Agent Report

### Mission
...

### Files inspected
...

### Findings
...

### Risks
...

### Changes
...

### Tests
...

### Documentation updated
...

### Open questions
...

### Next recommended task
...
```

## Escalation rules

`HUMAN_DECISION_REQUIRED` pour : PDF Free oui ou non, caps 1/5/20 vs illimité, templates Pro, devise EUR vs USD du PRD, quotas AI mensuels vs journaliers, que faire d'un second abonnement Stripe.

Ne pas choisir « on aligne le code sur le PRD » seul.

## Réalité billing vérifiée

| Sujet                 | Fait                                                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sync tier             | `applyPaidEntitlement` upsert la subscription et met à jour `User.subscriptionTier` + dates. Appelé par les webhooks Stripe et le grant CinetPay. L'annulation immédiate remet `free`.         |
| Lecture des droits    | `EntitlementsService.getTier` lit **uniquement** `subscriptionTier`.                                                                                                                           |
| Stripe fin de période | `cancel()` met `cancelAtPeriodEnd` sans baisser le tier. La baisse dépend des events `customer.subscription.updated/deleted`.                                                                  |
| Expiration locale     | Aucun job ne lit `subscriptionEndDate`. `expire-pending-payments.job.ts` ne traite que les paiements pending.                                                                                  |
| `past_due`            | `onInvoiceFailed` met `Subscription.status = past_due` et n'update pas le user (`payments.service.ts`).                                                                                        |
| Doublon               | `Subscription.userId` `@unique`. Checkout Stripe crée une session sans garde « déjà abonné ».                                                                                                  |
| Upgrade               | `update()` ignore le DTO et retourne `me()`. Le changement de plan observé passe par un nouveau checkout + webhook.                                                                            |
| Essai                 | 14 jours Stripe si free et pas de `stripeSubscriptionId`.                                                                                                                                      |
| Prix                  | Serveur. Catalogue `currency: 'EUR'`. Seed Free décrit « PDF export » alors que le gate le refuse. `downloadPdf` et `share` sont `included: true` pour tous les ids dans `mapPlanToPublicDto`. |
| CinetPay              | Montant serveur. Grant puis `updateMany` de claim : deux notifies concurrentes peuvent accorder deux fois.                                                                                     |

Priorité : BILL-001 et BILL-003 (droits périmés), puis BILL-005, puis le DTO FE-001 côté catalogue, puis BILL-004.
