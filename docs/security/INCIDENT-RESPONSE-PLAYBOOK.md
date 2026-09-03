# Incident Response Playbook (operational checklist)

Owner: on-call + IC  
Full NIST flow: [INCIDENT-RESPONSE.md](./INCIDENT-RESPONSE.md)  
Roster: [IR_ROSTER.md](./IR_ROSTER.md)

## 1. First 15 minutes

- [ ] Page on-call (`IR_WEBHOOK_URL` / `IR_ONCALL_EMAIL`)
- [ ] Confirm the alert (Sentry tag `alert_id`, API logs `requestId`)
- [ ] Classify P0 / P1 / P2
- [ ] If personal data may be involved: notify DPO (`privacy@cvstudio.ai`) — 72h clock starts at awareness
- [ ] Preserve logs; do not wipe hosts

## 2. Containment (first hour)

| Scenario                  | Action                                                                   |
| ------------------------- | ------------------------------------------------------------------------ |
| Refresh reuse (SEC-01)    | Already revokes family; force password reset if ATO suspected            |
| Stolen JWT secret         | Rotate `JWT_ACCESS_SECRET` / refresh; restart API; revoke all sessions   |
| Stripe sig fails (SEC-05) | Confirm `STRIPE_WEBHOOK_SECRET`; do not disable Checkout                 |
| PDF / Chromium abuse      | Endpoint is authenticated; tighten throttle; disable HTML body if needed |
| Account wipe fraud        | Check `gdpr.erase` audit spike (SEC-08)                                  |

## 3. Investigation

- Timeline (UTC), systems, data categories, actor
- Correlate `X-Request-Id`
- Stripe / CinetPay dashboards for payment events

## 4. Recover

- Canary traffic
- Auth + CV ownership smoke tests
- Watch 24–72h

## 5. Close

- Blameless postmortem ≤ 5 business days (P1/P2)
- Update this checklist and the roster
