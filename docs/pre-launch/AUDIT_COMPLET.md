# Audit complet — CV Studio AI

| Champ          | Valeur                                                                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date           | 13 août 2026                                                                                                                                                                                      |
| Méthode        | Lecture du code (`apps/web`, `apps/api`, Prisma, CI, infra) — **pas** validation du brief                                                                                                         |
| Verdict        | **NO-GO production**. Produit cœur réel. Observabilité / admin / legal / plusieurs contrôles sécu **non prêts**.                                                                                  |
| Livrables liés | [GO_NO_GO_DECISION.md](./GO_NO_GO_DECISION.md) · [ACTION_PLAN.md](./ACTION_PLAN.md) · [CHECKLIST_PRE_LANCEMENT.md](./CHECKLIST_PRE_LANCEMENT.md) · [ROADMAP_OPTIMISEE.md](./ROADMAP_OPTIMISEE.md) |

---

## 0. Écart brief vs dépôt (le point le plus important)

Le brief d’entrée décrit 3 semaines (Dashboard, Stripe, Email+Analytics), « TypeScript 0 errors, tests all passing, no technical debt, 6 min PostHog/Sentry, GO ».

Le dépôt est **à la fois plus grand et moins fini** que ce récit.

| Claim brief                                            | Réalité code                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Semaines 1–3 = tout le produit                         | Auth, éditeur, PDF, templates, AI slice, marketplace, mobile scaffold, K8s — **Phase 1+ du PRD** |
| PostHog page tracking                                  | **Aucun** package `posthog`. Stub Amplitude, consent jamais activé                               |
| Sentry init web + API                                  | **Pas** de `@sentry/*`. HTTP envelope **uniquement** pour alertes Stripe                         |
| 4 templates email + Resend + cron expiration           | **3** mails HTML inline, **nodemailer/SMTP**, pas de Resend, pas de cron                         |
| Admin `/admin/analytics` + AdminGuard + `ADMIN_EMAILS` | **N’existe pas**. Seller analytics ≠ admin                                                       |
| CAC/LTV/cohorts + dual-write PostHog                   | Table `AnalyticsEvent` oui. Formules **absentes**. TODO Amplitude                                |
| Smart reactivation `cancel_at_period_end=false`        | Webhook **force** `cancelAtPeriodEnd: false` — c’est un bug, pas une feature                     |
| Invoices UI                                            | API `GET /invoices` **oui**. UI = « Aucune facture pour le moment » **toujours**                 |
| Vercel frontend+backend                                | **Pas** de `vercel.json`. Infra = Docker + manifests K8s                                         |
| Zod partout                                            | **class-validator** + `ValidationPipe`                                                           |
| Rate limiting absent (gap Phase 5)                     | **Déjà là** : Throttler 120/min + Redis auth                                                     |
| 2FA Phase 5                                            | **Déjà là** : TOTP                                                                               |
| GDPR delete manquant                                   | `DELETE /users/me` **existe** ; UI + export + cancel Stripe **manquants**                        |
| Tests all passing                                      | ~14 spec files ; e2e CI = `playwright --list` + `continue-on-error`                              |
| No technical debt                                      | Endpoints publics dangereux, billing UI morte, analytics morte                                   |

Document interne plus honnête : `docs/DELIVERY-STATUS-30-SPRINTS.md` (30 juillet 2026).

---

## 1. Cartographie produit réelle

```
apps/web     Next.js — marketing, auth, dashboard, editor, billing, marketplace, share
apps/api     NestJS — auth, users, cvs, templates, subscriptions, payments, invoices,
             ai, analytics (user), marketplace, health, mail, worker PDF
apps/mobile  Expo scaffold (Phase 0)
apps/admin   ABSENT
packages/    ui, shared-types, shared-utils, ai-service (optimize + heuristics)
infrastructure/  docker-compose, k8s overlays, terraform scaffolds, helm placeholder
```

### 1.1 Frontend — status par fichier demandé

