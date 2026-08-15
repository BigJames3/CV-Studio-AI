# CI/CD — Playwright E2E

---

## 1. Workflow

**Fichier:** `.github/workflows/e2e-tests.yml`  
**Triggers:** appelé par `ci.yml` (job `e2e`) après quality ; `workflow_dispatch` (option Stripe).

Postgres 16 + Redis 7 sont des **GitHub Actions services** (`localhost:5432` / `localhost:6379`), pas des hostnames `postgres`/`redis`. Le job attend `pg_isready` + `redis-cli ping`, écrit `apps/api/.env` et `apps/web/.env.local`, puis migrate + seed. Playwright `webServer` démarre API (`dist/main.js`) et Next (`next start`) — ne pas ajouter un second `npm start &` (conflit de ports).

Le job cosmétique `playwright --list` a été retiré. Unitaire + coverage : `ci.yml` job `quality`. Lighthouse : job `lighthouse` (après quality). Staging/prod : uniquement si CI vert (`deploy-staging` / `deploy-prod`).

---

## 2. Job `playwright`

```
services: postgres:16-alpine (db cvstudio_e2e) + redis:7-alpine
pnpm install
prisma generate && migrate deploy && db seed
pnpm build --filter api,web,ui,shared-*,ai-service
playwright install --with-deps chromium
pnpm --filter @cvstudio/web test:e2e
on failure: upload playwright-report + test-results (14j)
on failure + SLACK_WEBHOOK_URL: POST Slack
```

### Env CI (bypass)

| Clé                                    | Valeur                                                 |
| -------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL` / `DIRECT_DATABASE_URL` | postgres service                                       |
| `REDIS_URL`                            | redis service                                          |
| `JWT_*_SECRET`                         | 32+ chars dédiés E2E                                   |
| `NEXT_PUBLIC_API_URL`                  | `http://localhost:3001/api/v1` (build **et** runtime)  |
| `AUTH_RATE_LIMIT_DISABLED`             | `true`                                                 |
| `STRIPE_SECRET_KEY`                    | `sk_test_xxx` → bypass                                 |
| `CI`                                   | `true` → retries 1, `next start` + `node dist/main.js` |

Playwright `webServer` attend health API + `localhost:3000`.

---

## 3. Stripe opt-in

`workflow_dispatch` input `stripe: true` :

- `E2E_STRIPE=1` (plus de `grepInvert`)
- Secrets : `E2E_STRIPE_SECRET_KEY`, `E2E_STRIPE_WEBHOOK_SECRET`, `E2E_STRIPE_PUBLISHABLE_KEY`, `E2E_STRIPE_PRICE_PRO_MONTHLY`, `E2E_STRIPE_PRICE_BUSINESS_MONTHLY`

**CI PR ne doit pas** mettre une vraie `sk_test_` dans l’env par défaut : le clic « Passer à Pro » irait sur `checkout.stripe.com` et T1 timeout.

Webhook staging : Stripe CLI ou endpoint public. GitHub-hosted runner n’est **pas** joignable par Stripe → `@stripe` en CI cloud **sans** tunnel = partiel (session créée, sync dépend du webhook). Préférer staging self-hosted / `stripe listen` local.

---

## 4. Slack

Secret optionnel `SLACK_WEBHOOK_URL` (Incoming Webhook).  
Payload : ref + SHA + lien `actions/runs/{id}`.

Pas de bot Slack custom (dette). Si le secret est absent, l’étape no-op (`if: failure() && env.SLACK_WEBHOOK_URL != ''`).

---

## 5. Artifacts

| Path                          | Contenu                        |
| ----------------------------- | ------------------------------ |
| `apps/web/playwright-report/` | HTML                           |
| `apps/web/test-results/`      | traces, png, webm, `junit.xml` |

Upload **uniquement** `if: failure()`. Succès = pas de rétention.

Ouvrir le HTML : télécharger l’artifact, `npx playwright show-report`.

---

## 6. Rapports

Reporters CI : `github` (annotations PR) + `html` + `junit` (`test-results/junit.xml`).

Local : `list` + HTML `apps/web/playwright-report`.

---

## 7. Procédure on-failure

1. Ouvrir le job Actions → annotation GitHub du spec.
2. Télécharger `playwright-report` : screenshot + video du test.
3. Distinguer :
   - **Produit** : 401 after checkout reload → cookie refresh
   - **Data** : `PLAN_NOT_FOUND` → seed oublié
   - **Infra** : health API never ready → build/migrate
   - **Flake** : retry CI = 1 ; si rouge 2× → issue, ne pas monter `retries: 3` (masque)
4. Repro local : `PLAYWRIGHT_SKIP_WEBSERVER=1` si `pnpm dev` déjà up, `pnpm test:e2e --headed --debug -g "nom du test"`.
5. Ne **pas** `continue-on-error: true` sur ce workflow.

---

## 8. Staging (hors GitHub services)

Pipeline CD staging (ECR) ≠ E2E. Pour Soft GA :

```
PLAYWRIGHT_BASE_URL=https://staging.example
E2E_API_URL=https://api.staging.example/api/v1
E2E_STRIPE=1
PLAYWRIGHT_SKIP_WEBSERVER=1
```

Runner avec accès réseau staging + secrets test Stripe. À brancher quand l’hostname staging est stable (checklist pre-launch).

---

## 9. Monitoring CI (léger)

GitHub fournit déjà duration + fail rate. Pas de Datadog custom dans ce livrable.

Signaux :

- Job > 20 min → build Next trop lent / webServer hang
- `@stripe` rouge isolé → DOM Checkout
- Toute la suite rouge → API/DB
- Un seul spec flake 1/2 → issue, freeze retries

---

## 10. Secrets à créer (GitHub)

| Secret                   | Obligatoire               |
| ------------------------ | ------------------------- |
| aucun pour le job bypass | Non                       |
| `SLACK_WEBHOOK_URL`      | Non                       |
| `E2E_STRIPE_*`           | Seulement dispatch Stripe |
