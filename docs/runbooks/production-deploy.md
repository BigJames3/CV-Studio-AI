# Production deploy checklist

Tests passing on a PR **does not** ship production. Production ships only from a `v*` tag (or a manual `deploy.yml` run with an existing ECR `sha-…` tag).

## Path to production

1. PR → `ci.yml` (`quality` + `lighthouse` + `e2e` + `build`). No deploy.
2. Merge to `main` → same CI, then `cd-staging.yml` (build/push ECR, kustomize, smoke).
3. Tag the **same commit** after staging is green: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. Tag push → CI again, then `cd-prod.yml`:
   - builds & pushes images unless `image_tag` is provided
   - migrate Job uses that SHA (not the overlay `:prod` tag)
   - blue-green API flip after internal smoke
   - public smoke (`/health/ready`, `/`, `/marketplace`)
   - keeps blue at 1 replica
   - automatic rollback on failure

Manual: Actions → **Deploy to Production (manual)** (`deploy.yml`) with `image_tag=sha-…` already in ECR. Skips the image build.

## Pre-deploy

- [ ] Staging smoke green for this SHA
- [ ] Expand-safe Prisma migration (no destructive expand/contract in the same tag)
- [ ] `AWS_ROLE_PROD`, `AWS_ACCOUNT_ID`, ECR repos `cvstudio/{api,web,worker}`
- [ ] Secrets in `api-secrets` (JWT, Stripe live, **CinetPay** `CINETPAY_API_KEY` / `CINETPAY_SITE_ID`, `API_URL`, `APP_URL`, Sentry, PostHog)
- [ ] CinetPay fail-closed: empty keys hide Mobile Money in billing (`GET /payments/methods`)
- [ ] Cron: `expire-pending-payments` CronJob in the overlay; check logs after first hour
- [ ] Slack webhook optional (`SLACK_WEBHOOK_URL`)

## Post-deploy verify

```bash
curl -fsS https://api.cvstudio.ai/api/v1/health/ready
curl -fsS https://api.cvstudio.ai/api/v1/health
curl -fsS -o /dev/null -w "%{http_code}\n" https://cvstudio.ai/
curl -fsS -o /dev/null -w "%{http_code}\n" https://cvstudio.ai/marketplace
```

Health JSON should show `"db":"up"`. `observability.sentry` / `posthog` are warnings in CD until those keys are required.

## Rollback

See [production-rollback.md](./production-rollback.md).
