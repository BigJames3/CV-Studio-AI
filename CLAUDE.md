# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo overview

pnpm 9.15.0 workspaces (`apps/*`, `packages/*`) orchestrated by Turborepo 2. Node `>=24.0.0` (`.nvmrc`: 24.18.0). All internal packages are scoped `@cvstudio/*` and consumed via `workspace:*`.

| Package                                       | Role                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/api` (`@cvstudio/api`)                  | NestJS modular monolith + Prisma/PostgreSQL + Redis/BullMQ. Port 3001.           |
| `apps/web` (`@cvstudio/web`)                  | Next.js 14 App Router, Zustand stores, TanStack Query. Port 3000.                |
| `apps/mobile` (`@cvstudio/mobile`)            | Expo app (partial, Phase 4).                                                     |
| `packages/ai-service`                         | Multi-model AI gateway, built to `dist/` and consumed by the API.                |
| `packages/ui`                                 | shadcn/Radix design system + Storybook + Vitest. `shared-ui` just re-exports it. |
| `packages/shared-types`, `shared-utils`       | Shared TS used by api and web (source-exported via `./src/index.ts`).            |
| `packages/eslint-config`, `typescript-config` | Shared configs.                                                                  |

Most docs (`docs/`, README) are written in French. Canonical specs: `docs/ARCHITECTURE-CV-STUDIO-AI.md`, `docs/API-CV-STUDIO-AI.md`, `docs/FRONTEND-CV-STUDIO-AI.md`, `docs/DATABASE-CV-STUDIO-AI.md`, `docs/INFRASTRUCTURE-CV-STUDIO-AI.md`. Architecture decisions live in `docs/adr/`.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm docker:up                      # Postgres 16 + Redis + Mailpit (dev)
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev                            # api + web in parallel

pnpm lint                           # turbo run lint (eslint per package; web uses `next lint`)
pnpm typecheck                      # turbo run typecheck (tsc --noEmit)
pnpm test                           # turbo run test
pnpm test:coverage
pnpm build
pnpm format                         # prettier --write
pnpm lint:fix                       # NOTE: actually `prettier --check`, it does not fix anything
```

Turbo `lint`, `typecheck`, `test` and `build` all depend on `^build`, so upstream packages (`ai-service`, `shared-*`) get built first.

### Running a single package / test

```bash
pnpm --filter @cvstudio/api test                              # Jest unit (src/**/*.spec.ts)
pnpm --filter @cvstudio/api exec jest --config jest.config.json src/modules/ai/ai.service.spec.ts
pnpm --filter @cvstudio/api exec jest --config jest.config.json -t "test name"
pnpm --filter @cvstudio/ui test                               # Vitest
pnpm --filter @cvstudio/web test:e2e                          # Playwright
```

API e2e tests (`apps/api/test/*.e2e-spec.ts`, run in band) need a real DB/Redis. Use the isolated stack, which binds the same ports as `docker:up`, so don't run both:

```bash
pnpm docker:test
pnpm --filter @cvstudio/api exec prisma migrate deploy
pnpm test:e2e:api
pnpm docker:test:down
```

`apps/api/jest.config.json` enforces **per-file coverage thresholds** on `ai.service.ts`, `ai-quota.service.ts`, `payments.service.ts` and `marketplace.service.ts`. Coverage runs fail if those drop.

### Prisma

The schema is `apps/api/prisma/schema.prisma` (the single source of truth; `docs/prisma/` only points to it). Run `pnpm db:generate` after schema changes and before typecheck/tests on a fresh install, or the Prisma client types will be missing.

## API architecture (apps/api)

