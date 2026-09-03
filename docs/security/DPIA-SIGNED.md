# Data Protection Impact Assessment (DPIA) — CV Studio AI

**Assessment date:** 16 August 2026  
**Scope:** CV Studio AI SaaS (account, CV storage, AI assist, Stripe/CinetPay billing)  
**Status:** **Ready for sign-off — not yet legally signed**  
**Related:** `GDPR-DPIA-OUTLINE.md`, `DPO.md`, privacy page `/privacy`

This document completes the Art. 35 assessment content. Signature blocks below must be executed by a natural person; they are **not** auto-signed by engineering.

## 1. Purpose and necessity

CV Studio AI provides AI-assisted CV creation, storage, PDF export, and paid plans.

Processing is necessary for the contract (ToS). Marketing and geo-based payment suggestion use consent. Security logs use legitimate interest.

No special-category data is solicited. Users are asked not to upload health/religion data (ToS). Residual risk remains if they paste it into a CV.

## 2. Data categories

| Category     | Examples                                             | Necessity           |
| ------------ | ---------------------------------------------------- | ------------------- |
| Account      | email, name, phone, location                         | Login and profile   |
| CV content   | employment, education, skills, references, photo URL | Core product        |
| Auth secrets | password hash, TOTP ciphertext, sessions             | Security            |
| Billing      | Stripe/CinetPay ids, amounts, invoices               | Contract + tax      |
| AI           | prompt snippets, model output                        | Feature; TTL 7 days |
| Logs         | IP, UA, request id                                   | Abuse detection     |

## 3. Recipients / processors

| Processor  | Role              | Transfer notes                                           |
| ---------- | ----------------- | -------------------------------------------------------- |
| Stripe     | Card payments     | No PAN stored by us                                      |
| CinetPay   | Mobile money      | Africa corridors                                         |
| LLM vendor | Generation        | Contract must forbid training; DPA required before EU GA |
| Sentry     | Errors            | `sendDefaultPii: false`                                  |
| PostHog    | Product analytics | Property blocklist                                       |

**Vendor DPAs:** not all on file. Track as a close-out item before public EU GA.

## 4. Retention

| Data            | Retention                                             | Implementation           |
| --------------- | ----------------------------------------------------- | ------------------------ |
| Active CVs      | Account life                                          | Postgres                 |
| Account erasure | Immediate PII purge; user row anonymized for invoices | `UsersService.deleteMe`  |
| AiHistory       | 7 days (`AI_HISTORY_TTL_DAYS`)                        | `AiRetentionJob`         |
| Security audit  | 24 months (policy)                                    | Auth `audit_logs`        |
| Invoices        | 7–10 years                                            | Kept after anonymization |

## 5. Measures

- TLS in transit (when deployed on HTTPS)
- bcrypt passwords; AES-GCM for TOTP/OAuth tokens
- JWT + ownership checks; PDF export authenticated + Chromium network lock
- Stripe webhook signatures; fail-closed in production
- DSAR export and erasure APIs
- Security alerts to Sentry + optional `IR_WEBHOOK_URL`

## 6. Risks

| Risk                         | Likelihood              | Impact   | Mitigation                       |
| ---------------------------- | ----------------------- | -------- | -------------------------------- |
| Unauthorized CV access       | Medium                  | High     | AuthZ, rate limits, upcoming RLS |
| LLM vendor exposure          | Medium                  | High     | TTL, DPA, quotas                 |
| Billing after erasure        | Low (after this change) | High     | Immediate Stripe cancel          |
| Unauthenticated PDF/Chromium | Low (after this change) | Critical | Auth + request allowlist         |

Residual risk after mitigations: **medium**. Proceed only with signed ToS/privacy, DPO contact live, and Stripe **test mode** until production AWS exists.

## 7. User rights

| Right                | Mechanism                     |
| -------------------- | ----------------------------- |
| Access / portability | `GET /api/v1/users/me/export` |
| Rectification        | Profile + editor              |
| Erasure              | `DELETE /api/v1/users/me`     |
| Withdraw geo consent | `/account/privacy`            |
| Complain             | Supervisory authority         |

## Sign-off

| Role                  | Name | Date | Decision                     |
| --------------------- | ---- | ---- | ---------------------------- |
| DPO / privacy contact |      |      | Proceed / Conditional / Stop |
| Legal counsel         |      |      |                              |
| Security lead         |      |      |                              |
| Product               |      |      |                              |
