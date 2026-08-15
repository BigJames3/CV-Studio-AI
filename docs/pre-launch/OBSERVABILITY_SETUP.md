# Observability setup — PostHog + Sentry

This is the **code-accurate** runbook. Keys are never committed. The 6-minute brief that assumed `posthog-client.ts` / Sentry SDKs already existed was wrong; those SDKs are now in the repo.

## What the code does

| Surface | SDK              | Env                                                   | Behavior                                                                      |
| ------- | ---------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| Web     | `posthog-js`     | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Client events after consent (auto-on in `development`)                        |
| API     | `posthog-node`   | `POSTHOG_API_KEY`, `POSTHOG_HOST`                     | Dual-write: `analytics_events` + PostHog                                      |
| Web     | `@sentry/nextjs` | `NEXT_PUBLIC_SENTRY_DSN`                              | Client + server/edge. Dev events dropped unless `NEXT_PUBLIC_SENTRY_DEV=true` |
| API     | `@sentry/node`   | `SENTRY_DSN`                                          | 5xx via `GlobalExceptionFilter` + Stripe webhook fatals                       |

EU residency: set host to `https://eu.i.posthog.com` (web + API) and create the PostHog project in the EU cloud.

## 1. PostHog

1. Create a project **CV Studio AI** at [posthog.com](https://posthog.com).
2. Copy the Project API Key (`phc_…`). Same key for frontend and backend.
3. Local:

```env
# apps/web/.env.local  (or apps/web/.env)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# apps/api/.env
POSTHOG_API_KEY=phc_xxxxx
POSTHOG_HOST=https://us.i.posthog.com
```

4. Restart `pnpm dev`. Open `http://localhost:3000/register` (not `/signup`). Create an account.
5. PostHog → Activity / Events → `signup_started` (client) and `signup_succeeded` (client + API).

Dev captures automatically. Production shows a consent banner; events fire only after **Accepter**.

## 2. Sentry

Create **two** projects in [sentry.io](https://sentry.io):

- Platform Next.js → `CV Studio AI - Frontend` → copy DSN → `NEXT_PUBLIC_SENTRY_DSN`
- Platform Node.js / NestJS → `CV Studio AI - Backend` → copy DSN → `SENTRY_DSN`

Local Sentry is **silent in development** (expected). To test locally:

```env
NEXT_PUBLIC_SENTRY_DEV=true
SENTRY_DEV=true
```

Then in the browser console: `throw new Error('Test Sentry')`.

Optional source maps (CI only, never commit): `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

## 3. Alert rules (Sentry UI)

Per project (Frontend and Backend):

1. **New Issue** — when a new issue is created → email or Slack.
2. **Error spike** — error count exceeds ~5 in 5 minutes (or 50/min) → email or Slack.

Connect Slack/email under Settings → Integrations first.

## 4. Marketing spend (CAC)

```env
# apps/api/.env
ANALYTICS_MARKETING_SPEND_MONTHLY=1000
```

Formula in `AnalyticsService.unitEconomics()`: `CAC = spend / new paid users created this UTC month`. `0` or unset → `cac: null` (display "—"). There is **no** `/admin/analytics` page yet; do not commit `.env` or expect that URL.

Health check (no secrets): `GET /api/v1/health` → `observability.sentry`, `observability.posthog`, `observability.marketingSpendConfigured`, `observability.payments`.

## 5. Production env (hosting dashboard)

Web:

- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_SENTRY_DSN`

API:

- `POSTHOG_API_KEY`
- `POSTHOG_HOST`
- `SENTRY_DSN`
- `ANALYTICS_MARKETING_SPEND_MONTHLY`

Do not git-add `.env` files. Deploy the app after saving env vars (Vercel/EKS/your host — this repo’s CD is EKS Helm, not a `vercel.json`).

## 6. Validate

| Check                | Expected                                                              |
| -------------------- | --------------------------------------------------------------------- |
| Register locally     | PostHog events `signup_started`, `signup_succeeded`                   |
| `GET /api/v1/health` | `observability.posthog/sentry` true once keys are set                 |
| Prod error           | Sentry issue on the matching project within ~30s                      |
| Alert rules          | 2 per Sentry project                                                  |
| Network tab          | requests to `i.posthog.com` / `sentry.io` (ad blockers can hide them) |

## Troubleshooting

- **No PostHog events:** key must start with `phc_`; restart after `.env` change; in prod accept the banner; check DevTools → Network.
- **No Sentry in local:** set `NEXT_PUBLIC_SENTRY_DEV=true` / `SENTRY_DEV=true` or test in production.
- **CAC is "—":** spend is 0 **or** no paid user created this month.
