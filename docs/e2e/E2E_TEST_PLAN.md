# Plan de tests E2E — flow paiement

**Owner:** Engineering  
**Stack:** Playwright 1.x, TypeScript, Chromium  
**Code:** `apps/web/e2e/`  
**Config:** `apps/web/playwright.config.ts`

---

## 1. Objectifs

Prouver le chemin Soft GA : **auth → CV → PDF UI → pricing → checkout → plan sync → limites → cancel**.

Non-objectifs :

- Pentest Stripe
- Charge / chaos multi-pod (couvert Jest + Redis NX)
- Admin analytics / marketplace

---

## 2. Structure (implémentée)

```
apps/web/e2e/
  env.ts
  fixtures/auth.fixture.ts
  pages/          # POM
    login.page.ts
    register.page.ts
    dashboard.page.ts
    editor.page.ts
    pricing.page.ts
    billing.page.ts
    checkout.page.ts
  tests/
    full-payment-flow.spec.ts
    free-to-pro.spec.ts
    pro-to-business.spec.ts
    downgrade.spec.ts
    plan-limits.spec.ts
    stripe-card-errors.spec.ts   # @stripe
    stripe-checkout.spec.ts      # @stripe
    stripe-webhook.spec.ts       # contrat Jest
    edge-cases.spec.ts
  utils/
    api.ts
    assertions.ts
    stripe-test-cards.ts
    wait-helpers.ts
  pdf-export.spec.ts
```

Pas de `tests/e2e/` racine (voir analyse).

---

## 3. Tags

| Tag                       | Usage                                                 |
| ------------------------- | ----------------------------------------------------- |
| `@payment`                | Checkout / plan                                       |
| `@ac`                     | Parcours 8 critères                                   |
| `@auth`                   | Login                                                 |
| `@upgrade` / `@downgrade` | Changements de plan                                   |
| `@limits` `@paywall`      | Quotas                                                |
| `@pricing`                | Page marketing                                        |
| `@edge`                   | Erreurs                                               |
| `@stripe`                 | Hosted Checkout — **exclu** par défaut (`grepInvert`) |
| `@webhook`                | Contrat unitaire                                      |

---

## 4. Scénarios

### T1 — Full payment flow (Free → Pro)

**Fichier:** `tests/full-payment-flow.spec.ts`  
**Setup:** `apiRegister` → user unique  
**Teardown:** `DELETE /users/me`

| Step                | Assert                                          |
| ------------------- | ----------------------------------------------- |
| `/login` visible    | `#` / `data-testid=login-email`                 |
| Credentials valides | Redirect `/dashboard`, `Bonjour, {firstName}`   |
| Nouveau CV          | URL `/editor/:uuid`, `cv-editor`                |
| Identity            | `fullName` + email                              |
| Export PDF          | Download `%PDF`, size > 0 (route mock)          |
| Dashboard           | Carte « Nouveau CV »                            |
| `/pricing`          | Free / Pro / Business + prix                    |
| Billing             | Badge `free`                                    |
| Passer à Pro        | Redirect success (bypass) ou Stripe (`@stripe`) |
| Billing + API       | `tier=pro`, subscription `active`               |

**Login KO:** mauvais password → `login-error`, reste sur `/login`.

### T2 — Free → Pro

CTA billing uniquement. Idempotence : 2× `POST /checkout` → **une** row subscription (upsert `userId`).

### T3 — Pro → Business

Setup : checkout API Pro. UI : badge Pro, **pas** de bouton Pro, « Passer à Business ». API : `tier=business`.

### T4 — Downgrade

Setup Pro. UI cancel → confirm. Assert :

- `cancelAtPeriodEnd === true`
- `status` ∈ `active|trialing`
- Banner `cancel-pending` (accès jusqu’à `currentPeriodEnd`)
- **Pas** de descente immédiate à Free (produit = fin de période)

Le « wait until period end » n’est **pas** un sleep E2E. Couvert unitairement (`applyStripeSubscription` status `canceled` → tier `free`).

### T5 — Plan limits

| Plan     | Attendu                                          |
| -------- | ------------------------------------------------ |
| Free     | CV #1 OK ; CV #2 → `paywall-modal` → CTA billing |
| Pro      | ≥ 2 CV, pas de paywall                           |
| Business | ≥ 2 CV, pas de paywall                           |

### T6 — Erreurs carte (`@stripe`)

| Carte              | Attendu                         |
| ------------------ | ------------------------------- |
| `4000000000000002` | Message declined, `tier=free`   |
| `4000000000000069` | Reste sur `checkout.stripe.com` |

Sans `E2E_STRIPE=1` : exclus (pas skipped-as-pass dans le rapport default).

### T7 — Webhook P0

Playwright lit `payments.service.spec.ts` et exige les blocs P0-1 (lock, retry, DLQ).  
Exécution runtime webhook = Jest + `pnpm --filter @cvstudio/api webhook:retry-dlq`.

### T8 — Edge

- Mock `POST /subscriptions/checkout` 400 → `checkout-error`, pas de navigation Stripe
- `/account/billing` anonyme → `/login`
- `/pricing` public

### T9 — PDF local

`pdf-export.spec.ts` : cookie `cv_session=1` (middleware), mock download, abort → `role=alert`.

---

## 5. Setup / teardown (chaque test)

```
apiRegister (email unique @cvstudio.test)
  → test body
  → DELETE /users/me (best-effort, ne fail pas le test)
```

Rate limit register **3/h/IP** → `AUTH_RATE_LIMIT_DISABLED=true` obligatoire.

Stripe : pas de Customer Portal cleanup en bypass (pas d’id Stripe). En `@stripe`, cancel at period end + deleteMe ; customers orphelins = purge Dashboard test mode.

---

## 6. Environnements

|          | Local                | CI                     | Staging Stripe               |
| -------- | -------------------- | ---------------------- | ---------------------------- |
| Stripe   | `sk_test_xxx` bypass | idem                   | `E2E_STRIPE=1` + CLI forward |
| DB       | docker postgres      | service `cvstudio_e2e` | staging                      |
| Redis    | docker               | service                | staging                      |
| Browsers | Chromium             | Chromium + deps        | Chromium                     |
| Headless | default              | true                   | true                         |
| Retry    | 0                    | 1                      | 0 (debug)                    |

---

## 7. Timeline d’implémentation (faite / reste)

| J   | Item                              | Statut      |
| --- | --------------------------------- | ----------- |
| J1  | Audit + POM + fixtures            | Fait        |
| J1  | T1–T5 + edge + PDF cookie         | Fait        |
| J1  | Cancel UI + checkout error        | Fait        |
| J1  | Workflow `e2e-tests.yml`          | Fait        |
| J2  | Première run CI verte             | **À faire** |
| J3  | Staging `@stripe` 4242 + declined | **À faire** |
| J4  | Brancher Slack secret             | Optionnel   |
| J5  | Soft GA : 1 run verte sur staging | **Gate**    |

---

## 8. Risques flake

| Risque                              | Mitigation                                                         |
| ----------------------------------- | ------------------------------------------------------------------ |
| Reload checkout perd le JWT mémoire | Refresh cookie cross-origin `credentials: include` (déjà en place) |
| PDF worker lent                     | Mock dans T1                                                       |
| Stripe DOM change                   | Tests `@stripe` isolés, POM checkout                               |
| Rate limit                          | Flag E2E only                                                      |
| Parallel workers                    | `workers: 1`                                                       |
| Seed plans manquant                 | `prisma db seed` dans CI                                           |
