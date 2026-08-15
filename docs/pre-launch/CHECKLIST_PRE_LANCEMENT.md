# Checklist pré-lancement — CV Studio AI

Date : 13 août 2026. Cases à cocher **après preuve** (commande, screenshot, ou test), pas « on pense que c’est bon ».

Légende : **P0** bloquant prod · **P1** bloquant public payant · **P2** après beta.

---

## 1. Avant déploiement

### 1.1 Sécurité (P0)

- [ ] `POST /api/v1/templates/seed` n’est plus public (401/403 sans auth ops)
- [ ] `POST /api/v1/cvs/export/pdf` authentifié **ou** HTML refusé pour anonyme
- [ ] Boot prod refuse les JWT fallbacks `dev-*-secret-change-me`
- [ ] `POST /subscriptions` ne peut pas créer un plan Pro/Business sans Stripe
- [ ] Webhook Stripe : signature vérifiée (`constructEvent`) — **déjà en code**, retester
- [ ] `STRIPE_FAIL_CLOSED` / `NODE_ENV=production` : pas de `dev_bypass` checkout
- [ ] CORS_ORIGINS = domaines réels uniquement (pas `*`)
- [ ] Swagger `/docs` désactivé ou protégé en prod
- [ ] `.env` / secrets absents de git (`.gitignore` OK — **revérifier** `git ls-files '*.env'`)

### 1.2 Billing (P0/P1)

- [ ] 4 price IDs Stripe renseignés (`STRIPE_PRICE_PRO_MONTHLY` … `BUSINESS_YEARLY`)
- [ ] Webhook endpoint pointe vers `/api/v1/payments/webhook` (raw body)
- [ ] `cancel_at_period_end` lu depuis Stripe et persisté (plus `false` hardcodé)
- [ ] Billing page : toast d’erreur checkout (plus de `catch` silencieux)
- [ ] Billing page : liste factures via `GET /invoices` (plus le placeholder)
- [ ] Customer Portal ou cancel UI branché
- [ ] `deleteMe` annule / schedule cancel Stripe
- [ ] Stripe **test** validé avec `4242…` de bout en bout
- [ ] Stripe **live** : décision explicite (ne pas cocher par défaut)
- [ ] CinetPay : `CINETPAY_API_KEY` / `CINETPAY_SITE_ID` / `API_URL` / `APP_URL` / `CINETPAY_FAIL_CLOSED`
- [ ] Fail-closed : clés CinetPay vides → billing n’affiche que Stripe (`GET /payments/methods`)
- [ ] Webhook CinetPay testé (`POST /api/v1/payments/webhook/cinetpay` notify mock)
- [ ] Cron expire-pending : logs après 1 h (Nest `@Cron` et/ou CronJob k8s)

### 1.3 Legal / GDPR (P1 public UE)

- [ ] `/privacy` publié
- [ ] `/terms` publié
- [ ] Liens depuis signup + footer
- [ ] Export données `GET /users/me/export`
- [ ] Delete account UI + `DELETE /users/me`
- [ ] Bannière consentement si analytics cookies (PostHog/Amplitude)

### 1.4 Auth & produit cœur

- [ ] Signup : validation email/password, user DB, JWT, redirect dashboard
- [ ] Mail de vérification visible (Mailpit en local / SMTP prod)
- [ ] Login + refresh cookie httpOnly + logout clear session
- [ ] 2FA : smoke (enable / login challenge) si exposé en beta
- [ ] Dashboard : liste CV, pagination « Afficher plus », star/delete
- [ ] 2e CV Free → paywall
- [ ] Éditeur autosave + export PDF (auth)
- [ ] Share public `/s/[slug]` OK

### 1.5 Observabilité (P1 avant acquisition)

- [x] Un SDK errors réel (`@sentry/node` + `@sentry/nextjs`) — DSN toujours requis en prod
- [x] Un SDK product analytics (PostHog) — dual-write `analytics_events`
- [x] `enableAnalytics()` après consent (prod) ; auto-enable en development
- [x] Events : `signup_succeeded`, `login_succeeded`, `checkout_started`, `paywall_viewed`
- [ ] Health `GET /api/v1/health` monitoré (UptimeRobot / Better Stack / etc.)

### 1.6 Config env

**API (`apps/api/.env` prod)**

