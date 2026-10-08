# Audit juridique, confidentialité et préparation à la production

Date : 8 octobre 2026. Branche : `feat/legal-privacy-production-readiness`.

Ce document reflète le code de cette branche. Il ne constitue pas un avis juridique : les points marqués **À valider** demandent une décision de l'exploitant ou d'un juriste.

## A. Résumé

**Prêt techniquement, sous réserve de validations.** Les pages juridiques existent et décrivent le fonctionnement réel. Le consentement aux cookies, l'export et la suppression des données fonctionnent et sont testés. Trois défauts bloquants ont été corrigés : les virements vendeurs multipliés par le nombre de pods, la suppression de compte sans confirmation et le traceur chargé avant le consentement.

Les pages ne sont **pas publiables en l'état**. L'identité de l'exploitant, le droit applicable, l'âge minimum, les durées de conservation, la TVA, la politique de remboursement et les garanties de transfert hors UE restent à fournir. Chaque page affiche un bandeau « Document en cours de validation » tant que `apps/web/src/lib/legal.ts` n'est pas complété.

La conformité juridique ne peut pas être déduite de ces tests.

## B. Pages

Toutes les pages sont publiques, en français uniquement : l'application n'a pas de système i18n.

| Page                     | Route                 | Langues | Contenu vérifié dans le code         | Tests e2e | État                                   |
| ------------------------ | --------------------- | ------- | ------------------------------------ | --------- | -------------------------------------- |
| Confidentialité          | `/privacy`            | FR      | oui                                  | oui       | brouillon, infos exploitant manquantes |
| Conditions d'utilisation | `/terms`              | FR      | oui                                  | oui       | brouillon, droit applicable et âge     |
| Conditions d'abonnement  | `/subscription-terms` | FR      | oui : Stripe, essai, prorata, grâce  | oui       | brouillon, TVA et rétractation         |
| Remboursement            | `/refund-policy`      | FR      | oui : aucun remboursement automatisé | oui       | brouillon, politique commerciale       |
| Cookies                  | `/cookie-policy`      | FR      | oui : inventaire du code             | oui       | prêt sous réserve                      |
| Mentions légales         | `/legal-notice`       | FR      | hébergeur seulement                  | oui       | brouillon, éditeur                     |

Points d'accès :

- **Pied de page** : toutes les pages, plus « Préférences cookies ».
- **Inscription** : lien vers les conditions, case non cochée par défaut, et mention de la politique de confidentialité séparée de l'acceptation.
- **Tarifs et grille de facturation** : renouvellement, essai, lien vers les conditions d'abonnement et la politique de remboursement.
- **Paramètres › Confidentialité** : export, cookies et suppression du compte.

## C. Données personnelles

### Inventaire

| Catégorie             | Données exactes                                                                             | Finalité                     | Base (à valider)           | Destination                                              | Conservation                                                           | Suppression du compte       |
| --------------------- | ------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------- |
| Compte                | e-mail, prénom, nom, hash bcrypt ; facultatifs : téléphone, localisation, bio, avatar (URL) | compte, connexion            | contrat                    | BDD                                                      | vie du compte                                                          | anonymisé                   |
| Date de naissance     | colonne `date_of_birth`                                                                     | aucune (pas de formulaire)   | —                          | BDD                                                      | —                                                                      | effacée                     |
| OAuth                 | fournisseur, ID chez le fournisseur                                                         | connexion Google ou LinkedIn | contrat                    | BDD                                                      | vie du compte                                                          | supprimé                    |
| 2FA                   | secret chiffré, codes de secours hachés                                                     | sécurité                     | contrat                    | BDD                                                      | vie du compte                                                          | effacé                      |
| CV                    | contenu JSON, versions, rapports ATS (offre collée), vues publiques                         | service                      | contrat                    | BDD, Redis (PDF ≤ 15 min)                                | jusqu'à suppression ; **CV supprimé = suppression logique sans purge** | supprimé                    |
| IA                    | prompt (≤ 280 caractères), résultat                                                         | optimisation, lettre         | contrat                    | BDD ; OpenAI pour l'optimisation de puces seulement      | 7 jours (cron quotidien)                                               | supprimé                    |
| Abonnement            | formule, statut, dates, montants, factures, IDs Stripe                                      | facturation                  | contrat, obligation légale | BDD, Stripe                                              | **non défini**                                                         | conservé (compte anonymisé) |
| Sessions              | IP, user-agent, dates                                                                       | sécurité                     | intérêt légitime           | BDD, Redis                                               | **pas de purge des lignes**                                            | supprimées                  |
| Journal de sécurité   | action, IP, user-agent                                                                      | sécurité                     | intérêt légitime           | BDD                                                      | **pas de purge**                                                       | conservé                    |
| Événements produit    | type, données nettoyées, session                                                            | mesure interne               | intérêt légitime           | BDD ; PostHog seulement si `POSTHOG_SERVER_CAPTURE=true` | **pas de purge**                                                       | détachés de l'utilisateur   |
| Mesure d'audience web | événements PostHog                                                                          | amélioration                 | consentement               | PostHog                                                  | 1 an (cookie)                                                          | non supprimé chez PostHog   |
| Vues de CV public     | hash journalier IP+UA, domaine référent                                                     | statistiques Business        | intérêt légitime           | BDD                                                      | avec le CV                                                             | supprimées avec le CV       |
| Marketplace           | profil vendeur, compte Stripe Connect, achats, avis, litiges                                | marketplace                  | contrat                    | BDD, Stripe                                              | **non défini**                                                         | conservés                   |
| Support               | e-mails                                                                                     | support                      | contrat                    | messagerie                                               | **non défini**                                                         | —                           |

