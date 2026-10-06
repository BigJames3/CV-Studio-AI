# AUDIT SUBSCRIPTION SYSTEM

Audit du système d'abonnement Stripe de CV Studio AI (branche `feat/subscription-system-audit-fix`, base `main` @ `c583bb1`).
Les numéros de ligne renvoient à l'état **avant** correction.

## Règles métier de référence

| Règle            | Valeur                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Prix             | Pro 9,99 €/mois ou 99 €/an ; Business 29,99 €/mois ou 299 €/an (EUR, prix Stripe lus côté serveur `STRIPE_PRICE_{PLAN}_{INTERVAL}`)    |
| Trial            | 14 jours, **une seule fois par compte**, quels que soient les réabonnements, changements de plan, sessions Checkout, Customers, cartes |
| Source de vérité | Stripe pour l'état de facturation ; le backend pour les droits ; le frontend n'accorde jamais rien                                     |
| Périodes         | `current_period_start` / `current_period_end` de Stripe, jamais calculées                                                              |
| Annulation       | `cancel_at_period_end` garde l'accès jusqu'à `current_period_end`                                                                      |

## Cartographie (A → R)

| Étape                    | Où                                                                                  | Comportement                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| A. Création utilisateur  | `auth.service.ts`                                                                   | `users.subscription_tier = free`, aucune ligne `subscriptions`                                                    |
| B. Catalogue             | `plans.service.ts` (`GET /plans`)                                                   | prix depuis la table `plans` (seed), `trialDays = 14` pour les plans payants, price IDs depuis l'env              |
| C. Clic « S'abonner »    | web `account/billing/page.tsx` → `subscriptionsApi.checkout`                        | n'envoie que `{ plan, interval }`                                                                                 |
| D. Validation            | `CheckoutDto` + `ValidationPipe` (whitelist, forbidNonWhitelisted)                  | `plan ∈ {pro,business}`, `interval ∈ {month,year}`                                                                |
| E. Abonné existant       | `SubscriptionsService.checkout` → `findLiveStripeSubscription` → `changeStripePlan` | changement de plan en place (pas de 2ᵉ abonnement)                                                                |
| F. Décision trial        | `checkout` l.255                                                                    | `tier == free && !stripeSubscriptionId`                                                                           |
| G. Stripe Customer       | `ensureStripeCustomerId` l.609                                                      | Customer stocké → Customer de l'abonnement → **Customer trouvé par email** → création                             |
| H. Sessions concurrentes | `expireOpenCheckoutSessions` l.562                                                  | expire les sessions ouvertes, erreurs ignorées                                                                    |
| I. Checkout Session      | `checkout.sessions.create` l.274                                                    | `mode=subscription`, `client_reference_id`, metadata, `trial_period_days`, sans clé d'idempotence                 |
| J. Retour Checkout       | `POST /payments/checkout/confirm` → `confirmCheckoutSession`                        | relit la session chez Stripe, vérifie le propriétaire, applique comme le webhook                                  |
| K. Webhook               | `POST /payments/webhook` → `handleStripeWebhook`                                    | `constructEvent` (signature), fail-closed si non configuré                                                        |
| L. Idempotence webhook   | `processEventWithRetry` + `StripeWebhookStoreService`                               | verrou Redis NX, table `stripe_webhook_events` (id unique, type, status, attempts, last_error, processed_at), DLQ |
| M. Synchronisation       | `onCheckoutCompleted`, `onSubscriptionChanged`, `onInvoicePaid`, `onInvoiceFailed`  | → `applyPaidEntitlement` (upsert `subscriptions`, mise à jour `users.subscription_tier`)                          |
| N. Droits                | `EntitlementsService` + `resolveEffectiveTier`                                      | tier effectif calculé depuis la BDD à chaque requête (statut + fin de période + délais de grâce)                  |
| O. Limite de CV          | `CvsService.create/duplicate`                                                       | verrou `pg_advisory_xact_lock` par utilisateur + comptage dans la transaction                                     |
| P. Annulation            | `DELETE /subscriptions/me/cancel` → `cancel`                                        | `cancel_at_period_end=true` chez Stripe                                                                           |
| Q. Portail               | `POST /subscriptions/me/portal`                                                     | session côté serveur avec le Customer stocké                                                                      |
| R. Nettoyage             | `ExpireSubscriptionsJob` (cron horaire) ; `cancelImmediately` (RGPD)                | repasse en `free` les tiers expirés ; annulation immédiate à l'effacement du compte                               |

## Architecture actuelle

Module `subscriptions` (checkout, changement de plan, annulation, portail, droits) et module `payments` (webhooks, confirmation Checkout, paiements et factures). Une ligne `subscriptions` par utilisateur (`user_id` unique), `stripe_customer_id` unique. Aucun champ ne mémorise l'usage du trial.

## Flux Checkout

Correctement protégé contre les prix venant du client (price ID résolu côté serveur), les URL de retour (`safeReturnUrl`) et les clés live. **Mais** aucune sérialisation : deux requêtes simultanées créent chacune une session (SUB-02), sans clé d'idempotence (SUB-04).

