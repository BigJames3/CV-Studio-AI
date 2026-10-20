# E2E Tests

Playwright lives in `apps/web/e2e`. API Jest e2e lives in `apps/api/test/*.e2e-spec.ts`.

## Prerequisites

1. **API** on `localhost:3001` with `GET /api/v1/health` returning 200
2. **PostgreSQL** on `localhost:5432`
3. **Redis** on `localhost:6379`
4. Node `>=24`, pnpm `9.15` (see `.nvmrc`)

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

# API Jest e2e (auth, CVs, payment webhook route)
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

## Billing specs (Paystack, prepaid periods)

Plans are prepaid one-time payments (a month or a year) through Paystack's hosted page; nothing renews by itself.

- Payment through Paystack (Mobile Money or card is chosen on Paystack's page), no billing portal, no trial
- Success / cancel banners from query params; the `reference` Paystack appends is sent to `POST /payments/checkout/confirm`
- Plan activation polling after `?checkout=success`
- Checkout body sends only `plan` and `interval`; a prepaid plan shows « Valable jusqu’au » and renews through checkout
- Without Paystack keys checkout is fail-closed (`PAYMENTS_NOT_CONFIGURED`): paid users are seeded with `utils/db.ts` `grantPlan`

Checkout requires auth (JWT). The Paystack webhook is public and verified by signature. Paystack's hosted page is not driven by Playwright (it needs a real Paystack account).

## Debugging

```bash
pnpm --filter @cvstudio/web test:e2e:headed
pnpm --filter @cvstudio/web test:e2e:debug
pnpm --filter @cvstudio/web test:e2e:report
```

Tests tagged `@mobile-wip` (mobile nav + editor section tabs/rail) describe UI that is not implemented yet
(`marketing-nav-trigger`, `editor-section-rail`, … do not exist; `mobile-nav.tsx` is not mounted). They are
excluded by default; run them with `E2E_MOBILE_WIP=1` and drop the tag once the UI ships.

## CI/CD

| Workflow                                 | What runs                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml` job `quality` | Unit tests + coverage gates + **API Jest e2e**                                  |
| `.github/workflows/e2e-tests.yml`        | Playwright (after quality). Artifacts on failure: `apps/web/playwright-report/` |

Postgres 16 + Redis 7 are GitHub Actions services. Playwright `webServer` waits on `http://localhost:3001/api/v1/health` then runs `e2e/health.setup.ts`.