- [ ] `DATABASE_URL` + `DIRECT_DATABASE_URL` (pooling)
- [ ] `REDIS_URL`
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` aléatoires ≥ 32 chars
- [ ] `CORS_ORIGINS` / `APP_URL`
- [ ] `SMTP_*` + `MAIL_FROM` domaine vérifié
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + 4 prices
- [ ] `CINETPAY_API_KEY` / `CINETPAY_SITE_ID` / `API_URL` / `APP_URL` / `CINETPAY_FAIL_CLOSED`
- [ ] `SENTRY_DSN` (SDK `@sentry/node` branché)
- [ ] `POSTHOG_API_KEY` / `POSTHOG_HOST`
- [ ] `ANALYTICS_MARKETING_SPEND_MONTHLY` (0 = CAC null)
- [ ] `OPENAI_API_KEY` optionnel (heuristic fallback existe)

**Web (`apps/web/.env`)**

- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` si OAuth
- [ ] `NEXT_PUBLIC_LINKEDIN_CLIENT_ID` si OAuth
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST`
- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] Pas de secret dans `NEXT_PUBLIC_*`

**Documentés et branchés dans le code (renseigner les valeurs, ne pas committer) :**

- `NEXT_PUBLIC_POSTHOG_KEY` / `POSTHOG_API_KEY`
- `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN`
- `ANALYTICS_MARKETING_SPEND_MONTHLY`

**Toujours absents (ne pas « configurer » en croyant que ça marche) :**

- `ADMIN_EMAILS`
- `RESEND_API_KEY`

### 1.7 Infra

- [ ] Provider DB choisi (pas « Vercel + magic ») — Compose local ≠ prod
- [ ] Backups PITR activés chez le provider
- [ ] Migrations `prisma migrate deploy` dans le pipeline de release
- [ ] Worker PDF (Chromium) dimensionné si export synchrone reste
- [ ] Décision hébergement web : Docker/K8s (repo) **ou** Vercel (non présent : pas de `vercel.json`)

### 1.8 Tests

- [ ] `pnpm typecheck` local
- [ ] `pnpm --filter @cvstudio/api test`
- [ ] `pnpm --filter @cvstudio/web exec playwright test e2e/payment-flow.spec.ts` **exécuté**, pas `--list`
- [ ] CI e2e : plus `continue-on-error: true` sans justification

---

## 2. Pendant le déploiement

- [ ] Déployer **staging** d’abord (même petit : un hostname interne)
- [ ] `prisma migrate deploy` avant traffic
- [ ] Seed plans Free/Pro/Business (idempotent)
- [ ] Vérifier health API + page `/` web
- [ ] Enregistrer webhook Stripe sur l’URL **staging**, puis prod
- [ ] 1 paiement test Stripe sur staging
- [ ] 1 paiement test CinetPay (sandbox + notify) **ou** fail-closed volontaire (clés vides)
- [ ] Rollback plan écrit (previous image / previous function + [production-rollback.md](../runbooks/production-rollback.md))

**Ne pas** cocher « automatic deploy on push main » tant que les P0 ne sont pas mergés.

---

## 3. Après déploiement — Day 1

- [ ] Health check OK 15 min
- [ ] Signup réel (compte interne)
- [ ] Mail reçu (ou Mailpit / logs SMTP)
- [ ] Création 1 CV + PDF
- [ ] Tentative 2e CV → paywall
- [ ] Checkout test (si live : montant réel 1× puis refund)
- [ ] Webhook `checkout.session.completed` visible (logs + `stripe_webhook_events`)
- [ ] User `subscriptionTier=pro` en DB
- [ ] Sentry : event test `captureMessage('launch-ping')`
- [ ] Analytics : 1 event visible **ou** row `analytics_events`
- [ ] Aucune 5xx spike
- [ ] `POST /templates/seed` depuis l’extérieur → échec

Watch list Day 1 (pas de code) :

- Logs API `Failed to send mail`
- Stripe DLQ / `StripeAlertService`
- Redis down → auth rate-limit fail-open ou fail-closed ? (vérifier)

---

## 4. Après déploiement — Week 1

- [ ] 5+ users dogfood, recueil 10 feedbacks
- [ ] Bugs P0/P1 hotfixés
- [ ] Funnel manuel : landing → signup → CV → paywall → checkout
- [ ] Dunning : simuler `invoice.payment_failed` (Stripe CLI)
- [ ] Cancel + (si implémenté) reactivation
- [ ] Décision marketplace : visible ou flag off
- [ ] Décision AI : optimize only vs tous les endpoints scaffold
- [ ] Backup restore test (1 fois)
- [ ] GO/NO-GO soft launch public (document [GO_NO_GO_DECISION.md](./GO_NO_GO_DECISION.md))

Hors Week 1 (ne pas dériver) :

- [ ] ~~Lighthouse 90~~ — baseline seulement
- [ ] ~~Admin MRR~~
- [ ] ~~Referral program~~
- [ ] ~~1000 concurrent users~~

---

## 5. Flows utilisateur (preuve)

### Signup

- [ ] Validation email & password
- [ ] User créé
- [ ] Email vérification (pas « welcome Resend 4 templates »)
- [ ] JWT + redirect dashboard
- [ ] Event analytics **si** SDK + consent (aujourd’hui : non)

### Login

- [ ] Credentials
- [ ] JWT + refresh
- [ ] 2FA si enabled
- [ ] Redirect dashboard

### Dashboard

- [ ] Liste + pagination bouton
- [ ] Badge plan
- [ ] Create limité Free
- [ ] Star / delete + toasts
- [ ] Paywall 2e CV

### Upgrade

- [ ] CTA → Stripe Checkout
- [ ] Paiement
- [ ] Webhook
- [ ] Tier Pro
- [ ] Email confirmation (**manquant** aujourd’hui — seulement payment_failed)
- [ ] Badge Pro
- [ ] ~~Admin MRR +$9.99~~ — page admin **absente**

### Admin analytics

- [ ] **N/A** — ne pas tester une page qui n’existe pas
- [ ] Seller `/seller/analytics` ≠ admin (ne pas confondre)

### Erreurs

- [ ] API error → toast (mutations CV : oui ; checkout : **non**)
- [ ] Retry client : React Query `retry: 1` queries ; pas de timeout défaut
- [ ] Exception → filter JSON ; **pas** Sentry global
