# Plan d’action — CV Studio AI

| Champ              | Valeur                                                                         |
| ------------------ | ------------------------------------------------------------------------------ |
| Date               | 13 août 2026                                                                   |
| Objectif           | Fermer les P0, dogfood, puis soft launch — **sans** bloquer sur les phases 7–9 |
| Hypothèse staffing | 1–2 ingénieurs full-stack                                                      |

Le plan du brief (« 15 minutes PostHog + push main ») est **rejeté**. Ci-dessous le plan calé sur le code réel.

---

## 0. Règle d’or

**Ne pas ajouter de features (IA, collab, referrals, admin MRR) tant que les P0 sécurité + money loop ne sont pas verts.**

Chaque jour : une chose qui réduit le risque de prod, pas une chose qui élargit le scope.

---

## Today — durcissement (pas du monitoring)

Durée réaliste : **4–8 heures**, pas 15 minutes.

### Bloc A — P0 sécurité (bloquant)

| #   | Action                                                                                                                                            | Fichiers                                                     | Done |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---- |
| A1  | Retirer `@Public()` de `POST /templates/seed`. Guard interne ou script CLI `prisma db seed` uniquement.                                           | `apps/api/src/modules/templates/templates.controller.ts`     | ☐    |
| A2  | Exiger JWT sur `POST /cvs/export/pdf` **ou** refuser `dto.html` si non authentifié. Throttle plus bas (ex. 3/min).                                | `apps/api/src/modules/cvs/export/export.controller.ts`       | ☐    |
| A3  | Au boot API : si `NODE_ENV=production` et secret JWT ∈ `{dev-access-secret-change-me, unset}` → `process.exit(1)`. Idem refresh + encryption key. | `apps/api/src/main.ts`, `jwt.strategy.ts`, `auth.service.ts` | ☐    |
| A4  | `POST /subscriptions` (`create`) : interdire `plan=pro\|business` hors admin / Stripe webhook. Tout upgrade passe par `checkout`.                 | `subscriptions.service.ts`                                   | ☐    |

### Bloc B — Money loop (bloquant business)

| #   | Action                                                                                                                                       | Fichiers                                   | Done |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---- |
| B1  | Webhook `applyStripeSubscription` : écrire `cancelAtPeriodEnd: stripeSub.cancel_at_period_end` (plus `false` hardcodé).                      | `subscriptions.service.ts`                 | ☐    |
| B2  | Brancher `GET /invoices` dans `/account/billing` (liste + lien PDF). Toast si checkout échoue.                                               | `apps/web/.../billing/page.tsx`, `lib/api` | ☐    |
| B3  | Bouton « Gérer l’abonnement » → Stripe Billing Portal (`billingPortal.sessions.create`). Bouton Annuler → `DELETE /subscriptions/me/cancel`. | API + billing page                         | ☐    |
| B4  | `deleteMe` : `subscriptions.cancel` Stripe si `stripeSubscriptionId`, puis soft-delete + anonymiser email (`deleted+{id}@…`).                | `users.service.ts`                         | ☐    |

### Bloc C — Legal minimum UE

| #   | Action                                                                             | Done |
| --- | ---------------------------------------------------------------------------------- | ---- |
| C1  | Pages `/privacy` et `/terms` (même courtes). Liens footer marketing + signup.      | ☐    |
| C2  | Endpoint `GET /users/me/export` (JSON profil + CVs métadonnées, pas de secrets).   | ☐    |
| C3  | UI « Supprimer mon compte » sur `/account/profile` qui appelle `DELETE /users/me`. | ☐    |

### Ce qu’on ne fait **pas** aujourd’hui

- Créer un compte PostHog « pour cocher la case » sans SDK dans le repo.
- Push `main` vers un cluster EKS inexistant.
- Activer Stripe **live**.
- Construire `/admin/analytics`.

**Critère de fin de journée :** `pnpm --filter @cvstudio/api test` vert + checklist A1–A4 cochée + notes B/C en PR.

---

## Day 1 — stack local production-like (monitoring réel)

Durée : 1 journée.

1. `pnpm docker:up` → Postgres + Redis + Mailpit.
2. `pnpm db:migrate:deploy && pnpm db:seed`.
3. Renseigner `apps/api/.env` **test** : Stripe test keys, price IDs, JWT secrets **nouveaux** (≥32 chars).
4. Stripe CLI : `stripe listen --forward-to localhost:3001/api/v1/payments/webhook`.
5. Parcours manuel (écrire les résultats dans un pad) :

| Flow                           | Attendu                                                | Résultat |
| ------------------------------ | ------------------------------------------------------ | -------- |
| Signup                         | User DB + mail vérif dans Mailpit + JWT                | ☐        |
| Login + logout                 | Session clear, cookie refresh cleared                  | ☐        |
| 2e CV                          | Paywall, pas de 2e CV Free                             | ☐        |
| Checkout 4242…                 | Webhook → `subscriptionTier=pro`                       | ☐        |
| Billing invoices               | Au moins 1 ligne après paiement test                   | ☐        |
| Cancel                         | `cancelAtPeriodEnd=true` en DB **et** Stripe           | ☐        |
| Delete account                 | Plus de login ; Stripe canceled / cancel_at_period_end | ☐        |
| `POST /templates/seed` anonyme | **401/403**                                            | ☐        |
| `POST /cvs/export/pdf` anonyme | **401** (si A2 JWT)                                    | ☐        |

