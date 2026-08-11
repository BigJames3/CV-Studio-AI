# Stripe webhook fail-closed (Étape 11)

## Flow

1. `POST /api/v1/payments/webhook` verifies Stripe signature (`rawBody` + `STRIPE_WEBHOOK_SECRET`).
2. Event `id` is the idempotency key (Postgres `stripe_webhook_events` + Redis cache).
3. Handler runs with **3 attempts**, exponential backoff `2^attempt * 1000ms`.
4. On permanent failure → **DLQ** (`status=dlq`) + **Sentry alert** (`SENTRY_DSN`).
5. CronJob every 5 minutes runs `webhook:retry-dlq` (`infrastructure/k8s/base/stripe-webhook-retry-cronjob.yaml`).

## Fail-closed

- Production / `STRIPE_FAIL_CLOSED=1`: missing Stripe config → **503** (webhook) / checkout rejected. No soft-ack, no `dev_bypass`.
- Development: soft-ack + local plan activation allowed.

## Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Sync subscription + tier |
| `customer.subscription.updated/deleted` | Sync / downgrade to Free |
| `invoice.paid` / `invoice.payment_succeeded` | Payment + invoice rows (unique `transactionId`) |
| `invoice.payment_failed` | `past_due` + email + alert |

## Ops

```bash
pnpm --filter @cvstudio/api webhook:retry-dlq
```

Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `SENTRY_DSN`, `STRIPE_FAIL_CLOSED`.
