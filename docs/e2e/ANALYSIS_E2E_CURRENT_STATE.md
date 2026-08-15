# Analyse E2E — état actuel vs Soft GA

**Date:** 14 août 2026  
**Périmètre:** flow paiement CV Studio AI (Next.js 14 + NestJS 10 + Playwright)  
**Verdict:** **GO conditionnel** — suite Playwright réelle livrée ; CI n’est plus un `--list` cosmétique. Soft GA reste bloqué tant que la suite n’a pas tourné **verte** une fois sur staging avec stack API + Postgres + Redis.

---

## 1. Où sont les tests

| Emplacement brief         | Réalité dépôt                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `tests/e2e/` à la racine  | **N’existe pas**                                                                       |
| Playwright                | `apps/web/playwright.config.ts` + `apps/web/e2e/`                                      |
| API « e2e »               | Jest Supertest `apps/api/test/` (auth seulement) — **pas** le flow paiement navigateur |
| CI E2E (avant ce travail) | `.github/workflows/ci.yml` : `playwright test … --list` + `continue-on-error: true`    |

**Décision (anti-dette):** ne **pas** créer un second `tests/e2e/` à la racine. Playwright reste dans `@cvstudio/web`. Un double `testDir` = deux configs, deux CI, selectors divergents.

---

## 2. État avant implémentation

### 2.1 Fichiers Playwright

| Fichier                             | Statut  | Couverture réelle                                                                                                      |
| ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `apps/web/e2e/payment-flow.spec.ts` | Stub UI | Register → mock PDF → checkout **dev_bypass**. Pas de login, pas de DB assert, pas de teardown, pas de Stripe hébergé  |
| `apps/web/e2e/pdf-export.spec.ts`   | Stub UI | `/editor/local-e2e-pdf` **sans cookie session** → middleware redirige vers `/login` → test cassé si réellement exécuté |
| Fixtures / POM / helpers            | Absents | Sélecteurs inline, emails `Date.now()`                                                                                 |
| `playwright.config.ts`              | Minimal | Chromium, video on failure, **pas de webServer**, **pas de CI stack**                                                  |

### 2.2 CI / CD

| Question                 | Réponse                                                       |
| ------------------------ | ------------------------------------------------------------- |
| Playwright setup exists? | Oui, partiel (`@playwright/test` ^1.49, script `test:e2e`)    |
| E2E déjà écrits?         | 2 specs, **non exécutés** en CI                               |
| Compte test en DB?       | Non. Seed = templates + plans Free/Pro/Business uniquement    |
| Staging accessible?      | CD staging existe (ECR/AWS). **Aucun job E2E contre staging** |
| Stripe test keys?        | `.env.example` = `sk_test_xxx` → checkout **dev_bypass**      |
| Seeders test users?      | Non                                                           |
| Pipeline E2E?            | Cosmétique (`--list`)                                         |

### 2.3 Couverture unitaire paiement (déjà verte — à ne pas dupliquer en Playwright)

`apps/api/src/modules/payments/payments.service.spec.ts` + `subscriptions.service.spec.ts` :

- Lock Redis NX / double webhook (P0-1)
- Retry exponentiel puis succès
- DLQ + Sentry après 3 échecs
- Plan inconnu → throw (P0-2)
- `cancelAtPeriodEnd` persisté, statut `active` (P0-3)

Ces cas **ne sont pas** des parcours navigateur. Les rejouer en Playwright avec mocks webhook = dette + flakiness.

---

## 3. Produit réel (écarts vs brief d’acceptance)

Le brief demandait Free = 3 CV, Pro = 10 CV, formulaire carte **embarqué**. Le code dit autre chose. Les tests suivent **le code**.

| Sujet           | Brief                   | Code                                                                                                                            |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Quota Free      | 3 CV                    | **1 CV** (`EntitlementsService.can('cv:create')`, seed `cvLimit: 1`)                                                            |
| Quota Pro       | 10 CV                   | **Illimité** (`tier !== 'free'` → `true`)                                                                                       |
| Quota Business  | Illimité                | Illimité                                                                                                                        |
| Checkout        | Formulaire carte in-app | **Stripe Checkout hébergé** (`window.location.href = session.url`)                                                              |
| Sans clé Stripe | —                       | `mode: 'dev_bypass'` active le plan en DB, redirect `?checkout=success`                                                         |
| Annulation      | Modal billing           | API `DELETE /subscriptions/me/cancel` existait ; **UI absente** (ajoutée)                                                       |
| Pricing CTA     | Upgrade Pro             | `/pricing` → **`/register`** (marketing). Upgrade réel = `/account/billing`                                                     |
| Login           | Credentials prédéfinis  | Pas de user seed. Isolation = **register unique** `@cvstudio.test`                                                              |
| PDF             | Download réel           | Export UI + worker Chromium. E2E flow principal **mocke** le binaire (déterministe). Contrat UI aussi dans `pdf-export.spec.ts` |
| Welcome         | « Welcome »             | Copy réelle : **« Bonjour, {firstName} »**                                                                                      |

Tester 3 CV / 10 CV / Elements would be **dette** : tests verts contre un produit qui n’existe pas.

---

## 4. Gaps vs 8 acceptance criteria (avant → après)