## Flux Stripe Customer

Réutilise un Customer **non marqué** trouvé par email et lui attribue l'utilisateur (SUB-03).

## Flux Subscription

Un seul abonnement Stripe actif par utilisateur (changement en place, `cancelSupersededSubscription` si deux Checkouts aboutissent). Les périodes viennent de Stripe, mais `syncStripeSubscription` lit `current_period_*` sans gérer les payloads « basil » (SUB-17).

## Flux Webhook

Signature vérifiée, idempotence par `event.id`, retries + DLQ : conforme. En revanche, le contenu de l'événement est appliqué tel quel : un événement plus ancien reçu en retard écrase un état plus récent (SUB-05), et `invoice.payment_failed` force `past_due` (SUB-06).

## Flux Entitlements

Calculés côté serveur depuis la BDD (bon). Statuts donnant accès : `active`, `trialing`, `past_due` (7 jours de grâce). Mais `unpaid` est mappé sur `past_due` dans `applyPaidEntitlement` et sur `canceled` dans le webhook : la règle n'est pas explicite (SUB-08).

## Gestion Trial

Pas de mémoire durable du trial (SUB-01), course entre Checkouts concurrents (SUB-02), aucun garde-fou lorsque Stripe démarre malgré tout un 2ᵉ trial (SUB-07), front qui affiche « 14 jours gratuits » à tout le monde (SUB-12), comportement en fin de trial sans moyen de paiement non défini (SUB-13).

## Gestion périodes

Dates Stripe utilisées. `applyPaidEntitlement` remplace un `periodStart` absent par `now` (SUB-10).

## Gestion annulation

`cancel_at_period_end` garde l'accès jusqu'à la fin de période (OK). `canceledAt` est réécrit à chaque synchronisation (SUB-09) et `cancel()` écrit un état local au lieu de l'état renvoyé par Stripe (SUB-11).

## Gestion renouvellement

`invoice.paid` enregistre paiement + facture ; `customer.subscription.updated` porte la nouvelle période. Devise par défaut `usd` si absente (SUB-14).

## Gestion upgrade/downgrade

Changement en place, upgrade facturé immédiatement (`always_invoice` + `pending_if_incomplete`), downgrade crédité, pas de proratisation pendant le trial. Le trial en cours est conservé (même abonnement), aucun nouveau trial n'est créé : conforme.

## Gestion utilisateurs existants

Aucune donnée sur le trial : une migration doit le reconstituer de façon prudente (SUB-15).

## Risques critiques

