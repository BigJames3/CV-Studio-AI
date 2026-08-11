# Cache (Redis)

Planned home for Redis client / refresh-token helpers used by auth (Sprint 1).

Canonical connection: `REDIS_URL` (see `apps/api/.env.example`).

Do not leave business logic here until the module is wired from `AuthModule` / `AppModule`.