| Élément brief                  | Chemin réel                                                            | Status                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Dashboard paywall / pagination | `apps/web/src/app/(app)/dashboard/page.tsx`                            | **OK** — bouton « Afficher plus », pas infinite scroll                                           |
| PaywallModal                   | `components/paywall/paywall-modal.tsx` (pas `PaywallModal.tsx` racine) | **OK** — monté dans layout app                                                                   |
| Toasts                         | Sonner dans `providers/app-providers.tsx` + `useCvMutations.ts`        | **OK** mutations CV ; **KO** checkout                                                            |
| `useMe` / `useUserPlan`        | `hooks/useMe.ts`                                                       | **OK**                                                                                           |
| `useCvsInfinite`               | `hooks/useCvsInfinite.ts`                                              | **OK**                                                                                           |
| `useCvMutations`               | `hooks/useCvMutations.ts`                                              | **OK**                                                                                           |
| `useInvoices`                  | —                                                                      | **ABSENT**                                                                                       |
| Billing Stripe                 | `app/(app)/account/billing/page.tsx`                                   | **PARTIEL** — redirect Checkout ; pas de Stripe.js ; `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` unused |
| Admin analytics                | `app/(app)/admin/analytics`                                            | **ABSENT**                                                                                       |
| AdminGuard                     | —                                                                      | **ABSENT**                                                                                       |
| Layout PostHog                 | `app/layout.tsx`                                                       | **PAS de PostHog**                                                                               |
| Signup/login events            | `(auth)/signup`, `login`                                               | **PAS de track()**                                                                               |
| Logout reset PostHog           | `useLogout`                                                            | Clear session + cache seulement                                                                  |
| Analytics client               | `lib/analytics/index.ts`                                               | Stub Amplitude, `consented === false` → no-op                                                    |
| API client                     | `lib/api/client.ts`                                                    | JWT mémoire + refresh cookie ; **pas de timeout défaut**                                         |
| Theme / dark mode              | `providers/theme-provider.tsx`                                         | Tokens dark **oui** ; `setTheme` **jamais appelé**                                               |
| `next/image`                   | —                                                                      | **0 import** ; `<img>` QR/avatars                                                                |
| ErrorToast dédié               | —                                                                      | Sonner, pas `Toasts/ErrorToast.tsx`                                                              |

**Questions d’audit frontend**

| Question                 | Réponse                                                    |
| ------------------------ | ---------------------------------------------------------- |
| Components chargent ?    | Oui pour le cœur (dashboard, editor, billing, auth)        |
| Console errors en prod ? | Non mesuré (pas de run browser dans cet audit)             |
| Images Next.js Image ?   | Config `images.formats` seulement                          |
| CSS dangling ?           | `.cv-page-enter` dupliqué globals + tokens, unused         |
| Timeouts + retry API ?   | Retry 401 refresh ; RQ `retry: 1` queries ; pas de timeout |
| Logout reset PostHog ?   | N/A — pas de PostHog                                       |
| Responsive ?             | Breakpoints Tailwind présents ; pas un audit visuel        |
| Dark mode ?              | Plumbing oui, toggle UI non                                |

**Bugs frontend notables**

1. Checkout `catch { setCheckoutPending(null) }` — erreur silencieuse.
2. Historique factures hardcodé vide alors que l’API invoices existe.
3. Middleware protège `/analytics` mais **aucune page** ; marketplace/seller **hors** matcher.
4. Taxonomie `events.ts` riche ; presque aucun call site vivant (ATS / export / editor-store `track()` morts sans consent).

### 1.2 Backend — modules et claims

Modules sous `apps/api/src/modules` : `ai`, `analytics`, `auth`, `cvs`, `health`, `invoices`, `marketplace`, `payments`, `subscriptions`, `templates`, `users`. Hors modules : `mail/`, `database/`, `redis/`, `worker.ts`.

