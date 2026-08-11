# Local Docker — CV Studio AI

**Canonical compose:** `infrastructure/docker/docker-compose.yml`

```bash
# From repo root (preferred)
pnpm docker:up      # postgres + redis + mailpit
pnpm docker:down
pnpm docker:app     # optional: also build/run api+web (profile app)
```

| File               | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `docker-compose.yml` | Postgres + Redis + Mailpit (+ profile `app`) |
| `nginx.conf`       | Reverse proxy snippet for compose stacks     |
| `.env.example`     | Local compose env defaults                   |

## Dockerfiles (single source of truth)

Application images live under **`apps/`** (not duplicated here):

- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/api/Dockerfile.worker`

Compose `app` profile builds with:

```yaml
api:
  build:
    context: ../../apps/api
    dockerfile: Dockerfile
web:
  build:
    context: ../../apps/web
    dockerfile: Dockerfile
```

## Env (apps)

```
DATABASE_URL=postgresql://cvstudio:cvstudio@localhost:5432/cvstudio?schema=public
REDIS_URL=redis://localhost:6379
```

Mailpit UI: http://localhost:8025 · SMTP: `localhost:1025`
