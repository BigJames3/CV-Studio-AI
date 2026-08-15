# Implémentation Playwright

Source of truth = **code** sous `apps/web/e2e/`. Ce document mappe fichiers, conventions, config et extraits. Ne pas copier-coller une deuxième suite à la racine.

---

## 1. Principes

- **POM** : une classe par écran, `data-testid` uniquement (pas de CSS généré).
- **Fixture `testUser`** : register API + teardown `deleteMe`.
- **Asserts métier** : `GET /users/me` et `GET /subscriptions/me`, pas Prisma dans le package web.
- **Deux modes checkout** :
  - Default : `STRIPE_SECRET_KEY` contient `xxx` → `dev_bypass`.
  - `E2E_STRIPE=1` : Checkout hébergé + cartes test.
- **P0 webhook** : Jest, pas un second runtime Playwright.

---

## 2. Carte des fichiers

| Fichier                           | Rôle                                                      |
| --------------------------------- | --------------------------------------------------------- |
| `apps/web/playwright.config.ts`   | testDir, Chromium, video, webServer, grepInvert `@stripe` |
| `e2e/env.ts`                      | `API_URL`, `E2E_PASSWORD`, `uniqueEmail()`                |
| `e2e/fixtures/auth.fixture.ts`    | `test.extend` + page objects + `loginAs`                  |
| `e2e/pages/*.ts`                  | POM                                                       |
| `e2e/utils/api.ts`                | Client HTTP envelope `{ success, data }`                  |
| `e2e/utils/stripe-test-cards.ts`  | 4242, 0002, 0069, 9995                                    |
| `e2e/utils/wait-helpers.ts`       | Mock PDF, lecture stream `%PDF`                           |
| `e2e/utils/assertions.ts`         | Badge UI + tier API                                       |
| `e2e/tests/*.spec.ts`             | Scénarios                                                 |
| `.github/workflows/e2e-tests.yml` | Postgres + Redis + migrate + build + Playwright           |

---

## 3. Config (`playwright.config.ts`)

- `testDir: ./e2e`, `workers: 1`, `retries: CI ? 1 : 0`
- `timeout: 90s`, `expect: 15s`, `navigationTimeout: 30s`
- `video: retain-on-failure`, `screenshot: only-on-failure`, `trace: on-first-retry`
- `grepInvert: /@stripe/` sauf `E2E_STRIPE=1`
- **webServer** (sauf `PLAYWRIGHT_SKIP_WEBSERVER=1`) :
  - Local : `pnpm --filter @cvstudio/api dev` + `web dev`, `reuseExistingServer`
  - CI : `node dist/main.js` + `next start` (build préalable)
  - Ready : `http://localhost:3001/api/v1/health` et `PLAYWRIGHT_BASE_URL`
  - `AUTH_RATE_LIMIT_DISABLED=true` injecté sur l’API

---

## 4. Fixture auth

```ts
testUser: async ({ request }, use) => {
  const user = await apiRegister(request);
  await use(user);
  await deleteUser(request, user.accessToken);
};
```

Page objects injectés : `loginPage`, `dashboardPage`, `billingPage`, etc.

`loginAs(page, user)` = UI login + wait dashboard (session navigateur + JWT mémoire).

---

## 5. POM — sélecteurs stables

Ajoutés côté produit (pas de dette de sélecteur texte FR/EN) :

| testid                                                                         | Écran     |
| ------------------------------------------------------------------------------ | --------- |
| `login-page` `login-email` `login-password` `login-submit` `login-error`       | Login     |
| `register-page` `register-submit`                                              | Register  |
| `dashboard-page` `welcome` `create-cv` `cv-card` `upgrade-to-pro`              | Dashboard |
| `cv-editor` `identity-form` `export-pdf-open` `export-pdf-confirm`             | Editor    |
| `pricing-page` `pricing-plan-*` `pricing-cta-*`                                | Pricing   |
| `billing-page` `plan-badge` `checkout-pro-month` `checkout-business-month`     | Billing   |
| `checkout-error` `cancel-subscription` `cancel-confirm-modal` `cancel-pending` | Billing   |
| `paywall-modal` `paywall-upgrade`                                              | Paywall   |

`plan-badge` existe aussi dans la topbar : asserts via `.first()` ou billing page.

