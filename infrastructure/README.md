# Infrastructure scaffold — CV Studio AI

| Path                    | Purpose                                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| `docker/`               | Local compose (Postgres, Redis, Mailpit; profile `app` for API/Web images) |
| `terraform/`            | AWS IaC modules + envs (`dev` / `staging` / `prod`)                        |
| `k8s/`                  | Workloads, ingress, blue-green, monitoring snippets                        |
| `../.github/workflows/` | CI, PR checks, CD staging/prod, Terraform                                  |

## Local data plane

```bash
# from repo root
pnpm docker:up      # postgres + redis + mailpit
pnpm docker:app     # optional: build & run api/web containers
pnpm docker:down
```

Compose file: [`docker/docker-compose.yml`](docker/docker-compose.yml)

Full design: [`docs/INFRASTRUCTURE-CV-STUDIO-AI.md`](../docs/INFRASTRUCTURE-CV-STUDIO-AI.md)
