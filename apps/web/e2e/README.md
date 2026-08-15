# E2E Tests

Playwright lives in `apps/web/e2e`. API Jest e2e lives in `apps/api/test/*.e2e-spec.ts`.

## Prerequisites

1. **API** on `localhost:3001` with `GET /api/v1/health` returning 200
2. **PostgreSQL** on `localhost:5432`
3. **Redis** on `localhost:6379`
4. Node `>=20.11`, pnpm `9.15` (see `.nvmrc`)

`NEXT_PUBLIC_API_URL` must be `http://localhost:3001/api/v1` (the web client does not prefix `/api/v1`).

### Test database (this folder’s default)

`apps/api/.env.test` + `docker-compose.test.yml`:

|                 |                         |
| --------------- | ----------------------- |
| Database        | `cv_studio_test`        |
| User / password | `postgres` / `postgres` |

Do **not** run `pnpm docker:test` and `pnpm docker:up` at the same time — both bind 5432 and 6379.

`pnpm docker:up` uses `cvstudio` / `cvstudio` / `cvstudio` instead. Point `DATABASE_URL` at whichever stack you started.

## Running tests

### Option 1: Dedicated test compose

```bash
pnpm docker:test
pnpm --filter @cvstudio/api exec prisma migrate deploy
pnpm --filter @cvstudio/web exec playwright install chromium

# API Jest e2e (CinetPay flow + Stripe route regression)
pnpm test:e2e:api

# Playwright (starts API + web unless they are already up)
pnpm --filter @cvstudio/web test:e2e
```

### Option 2: Dev stack

```bash
# Terminal 1
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm dev

# Terminal 2 — Playwright reuses localhost:3000 / :3001
pnpm test:e2e
```

### Option 3: Interactive

```bash
pnpm --filter @cvstudio/web test:e2e:ui
```

## Billing / CinetPay specs

- Payment method selector (Stripe + CinetPay)
- Success / cancel / failed banners from query params
- Pending checkout polling (`/payments/status/:tx`)
- Redirect when payment completes or is refused
- Checkout body sends `paymentMethod=cinetpay`

Auth is required for checkout and status polling (JWT). CinetPay notify is public and always returns 200.

## Debugging

```bash
pnpm --filter @cvstudio/web test:e2e:headed
pnpm --filter @cvstudio/web test:e2e:debug
pnpm --filter @cvstudio/web test:e2e:report
```

Stripe hosted checkout is opt-in: `E2E_STRIPE=1` (see `docs/e2e/EXECUTION_GUIDE.md`).

## CI/CD

| Workflow                                 | What runs                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml` job `quality` | Unit tests + **API Jest e2e**                                                   |
| `.github/workflows/test.yml`             | Coverage + **API Jest e2e**                                                     |
| `.github/workflows/e2e-tests.yml`        | Playwright (after quality). Artifacts on failure: `apps/web/playwright-report/` |

Postgres 16 + Redis 7 are GitHub Actions services. Playwright `webServer` waits on `http://localhost:3001/api/v1/health` then runs `e2e/health.setup.ts`.
