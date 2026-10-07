# Production rollback

The deploy workflow (`deploy-k8s.yml`) rolls back by itself when the rollout or the public smoke test fails: `kubectl rollout undo` on `api` and `web`, then waits for both. A failed migration stops the deploy before any rollout, so nothing needs rolling back.

## Roll back to a known build (preferred)

Actions → **Deploy to production (manual)** (`deploy.yml`) with the `image_tag` of the last good release (`sha-<12>`, see the previous successful deploy run). It redeploys existing images without rebuilding, with the same smoke test and automatic rollback.

## Manual rollback (cluster access)

```bash
export KUBECONFIG=/path/to/prod-kubeconfig   # Terraform output `kubeconfig`, never committed

kubectl -n cvstudio rollout history deploy/api
kubectl -n cvstudio rollout history deploy/web

kubectl -n cvstudio rollout undo deploy/api        # or --to-revision=<n>
kubectl -n cvstudio rollout undo deploy/web
kubectl -n cvstudio rollout status deploy/api --timeout=10m
kubectl -n cvstudio rollout status deploy/web --timeout=10m
```

The `stripe-webhook-retry` CronJob takes the release tag on the next deploy; a manual undo does not change it.

## Verify

```bash
curl -fsS https://api.cvstudio.ai/api/v1/health/ready
curl -fsS https://api.cvstudio.ai/api/v1/health
curl -fsS -o /dev/null -w "%{http_code}\n" https://cvstudio.ai/
```

## Schema rollback

Application rollback does **not** undo Prisma migrations. If the release ran a migration the previous release cannot work with, restore the managed PostgreSQL backup (OVHcloud console, point-in-time restore) or ship a reverse migration — see `docs/infrastructure/DR-RUNBOOK.md`.