| Claim                     | Status                                 | Preuve                                                                                 |
| ------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| Stripe webhooks signés    | **OK**                                 | `constructEvent` + `rawBody: true`                                                     |
| Checkout sessions         | **OK**                                 | `SubscriptionsService.checkout` ; bypass si pas de clé (dev)                           |
| Invoices persistées       | **OK**                                 | `onInvoicePaid` + `InvoicesController`                                                 |
| Customer Portal           | **ABSENT**                             | Pas de `billingPortal.sessions.create`                                                 |
| Reactivation smart        | **BUG**                                | Cancel Stripe `cancel_at_period_end: true` ; webhook update `cancelAtPeriodEnd: false` |
| Email 4 templates         | **3**                                  | verify, reset, payment_failed                                                          |
| Resend                    | **ABSENT**                             | `nodemailer`                                                                           |
| Cron expiration           | **ABSENT**                             | Pas de `@nestjs/schedule`                                                              |
| SMTP fallback             | SMTP **est** le primaire ; échec → log |
| PostHog dual-write        | **ABSENT**                             | Prisma only + TODO Amplitude                                                           |
| CAC/LTV/cohorts           | **ABSENT**                             | Docs analytics seulement                                                               |
| Admin analytics           | **ABSENT**                             | `AnalyticsService.dashboard` = stats **user** (cvs, views, ATS)                        |
| trackSignup               | **ABSENT**                             | Audit `auth.register` ≠ analytics product                                              |
| JWT refresh / logout      | **OK**                                 | Rotation + reuse detection                                                             |
| AdminGuard / ADMIN_EMAILS | **ABSENT**                             | Décorateur `Roles()` sans `RolesGuard`                                                 |
| CV CRUD + soft delete     | **OK**                                 | `deletedAt`                                                                            |
| Pagination CV             | **OK**                                 | Cursor                                                                                 |
| Rate limiting             | **OK**                                 | Global + Redis auth + `@Throttle` export                                               |
| CORS                      | **OK**                                 | `CORS_ORIGINS`                                                                         |
| Zod                       | **NON**                                | class-validator                                                                        |
| Sentry filter global      | **NON**                                | `GlobalExceptionFilter` log + JSON                                                     |
| `main.ts` Helmet          | **OK**                                 | helmet, cookies, ValidationPipe, interceptors, Swagger `/docs`                         |

**Routes `@Public()` (JWT skip)**

- Auth : register, login, refresh, OAuth, forgot/reset, verify-email
- `GET /health`
- `POST /payments/webhook`
- `GET /public/cvs/:slug`
- `POST /cvs/export/pdf` ← **P0**
- `GET/POST /templates` dont **`POST /templates/seed`** ← **P0**
- `GET /marketplace/templates`

**Trous sécu backend**

| ID  | Sévérité | Détail                                                                                      |
| --- | -------- | ------------------------------------------------------------------------------------------- |
| S1  | **P0**   | `POST /templates/seed` public — upsert catalogue                                            |
| S2  | **P0**   | `POST /cvs/export/pdf` public, HTML jusqu’à 10 Mo → Chromium (DoS / SSRF)                   |
| S3  | **P0**   | JWT fallbacks `dev-access-secret-change-me` si env manquant                                 |
| S4  | **P1**   | `POST /subscriptions` crée un record `active` 100 ans (tier user non mis à jour — landmine) |
| S5  | **P1**   | `deleteMe` : sessions revoked, **Stripe inchangé**                                          |
| S6  | **P1**   | Webhook écrase `cancelAtPeriodEnd` à `false`                                                |
| S7  | **P2**   | `RequestIdMiddleware` jamais enregistré (`requestId` souvent `"unknown"`)                   |
| S8  | **P2**   | Swagger ouvert (`/docs`)                                                                    |

Email : `MailService` verify SMTP au boot ; `MAIL_FROM` défaut `noreply@cvstudio.local`. Pas d’email « welcome » dédié (le verify fait office). Pas d’email « paiement OK ».

### 1.3 Base de données

