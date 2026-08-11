# Monorepo setup — CV Studio AI

## Prerequisites

- Node **20.11+** (see `.nvmrc`)
- **pnpm 9.15+** (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Docker (Postgres 16 + Redis 7)

## First-time setup

```bash
pnpm install
cp .env.example apps/api/.env
cp apps/web/.env.example apps/web/.env   # if present
pnpm docker:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- API: http://localhost:3001
- Web: http://localhost:3000
- Swagger: http://localhost:3001/docs

## Workspace layout

```
apps/
  api/       @cvstudio/api      NestJS
  web/       @cvstudio/web      Next.js 14
  mobile/    @cvstudio/mobile   Expo
packages/
  shared-types/
  shared-utils/
  ui/                 Design system
  ai-service/         AI gateway scaffold
  typescript-config/
  eslint-config/
infrastructure/
  docker/
  terraform/
  k8s/
```

## Turbo commands

| Command                             | Effect             |
| ----------------------------------- | ------------------ |
| `pnpm dev`                          | API + Web parallel |
| `pnpm build`                        | All packages       |
| `pnpm lint` / `typecheck` / `test`  | Quality gates      |
| `pnpm build --filter=@cvstudio/web` | Single app         |

## Package manager note

Architecture uses **pnpm workspaces** + Turborepo 2 (`tasks` in `turbo.json`).  
npm workspaces are not used (pnpm preferred for monorepo perf + `workspace:*`).

After first `pnpm install`, commit `pnpm-lock.yaml` and switch CI back to `--frozen-lockfile`.