Données sensibles : les CV peuvent en contenir (santé, opinions, photo). La politique invite à ne pas les saisir. Aucune détection n'existe.

### Prestataires et transferts

| Prestataire      | Région                                                           |
| ---------------- | ---------------------------------------------------------------- |
| OVH, hébergement | Gravelines, UE                                                   |
| Stripe           | UE et États-Unis                                                 |
| OpenAI           | États-Unis, si `OPENAI_API_KEY` est défini                       |
| PostHog          | **US par défaut** (`POSTHOG_HOST`), passer en `eu.i.posthog.com` |
| Sentry           | région du DSN                                                    |
| Google, LinkedIn | si l'utilisateur s'en sert                                       |
| Relais SMTP      | **non choisi**                                                   |

Garanties de transfert : **À valider** pour chaque prestataire.

### Export et suppression

L'export `GET /users/me/export` est accessible depuis Paramètres › Confidentialité. Il couvre toutes les catégories de la base et exclut les secrets. Il liste aussi ce qu'il ne couvre pas : prestataires, journaux serveur, sauvegardes.

La suppression `DELETE /users/me` exige le mot de passe, ou l'e-mail pour un compte OAuth. Elle :

- résilie Stripe immédiatement, sans remboursement ;
- supprime CV, IA, OAuth, sessions, notifications, portfolios, équipes et sièges de collaboration ;
- anonymise le profil et les événements ;
- conserve paiements, factures, achats et journal de sécurité.

Elle ne supprime ni le client Stripe, ni la personne chez PostHog, ni les sauvegardes. Les deux endpoints sont limités à 5 requêtes par minute.

## D. Cookies

| Élément                                                                  | Catégorie         | Avant consentement                  |
| ------------------------------------------------------------------------ | ----------------- | ----------------------------------- |
| `refresh_token` (HttpOnly, 7 j), `cv_session` (7 j)                      | nécessaire        | oui                                 |
| `cv_account`, `cv_logout_at`, `cv_analytics_consent(_at)` (localStorage) | nécessaire        | oui                                 |
| `cv-draft-*`, `oauth_*`, `cv-view-*` (sessionStorage)                    | nécessaire        | oui                                 |
| `ph_*`, `__ph_opt_in_out_*` (PostHog), `cv_sid`                          | mesure d'audience | **non** (corrigé)                   |
| Script Google Identity (pages de connexion, si activé)                   | tiers             | chargé à l'affichage, **À valider** |

Consentement :

- La bannière apparaît seulement si PostHog est configuré.
- Elle propose « Tout refuser », « Personnaliser » et « Tout accepter », avec le même poids visuel. La case n'est pas pré-cochée.
- Le choix est daté et redemandé après 13 mois.
- Le consentement se retire depuis le pied de page ou les paramètres. Le retrait supprime les cookies et le stockage PostHog.

Tests Playwright sur build de production avec une clé PostHog factice et le trafic PostHog intercepté :

- aucune requête et aucun cookie avant consentement ;
- cookies créés après acceptation, supprimés après retrait ;
- refus mémorisé après rechargement.

En CI, le test avec PostHog est ignoré, car la CI ne définit pas de clé.

## E. Paiements et abonnements

