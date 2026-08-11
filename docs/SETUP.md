# Local setup — CV Studio AI

## Prerequisites

- Node.js **20.11+** (`.nvmrc`)
- **pnpm 9.15+** (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Docker Desktop (Postgres + Redis)
- Git

## Steps

```bash
pnpm install
cp .env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm docker:up           # Postgres + Redis + Mailpit (infrastructure/docker/)
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

| Service       | URL                        |
| ------------- | -------------------------- |
| Web           | http://localhost:3000      |
| API           | http://localhost:3001      |
| Swagger       | http://localhost:3001/docs |
| Mailpit       | http://localhost:8025      |
| Prisma Studio | `pnpm db:studio`           |

Full guide: [MONOREPO-SETUP.md](./MONOREPO-SETUP.md)
