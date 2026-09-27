# Payment gateway setup

Stripe is the only payment provider (cards, auto-renew). CinetPay (Mobile Money) was removed on 2026-09-27, together with its routes, its gateway and the geo-based payment suggestion. The unused `cinetpay_transaction_id` column is dropped by the following release (expand/contract).

## Environment

Copy from `apps/api/.env.example`. **Never commit real keys.** Do not put secrets in `apps/api/.env` in git.

### Stripe

| Variable                                    | Role                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                         | Server SDK. Placeholder `sk_test_xxx` = unconfigured                                                                                              |
| `STRIPE_WEBHOOK_SECRET`                     | `POST /api/v1/payments/webhook` signature                                                                                                         |
| `STRIPE_CONNECT_WEBHOOK_SECRET`             | Optional. Secret of the second endpoint ("events on connected accounts": `account.updated` for marketplace sellers).                              |
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

## Check the configuration

```bash
pnpm stripe:check
```

Read-only. It loads `apps/api/.env.local` then `apps/api/.env` (the process environment wins), then checks:

- the keys: a test key, or a live key allowed by `STRIPE_ALLOW_LIVE`, plus `whsec_` webhook secrets;
- that the Stripe account is reachable;
- the 4 prices: they exist, are active, recurring, in EUR, with the right interval, and with the amounts the app displays; a trial set on a price is flagged, because the app adds the trial itself;
- the webhook endpoints ending in `/api/v1/payments/webhook` and their events;
- that the customer portal is activated.

It exits with code 1 on any error.

## Fail-closed

- Missing Stripe keys → checkout 400 `STRIPE_NOT_CONFIGURED`, webhook 503 (see `docs/STRIPE-WEBHOOK-FAIL-CLOSED.md`).
- `POST /api/v1/payments/webhook` is the only payment webhook; it requires a valid `stripe-signature`.

## Local webhook (Stripe CLI)

```bash
stripe listen --forward-to localhost:3001/api/v1/payments/webhook
# Copy the printed whsec_… into STRIPE_WEBHOOK_SECRET in apps/api/.env
```

## Customer portal

"Gérer mon paiement et mes factures" on the billing page calls `POST /api/v1/subscriptions/me/portal`, which opens a Stripe Customer Portal session (update the card, pay an unpaid invoice, download invoices) and returns to `/account/billing`.

Activate the portal once per mode (test and live): Dashboard → Settings → Billing → Customer portal. Until then the API answers 503 `BILLING_PORTAL_UNAVAILABLE`.

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
