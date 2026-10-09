# Marketplace — Phase 1

Date : 9 octobre 2026. Branche : `feat/marketplace-phase1`.

## 1. Analyse du prompt

### Ce qui était juste

Les six problèmes annoncés ont été vérifiés dans le code :

| Problème annoncé                | Constat dans le code                                                                                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listings bloqués en `submitted` | Aucun endpoint ne publiait. `ListingModeration` existait, sans écran ni API.                                                                                                                       |
| Achat sans accès dans l'éditeur | `getDesign` renvoyait le JSON, mais la création de CV vérifiait `isPremium`, donc un acheteur Free était refusé.                                                                                   |
| Achats en double                | Aucun contrôle avant le Checkout. Le second paiement était encaissé, puis ignoré **en silence** (`ConflictException` → `null`).                                                                    |
| Remboursements                  | Aucun événement Stripe de remboursement n'était traité. `refundedAt` n'était jamais écrit.                                                                                                         |
| Confirmation du Checkout        | `/payments/checkout/confirm` rejetait tout ce qui n'était pas `mode: subscription`, et l'URL de succès ne portait pas l'identifiant de session.                                                    |
| Double versement                | Le cron tournait sur chaque pod. Une clé « vendeur + jour + montant » avait été ajoutée (#81), mais un échec d'écriture en base après Stripe pouvait encore mener à un second envoi un autre jour. |

### Ce qui manquait ou était imprécis

1. **Contournement de licence non mentionné.** Un utilisateur Pro ou Business pouvait mettre n'importe quel template vendeur sur un CV sans l'acheter : `isPremium` laissait passer tout abonnement payant.
2. **Paiements perdus.** Un listing retiré après paiement faisait échouer le webhook jusqu'à la DLQ. Les moyens de paiement différés (`payment_status: unpaid`) n'étaient pas gérés.
3. **Designs vendeur non validés.** Un `designData` sans clé de mise en page connue de l'éditeur ne pouvait pas être affiché chez l'acheteur.
4. **Pas de rôle administrateur.** Le prompt demande un contrôle « indépendant de `subscriptionTier` », mais aucun rôle n'existe : les `roles` du JWT sont dérivés de l'abonnement. Il fallait donc un choix de mécanisme.
5. **Deux flux d'achat.** Le prompt ne cite que Checkout. Il existe aussi le flux PaymentIntent (`POST /templates/:id/purchase`), corrigé de la même façon.
6. **« Un seul worker autorisé ».** Il n'y a pas de worker dédié au cron : chaque pod de l'API l'exécute. La garantie vient donc d'un verrou par vendeur et de l'idempotence, pas d'une élection de leader.
7. **« Rapport d'audit ».** Aucun rapport d'audit Marketplace n'existe dans le dépôt. L'analyse ci-dessus en tient lieu.
8. **Décisions financières.** Plusieurs choix demandés (remboursement partiel, litige, double paiement, reverse transfer) sont des décisions métier. Ils sont listés en section 4.

### Prompt corrigé

> Sécuriser et finaliser le Marketplace existant (NestJS, Prisma, Stripe Checkout, PaymentIntent, Connect), sans toucher aux abonnements ni aux droits Pro et Business.
>
> - **A — Publication.** Modération par une liste d'identifiants configurée côté serveur, fermée par défaut et indépendante de l'abonnement. Approuver, demander des modifications, refuser ou suspendre, par transitions conditionnelles et transactionnelles, avec trace de la décision. Le vendeur peut retirer ou resoumettre, jamais publier. Les ventes et licences sont conservées.
> - **B — Livraison.** Un template vendeur suit la **licence**, jamais l'abonnement, à la création, la modification et la copie d'un CV. La licence couvre la mise en page de son design et aucune autre mise en page premium. Le design doit utiliser une mise en page connue de l'éditeur. L'acheteur crée un CV à partir du design acheté.
> - **C — Paiement.** Refuser le Checkout si une licence existe, si elle a été remboursée, ou si c'est le listing du vendeur. Vérifier côté Stripe le type, le listing, l'acheteur, le montant et la devise par rapport au prix facturé. Un rejeu ne produit aucun doublon. Un second paiement n'accorde rien et est signalé pour remboursement. Livrer même si le listing a été retiré entre-temps. Gérer les paiements différés. Permettre la confirmation au retour sans attendre le webhook.
> - **D — Remboursements.** Un remboursement total confirmé par Stripe révoque la licence et passe une écriture de correction, sans rien supprimer. Un remboursement partiel ou un litige est signalé, sans révocation, en attendant une politique.
> - **E — Versements.** Enregistrer d'abord le versement `pending` sous verrou, puis faire le transfert avec une clé d'idempotence et un `transfer_group` dérivés de l'identifiant du versement. Reprendre un versement abandonné en interrogeant Stripe avant tout nouvel envoi. Exclure du versement les ventes remboursées.
>
> Pas de migration destructive, pas de vrai paiement en test, et un e2e sur la vraie base pour la concurrence.

## 2. Changements réalisés

| Lot | Commit                                            | Résumé                                                                                                                                                                |
| --- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `feat(marketplace): moderators publish listings…` | `MARKETPLACE_MODERATOR_IDS`, `/marketplace/moderation/listings`, décisions `approve`, `request_changes`, `reject`, `suspend`. Retrait et resoumission par le vendeur. |
| C   | `fix(marketplace): one licence per buyer…`        | Refus des achats en double, vérifications Stripe, alerte MKT-01, paiements différés, confirmation des sessions Marketplace, `GET /templates/:id/licence`.             |
| B   | `feat(marketplace): a purchased template opens…`  | Accès aux templates vendeur par licence dans `CvsService`, validation de `designData.key`, boutons web « Utiliser ce modèle » et état de la licence.                  |
| D   | `feat(marketplace): a full refund revokes…`       | `charge.refunded` révoque et écrit un `refund_clawback`. Partiels et litiges : alertes MKT-02 et MKT-03.                                                              |
| E   | `fix(marketplace): two-phase seller payouts…`     | Versement `pending` sous verrou, puis transfert idempotent, puis rapprochement. Reprise par `transfer_group`. Ventes remboursées exclues.                             |

**Migration** : `20261009120000_moderation_suspend` ajoute la valeur `suspend` à `ModerationDecision`. Elle est additive (`ADD VALUE IF NOT EXISTS`) et compatible avec les pods de la version précédente.

**Nouveaux événements webhook**, désormais contrôlés par `pnpm stripe:check` :

- `checkout.session.async_payment_succeeded`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`

## 3. Tests exécutés

| Vérification                                           | Résultat                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| `pnpm lint`                                            | ✅ (avertissements existants uniquement)                         |
| `pnpm typecheck`                                       | ✅                                                               |
| Jest API avec seuils de couverture par fichier         | ✅ 629 tests ; `marketplace.service.ts` à 79 % des lignes        |
| E2E API, Postgres et Redis réels (`pnpm test:e2e:api`) | ✅ 59/59, dont `marketplace.e2e-spec.ts` (18)                    |
| Build web                                              | ✅                                                               |
| Playwright du parcours Marketplace dans le navigateur  | ❌ non exécuté, aucun spec Marketplace n'existe                  |
| Stripe réel (mode test)                                | ❌ non exécuté : aucun paiement, remboursement ou transfert réel |

L'e2e Marketplace couvre :

- la modération selon le profil : anonyme (401), Free, Pro, Business et vendeur (403), modérateur (OK) ;
- l'absence de `designData` dans le catalogue ;
- le refus de l'accès sans licence, Business compris ;
- un acheteur Free qui obtient le design et sa mise en page premium, mais aucune autre ;
- trois livraisons concurrentes du même paiement (une seule licence, quatre lignes au grand livre) ;
- un second paiement qui n'accorde rien ;
- un remboursement qui révoque une seule fois ;
- trois exécutions concurrentes du job de versement, qui ne produisent qu'un transfert ;
- la reprise d'un versement abandonné sans nouvel envoi ;
- la suspension d'un listing, qui conserve les ventes.

## 4. Décisions à prendre

| #   | Sujet                                           | Comportement implémenté                                                                                                               | Options                                                                                           |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| D1  | Désignation des modérateurs                     | Liste d'identifiants dans `MARKETPLACE_MODERATOR_IDS`. Fermée par défaut, aucune migration.                                           | Une colonne `users.role`, avec migration et un écran d'administration.                            |
| D2  | Second paiement pour une licence déjà détenue   | Aucune licence accordée, alerte MKT-01, remboursement manuel.                                                                         | Remboursement automatique via l'API Stripe.                                                       |
| D3  | Remboursement partiel                           | Licence conservée, alerte MKT-02.                                                                                                     | Révoquer au-delà d'un seuil, ou ne jamais révoquer.                                               |
| D4  | Litige perdu                                    | Alerte seulement (MKT-03).                                                                                                            | Révoquer la licence et passer une écriture de correction.                                         |
| D5  | Remboursement d'une vente en destination charge | Le `refund_clawback` est écrit, mais n'est pas déduit des versements : le transfert doit être annulé par Stripe (`reverse_transfer`). | Rembourser sans `reverse_transfer` et déduire des versements suivants.                            |
| D6  | CV existants après un remboursement             | Ils restent éditables, comme après un passage en Free. Aucun nouveau CV ni aucune copie n'est possible.                               | Retirer le style du template de ces CV.                                                           |
| D7  | Rachat après un remboursement                   | Refusé (`REPURCHASE_UNAVAILABLE`), car la ligne d'achat est unique.                                                                   | Autoriser, ce qui demande une migration de la contrainte.                                         |
| D8  | Devise des listings                             | USD (valeur par défaut existante), alors que les abonnements sont en EUR.                                                             | Passer en EUR, ce qui demande une migration de la valeur par défaut et une revue des commissions. |

## 5. Risques résiduels

- **Stripe réel non testé.** Les signatures, `transfers.list` par `transfer_group` et les paiements différés n'ont été vérifiés qu'avec un faux Stripe.
- **Grand livre.** Il n'existe aucun type d'écriture d'annulation de versement : un versement `failed` n'écrit rien, ce qui est correct puisqu'aucun argent n'a bougé.
- **Délai de reprise.** Un versement `pending` reste bloquant tant qu'un résultat inconnu persiste. Il est repris à l'exécution suivante (hebdomadaire) ou sur une relance manuelle du job.
- **Interface de modération.** Il n'y en a pas : la modération se fait par l'API, par exemple via Swagger avec un jeton de modérateur.
- **Conditions juridiques.** Les conditions de licence et la politique de remboursement de la marketplace sont encore marquées « à compléter » (voir `docs/LEGAL-PRIVACY-AUDIT.md`).

## 6. Étapes manuelles

1. Définir `MARKETPLACE_MODERATOR_IDS` dans `API_ENV_FILE` (staging, puis production) avec les identifiants des modérateurs.
2. Ajouter au webhook Stripe de chaque environnement les quatre événements de la section 2, puis lancer `pnpm stripe:check`.
3. Décider des points D1 à D8.
4. Remboursements Marketplace : depuis le tableau de bord Stripe, en suivant la décision D5.

## 7. Validation en staging

Prérequis : clés Stripe en **mode test**, `MARKETPLACE_MODERATOR_IDS` renseigné, webhook configuré avec les nouveaux événements, migration appliquée par le job `db-migrate`.

1. **Publication.**
   - Un compte vendeur active Connect en mode test, crée un template (`designData.key` = `executive`) puis un listing.
   - Vérifier que le listing est absent de `/marketplace`.
   - Un compte non modérateur appelle `POST /api/v1/marketplace/moderation/listings/:id/approve` : réponse 403.
   - Le modérateur approuve : le listing apparaît dans `/marketplace`.
2. **Achat et livraison.**
   - Un compte Free achète avec la carte `4242 4242 4242 4242`.
   - Au retour, la page affiche « Paiement en cours de confirmation » puis « Licence active ».
   - « Utiliser ce modèle » ouvre l'éditeur avec la mise en page Executive.
   - Passer ce CV sur un autre template premium est refusé.
3. **Double achat.** Rouvrir la page : le bouton d'achat a disparu. `POST …/checkout` répond 409 `ALREADY_PURCHASED`.
4. **Rejeu.** Dans le tableau de bord Stripe, renvoyer l'événement `checkout.session.completed` : toujours un seul achat et quatre lignes au grand livre.
5. **Remboursement.**
   - Rembourser totalement le paiement dans Stripe.
   - La page affiche « Licence remboursée ».
   - `GET …/design` répond 403 et une écriture `refund_clawback` existe.
6. **Versements.**
   - Faites tourner l'API sur au moins deux pods : `kubectl scale` ou un minimum HPA à 2.
   - Ajoutez des ventes de test datées au-delà de la période de rétention, pour au moins 25 $.
   - Laissez le cron du mercredi à 09:00 UTC s'exécuter sur tous les pods.
   - Vérifiez qu'un seul transfert existe dans Stripe, avec `transfer_group = payout_<id>`, et un seul `seller_payouts` en `paid`.
7. **Suspension.** Le modérateur suspend le listing : il disparaît du catalogue, et l'acheteur restant garde l'accès au design.
