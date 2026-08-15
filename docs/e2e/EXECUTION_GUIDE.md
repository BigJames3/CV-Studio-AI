# Guide d’exécution E2E

---

## 1. Prérequis

- Node `>=20.11` (`.nvmrc`), pnpm `9.15`
- Docker : Postgres 16 + Redis 7 (`pnpm docker:up`)
- `apps/api/.env` + `apps/web/.env` depuis les `.env.example`
- `JWT_*_SECRET` ≥ 32 caractères
- `AUTH_RATE_LIMIT_DISABLED=true` dans `apps/api/.env` **pour les sessions E2E locales**
- `STRIPE_SECRET_KEY=sk_test_xxx` pour le mode bypass (CI-like)

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm --filter @cvstudio/web exec playwright install chromium
```

---

## 2. Local (recommandé)

Terminal A :

```bash
pnpm docker:up
pnpm dev
```

Health : `http://localhost:3001/api/v1/health`, `http://localhost:3000`.

Terminal B :

```bash
# webServer réutilise la stack déjà up
pnpm test:e2e
```

Headed / UI :

```bash
pnpm --filter @cvstudio/web test:e2e:headed
pnpm --filter @cvstudio/web test:e2e:ui
```

Un fichier / un titre :

```bash
pnpm --filter @cvstudio/web exec playwright test e2e/tests/plan-limits.spec.ts
pnpm --filter @cvstudio/web exec playwright test -g "paywall"
```

Sans réutiliser le dev server (Playwright démarre api `dev` + web `dev`) : ne pas poser `PLAYWRIGHT_SKIP_WEBSERVER`. Ports 3000/3001 doivent être libres.

---

## 3. Stripe hosted (opt-in)

1. Clés `sk_test_` / `pk_test_` / `whsec_` + price IDs dans `apps/api/.env`
2. Webhook :

```bash
stripe listen --forward-to localhost:3001/api/v1/payments/webhook
```

3. PowerShell :

```powershell
$env:E2E_STRIPE="1"
pnpm --filter @cvstudio/web test:e2e:stripe
```

Sans forwarding, le badge Pro peut rester `free` après 4242 (session OK, sync webhook KO).

---

## 4. CI

Push/PR `develop`|`main` → workflow **E2E Tests**.  
Pas besoin de secrets pour le chemin bypass.

Dispatch manuel + `stripe=true` uniquement si les secrets `E2E_STRIPE_*` existent **et** qu’un tunnel webhook est prévu (sinon ne pas l’activer).

---

## 5. Debug d’un test rouge

| Symptôme                           | Cause probable                    | Fix                                        |
| ---------------------------------- | --------------------------------- | ------------------------------------------ |
| Timeout `/dashboard` après login   | API down / CORS / JWT court       | Health + `.env` API                        |
| `RATE_LIMITED` au register         | Flag oublié                       | `AUTH_RATE_LIMIT_DISABLED=true`            |
| `PLAN_NOT_FOUND`                   | Seed absent                       | `pnpm db:seed`                             |
| Badge reste `free` après clic Pro  | Stripe réel sans bypass / webhook | `sk_test_xxx` ou CLI listen                |
| Redirect `/login` sur editor local | Cookie session                    | déjà posé dans `pdf-export.spec.ts`        |
| Paywall n’apparaît pas             | 1er CV pas persisté               | Attendre `/editor/` puis revenir dashboard |
| Cancel bouton absent               | User encore Free                  | Setup `checkout(..., 'pro')` d’abord       |
| `checkout.stripe.com` en CI        | Vraie clé injectée                | Forcer `sk_test_xxx`                       |
| webServer timeout 180s             | Build manquant en CI              | job build avant test                       |

Traces : `apps/web/test-results/` → `npx playwright show-trace <zip>`.  
HTML : `apps/web/playwright-report/index.html`.

```bash
pnpm --filter @cvstudio/web exec playwright test --debug -g "upgrade to Pro"
```

---

## 6. Maintenance

- Nouveau `data-testid` : mettre à jour le POM, pas les specs en dur.
- Quota produit : changer `EntitlementsService` **et** `plan-limits.spec.ts`.
- Ne pas réintroduire `--list` + `continue-on-error` dans CI.
- Ne pas monter `workers` sans revoir Throttler + rate-limit.
- Après refacto billing, relancer T1 + T4 + T5.

---

## 7. Checklist Soft GA

- [ ] `pnpm test:e2e` vert en local (bypass)
- [ ] Workflow Actions vert sur `develop`
- [ ] Artifact failure testé une fois (forcer un assert) puis revert
- [ ] Staging : 1 paiement `4242` + badge Pro
- [ ] Staging : 1 declined `0002` + pas de subscription
- [ ] Cancel : banner « se terminera le … »
- [ ] Free : 2ᵉ CV → paywall