Prisma `apps/api/prisma/schema.prisma` v2 — **beaucoup plus large** que User+CV+analytics_events.

**Présent (extrait) :** User, AuthSession, OAuth, Team, Template, Cv (+ Experience, Education, …), Plan, Subscription, Payment, Invoice, StripeWebhookEvent, AtsReport, AiHistory, AnalyticsEvent, marketplace (seller, listing, purchase, ledger, payout, reviews, disputes), Notification, Portfolio, AuditLog, CollabSession.

**Soft delete :** `User.deletedAt`, `Cv.deletedAt`. Pas partout.

**Indexes :** `AnalyticsEvent (userId, createdAt)`, `(eventType, createdAt)` ; CV userId ; email unique (citext). **OK** pour le volume actuel.

**Migrations :** 3 dossiers (`init`, `auth_sessions_email_verify`, `stripe_webhook_fail_closed`). Seed : plans + templates (`prisma/seed.ts`).

**Pas en migrations :** `docs/sql/002_partitioning.sql`, `003_rls.sql` — **docs only**.

**Backups / replicas :** aucun job dans le repo. Terraform RDS `backup_retention_days` scaffold. PgBouncer : comment Prisma `directUrl`, **pas** dans Compose.

**User.plan vs brief :** le brief cite `User.plan`. Le code utilise `User.subscriptionTier` (`free|pro|business`) **et** un modèle `Subscription` lié à `Plan`.

### 1.4 Configuration

`.gitignore` ignore `.env` / `.env.*` avec exception `*.example`. Correct.

