# Prisma schema (docs pointer)

The **canonical** Prisma schema lives at:

[`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma)

Do **not** duplicate the schema under `docs/`. This folder only points to the source of truth.

## Migrations

```bash
pnpm db:generate
pnpm db:migrate          # dev
pnpm db:migrate:deploy   # CI / staging / prod
pnpm db:seed
```

Migration history: `apps/api/prisma/migrations/`

## Full database documentation

See [`docs/DATABASE-CV-STUDIO-AI.md`](../DATABASE-CV-STUDIO-AI.md) and SQL ops under [`docs/sql/`](../sql/).
