# Local development — Docker Compose (reference)

**Canonical file:** [`infrastructure/docker/docker-compose.yml`](../../infrastructure/docker/docker-compose.yml)

```bash
pnpm docker:up    # from repo root
```

There is **no** root `docker-compose.yml` anymore (removed to avoid dual sources).

## Services

| Service  | Port(s)     | Notes                          |
| -------- | ----------- | ------------------------------ |
| postgres | 5432        | user/db/password: `cvstudio`   |
| redis    | 6379        |                                |
| mailpit  | 8025 / 1025 | UI + SMTP (dev email)          |
| api/web  | 3001 / 3000 | optional `--profile app`       |

## Suggested env (api)

```
DATABASE_URL=postgresql://cvstudio:cvstudio@localhost:5432/cvstudio?schema=public
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=dev-only-change-me
JWT_REFRESH_SECRET=dev-only-change-me-too
```

Enable `citext` via Prisma migrations / `docs/sql/001_extensions.sql`.

## Dockerfiles

Build contexts for compose `app` profile: `apps/api/Dockerfile` and `apps/web/Dockerfile`.