| Var brief                           | Dans le code ?                                                 |
| ----------------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_POSTHOG_*`             | Non                                                            |
| `NEXT_PUBLIC_SENTRY_DSN`            | Non (API a `SENTRY_DSN` pour Stripe alerts)                    |
| `RESEND_API_KEY`                    | Non                                                            |
| `ADMIN_EMAILS`                      | Non                                                            |
| `ANALYTICS_MARKETING_SPEND_MONTHLY` | Non                                                            |
| `JWT_SECRET`                        | Legacy docs ; API = `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` |
| `SENDGRID_API_KEY`                  | Root `.env.example` seulement ; API = SMTP                     |
| `NEXT_PUBLIC_LINKEDIN_CLIENT_ID`    | Utilisé, **manquant** web `.env.example`                       |
| `ENCRYPTION_KEY`                    | Utilisé, manquant api `.env.example` (fallback JWT)            |
| `AUTH_RATE_LIMIT_DISABLED`          | Utilisé, non documenté                                         |

Pas de `sk_live_` commité. Placeholders `sk_test_xxx`. Risque = fallbacks dev en prod, pas un secret leak git.

Dev vs staging vs prod : overlays k8s existent ; **pas** de preuve qu’un cluster tourne.

### 1.5 Déploiement

| Claim Vercel       | Réalité    |
| ------------------ | ---------- |
| Projects connected | Non trouvé |
| Env dans Vercel UI | N/A        |
| Preview deploys    | N/A        |

| Surface                    | Réalité                                             |
| -------------------------- | --------------------------------------------------- |
| Docker Compose             | **Prêt local** (Postgres 16, Redis, Mailpit)        |
| Dockerfiles                | api, worker, web                                    |
| GitHub Actions             | lint, typecheck, test, build, cd-staging/prod (EKS) |
| E2E CI                     | `--list` + `continue-on-error: true`                |
| Helm                       | Placeholder                                         |
| Terraform                  | Scaffolds incomplets                                |
| Stripe live / Portal / tax | Code test-oriented ; Portal absent                  |
| Resend domain              | N/A                                                 |
| PostHog/Sentry accounts    | Sentry DSN optionnel, SDK absent                    |

---

## 2. Validation pré-lancement (flows)

| Flow                                    | Code                      | Bloquant prod ?                   |
| --------------------------------------- | ------------------------- | --------------------------------- |
| Signup → DB + JWT + dashboard           | Oui                       | Non                               |
| Welcome email Resend                    | Non (verify SMTP)         | Non pour dogfood                  |
| Login + 2FA                             | Oui                       | Non                               |
| Events PostHog signup/login             | Non                       | Oui pour growth, non pour dogfood |
| Dashboard pagination / paywall / toasts | Oui                       | Non                               |
| Upgrade Checkout                        | Oui                       | Erreurs silencieuses = P1 UX      |
| Webhook → tier Pro                      | Oui (si Stripe configuré) | Config                            |
| Email confirmation paiement             | **Non**                   | P2                                |
| Badge Pro                               | `useUserPlan`             | OK                                |
| Admin MRR +$9.99                        | **Page absente**          | N/A                               |
| API error → toast                       | CV oui / billing non      | P1                                |
| Sentry unhandled                        | Non                       | P1 avant scale                    |

**Performance :** aucune baseline Lighthouse / p95 / bundle dans le repo. Les cibles « Lighthouse > 90, API < 200 ms » sont des **objectifs**, pas des mesures.

**Sécurité baseline vs brief**

| Contrôle             | Status                                    |
| -------------------- | ----------------------------------------- |
| HTTPS                | Dépend de l’hébergeur (pas encore choisi) |
| CORS whitelist       | Oui (env)                                 |
| bcrypt passwords     | Oui (auth)                                |
| JWT httpOnly refresh | Oui ; access token **mémoire** (bon)      |
| Prisma SQLi          | Oui                                       |
| React XSS escape     | Oui (sauf PDF HTML trusted)               |
| Rate limiting        | **Présent** (brief disait non)            |
| Privacy policy       | **Absente**                               |
| Delete account       | API oui, incomplet + pas d’UI             |
| Data export          | **Absent**                                |

---

## 3. Gaps — inventaire

### 3.1 Implémenté (crédible)

- Auth complète (email, refresh rotation, OAuth Google/LinkedIn, TOTP, sessions, rate limit)
- Dashboard CV, paywall 1 CV, toasts mutations
- Éditeur + templates + PDF worker path
- Stripe Checkout + webhooks signés + idempotency/DLQ + invoices **API**
- SMTP verify / reset / payment_failed
- Entitlements serveur (`EntitlementsGuard`)
- Soft delete CV/user
- CI lint/typecheck/test/build
- Compose local
- Helmet, ValidationPipe, exception filter JSON

### 3.2 Manquant (claims faux)

- PostHog, pageviews, reset logout
- Sentry SDK + filter
- Admin analytics, AdminGuard, MRR/CAC/LTV/cohorts
- Resend, 4e template, cron reminder
- Customer Portal, invoices UI, checkout toasts
- Privacy/terms, export GDPR, delete UI
- `next/image`, theme toggle
- Vercel
- Playwright réellement exécuté en CI

### 3.3 Bugs / issues

**P0 — avant tout trafic public**

1. `POST /templates/seed` `@Public()`
2. `POST /cvs/export/pdf` `@Public()` + HTML 10 Mo
3. JWT secrets fallback en prod possible

**P1 — avant argent réel / UE public**

4. `cancelAtPeriodEnd: false` forcé au webhook
5. `deleteMe` ne touche pas Stripe
6. Billing UI : pas de factures, pas de portal, erreurs avalées
7. `POST /subscriptions` landmine 100 ans
8. Pas de pages legal
9. Analytics no-op (consent)
10. PDF/HTML = surface XSS/SSRF

**P2 — 2 semaines**

11. Email paiement réussi / welcome
12. Middleware routes mortes / seller non protégé côté edge
13. Request ID middleware mort
14. Swagger prod
15. Images non optimisées
16. Dark mode sans toggle

**P3 — plus tard**

17. Admin MRR
18. Marketplace KYC
19. Mobile
20. Collab (schema only)

### 3.4 Dette technique (honnête)

Le brief « aucune dette » est faux. Dette **gérable** si on arrête d’ajouter des surfaces.

| Dette                                        | Coût de reprise                          |
| -------------------------------------------- | ---------------------------------------- |
| Analytics stub vs taxonomie 70 events        | Moyen — choisir 8 events                 |
| AI : 13 endpoints, 3 live, reste scaffold    | Haut si tout est exposé en prod          |
| Marketplace UI avant Connect mature          | Haut                                     |
| Docs (100+ fichiers) vs code                 | Continu — status drift                   |
| Overlapping GHA (`ci.yml` + lint/test/build) | Bas                                      |
| Helm/Terraform vides                         | Ignorer jusqu’à AWS réel                 |
| `@ts-ignore`                                 | **Aucun trouvé** (claim OK sur ce point) |
| `console.log` API listen                     | Cosmétique                               |

---

## 4. Recommandations prioritaires

### P0 (aujourd’hui)

Voir [ACTION_PLAN.md](./ACTION_PLAN.md) blocs A1–A4.

### Quick wins (2–6 h, après P0)

1. Toasts checkout
2. Brancher `GET /invoices` (API déjà payée)
3. Privacy/terms statiques
4. Feature-flag marketplace
5. Fail-fast JWT
6. Documenter LinkedIn env

### Ne pas faire « demain »

- Compte PostHog sans installer le SDK
- Dashboard admin MRR
- Lighthouse chase
- Referral program
- 1000 VU load test
- Dual provider Resend+SMTP

### Long terme (après soft launch)

Aligné [ROADMAP_OPTIMISEE.md](./ROADMAP_OPTIMISEE.md) : AI slice fiable → SEO/emails → **un** de {marketplace, mobile} → infra réelle (backups, staging CD).

---

## 5. Réponses aux 6 questions de l’objectif

| Question                              | Réponse                                                                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Est-ce que tout fonctionne vraiment ? | **Le cœur oui** (auth, editor, dashboard, checkout code path). **Pas** analytics, admin, emails « 4 templates », portal, invoices UI. Non exécuté : Lighthouse, e2e CI, prod cloud. |
| Qu’est-ce qui casse en prod ?         | Seed public, PDF Chromium public, JWT fallback, désync cancel, delete sans uncancel Stripe, checkout silencieux, mails SMTP non vérifiés, 0 visibilité erreurs.                     |
| Avant de lancer ?                     | P0 sécu + money loop + legal min + smoke Stripe test. **Pas** « 6 min de keys ».                                                                                                    |
| Après ?                               | Observabilité, e2e CI, perf mesurée, AI durcie, growth.                                                                                                                             |
| Optimiser sans bloquer ?              | Flag off marketplace/AI scaffold. Ne pas ouvrir admin. Dogfood interne dès P0 verts.                                                                                                |
| Chemin critique ?                     | **Endpoints publics → Stripe cohérent (portal/invoices/cancel/delete) → legal → smoke → beta → Sentry/events → soft launch.** Perf/growth/collab hors chemin.                       |

---

## 6. Récapitulatif (remplace le bandeau « 100 % COMPLET »)

```
IMPLÉMENTATION CŒUR     : avancée (Phase 1 produit, pas « 3 semaines »)
CLAIMS SEMAINES 1–3     : partiellement vrais, largement surévalués
CODE QUALITY            : stack propre (Nest/Next/Prisma), pas 0 dette
TESTS                   : unitaires ciblés ; e2e CI non exécutés
SECURITY                : baseline auth OK ; P0 ouverts (seed, PDF, JWT)
PERFORMANCE             : non mesurée
MONITORING              : prêt dans les docs, pas dans les dépendances
DEPLOYMENT              : local Docker prêt ; cloud non démontré
GAPS CRITIQUES          : OUI
BLOCKERS                : OUI (P0)
GO / NO-GO              : NO-GO production | GO closed beta après P0
```

Audit code-first. Toute relance « GO aujourd’hui » doit d’abord fermer la liste P0 de la [checklist](./CHECKLIST_PRE_LANCEMENT.md).
