# Payment gateway setup

Stripe (cards, auto-renew) and CinetPay (Mobile Money, West/Central Africa) share the same billing UI. CinetPay is prepaid: a successful notify grants one period; there is no CinetPay auto-renew in v1.

## Environment

Copy from `apps/api/.env.example`. **Never commit real keys.** Do not put secrets in `apps/api/.env` in git.

### Stripe

| Variable                                    | Role                                                              |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                         | Server SDK. Placeholder `sk_test_xxx` = unconfigured              |
| `STRIPE_WEBHOOK_SECRET`                     | `POST /api/v1/payments/webhook` signature                         |
| `STRIPE_PRICE_PRO_MONTHLY` / `_YEARLY`      | Price IDs                                                         |
| `STRIPE_PRICE_BUSINESS_MONTHLY` / `_YEARLY` | Price IDs                                                         |
| `STRIPE_FAIL_CLOSED`                        | `1` = no `dev_bypass` checkout (also on in `NODE_ENV=production`) |

Web: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

### CinetPay

| Variable                | Role                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CINETPAY_API_KEY`      | Dashboard → Settings                                                                                                                                    |
| `CINETPAY_SITE_ID`      | Dashboard → Settings                                                                                                                                    |
| `CINETPAY_SECRET_KEY`   | Reserved (HMAC v2)                                                                                                                                      |
| `CINETPAY_USD_XOF_RATE` | Default `656`                                                                                                                                           |
| `CINETPAY_FAIL_CLOSED`  | `true` (default in production): checkout throws `CINETPAY_NOT_CONFIGURED` if keys missing. Billing hides the CinetPay radio via `GET /payments/methods` |

### URLs (used in CinetPay create-payment)

| Variable  | Used as                                                                            |
| --------- | ---------------------------------------------------------------------------------- |
| `API_URL` | `notify_url` → `{API_URL}/api/v1/payments/webhook/cinetpay`                        |
| `APP_URL` | `return_url` → `{APP_URL}/account/billing?checkout=pending&provider=cinetpay&tx=…` |

Staging examples: `API_URL=https://api.staging.cvstudio.ai`, `APP_URL=https://staging.cvstudio.ai`.

### Logging / Sentry

| Variable             | Role                                                                  |
| -------------------- | --------------------------------------------------------------------- |
| `LOG_LEVEL`          | `debug` (dev) or `log` (prod default)                                 |
| `LOG_FORMAT=json`    | HTTP interceptor JSON lines                                           |
| `LOG_PAYMENTS=true`  | Extra JSON lines on CinetPay create/error (omit `false` to keep them) |
| `SENTRY_DSN`         | API errors                                                            |
| `SENTRY_ENVIRONMENT` | Overrides Sentry `environment` (else `NODE_ENV`)                      |

See [docs/pre-launch/OBSERVABILITY_SETUP.md](./pre-launch/OBSERVABILITY_SETUP.md).

## Fail-closed

- Missing CinetPay keys → `GET /payments/methods` has `cinetpay: false` → UI shows Stripe only (and a notice if geo suggested CinetPay).
- Checkout with `paymentMethod=cinetpay` still returns 400 `CINETPAY_NOT_CONFIGURED`.
- Stripe route `POST /api/v1/payments/webhook` is unchanged.
- Kill-switch in prod: set `CINETPAY_FAIL_CLOSED=true` and clear `CINETPAY_API_KEY` / `CINETPAY_SITE_ID`, or hide via missing keys. **Do not disable Stripe.**

## Local webhook tunnel (ngrok)

CinetPay must reach a public `notify_url`.

```bash
ngrok http 3001
# Set API_URL=https://<id>.ngrok-free.app in apps/api/.env (keep APP_URL=http://localhost:3000)
```

Smoke notify (always 200, fail-closed):

```bash
curl -sS -X POST "$API_URL/api/v1/payments/webhook/cinetpay" \
  -H "Content-Type: application/json" \
  -d '{"cpm_trans_id":"cv_unknown","cpm_status":"ACCEPTED"}'
```

Real ACCEPTED requires a pending `Payment.transactionId` created by checkout, then CinetPay `/v2/payment/check` returning ACCEPTED.

## Cron

- Nest `@Cron` hourly on API processes (not PDF worker, not `NODE_ENV=test`, not `WORKER_KIND`): `ExpirePendingPaymentsJob`.
- K8s: `expire-pending-payments` CronJob (`10 * * * *`) runs `node dist/scripts/expire-pending-payments.js` with `WORKER_KIND=expire-pending` so the one-shot job does not also register `@Cron`.
- Manual: `pnpm --filter @cvstudio/api payments:expire-pending`.
- Pending rows older than 60 minutes → `failed` + timeout reason. A late ACCEPTED notify can still grant and mark `completed`.
- In-process cron + CronJob are both idempotent (`updateMany` on `status=pending`).

## Tests

```bash
pnpm --filter @cvstudio/api test
pnpm --filter @cvstudio/api test:e2e
pnpm --filter @cvstudio/web test:e2e
```

Stripe hosted checkout remains opt-in (`E2E_STRIPE=1`).

## Monitoring

- Health: `GET /api/v1/health` → `observability.payments.{stripe,cinetpay,cinetpayFailClosed}`.
- Sentry: new issue + error spike (see observability setup).
- Grafana notes: `infrastructure/k8s/monitoring/grafana-notes.yaml` (API golden signals — no fictional DataDog dashboard in this repo).
- Watch: CinetPay vs Stripe success, failed/timeout payments, webhook latency (notify → `/payment/check`).

## Docker Compose (local app profile)

`infrastructure/docker/docker-compose.yml` (`--profile app`) sets `API_URL`, `APP_URL`, `CINETPAY_FAIL_CLOSED=true`, `LOG_FORMAT=json`. Leave CinetPay keys empty unless you inject sandbox secrets — fail-closed hides Mobile Money.

## Rollback

See [runbooks/production-rollback.md](./runbooks/production-rollback.md).

| Severity                | Action                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Immediate               | Clear CinetPay keys (or `CINETPAY_FAIL_CLOSED=true` + empty keys). Stripe stays.        |
| Minor (webhook latency) | Check CinetPay status; confirm `API_URL` / ngrok; do not delete `payments` rows.        |
| Critical (double-grant) | Rollback the API image; restore DB only if the release migrated. Notify affected users. |

Never disable Stripe to “fix” CinetPay. Never delete payment records.
