# Troubleshooting — CV Studio AI

## `pnpm` / `node` not found

Install Node 20 LTS, then:

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

## Port already in use (3000 / 3001 / 5432)

```bash
pnpm compose:down
# or stop the process holding the port
```

## Prisma migrate fails / `DIRECT_DATABASE_URL`

Ensure both are set in `apps/api/.env`:

```
DATABASE_URL=postgresql://cvstudio:cvstudio@localhost:5432/cvstudio?schema=public
DIRECT_DATABASE_URL=postgresql://cvstudio:cvstudio@localhost:5432/cvstudio?schema=public
```

Then `pnpm docker:up` and retry `pnpm db:migrate`.

## Workspace package not resolving

```bash
pnpm install
# verify package name matches filter, e.g. @cvstudio/shared-types
```

## Turbo cache weirdness

```bash
pnpm clean
pnpm install
```

## Docker compose

- Canonical: `infrastructure/docker/docker-compose.yml`
- Start: `pnpm docker:up` (Postgres + Redis + Mailpit)
- Optional app containers: `pnpm docker:app`

## CI fails on frozen lockfile

Commit `pnpm-lock.yaml` after first local `pnpm install`, then switch workflows to `--frozen-lockfile`.
