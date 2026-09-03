# Incident Response Roster

Last updated: 16 August 2026

Do **not** invent personal phone numbers in git. Fill names when people are appointed. Operational paging uses environment variables so production secrets stay out of the repo.

## Environment (wire in staging/prod)

| Variable          | Purpose                                               |
| ----------------- | ----------------------------------------------------- |
| `IR_ONCALL_EMAIL` | Primary on-call inbox                                 |
| `IR_ONCALL_PHONE` | Voice / SMS (password manager, not git)               |
| `IR_WEBHOOK_URL`  | Slack/Teams incoming webhook — P1 `emitSecurityAlert` |
| `SENTRY_DSN`      | Exception + tagged `alert_id`                         |
| `PRIVACY_EMAIL`   | Defaults conceptually to privacy@cvstudio.ai          |

## Roles

| Role                 | Primary                             | Backup               | Page                    |
| -------------------- | ----------------------------------- | -------------------- | ----------------------- |
| On-call engineer     | `IR_ONCALL_EMAIL`                   | Engineering lead     | Immediate (P0/P1)       |
| Incident commander   | Engineering lead (interim)          | Founder              | P0 / confirmed breach   |
| CISO / security lead | **Vacant — founder interim**        | —                    | P0/P1 security          |
| DPO / privacy        | privacy@cvstudio.ai                 | legal@cvstudio.ai    | Personal-data incidents |
| Legal                | legal@cvstudio.ai                   | External counsel TBD | Breach notify           |
| Payments             | Stripe Dashboard + CinetPay console | —                    | PAY-* alerts            |
| Comms                | Founder interim                     | —                    | User notification       |

## Escalation

### P0 (data exposed, RCE, payments compromised, total outage)

1. Page on-call (`IR_WEBHOOK_URL` + email) within 5 minutes
2. No ack in 15 minutes → founder / IC
3. Suspected personal-data breach → DPO + legal immediately (GDPR 72h clock)
4. Channel: `#inc-YYYYMMDD-shortname`
5. Updates every 30 minutes until contained

### P1 (ATO campaign, refresh reuse, webhook sig burst)

1. Page on-call
2. Escalate to IC if not contained in 1 hour

## Tools

- Playbook: [INCIDENT-RESPONSE.md](./INCIDENT-RESPONSE.md)
- Checklist: [INCIDENT-RESPONSE-PLAYBOOK.md](./INCIDENT-RESPONSE-PLAYBOOK.md)
- Notify: [BREACH-NOTIFICATION.md](./BREACH-NOTIFICATION.md)
- Alert catalog: [MONITORING-ALERTS.md](./MONITORING-ALERTS.md)
- Stripe: keep **test mode** until production hosting exists

## Wired alerts (code)

| ID     | Trigger                       | Destination                           |
| ------ | ----------------------------- | ------------------------------------- |
| SEC-01 | Refresh token reuse           | Log + Sentry fatal + `IR_WEBHOOK_URL` |
| SEC-05 | Stripe webhook signature fail | Log + Sentry error                    |
