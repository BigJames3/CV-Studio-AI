# Production rollback

Automatic rollback runs in `.github/workflows/cd-prod.yml` when green smoke, flip, web/worker rollout, or public smoke fails:

- API Service selector → `version=blue`
- blue scaled to 3, green scaled to 0
- `rollout undo` on web + worker
- post-rollback curl against `https://api.cvstudio.ai/api/v1/health/ready`

Blue is **not** drained to 0 after a successful flip (1 replica soak). That keeps a rollback target.

## Manual rollback

```bash
aws eks update-kubeconfig --name cvstudio-prod --region eu-west-1

kubectl -n cvstudio get deploy,svc,pods
kubectl -n cvstudio rollout history deploy/api
kubectl -n cvstudio rollout history deploy/api-green
kubectl -n cvstudio rollout history deploy/web
kubectl -n cvstudio rollout history deploy/worker-pdf

# 1. Send API traffic back to blue BEFORE scaling green to 0
kubectl -n cvstudio patch svc api -p '{"spec":{"selector":{"app":"api","version":"blue"}}}'
kubectl -n cvstudio scale deploy/api --replicas=3
kubectl -n cvstudio scale deploy/api-green --replicas=0
kubectl -n cvstudio rollout status deploy/api --timeout=5m

# 2. Web + PDF worker previous ReplicaSet
kubectl -n cvstudio rollout undo deploy/web
kubectl -n cvstudio rollout undo deploy/worker-pdf
kubectl -n cvstudio rollout status deploy/web --timeout=5m
kubectl -n cvstudio rollout status deploy/worker-pdf --timeout=5m
```

Do not `kubectl rollout undo` on green while the Service still selects `green` if green pods were already scaled to 0 — patch the Service to blue first.

## Verify

```bash
curl -fsS https://api.cvstudio.ai/api/v1/health/ready
curl -fsS https://api.cvstudio.ai/api/v1/health
curl -fsS -o /dev/null -w "%{http_code}\n" https://cvstudio.ai/
curl -fsS -o /dev/null -w "%{http_code}\n" https://cvstudio.ai/marketplace
```

## GitHub Actions

- Actions → **Deploy to Production (manual)** is `deploy.yml` (calls `cd-prod.yml`).
- Actions → **CD Production Blue-Green** → Run workflow with a known-good `image_tag` (`sha-…` already in ECR) to redeploy without rebuilding.

## Schema rollback

Application rollback does **not** undo Prisma migrations. If the release migrated, restore from backup / reverse migration — see `docs/infrastructure/DR-RUNBOOK.md`.
