# Payment gateway setup

Stripe is the only payment provider (cards, auto-renew). CinetPay (Mobile Money) was removed on 2026-09-27, together with its routes, its gateway and the geo-based payment suggestion. The unused `cinetpay_transaction_id` column is dropped by the following release (expand/contract).

## Environment

Copy from `apps/api/.env.example`. **Never commit real keys.** Do not put secrets in `apps/api/.env` in git.

### Stripe

| Variable                                    | Role                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                         | Server SDK. Placeholder `sk_test_xxx` = unconfigured                                                                                              |
| `STRIPE_WEBHOOK_SECRET`                     | `POST /api/v1/payments/webhook` signature                                                                                                         |
| `STRIPE_PRICE_PRO_MONTHLY` / `_YEARLY`      | Price IDs                                                                                                                                         |
| `STRIPE_PRICE_BUSINESS_MONTHLY` / `_YEARLY` | Price IDs                                                                                                                                         |
| `STRIPE_FAIL_CLOSED`                        | Default on. Missing keys → checkout 400 / webhook 503 (no `dev_bypass`, no soft-ack). `0` disables the flag only; checkout still requires Stripe. |
| `STRIPE_ALLOW_LIVE`                         | Staging must omit. Production go-live only (`1`) to allow `sk_live_` / `rk_live_`.                                                                |

Web: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

### Logging / Sentry

| Variable             | Role                                             |
| -------------------- | ------------------------------------------------ |
| `LOG_LEVEL`          | `debug` (dev) or `log` (prod default)            |
| `LOG_FORMAT=json`    | HTTP interceptor JSON lines                      |
| `SENTRY_DSN`         | API errors                                       |
| `SENTRY_ENVIRONMENT` | Overrides Sentry `environment` (else `NODE_ENV`) |

See [docs/pre-launch/OBSERVABILITY_SETUP.md](./pre-launch/OBSERVABILITY_SETUP.md).

## Fail-closed

- Missing Stripe keys → checkout 400 `STRIPE_NOT_CONFIGURED`, webhook 503 (see `docs/STRIPE-WEBHOOK-FAIL-CLOSED.md`).
- `POST /api/v1/payments/webhook` is the only payment webhook; it requires a valid `stripe-signature`.

## Local webhook (Stripe CLI)

```bash
stripe listen --forward-to localhost:3001/api/v1/payments/webhook
# Copy the printed whsec_… into STRIPE_WEBHOOK_SECRET in apps/api/.env
```

## Tests

```bash
pnpm --filter @cvstudio/api test
pnpm --filter @cvstudio/api test:e2e
pnpm --filter @cvstudio/web test:e2e
```

Stripe hosted checkout remains opt-in (`E2E_STRIPE=1`).

## Monitoring

- Health: `GET /api/v1/health` → `observability.payments.stripe`.
- Sentry: new issue + error spike (see observability setup).
- Grafana notes: `infrastructure/k8s/monitoring/grafana-notes.yaml` (API golden signals — no fictional DataDog dashboard in this repo).
- Watch: failed invoices, webhook failures and latency (Stripe dashboard + Sentry).

## Rollback

See [runbooks/production-rollback.md](./runbooks/production-rollback.md).

| Severity                | Action                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Webhook failures        | Check `STRIPE_WEBHOOK_SECRET` and the Stripe dashboard; replay with `webhook:retry-dlq`. |
| Critical (wrong grants) | Rollback the API image; restore DB only if the release migrated. Notify affected users.  |

Never delete payment records.