- `src/main.ts`: global prefix `/api`, URI versioning (default `v1`, so routes are `/api/v1/...`), strict `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`), 1.5 MB body limit, `rawBody: true` (needed for Stripe/CinetPay webhook signature checks), Swagger gated by `shouldEnableSwagger()`, and `assertAuthSecrets()` fails boot on weak or missing secrets.
- **Response envelope**: `TransformInterceptor` wraps every response as `{ success, data, meta: { timestamp, version, requestId } }` unless the handler already returns an object with `success`, a `StreamableFile` or a `Buffer`. `GlobalExceptionFilter` shapes errors.
- **Auth is global**: `JwtAuthGuard` and `ThrottlerGuard` are registered as `APP_GUARD` in `app.module.ts`. Public endpoints must opt out with `@Public()` from `src/common/decorators`.
- Feature modules live in `src/modules/*` (auth, users, cvs, templates, subscriptions, plans, payments, invoices, ai, analytics, marketplace, health, geo). Cross-cutting code (guards, filters, interceptors, middleware, feature gating) is in `src/common`. Infrastructure lives in `src/database` (Prisma), `src/redis`, `src/cache`, `src/mail`, `src/queue` and `src/observability` (Sentry, PostHog).
- **Two entrypoints from one codebase**: `main.ts` is the HTTP API. `worker.ts` (`WORKER_KIND=pdf node dist/worker.js`) is a PDF worker that keeps a warm Chromium pool (`PdfBrowserPool` in `modules/cvs/export`). In local dev, PDF jobs are processed inline by the API. `ScheduleModule` (cron) is disabled when `WORKER_KIND` is set or `NODE_ENV=test`.
- Env loading: `.env.test` (only when `NODE_ENV=test`), then `.env.local`, then `.env`. Copy `apps/api/.env.example` and `apps/web/.env.example` to start.
- Payments: Stripe and CinetPay. Webhook handling is fail-closed (see `docs/STRIPE-WEBHOOK-FAIL-CLOSED.md`, `docs/PAYMENT_GATEWAY_SETUP.md`). Maintenance scripts: `payments:expire-pending` and `webhook:retry-dlq`.

## Web architecture (apps/web)

App Router with route groups `(marketing)`, `(auth)` and `(app)`, plus public share routes `p/` and `s/`. Auth routing is in `src/middleware.ts` and `src/lib/auth-routes.ts`. The API client is in `src/lib/api`, React Query setup in `src/lib/query-client.ts`, and client state in `src/stores` (auth, editor, ui). The dual-pane CV editor (the product's core feature, spec in `docs/EDITOR-UI-SPEC.md`) is in `src/components/cv-editor` and `src/components/editor`.

## Lint / format / hooks

- Root `.eslintrc.json` (ESLint 8, legacy config) applies `@typescript-eslint` + `prettier`, with react-hooks rules only for `packages/ui` and `shared-ui`. `no-console` is off in `apps/api`.
- `.npmrc` sets `shamefully-hoist=false` and publicly hoists only `*eslint*`, `*prettier*` and `*turbo*`. Transitive deps of ESLint plugins are therefore **not** hoisted, so keep this in mind when diagnosing "Cannot find module" errors.
- Husky `pre-commit` runs `lint-staged` (prettier --write on staged files).

## Git / CI

- Branches: `main` = production, `staging` = pre-production, `feature/*` or technical branches for work. Commits follow Conventional Commits (`feat:`, `fix:`, `ci:`, `chore:` ...).
- Workflows are in `.github/workflows/`. `ci.yml` is the single CI entrypoint (push/PR, `v*` tags, manual `workflow_dispatch`): quality, build, `e2e-tests.yml` (reusable), Lighthouse, then `cd-staging.yml` / `cd-prod.yml`. Also `pr-checks.yml` (PR title), `deploy.yml` (manual prod deploy of an existing image) and `terraform.yml`.
- The maintainer develops on **Windows** (PowerShell, path with spaces); CI runs on Ubuntu. Account for junction vs. symlink and path differences when an issue reproduces in only one environment.

## Working conventions requested by the maintainer

When fixing tooling or CI issues: observe, reproduce, prove the root cause, then propose a minimal fix and **wait for validation** before modifying anything. Never add `--no-verify`, `|| true` or `continue-on-error: true` to hide real errors. Don't install packages, bump versions, touch the lockfile or change application code to fix a purely environmental problem without justification. Keep each fix in its own isolated commit, and run `git diff --check` before committing.
