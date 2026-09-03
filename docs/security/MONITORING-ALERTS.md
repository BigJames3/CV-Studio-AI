# Security monitoring — alert catalog (baseline)

Wire these into CloudWatch/Datadog/SIEM before GA.

| ID     | Name                   | Condition                        | Sev | Action                                    |
| ------ | ---------------------- | -------------------------------- | --- | ----------------------------------------- |
| SEC-01 | Refresh reuse          | `auth.refresh.reuse` ≥ 1         | P1  | Revoke session family; page on-call       |
| SEC-02 | Login fail spike       | fails / IP > 50 / 10m            | P2  | WAF + captcha                             |
| SEC-03 | 403 IDOR probe         | 403 on `/cvs/*` > 100 / 5m / IP  | P2  | Block IP; review                          |
| SEC-04 | WAF block surge        | 10× baseline                     | P2  | Confirm DDoS playbook                     |
| SEC-05 | Stripe sig fail        | > 10 / 5m                        | P2  | Rotate review                             |
| SEC-06 | AI budget kill         | circuit open                     | P2  | Confirm abuse vs outage                   |
| SEC-07 | Secret access anomaly  | unusual IAM principal            | P1  | Investigate + rotate                      |
| SEC-08 | GDPR erase spike       | > 20 / h                         | P2  | Fraud vs campaign                         |
| SEC-09 | Export storm           | PDF jobs > threshold / user      | P3  | Throttle user                             |
| SEC-10 | Public share 404 storm | enumeration pattern              | P3  | Rate limit tighten                        |
| PAY-01 | CinetPay API errors    | `CinetPay API error` ≥ 5 / 10m   | P2  | Pause CinetPay (empty keys); Stripe stays |
| PAY-02 | Pending payment expiry | `Expired pending payments` spike | P2  | Check CinetPay status + webhook tunnel    |
| PAY-03 | Payment fail rate      | failed / created > 20% / 1h      | P1  | Rollback CinetPay; do not disable Stripe  |

Log fields required: `request_id`, `actor_id`, `ip`, `route`, `action`, `result`.

**Wired in API (16 Aug 2026):**

- SEC-01 → `emitSecurityAlert` on refresh reuse (Sentry fatal + `IR_WEBHOOK_URL`)
- SEC-05 → `emitSecurityAlert` on Stripe signature failure
- HTTP logs include `requestId` from `RequestIdMiddleware`

Remaining rows still need CloudWatch/Datadog once production exists.

Payment JSON lines (`LOG_PAYMENTS`, default on): `message`, `userId`, `transactionId`, `paymentMethod`, `amount`, `currency`. Wire PAY-* from API logs / Sentry, not a fictional DataDog dashboard.