| #   | Critère                           | Avant                           | Après                                                            |
| --- | --------------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| 1   | Login email/password              | Non (register only)             | `full-payment-flow` + login invalid                              |
| 2   | Create CV                         | Partiel (click only)            | Create + identity form + liste dashboard                         |
| 3   | Export PDF                        | Mock, editor local cassé (auth) | Mock authentifié + cookie `cv_session` sur editor local          |
| 4   | Pricing                           | Non                             | `pricing.page.ts` + `edge-cases`                                 |
| 5   | Upgrade Pro CTA                   | Billing button only             | Dashboard « Passer à Pro » + billing + paywall CTA               |
| 6   | Checkout Stripe                   | Bypass only                     | Bypass par défaut ; `@stripe` = cartes 4242 / declined           |
| 7   | Subscription DB                   | Non                             | `GET /subscriptions/me` + `GET /users/me` (source de vérité API) |
| 8   | Plan limits UI                    | Non                             | Paywall 2ᵉ CV Free ; Pro/Business sans paywall                   |
| 9   | Free→Pro, Pro→Business, Downgrade | 2/3 stub, 0 downgrade           | 3 specs dédiées + UI cancel                                      |

| Gap brief           | Traitement                                                |
| ------------------- | --------------------------------------------------------- |
| Concurrent webhook  | Jest P0-1 — **pas** Playwright                            |
| Retry webhook / DLQ | Jest + `stripe-webhook.spec.ts` (contrat fichier)         |
| Double charge       | Jest lock + unique `transactionId` invoice                |
| Sentry empty        | Hors parcours UI ; webhook fatal déjà alerté unitairement |

---

## 5. Pages & endpoints sous test

### Web (App Router, pas `pages/`)

| Route              | Rôle E2E                                       |
| ------------------ | ---------------------------------------------- |
| `/login`           | AC1                                            |
| `/register`        | Provisioning user (API) ; page gardée pour POM |
| `/dashboard`       | Create CV, liste, upgrade CTA                  |
| `/editor/:id`      | Identity + export PDF                          |
| `/pricing`         | AC4 (public)                                   |
| `/account/billing` | Checkout, badge plan, cancel                   |

### API

| Méthode | Path                              | Usage test                   |
| ------- | --------------------------------- | ---------------------------- |
| POST    | `/api/v1/auth/register`           | Fixture user                 |
| POST    | `/api/v1/auth/login`              | Token teardown / asserts     |
| GET     | `/api/v1/users/me`                | `subscriptionTier`           |
| DELETE  | `/api/v1/users/me`                | Teardown GDPR                |
| GET     | `/api/v1/cvs`                     | Comptage limites             |
| POST    | `/api/v1/subscriptions/checkout`  | Bypass / setup Pro           |
| GET     | `/api/v1/subscriptions/me`        | Statut + `cancelAtPeriodEnd` |
| DELETE  | `/api/v1/subscriptions/me/cancel` | Downgrade                    |
| GET     | `/api/v1/health`                  | webServer ready              |

### Schéma (extrait)

- `users.subscription_tier` (`free` \| `pro` \| `business`)
- `subscriptions` (1:1 user, `cancel_at_period_end`, `stripe_subscription_id`)
- `plans` (seed Free/Pro/Business)
- `stripe_webhook_events` (`processing` \| `processed` \| `dlq`)
- `cvs` (`deleted_at` pour quota)

---

## 6. Priorités

| P   | Item                                     | Pourquoi                                              |
| --- | ---------------------------------------- | ----------------------------------------------------- |
| P0  | Suite Playwright + CI réelle             | Soft GA : le `--list` ne prouve rien                  |
| P0  | `AUTH_RATE_LIMIT_DISABLED=true` en E2E   | Register = **3/h/IP** sinon la suite meurt au 4ᵉ test |
| P0  | UI cancel + erreur checkout              | AC downgrade / card error invisibles sans ça          |
| P1  | Job `@stripe` manuel (workflow_dispatch) | Staging + webhook forwarding                          |
| P2  | E2E PDF worker réel (`E2E_REAL_PDF`)     | Lent, Chromium API, hors chemin critique CI           |
| P2  | Slack                                    | Secret optionnel `SLACK_WEBHOOK_URL`                  |

---

## 7. Recommandations

1. **Ne pas** seeder `test@example.com` / `Test123!`. Isolation = email unique + `DELETE /users/me`.
2. **Ne pas** ouvrir Prisma depuis `@cvstudio/web`. Asserts via API authentifiée.
3. **Ne pas** attendre 5 min de cron DLQ dans Playwright. Retry = Jest + script `webhook:retry-dlq`.
4. Lancer **une fois** `pnpm test:e2e` en local (stack `pnpm docker:up` + `pnpm dev`) avant Soft GA.
5. Staging Stripe : `E2E_STRIPE=1` uniquement avec `sk_test_` + Stripe CLI `listen --forward-to`.
6. Conserver `workers: 1` (Throttler 120/min + Redis auth). Parallelisme = flake.

---

## 8. GO / NO-GO de ce livrable

| Critère prompt        | Statut                                          |
| --------------------- | ----------------------------------------------- |
| Full payment flow E2E | GO (bypass CI ; Stripe opt-in)                  |
| 8 AC couverts         | GO (limites = 1 CV Free, pas 3/10)              |
| Edge cases            | GO (checkout 400, login KO, `@stripe` declined) |
| Isolation + cleanup   | GO (`@cvstudio.test` + deleteMe)                |
| CI/CD                 | GO (`.github/workflows/e2e-tests.yml`)          |
| Docs                  | GO (`docs/e2e/*`)                               |
| Run local + CI        | GO si Postgres/Redis/JWT/seed plans             |

**NO-GO restant (hors code tests) :** job jamais exécuté sur un runner ; staging Stripe non branché ; PDF worker réel non dans le chemin CI.
