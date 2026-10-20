# Payment gateway setup

Paystack is the only payment provider (Côte d'Ivoire account, XOF: cards and Mobile Money Orange, MTN, Wave). Stripe was removed on 2026-10-20 because Côte d'Ivoire is not eligible; its columns (`stripe_*`) stay in the database as history. CinetPay was removed on 2026-09-27.

Paystack offers no recurring billing in Côte d'Ivoire, so Pro and Business are **prepaid periods** (1 month or 12 months) bought as one-time transactions:

- nothing renews by itself: access ends at the end of the period (the daily expiry job sets the account back to Free);
- an e-mail reminder goes out 7 days before the end (`RenewalReminderJob`, 08:00 UTC);
- buying the same plan again while it is active adds the period after the current end; switching plan starts now and credits the unused time at the ratio of the monthly prices;
- no trial, no customer portal; `DELETE /subscriptions/me/cancel` only records that the user does not want to renew.

## Environment

Copy from `apps/api/.env.example`. **Never commit real keys.** Do not put secrets in `apps/api/.env` in git.

### Paystack

| Variable                                           | Role                                                                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `PAYSTACK_SECRET_KEY`                              | Server API key, also the webhook signing key (HMAC-SHA512). Placeholder `sk_test_xxx` = unconfigured           |
| `PAYMENT_CURRENCY`                                 | Charge currency, default `XOF`. Prices and marketplace listings are in this currency                           |
| `PAYMENT_FAIL_CLOSED`                              | Default on. Missing key → checkout 503 `PAYMENTS_NOT_CONFIGURED`, webhook 503. `0` disables the flag only      |
| `PAYSTACK_ALLOW_LIVE`                              | Staging must omit. Production go-live only (`1`) to allow `sk_live_`                                           |
| `PAYSTACK_PRICE_<PRO\|BUSINESS>_<MONTHLY\|YEARLY>` | Optional, in major units (F CFA). Default: EUR catalog (`plans` table) × 655.957, rounded up to the next 100 F |
| `PAYSTACK_API_URL`                                 | Optional, defaults to `https://api.paystack.co` (tests only)                                                   |

Default XOF prices: Pro 6 600 F / month or 65 000 F / year, Business 19 700 F / month or 196 200 F / year.

The web and mobile apps need no Paystack key: the API returns the hosted payment page URL.

### Logging / Sentry

| Variable             | Role                                             |
| -------------------- | ------------------------------------------------ |
| `LOG_LEVEL`          | `debug` (dev) or `log` (prod default)            |
| `LOG_FORMAT=json`    | HTTP interceptor JSON lines                      |
| `SENTRY_DSN`         | API errors                                       |
| `SENTRY_ENVIRONMENT` | Overrides Sentry `environment` (else `NODE_ENV`) |

See [docs/pre-launch/OBSERVABILITY_SETUP.md](./pre-launch/OBSERVABILITY_SETUP.md).

## Paystack dashboard

1. Settings → API Keys & Webhooks: copy the test secret key (`sk_test_…`) into `PAYSTACK_SECRET_KEY`.
2. Same page, **Test Webhook URL** (and later Live Webhook URL): `https://<API host>/api/v1/payments/webhook`. Paystack sends every event there; the API handles `charge.success`, `refund.processed` and `charge.dispute.*` and ignores the rest.
3. Settings → Preferences: enable the payment channels (card, Mobile Money).
4. For go-live: complete the business review (Paystack needs the public website URL), then set the live key and `PAYSTACK_ALLOW_LIVE=1` in production only.

## Check the configuration

```bash
pnpm paystack:check
```

Read-only. It loads `apps/api/.env.local` then `apps/api/.env` (the process environment wins), then checks the key (test, or live allowed by `PAYSTACK_ALLOW_LIVE`), that the Paystack API answers, and the 4 prices in the charge currency. Paystack has no API to read the webhook URL, so it prints the URL and events to set as a reminder. It exits with code 1 on any error.

## Fail-closed

- Missing Paystack key → checkout 503 `PAYMENTS_NOT_CONFIGURED`, webhook 503 (see `docs/STRIPE-WEBHOOK-FAIL-CLOSED.md`).
- `POST /api/v1/payments/webhook` is the only payment webhook; it requires a valid `x-paystack-signature`.
- Every `charge.success` is re-verified with `GET /transaction/verify/:reference`, and its amount and currency are compared with what the API asked for before anything is granted.

## Local webhook

Paystack must reach the API over HTTPS: expose `localhost:3001` with a tunnel (for example `cloudflared tunnel --url http://localhost:3001`) and set the Test Webhook URL to `<tunnel>/api/v1/payments/webhook`. Without a tunnel the return confirmation below still grants the plan.

## Confirmation on return from Paystack

Paystack redirects to the `callback_url` with `?reference=…` (`/account/billing?checkout=success`, or `/marketplace/<id>?checkout=success`). The page then calls `POST /api/v1/payments/checkout/confirm` with that reference. The API verifies the transaction with Paystack, checks that it belongs to the signed-in user and is `success`, and runs the same fulfillment as the webhook. The redirect alone grants nothing. Both paths are idempotent (one `payments.transaction_id` per reference).

## Marketplace payouts

Sellers register a bank or Mobile Money account (`GET /marketplace/seller/payout-banks`, `POST /marketplace/seller/payout-account`), which creates a Paystack **subaccount**. Each sale is then split by Paystack: the seller's share goes to the subaccount, and the platform keeps the commission (`transaction_charge`, fees borne by the platform). A seller without a subaccount cannot publish paid listings.

## Tests

```bash
pnpm --filter @cvstudio/api test
pnpm --filter @cvstudio/api test:e2e
pnpm --filter @cvstudio/web test:e2e
```

API e2e tests replace the Paystack client with a fake (`apps/api/test/paystack-fake.ts`) and sign webhooks with its secret.

## Monitoring

- Sentry: new issue + error spike (see observability setup).
- Grafana notes: `infrastructure/k8s/monitoring/grafana-notes.yaml` (API golden signals — no fictional DataDog dashboard in this repo).
- Watch: webhook failures and latency (Paystack dashboard → Webhooks logs + Sentry), `PAY-01` / `MKT-*` security alerts (amount mismatch, duplicate payment, partial refund, dispute).

## Rollback

See [runbooks/production-rollback.md](./runbooks/production-rollback.md).

| Severity                | Action                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Webhook failures        | Check `PAYSTACK_SECRET_KEY` and the Paystack dashboard; replay with `webhook:retry-dlq`. |
| Critical (wrong grants) | Rollback the API image; restore DB only if the release migrated. Notify affected users.  |

Never delete payment records.
