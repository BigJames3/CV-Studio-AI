# @cvstudio/api — NestJS REST API

Production-oriented NestJS API for CV Studio AI.

## Quick start

```bash
cp .env.example .env
# Ensure Postgres is up (see docs/architecture/docker-compose.reference.md)
pnpm install
pnpm prisma generate --schema=../../docs/prisma/schema.prisma
pnpm dev
```

- API: `http://localhost:3001/api/v1`
- Swagger: `http://localhost:3001/docs`
- Health: `http://localhost:3001/api/v1/health`

## Spec

See [`docs/API-CV-STUDIO-AI.md`](../../docs/API-CV-STUDIO-AI.md)

## Modules

| Module        | Path prefix      |
| ------------- | ---------------- |
| Auth          | `/auth`          |
| Users         | `/users`         |
| CVs           | `/cvs`           |
| Templates     | `/templates`     |
| Subscriptions | `/subscriptions` |
| Payments      | `/payments`      |
| Invoices      | `/invoices`      |
| AI            | `/ai`            |
| Analytics     | `/analytics`     |
| Marketplace   | `/marketplace`   |
| Health        | `/health`        |

## Notes

- Global prefix `api` + URI version `v1`
- Envelope responses via `TransformInterceptor`
- JWT guard global; use `@Public()` for open routes
- Entitlements via `@RequireEntitlement()` + `EntitlementsGuard`
- OAuth / Stripe / BullMQ / LLM wired as stubs — replace with production integrations