- **Stripe** est le seul prestataire. **CinetPay a été retiré du code.** La colonne `cinetpay_transaction_id` existe toujours sur `main`, car la PR #43 a été fusionnée dans `claude/remove-cinetpay`, pas dans `main`.
- **Prix** : seed et page Tarifs à 9,99 €/99 € et 29,99 €/299 € ; `pnpm stripe:check` vérifie les montants et la devise EUR des Price IDs. HT ou TTC : **À valider**.
- **Essai de 14 jours** : une fois par compte, carte obligatoire, prélèvement à la fin, annulé si aucun moyen de paiement n'est enregistré.
- **Résiliation** : en fin de période depuis Facturation, accès maintenu. La reprise n'existe pas dans l'interface, le texte renvoie au support.
- **Changement de formule** : passage supérieur facturé immédiatement au prorata, passage inférieur crédité, aucun prorata pendant l'essai.
- **Impayé** : nouvelles tentatives Stripe, e-mail, 7 jours de grâce, puis Free.
- **Remboursements** : aucun automatisé, ils se font à la main depuis Stripe. Politique commerciale et droit de rétractation (UE : services numériques, L221-25 et L221-28 du Code de la consommation ; Côte d'Ivoire : loi n° 2013-546) : **À valider**.

## F. Sécurité

| Sévérité | Constat                                                                                                    | Fichier                                   | Correction                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------- |
| P0       | Le cron de virements vendeurs tournait sur chaque pod API (HPA min 3), d'où des virements Stripe multiples | `marketplace.service.ts`                  | clé d'idempotence (vendeur, jour, montant), transaction, conflit d'unicité ignoré |
| P0       | Un jeton d'accès volé suffisait à supprimer le compte                                                      | `users.service.ts`                        | mot de passe ou e-mail exigé, 403, limite de débit                                |
| P0       | PostHog initialisé avant tout choix, cookie `ph_*` déposé                                                  | `posthog-client.ts`                       | chargé seulement après consentement                                               |
| P1       | Événements serveur envoyés à PostHog malgré un refus                                                       | `observability/posthog.ts`                | `POSTHOG_SERVER_CAPTURE=true` requis                                              |
| P1       | SMTP sans authentification, certificats non vérifiés                                                       | `mail.service.ts`                         | `SMTP_USER/PASS/SECURE`, TLS vérifié en production                                |
| P1       | E-mail du destinataire et lien de réinitialisation dans les logs                                           | `mail.service.ts`                         | adresse masquée, corps jamais journalisé                                          |
| P1       | Consentement re-daté à chaque page (jamais expiré) ; « accepté » écrit sans clic en dev                    | `analytics/index.ts`                      | écrit seulement sur un choix                                                      |
| P1       | La bannière masquait les liens juridiques du pied de page                                                  | `consent-banner.tsx`                      | hauteur réservée                                                                  |
| P1       | Export limité au profil et aux CV ; pas d'écran export ou suppression                                      | `users.service.ts`, `PrivacySettings.tsx` | export complet et onglet Confidentialité                                          |

Vérifiés sans changement :

- signature des webhooks (`constructEvent`, fail-closed) ;
- prix déterminés côté serveur (Price IDs d'environnement) ;
- statut d'abonnement recalculé côté serveur ;
- aucune clé secrète dans le dépôt ni dans le bundle web (`git grep` des motifs `sk_live`, `whsec`, `phc_`, clés privées) ;
- garde JWT globale ;
- CSP et `X-Frame-Options` côté web, en-têtes de sécurité côté API (`common/http-security.ts`) ;
- aucun endpoint admin de lecture des CV.

Non traités, **À décider** :

- L'acceptation des conditions n'est pas enregistrée côté serveur (date, version), et une inscription via Google ou LinkedIn ne passe pas par la case : cela demande une migration et un choix d'UX.
- Pas de purge des CV supprimés, des sessions, du journal de sécurité ni des événements.
- La suppression du compte ne supprime pas le client Stripe ni la personne PostHog.
- Le message d'erreur OpenAI (≤ 400 caractères) est renvoyé dans les avertissements de l'IA.

## G. Tests

| Vérification                                                               | Résultat                 | Commentaire                            |
| -------------------------------------------------------------------------- | ------------------------ | -------------------------------------- |
| `pnpm lint`                                                                | ✅ 11/11                 | avertissements existants uniquement    |
| `pnpm typecheck`                                                           | ✅ 11/11                 |                                        |
| `pnpm test`                                                                | ✅                       |                                        |
| API Jest + couverture                                                      | ✅ 592 tests, 53 suites  | seuils par fichier respectés           |
| API e2e (Postgres + Redis réels)                                           | ✅ 41/41                 |                                        |
| Build web                                                                  | ✅                       | 6 routes juridiques statiques          |
| Playwright `legal-privacy.spec.ts`, build de prod avec clé PostHog factice | ✅ 18/18                 |                                        |
| Playwright `legal-privacy.spec.ts`, `next dev`                             | ✅ 16, 2 ignorés         | les 2 ignorés exigent un build de prod |
| Playwright, suite complète (hors `@stripe`)                                | voir le rapport de la PR |                                        |
| Paiements Stripe réels ou en mode test                                     | non exécuté              | aucune clé ; `@stripe` exclu           |
| Production (DNS, HTTPS, webhooks, sauvegardes)                             | non vérifiable           | environnement pas encore déployé       |

## H. Fichiers

**API** :

- `apps/api/src/modules/marketplace/marketplace.service.ts` et `.spec.ts`
- `apps/api/src/mail/mail.service.ts` et `.spec.ts`
- `apps/api/src/modules/users/users.service.ts`, `.spec.ts`, `users.controller.ts`, `dto/delete-account.dto.ts`
- `apps/api/src/observability/posthog.ts`, `posthog.spec.ts`, `index.ts`
- `apps/api/.env.example`

**Web** :

- `apps/web/src/lib/legal.ts`
- `apps/web/src/lib/analytics/consent.ts`, `posthog-client.ts`, `index.ts`
- `apps/web/src/components/analytics/consent-banner.tsx`, `cookie-preferences-button.tsx`
- `apps/web/src/components/legal/legal-page.tsx`
- `apps/web/src/components/profile/PrivacySettings.tsx`
- `apps/web/src/components/layout/marketing-chrome.tsx`
- `apps/web/src/components/billing/plan-grid.tsx`
- `apps/web/src/app/(marketing)/{privacy,terms,subscription-terms,refund-policy,cookie-policy,legal-notice}/page.tsx`
- `apps/web/src/app/(marketing)/pricing/page.tsx`
- `apps/web/src/app/(auth)/register/page.tsx`
- `apps/web/src/app/(app)/account/settings/page.tsx`
- `apps/web/src/app/sitemap.ts`
- `apps/web/src/lib/api/index.ts`

**Tests e2e** :

- `apps/web/e2e/tests/legal-privacy.spec.ts`
- `apps/web/e2e/utils/api.ts`
- `apps/web/e2e/fixtures/auth.fixture.ts`

**Documentation** :

- `docs/pre-launch/OBSERVABILITY_SETUP.md`
- ce fichier

Aucune migration Prisma.

## I. Informations à fournir par l'exploitant

1. **Identité** : raison sociale, forme juridique, capital, adresse, immatriculation (RCS ou RCCM), TVA, directeur de la publication.
2. **Pays** : pays d'établissement et pays ciblés. Ils déterminent le RGPD, la loi ivoirienne n° 2013-450 et l'ARTCI, le droit de la consommation et la TVA.
3. **Conditions** : droit applicable, juridiction compétente, âge minimum.
4. **Contacts** : confirmer que `privacy@`, `support@` et `legal@cvstudio.ai` existent et sont lus.
5. **Conservation** : durées pour les CV supprimés, les sessions, le journal de sécurité, les événements, les factures (obligation comptable), les sauvegardes et le support.
6. **Prix** : régime de TVA (HT ou TTC, Stripe Tax ?).
7. **Remboursements** : politique commerciale, délai de réponse tenable, règles de la marketplace.
8. **Rétractation** : modalités et éventuelle demande d'exécution immédiate au checkout.
9. **Prestataires** : relais SMTP de production, région PostHog (UE recommandée), région Sentry, conditions API OpenAI (conservation, entraînement), garanties de transfert.
10. **Traduction** : décider si une version anglaise est requise au lancement. Elle n'existe pas.

## J. Liste de contrôle avant lancement

- [ ] Compléter `apps/web/src/lib/legal.ts`, puis faire relire les 6 pages par un juriste. Le bandeau « brouillon » disparaît automatiquement.
- [ ] `NEXT_PUBLIC_POSTHOG_HOST` et `POSTHOG_HOST` sur `https://eu.i.posthog.com` (projet UE), ou ne pas définir PostHog au lancement.
- [ ] Laisser `POSTHOG_SERVER_CAPTURE` non défini, sauf décision contraire.
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` et `MAIL_FROM` dans `API_ENV_FILE` ; tester une réinitialisation de mot de passe en staging.
- [ ] `NODE_ENV=production` sur l'API, nécessaire pour la vérification TLS SMTP et les cookies sécurisés.
- [ ] Déclarer l'URL de la politique de confidentialité et des conditions dans Stripe (branding et portail client), Google et LinkedIn (écran de consentement OAuth).
- [ ] Webhook Stripe de production vers `https://api.cvstudio.ai/api/v1/payments/webhook`, mode live, et `STRIPE_ALLOW_LIVE=1` uniquement en production.
- [ ] `pnpm stripe:check` sur les clés de production : montants, EUR, webhooks, portail.
- [ ] Décider des purges (CV supprimés, sessions, journaux, événements) et de l'enregistrement de l'acceptation des conditions.
- [ ] Vérifier la rétention des sauvegardes PostgreSQL OVH et tester une restauration.
- [ ] Procédure de support : qui lit `privacy@` et sous quel délai, et comment supprimer un client chez Stripe et une personne chez PostHog sur demande.

## K. Git

- Branche `feat/legal-privacy-production-readiness`, créée depuis `main` (`007c32e`), un commit par sujet.
- Aucune migration, aucun déploiement, aucun push automatique, aucune fusion.
