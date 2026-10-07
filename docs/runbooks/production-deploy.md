# Production deploy checklist

Tests passing on a PR **does not** ship production. Production ships only from a `v*` tag, or a manual **Deploy to production (manual)** run (`deploy.yml`) with an image tag that already exists on GHCR.

Platform: OVHcloud Managed Kubernetes (`infrastructure/terraform-ovh`), manifests in `infrastructure/k8s`, images on GHCR.

## Path to production

1. PR → `ci.yml` (`quality` + `lighthouse` + `e2e` + `build`). No deploy.
2. Push to `staging` → same CI, then `deploy-k8s.yml` on the `staging` environment.
3. Tag the **same commit** once staging is green: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. Tag push → CI again, then `deploy-k8s.yml` on the `production` environment (required reviewers approve the job):
   - builds `ghcr.io/bigjames3/cvstudio-api:sha-<12>` and `cvstudio-web:sha-<12>-prod` (the web image bakes the production URLs);
   - Trivy blocks on critical fixable CVEs, images are signed with cosign (keyless);
   - refreshes `api-secrets`, `web-secrets` and the `ghcr-pull` secret from the environment secrets;
   - runs `prisma migrate deploy` in the `db-migrate` Job with the release image; a failed migration stops the deploy before any rollout;
   - rolling update of `api` and `web` (no pod is removed before its replacement is ready);
   - public smoke test (`/health/ready`, `/health` status ok, `/`, `/pricing`);
   - automatic `rollout undo` of `api` and `web` when the rollout or the smoke test fails.

## One-time setup per environment

- [ ] `terraform apply` done (`infrastructure/terraform-ovh/README.md`)
- [ ] **Bootstrap cluster (OVHcloud Kubernetes)** run once (`k8s-bootstrap.yml`), DNS A records set to the printed Load Balancer IP
- [ ] Environment secrets: `OVH_KUBECONFIG`, `API_ENV_FILE`, `GHCR_PULL_TOKEN`, optional `WEB_ENV_FILE`, `SLACK_WEBHOOK_URL`
- [ ] Environment variables: `PUBLIC_API_URL`, `PUBLIC_SITE_URL`, `STRIPE_PUBLISHABLE_KEY`, `ACME_EMAIL`
- [ ] `production` environment restricted to `v*` tags, with required reviewers

## Pre-deploy

- [ ] Staging green for this SHA
- [ ] Database backup taken when the release contains a destructive (contract) migration
- [ ] Migrations are backward compatible with the running release (expand/contract): a rollback does not undo them

## Post-deploy verify

```bash
curl -fsS https://api.cvstudio.ai/api/v1/health/ready
curl -fsS https://api.cvstudio.ai/api/v1/health
curl -fsS -o /dev/null -w "%{http_code}\n" https://cvstudio.ai/
curl -fsS -o /dev/null -w "%{http_code}\n" https://cvstudio.ai/pricing
```

Health JSON should show `"db":"up"`.

## Rollback

See [production-rollback.md](./production-rollback.md).
