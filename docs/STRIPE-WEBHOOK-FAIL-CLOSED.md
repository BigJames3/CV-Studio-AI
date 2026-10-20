# Payment webhook fail-closed (Paystack)

The file keeps its historical name; the provider is Paystack since 2026-10-20.

## Flow

1. `POST /api/v1/payments/webhook` verifies the `x-paystack-signature` header: HMAC-SHA512 of the raw body (`rawBody`) keyed with `PAYSTACK_SECRET_KEY`, compared in constant time.
2. Paystack events have no id: the idempotency key is `<event>:<data.id>` (or the reference), stored in Postgres `stripe_webhook_events` (model `PaymentWebhookEvent`) + Redis cache.
3. Handler runs with **3 attempts**, exponential backoff `2^attempt * 1000ms`.
4. On permanent failure → **DLQ** (`status=dlq`) + **Sentry alert** (`SENTRY_DSN`).
5. CronJob every 5 minutes runs `webhook:retry-dlq` (`infrastructure/k8s/base/stripe-webhook-retry-cronjob.yaml`).

## Fail-closed

- Missing or placeholder Paystack key → **503** on webhook, checkout **503** `PAYMENTS_NOT_CONFIGURED`. No soft-ack, no `dev_bypass`.
- Live keys (`sk_live_`) are ignored unless `PAYSTACK_ALLOW_LIVE=1`.
- Opt out only with `PAYMENT_FAIL_CLOSED=0` (not used in staging).

## Events

| Event              | Action                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `charge.success`   | Re-verify with Paystack, check amount and currency, then grant the prepaid period or the licence |
| `refund.processed` | Marketplace: full refund revokes the licence and books a clawback; partial refund is alerted     |
| `charge.dispute.*` | Marketplace dispute recorded and alerted                                                         |

## Ops

```bash
pnpm --filter @cvstudio/api webhook:retry-dlq
```

Env: `PAYSTACK_SECRET_KEY`, `PAYMENT_CURRENCY`, `SENTRY_DSN`, `PAYMENT_FAIL_CLOSED`.