6. Si un SDK d’errors est voulu : installer `@sentry/node` + `@sentry/nextjs` **et** les brancher dans `main.ts` + `instrumentation.ts`. Une DSN seule ne fait rien (constat audit).

**Pas de live traffic.**

---

## Week 1 — stabilisation (closed beta)

Objectif : 5–20 utilisateurs internes / amis, Stripe **test** ou live avec plafond bas.

| Jour  | Focus                                                                                                 | Done |
| ----- | ----------------------------------------------------------------------------------------------------- | ---- |
| J1–J2 | Finir B + C si non clos                                                                               | ☐    |
| J3    | Consent banner minimal + `enableAnalytics()` **ou** retirer les `track()` morts                       | ☐    |
| J3    | Brancher Amplitude **ou** PostHog (un seul, pas les deux). ADR existant = Amplitude (`docs/adr/018`). | ☐    |
| J4    | Playwright : exécuter `payment-flow.spec.ts` contre stack locale (plus `--list`)                      | ☐    |
| J4    | CI : retirer `continue-on-error` sur e2e **ou** job séparé `needs: services`                          | ☐    |
| J5    | Masquer marketplace / seller dans la nav si KYC/Connect non ready (feature flag)                      | ☐    |
| J5    | Documenter runbook incident 1 page (down, webhook DLQ, mail down)                                     | ☐    |

Métriques Week 1 (même manuelles) :

- Signups, CVs créés, checkouts tentés, checkouts OK, erreurs 5xx.
- Temps signup → premier PDF.

Hors scope Week 1 : Lighthouse 90, CAC/LTV, referrals, mobile, collab.

---

## Week 2–4 — Phase « Launch hardening » (ex-phases 4+5 du brief, réordonnées)

Le brief plaçait Performance en semaine 4 et Security en semaine 5. **Inverser.**

### Semaine 2 — Security / GDPR (ex-Phase 5, prioritaire)

- Rate limit PDF + auth déjà présents : étendre aux exports / AI.
- Headers : vérifier Helmet en prod ; cookies `Secure` + domain.
- GDPR : privacy, export, delete (si C incomplet).
- Audit `Roles()` : implémenter `RolesGuard` avant tout `/admin`.
- Swagger `/docs` : désactiver en production ou protéger.

### Semaine 3 — Billing polish + observabilité

- Customer Portal, invoices, dunning (email `sendPaymentFailed` déjà là).
- Sentry SDK réel (web + api) + alert Slack/email sur `fatal`.
- Dual-write `analytics_events` → Amplitude/PostHog (TODO actuel L67 `analytics.service.ts`).
- Corriger `RequestIdMiddleware` (existe, non enregistré).

### Semaine 4 — Performance baseline (ex-Phase 4, allégée)

- Lighthouse marketing + dashboard (mesurer, pas « viser 90 en 1 sprint »).
- `next/image` sur avatars / QR.
- Index Prisma : vérifier EXPLAIN des list CV / analytics events (indexes déjà présents sur `userId`, `createdAt`).
- Timeout client API (aujourd’hui : AbortSignal optionnel seulement).
- Connection pooling : `directUrl` est documenté ; PgBouncer **pas** dans Compose — décider avant charge.

Exit Week 4 : **GO soft launch public** si P0=0, money loop testé live (1 paiement réel 9,99), privacy en ligne, Sentry reçoit 1 event test.

---

## Month 2–6 — Phases 5–9 réalignées

Voir [ROADMAP_OPTIMISEE.md](./ROADMAP_OPTIMISEE.md) pour le détail. Ici : allocation temps.

| Mois | Thème                                                                                     | Ne pas faire                           |
| ---- | ----------------------------------------------------------------------------------------- | -------------------------------------- |
| M2   | QA réelle (unit billing/auth, e2e signup→upgrade, load 50–100 VU pas 1000)                | « 80 % coverage global » comme gate    |
| M3   | AI qui marche (optimize + cover letter + ATS) + quotas ; couper les 10 endpoints scaffold | Collab realtime                        |
| M4   | Growth : SEO pages existantes, onboarding, emails dunning/expiration                      | Referral program avant instrumentation |
| M5   | Marketplace **ou** mobile — **un** seul, pas les deux                                     | Les deux en parallèle                  |
| M6   | Infra : backups PITR, CD staging réel, uptime check                                       | Multi-région, on-call rotation 24/7    |

---

## Quick wins vs long terme

### Quick wins (2–6 h chacun, ROI immédiat)

1. A1 seed endpoint.
2. Toast checkout error.
3. Invoices UI (API déjà là).
4. Fail-fast JWT en prod.
5. Privacy page statique.
6. Feature-flag marketplace.

### Moyen terme (1–2 semaines)

- Billing Portal + cancel UI.
- Sentry SDK + 3 alertes.
- Analytics consent + 8 events cœur (signup, login, cv_created, paywall, checkout_*).
- E2E CI réel sur payment-flow.

### Long terme (ne pas démarrer avant soft launch)

- Admin analytics MRR/CAC/LTV (besoin d’events + spend).
- Referral / affiliate.
- Collab / teams.
- App mobile GA.
- Multi-région / read replicas.

---

## Chemin critique (une ligne)

**Sécuriser les endpoints publics → fermer Stripe (portal, invoices, cancel sync, delete) → legal min → smoke test → closed beta → observabilité → soft launch → ensuite perf/QA/growth.**

Tout le reste (phases 7–9 du brief) est **hors chemin critique**.