| ID     | Sévérité | Fichier                                    | Ligne            | Problème                                                                                                 | Impact                                                                                                     | Correction proposée                                                                                                            |
| ------ | -------- | ------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| SUB-01 | P0       | `subscriptions/subscriptions.service.ts`   | 255-256          | Éligibilité au trial déduite de `tier` et `stripeSubscriptionId`, rien n'est mémorisé                    | Tout chemin qui efface/recrée la ligne `subscriptions` ou un abonnement jamais synchronisé rouvre le trial | Colonnes `users.trial_used`, `trial_started_at`, `trial_ends_at`, `trial_stripe_subscription_id` ; éligibilité = `!trial_used` |
| SUB-02 | P0       | `subscriptions/subscriptions.service.ts`   | 211-301, 562-580 | Checkouts concurrents non sérialisés ; échec d'expiration des sessions ignoré                            | Plusieurs sessions avec trial ouvertes, plusieurs abonnements/trials                                       | Verrou consultatif Postgres par utilisateur (`billing:checkout`) autour du checkout ; échec d'expiration = refus (fail-closed) |
| SUB-03 | P0       | `subscriptions/subscriptions.service.ts`   | 636-645          | Réutilise un Customer Stripe **non marqué** trouvé par email                                             | Rattachement d'un Customer (cartes, historique, trials) qui n'appartient pas à l'utilisateur               | Ne réutiliser que le Customer stocké ou marqué `metadata.userId` ; sinon en créer un                                           |
| SUB-07 | P0       | `payments/payments.service.ts`             | 325-433          | Aucun garde-fou à la réception d'un abonnement `trialing` pour un compte dont le trial est déjà consommé | Session ancienne / course / données héritées → 2ᵉ trial effectif                                           | `enforceSingleTrial` : réserve le trial (CAS SQL) ou termine immédiatement le trial chez Stripe (`trial_end=now`)              |
| SUB-05 | P1       | `payments/payments.service.ts`             | 369-433          | `customer.subscription.*` appliqué depuis le payload, sans tenir compte de l'ordre                       | Un `updated(active)` reçu après `deleted` restaure l'accès payant                                          | Relire l'abonnement chez Stripe avant de synchroniser (le payload ne sert que si l'abonnement n'existe plus)                   |
| SUB-06 | P1       | `payments/payments.service.ts`             | 543-546          | `invoice.payment_failed` force `status = past_due`                                                       | Un échec ancien reçu après un paiement réussi bascule l'abonnement en impayé                               | Resynchroniser le statut depuis Stripe                                                                                         |
| SUB-04 | P1       | `subscriptions/subscriptions.service.ts`   | 274, 646         | Pas de clé d'idempotence sur `customers.create` et `checkout.sessions.create`                            | Doublons de Customer lors d'un retry réseau                                                                | `customer-create:{userId}` ; `checkout-session:{userId}:{uuid}` (une opération précise) ; `trial-end:{subscriptionId}`         |
| SUB-15 | P1       | `prisma/schema.prisma`                     | 187              | Utilisateurs existants sans information de trial                                                         | Un ancien abonné pourrait obtenir un trial                                                                 | Migration non destructive avec backfill prudent + vérification de l'historique Stripe du Customer au checkout                  |
| SUB-08 | P2       | `subscriptions/subscriptions.service.ts`   | 318              | `unpaid` → `past_due` (accès en grâce) ici, mais → `canceled` dans le webhook                            | Règle d'accès implicite et incohérente                                                                     | `unpaid` → `suspended` ; règle documentée dans `effective-tier.ts`                                                             |
| SUB-09 | P2       | `subscriptions/subscriptions.service.ts`   | 360, 372         | `canceledAt = new Date()` à chaque synchronisation                                                       | Date d'annulation fausse                                                                                   | Utiliser `canceled_at` de Stripe                                                                                               |
| SUB-10 | P2       | `subscriptions/subscriptions.service.ts`   | 324              | `periodStart ?? new Date()`                                                                              | Période inventée                                                                                           | `periodStart` obligatoire                                                                                                      |
| SUB-11 | P2       | `subscriptions/subscriptions.service.ts`   | 112-129          | `cancel()` écrit `cancelAtPeriodEnd`/`canceledAt` localement                                             | État local divergent de Stripe                                                                             | Synchroniser depuis l'abonnement renvoyé par Stripe                                                                            |
| SUB-12 | P2       | `web/components/billing/plan-grid.tsx`     | 134              | « 14 jours gratuits » affiché même si le trial est consommé                                              | Promesse commerciale fausse                                                                                | `trialEligible` renvoyé par `GET /subscriptions/me`, affiché seulement si éligible                                             |
| SUB-17 | P2       | `subscriptions/subscriptions.service.ts`   | 535-547          | `syncStripeSubscription` lit `current_period_*` directement                                              | `NaN` si le compte Stripe rend la période sur l'item (API basil)                                           | Utiliser `subscriptionPeriod()`                                                                                                |
| SUB-13 | P3       | `subscriptions/subscriptions.service.ts`   | 287              | Fin de trial sans moyen de paiement non spécifiée                                                        | Comportement implicite                                                                                     | `trial_settings.end_behavior.missing_payment_method = cancel`                                                                  |
| SUB-14 | P3       | `payments/payments.service.ts`             | 500, 524         | Devise par défaut `usd`                                                                                  | Factures mal libellées si la devise manque                                                                 | Défaut `eur`                                                                                                                   |
| SUB-16 | P3       | `payments/stripe-webhook-store.service.ts` | —                | Table d'idempotence : `id`(eventId), `type`, `status`, `processed_at`, `last_error` déjà présents        | —                                                                                                          | Aucune modification (conforme)                                                                                                 |

## Statuts donnant accès

| Statut Stripe                    | Statut local | Accès payant                                           |
| -------------------------------- | ------------ | ------------------------------------------------------ |
| `active`                         | `active`     | oui, jusqu'à `current_period_end` (+72 h de tolérance) |
| `trialing`                       | `trialing`   | oui, jusqu'à `current_period_end` (= fin du trial)     |
| `past_due`                       | `past_due`   | oui, 7 jours après l'échec de paiement                 |
| `unpaid`, `incomplete`, `paused` | `suspended`  | non                                                    |
| `canceled`, `incomplete_expired` | `canceled`   | non                                                    |
| inconnu                          | `suspended`  | non (fail-closed)                                      |

# PLAN DE CORRECTION

| Priorité    | Issues                                 | Étape                                                                                     |
| ----------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| P0 Critique | SUB-01, SUB-15                         | 1. Modèle + migration non destructive (`trial_*` sur `users`, backfill prudent)           |
| P0 Critique | SUB-01, SUB-02, SUB-13                 | 2. Logique de trial + Checkout sous verrou utilisateur                                    |
| P0 Critique | SUB-03, SUB-04                         | 3. Customer : stocké ou marqué uniquement, création idempotente                           |
| P0 Critique | SUB-07                                 | 4. Garde-fou « un seul trial » à la réception de l'abonnement                             |
| P1          | SUB-05, SUB-06                         | 5. Webhooks : relecture de l'état Stripe (ordre indifférent)                              |
| P2          | SUB-08, SUB-09, SUB-10, SUB-11, SUB-17 | 6. Synchronisation : statuts explicites, dates Stripe                                     |
| P2          | SUB-12                                 | 7. Frontend : affichage du trial selon l'éligibilité serveur                              |
| P3          | SUB-14                                 | 8. Devise par défaut EUR                                                                  |
| —           | toutes                                 | 9. Tests (trial, Stripe, webhooks, périodes, annulation, droits, concurrence, régression) |
