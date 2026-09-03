# Data Protection Officer (DPO)

**Status:** Interim appointment pending named counsel  
**Effective:** 16 August 2026  
**Contact:** privacy@cvstudio.ai

## Appointment

| Field            | Value                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| Role             | Data Protection Officer (GDPR Art. 37) / privacy contact (CCPA)                 |
| Named individual | **Interim:** founding engineering lead until external DPO/counsel is contracted |
| Email            | privacy@cvstudio.ai                                                             |
| Legal            | legal@cvstudio.ai                                                               |
| Phone            | Set `IR_ONCALL_PHONE` / roster in `IR_ROSTER.md`                                |

This is an **interim** designation so a contact exists before EU data collection. It is not a substitute for a qualified DPO if Art. 37(1) thresholds are met (core activities = large-scale regular monitoring or special-category data). Revisit at EU GA.

## Responsibilities

1. GDPR/CCPA compliance and DSAR coordination (`GET /users/me/export`, `DELETE /users/me`)
2. Maintain the DPIA (`DPIA-SIGNED.md`)
3. Vendor DPA tracking (Stripe, CinetPay, LLM, Sentry, PostHog)
4. Incident escalation with Legal (72-hour supervisory notify)
5. Privacy training for engineers (annual)

## Related

- [DPIA](./DPIA-SIGNED.md)
- [Incident response](./INCIDENT-RESPONSE.md)
- [IR roster](./IR_ROSTER.md)