---

## 6. Helpers API

Envelope Nest `TransformInterceptor` : `{ success, data }`. `unwrap()` lit `data`.

| Helper                      | Endpoint                          |
| --------------------------- | --------------------------------- |
| `apiRegister` / `apiLogin`  | `/auth/register` `/auth/login`    |
| `getMe` / `getSubscription` | `/users/me` `/subscriptions/me`   |
| `checkout`                  | `POST /subscriptions/checkout`    |
| `cancelSubscription`        | `DELETE /subscriptions/me/cancel` |
| `listCvs`                   | `GET /cvs`                        |
| `deleteUser`                | `DELETE /users/me`                |

Password : `TestPassword123!` (lettre + chiffre, min 8).

---

## 7. Scénarios — extraits

### Bypass checkout (CI)

`SubscriptionsService.checkout` sans Stripe réel :

1. `upsert` subscription + `user.subscriptionTier = pro|business`
2. `url = successUrl` (`/account/billing?checkout=success`)

Le test UI clique `checkout-pro-month` puis `waitForURL(/checkout=success|account\/billing/)`.

### Hosted Checkout (`checkout.page.ts`)

```ts
await page.waitForURL(/checkout\.stripe\.com/);
await page.getByLabel(/card number/i).fill('4242424242424242');
```

Sélecteurs Stripe peuvent bouger : tests isolés `@stripe`.

### PDF

```ts
await page.route('**/api/v1/cvs/export/pdf**', (route) =>
  route.fulfill({
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="cv-e2e.pdf"',
    },
    body: Buffer.from('%PDF-1.4 e2e-payment-flow'),
  })
);
```

Vérifie magic bytes `%PDF` sur le download Playwright.

### Paywall Free

1 CV créé → retour dashboard → 2ᵉ `create-cv` → API `ENTITLEMENT_REQUIRED` → `useCreateCv` ouvre le modal.

---

## 8. Produit touché (nécessaire aux AC, pas de gold-plating)

| Changement                                    | Pourquoi                                    |
| --------------------------------------------- | ------------------------------------------- |
| `subscriptionsApi.cancel` + UI billing        | AC downgrade                                |
| `checkout-error`                              | AC checkout failed (catch silencieux avant) |
| `usersApi.deleteMe`                           | Teardown                                    |
| testids login/dashboard/pricing/paywall       | POM stable                                  |
| Cookie `cv_session` dans `pdf-export.spec.ts` | Middleware `/editor`                        |

---

## 9. Scripts

```json
{
  "test:e2e": "playwright test",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:stripe": "playwright test --grep @stripe",
  "test:e2e:ui": "playwright test --ui"
}
```

Racine : `pnpm test:e2e` → filter `@cvstudio/web`.

Stripe :

```bash
# PowerShell
$env:E2E_STRIPE="1"; pnpm --filter @cvstudio/web test:e2e:stripe
```

---

## 10. CI (résumé)

Voir `CI_CD_INTEGRATION.md`. Job démarre Postgres 16 + Redis 7, `prisma migrate deploy` + seed, build api/web, `playwright install --with-deps chromium`, puis `pnpm test:e2e`. Artifacts HTML + videos si failure.

---

## 11. Ce qui n’est **pas** dans Playwright (volontaire)

| Sujet                               | Où                                   |
| ----------------------------------- | ------------------------------------ |
| Redis SET NX concurrent             | `payments.service.spec.ts` P0-1      |
| Retry 2^n puis DLQ                  | idem                                 |
| Plan name unknown throw             | `subscriptions.service.spec.ts` P0-2 |
| `cancelAtPeriodEnd` mapping webhook | P0-3                                 |
| Replay DLQ                          | `src/scripts/retry-webhook-dlq.ts`   |

Dupliquer ça dans le navigateur = dettes + 5 min de fake cron.

---

## 12. Maintenance

- Nouveau bouton billing → `data-testid` + méthode POM, pas de `getByText` FR.
- Nouveau plan Stripe → `STRIPE_PRICE_*` + carte `@stripe` ; bypass inchangé.
- Quota Free changé → **une** constante produit (`EntitlementsService`) + `plan-limits.spec.ts`.
- Playwright upgrade : revalider `@stripe` selectors.
