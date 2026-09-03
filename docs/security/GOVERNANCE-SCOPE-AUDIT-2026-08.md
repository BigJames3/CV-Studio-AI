# CV Studio AI — Security Governance & Scope Audit

| Field              | Value                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Document type**  | Governance, architecture, and risk audit (not a penetration test)                        |
| **Classification** | Internal — Confidential                                                                  |
| **Date**           | 16 August 2026                                                                           |
| **Auditor role**   | Independent AppSec / GRC review against repo evidence                                    |
| **Scope**          | Monorepo `CV Studio AI` (code, docs, CI, IaC scaffolds)                                  |
| **Out of scope**   | Live AWS account inspection, social engineering, exploit development, production traffic |
| **Related**        | `docs/SECURITY-CV-STUDIO-AI.md`, ADR-016, GO/NO-GO 13 Aug 2026                           |

**Method:** source-code and documentation review. No stakeholder interviews were conducted; named officers (CISO, DPO, CTO) are **vacant in all approval tables**. Live cloud state is **not evidenced** in this repository.

---

## 1. Executive summary

The claimed **9.1/10 ASVS L2** score is **not supported** as a platform or governance rating. It may describe recent application-layer hardening (auth, cookies, Stripe webhooks, Helmet, rate limits). It does **not** describe ASVS L2 completeness, production perimeter, or GDPR readiness.

**Independent score (this audit): 4.8 / 10 overall.**

| Domain                           | Score /10 | Evidence basis                                                 |
| -------------------------------- | --------- | -------------------------------------------------------------- |
| Payments / PCI minimization      | 7.8       | Stripe Checkout + signed webhooks; no PAN in schema            |
| Application security (auth/HTTP) | 7.2       | MFA, session rotation, lockout, Helmet, CORS allowlist         |
| SDLC / CI                        | 5.5       | Tests + Dependabot + OIDC wiring; no SAST; Trivy staging-only  |
| Data protection                  | 5.0       | AES-GCM for 2FA/OAuth; CV JSONB plaintext; AI history retained |
| Detection & incident response    | 3.5       | Playbook exists; contacts empty; SIEM/alerts not wired         |
| Security governance              | 3.0       | Unsigned policies; no org; no live risk register               |
| Compliance (GDPR/ISO/SOC)        | 2.8       | DPIA skeleton; no DSAR export; no public privacy policy        |
| Production infrastructure        | 2.5       | Terraform/Helm/WAF/KMS are scaffolds, not provisioned          |

**Launch posture:** the 13 August GO/NO-GO remains **NO-GO for public production**. Several P0 items from that review are still open (`POST /templates/seed` is `@Public()`, `POST /cvs/export/pdf` is `@Public()` and accepts HTML up to 10 MB, GDPR erase is a soft-delete that claims `purgeScheduled` with no worker).

### Top 5 risks

| ID      | Risk                                                                               | Score (L×S)  | Priority |
| ------- | ---------------------------------------------------------------------------------- | ------------ | -------- |
| SEC-001 | Unauthenticated Chromium PDF render (HTML ≤10 MB)                                  | 4×5 = **20** | P0       |
| SEC-003 | GDPR rights not implemented (no export, no hard purge, no Stripe cancel on delete) | 5×4 = **20** | P0       |
| SEC-023 | No public privacy policy / ToS; DPIA unsigned; DPO vacant                          | 5×4 = **20** | P0       |
| SEC-010 | Incident response unexecutable (empty contacts, no on-call, no SIEM)               | 5×4 = **20** | P0       |
| SEC-008 | Career PII sent to LLMs and stored in `AiHistory` with no TTL                      | 4×4 = **16** | P0       |

### Key recommendations

1. Do not expose a public origin until P0 perimeter issues (PDF, template seed, JWT fail-closed already present) and legal minimum (privacy/ToS, DSAR) are closed.
2. Treat `docs/SECURITY-CV-STUDIO-AI.md` as a **target-state program**, not as current control evidence. Align ADR-016 claims (RS256, RLS, KMS, Shield) with code or mark them explicitly “not implemented”.
3. Appoint accountable owners (CISO/security lead, DPO, platform owner) and fill IR contact roster before any EU user data is collected.
4. Finish GDPR: real export, hard-delete + Stripe cancel, AI retention job, signed DPIA.
5. Provision a real non-prod/prod AWS perimeter (WAF, private DB, Secrets Manager) before GA — current IaC cannot create it.

### Resource requirements (indicative)

| Need                                            | Estimate          | Why                                                         |
| ----------------------------------------------- | ----------------- | ----------------------------------------------------------- |
| Named security lead (fractional CISO OK pre-GA) | 0.3–0.5 FTE       | Policy ownership, vendor DPAs, IR                           |
| DPO / privacy counsel (external OK)             | retainer          | GDPR Art. 37/35 before EU GA                                |
| Platform/DevOps                                 | 1 FTE equivalent  | Real VPC, RDS encryption, WAF, secrets                      |
| AppSec engineering                              | 2–3 weeks focused | PDF auth, seed lock, GDPR jobs, RLS or documented exception |
| External pentest                                | budget pre-GA     | ASVS L2 claim is otherwise unverifiable                     |
| Cyber insurance                                 | quote at GA       | Transfer residual breach cost                               |

---

## 2. Governance assessment

### 2.1 Security organization

| Item                                | Status                   | Evidence                                                                                |
| ----------------------------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| CISO / Security Lead                | **Vacant**               | Approval block in `SECURITY-CV-STUDIO-AI.md` §22 is blank                               |
| Security team size/roles            | **Not staffed**          | RACI lists functions (CISO, Eng, Platform, Legal, Support), not people                  |
| Reporting lines                     | **Undefined**            | No org chart, no board reporting cadence in force                                       |
| Approval authorities                | **Documented, unsigned** | CISO “owns exceptions” in ADR-016; no signed exceptions exist                           |
| Cross-functional security committee | **Missing**              | No meeting cadence, minutes, or charter                                                 |
| CODEOWNERS                          | **Placeholder**          | `.github/CODEOWNERS` uses `@cvstudio-security` etc. — “adjust GitHub handles before GA” |

**Finding G-01 — No accountable security officer**  
Severity: **Critical** · Component: Governance  
Without a named owner, policies cannot be enforced, incidents cannot be commanded, and GDPR 72-hour notification cannot be executed.  
**Recommendation:** appoint a security lead (founder + fractional CISO is acceptable pre-GA) and a DPO/privacy counsel before collecting EU personal data. Effort: organizational, 1–5 days.  
**Risk if not fixed:** unowned P1 incident; supervisory-authority failure.

Roles that exist **on paper only**: AppSec, infra security, compliance, TPRM, IR team. Engineering implements controls; there is no second-line risk function.

### 2.2 Awareness and training

| Program                               | Status                                          |
| ------------------------------------- | ----------------------------------------------- |
| Mandatory developer security training | **Not evidenced**                               |
| OWASP awareness                       | Docs exist; no completion tracking              |
| Secure coding training                | `CONTRIBUTING.md` covers lint/tests, not AppSec |
| IR tabletop drills                    | Playbook says bi-annual; **no records**         |
| Executive/board briefings             | **Not evidenced**                               |

### 2.3 Policies and procedures

A relatively complete **target-state** pack exists and is version-controlled in git:

| Policy / procedure                     | Location                                         | Documented | Reviewed                                  | Technically enforced                                    | Metrics                 |
| -------------------------------------- | ------------------------------------------------ | ---------- | ----------------------------------------- | ------------------------------------------------------- | ----------------------- |
| Information security (master)          | `docs/SECURITY-CV-STUDIO-AI.md` v1.0 26 Jul 2026 | Yes        | Cadence stated (quarterly); no review log | Partial (app)                                           | KPI table, not measured |
| Access control (RBAC, MFA, privileged) | same + ADR-016                                   | Yes        | —                                         | MFA optional for users; **no RolesGuard**; no admin JIT | MFA adoption KPI unused |
| Data protection / privacy              | SECURITY §11 + DPIA outline                      | Draft      | —                                         | Soft-delete only                                        | GDPR SLA unused         |
| Incident response                      | `docs/security/INCIDENT-RESPONSE.md`             | Yes        | —                                         | Contacts **empty**                                      | MTTD/MTTR unused        |
| Vulnerability / patching               | SECURITY §14.4                                   | Yes        | —                                         | Dependabot yes; Critical≤7d not enforced                | —                       |
| Third-party / vendor risk              | DPA list in SECURITY §11.1                       | Intent     | —                                         | No vendor inventory, no SOC2 reviews on file            | —                       |
| Change / release                       | `docs/runbooks/production-deploy.md`             | Yes        | —                                         | GHA environments; branch protection **not proven**      | —                       |
| Code review                            | CONTRIBUTING + CODEOWNERS                        | Partial    | —                                         | No in-repo required-review proof                        | —                       |
| Deployment                             | `cd-prod.yml` blue-green                         | Partial    | —                                         | Depends on non-existent EKS evidence                    | —                       |

**Finding G-02 — Policy–control drift**  
Severity: **High** · Component: Governance  
ADR-016 and the CISO plan claim RS256/ES256, PostgreSQL RLS, KMS envelope encryption, CloudFront+WAF+Shield, Secrets Manager. Code uses HS256, app-layer ownership checks, env-based `ENCRYPTION_KEY`, and local Docker. Publishing those docs as “baseline accepted” overstates assurance.  
**Recommendation:** add an implementation status column (Implemented / Partial / Target) to the security plan; stop citing ASVS L2 as achieved. Effort: 4–8 hours docs + backlog tickets.

### 2.4 Compliance requirements

| Framework          | Applicability                                               | Status                                                                                                                                     |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **GDPR**           | Yes if any EU user or EU targeting                          | **Not ready** — DPIA skeleton, no DPO, no Art. 15/17/20 APIs, no public privacy notice                                                     |
| **CCPA/CPRA**      | Possible (global SaaS)                                      | **Not addressed**                                                                                                                          |
| **NIST CSF 2.0**   | Voluntary alignment claimed                                 | Identify/Protect partial; Detect/Respond/Recover mostly paper                                                                              |
| **ISO 27001**      | Roadmap M18–M24                                             | **Not started** as ISMS (no SoA, no internal audit, no management review)                                                                  |
| **SOC 2 Type II**  | Not claimed                                                 | No trust-service criteria program                                                                                                          |
| **HIPAA**          | Not intended (ToS: no health data)                          | Residual: users may paste health data into CVs — no detection                                                                              |
| **PCI-DSS**        | Card data **not stored**; Stripe Checkout for subscriptions | Likely **SAQ A** for Checkout; marketplace PaymentIntents may pull scope to **SAQ A-EP** if Elements is used — **confirm with QSA/Stripe** |
| **Africa / local** | CinetPay + African users                                    | Data-residency and local privacy laws (e.g. Kenya DPA, NDPR Nigeria) **not assessed**                                                      |

**Obligations vs implementation**

| Obligation           | Required                        | Implemented                                         |
| -------------------- | ------------------------------- | --------------------------------------------------- |
| Data residency       | SECURITY recommends `eu-west-1` | Terraform comments only; local Postgres today       |
| Audit logging        | Auth events in `audit_logs`     | Auth-only; no CV access/export/admin                |
| Breach notify 72h    | IR playbook §4                  | Cannot execute (empty Legal/DPO contacts)           |
| Retention / deletion | 30-day CV purge, ≤30d AI        | Soft-delete; **no purge job**; AI history unbounded |
| Processor DPAs       | AWS, Stripe, LLM, email, Sentry | **Not on file** in repo                             |

**Finding C-01 — GDPR launch blocker**  
Severity: **Critical** · Component: Compliance  
Collecting CVs (employment history, contact data, photos, third-party references) is high-risk processing. Art. 35 DPIA is unsigned. There is no public privacy policy (only in-app geo consent). `DELETE /users/me` sets `deletedAt` and returns `purgeScheduled: true` with **no worker**. No portability export. Account delete does not cancel Stripe.  
**Recommendation:** legal pages + DSAR export + purge job + billing cancel before any EU signup. Effort: 3–8 engineering days + legal review.

### 2.5 Risk management framework

| Element         | Status                                                  |
| --------------- | ------------------------------------------------------- |
| Methodology     | Implied NIST/OWASP in docs; **not operationalized**     |
| Scoring model   | This audit introduces L×S (1–5); no prior live register |
| Frequency       | Not scheduled                                           |
| Risk appetite   | Unstated (implicit: ship fast, ASVS L2 “target”)        |
| Board reporting | None                                                    |
| Risk owners     | Role names only                                         |

The closest artifacts are `docs/webhooks/RISK_ASSESSMENT.md` (billing) and the GO/NO-GO risk table — not a corporate risk register.

### 2.6 Security budget and resources

**Not evidenced.** No budget, tooling licenses (SIEM, DAST, WAF prod), or pentest PO in repo.

| Tooling        | Documented target             | In repo                                     |
| -------------- | ----------------------------- | ------------------------------------------- |
| SIEM           | CloudWatch/OpenSearch/Datadog | Alert catalog only (`MONITORING-ALERTS.md`) |
| WAF            | AWS WAF + CloudFront          | Terraform comments                          |
| SAST           | Semgrep OWASP                 | **Missing**                                 |
| SCA            | Dependabot/Snyk               | Dependabot **yes**                          |
| DAST           | Pen-test checklist            | **Not run**                                 |
| Container scan | Trivy                         | Staging CD only                             |
| Secrets scan   | Gitleaks                      | **Missing** in workflows                    |

Constraints: no dedicated AppSec/SecOps FTE; platform IaC unfinished; training absent; production hosting unidentified (`GO_NO_GO_DECISION.md`).

---

## 3. Architecture documentation

### 3.1 Actual architecture (code)

**Pattern:** Turborepo monorepo + **modular NestJS monolith** (ADR-002), not microservices.

| Layer                         | Technology (implemented)                                           |
| ----------------------------- | ------------------------------------------------------------------ |
| Web                           | Next.js 14 App Router, React, TypeScript, Tailwind/shadcn          |
| API                           | NestJS, Prisma, Passport JWT, Bull/Redis jobs (partial)            |
| Mobile                        | Expo / React Native (present; not GA-critical)                     |
| Admin                         | **Does not exist** (`apps/admin` absent)                           |
| Database                      | PostgreSQL (Prisma)                                                |
| Cache / rate limit / sessions | Redis                                                              |
| Queue                         | BullMQ documented; PDF currently in-process / Redis cache          |
| Message bus                   | None beyond Redis                                                  |
| CDN / WAF                     | **Not provisioned**                                                |
| Email                         | Nodemailer SMTP → Mailpit locally; SendGrid in `.env.example` only |

Trust boundaries **as designed** (SECURITY §1) vs **as running locally**:

```
Internet
  → [planned] CloudFront + WAF + Shield
  → [planned] ALB → EKS
  → Nest API (JWT, throttling, Helmet)
       → PostgreSQL (no RLS)
       → Redis (no auth in local compose)
       → Stripe / CinetPay / Google / LinkedIn / LLM vendors
  → Next.js web
  → Expo mobile
```

**Today’s perimeter** is the NestJS process + Next.js app + Docker Compose Postgres/Redis/Mailpit. There is no network segmentation, no WAF, no private subnet.

### 3.2 External dependencies

| Integration             | Status                                                 | Data                                        | Credential store (prod target vs code) |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------- | -------------------------------------- |
| Stripe                  | Implemented (Checkout, webhooks, marketplace PI)       | amounts, customer/sub IDs, webhook payloads | env / planned Secrets Manager          |
| CinetPay                | Implemented (create + server-side `/v2/payment/check`) | phone/operator payments, transaction IDs    | env                                    |
| Google OAuth            | Implemented (code + state)                             | profile/email                               | env                                    |
| LinkedIn OAuth          | Implemented                                            | profile/email                               | env                                    |
| Apple OAuth             | Stub `NOT_IMPLEMENTED`                                 | —                                           | —                                      |
| LLM (OpenAI-compatible) | Optional; heuristic fallback                           | CV text, job descriptions                   | env                                    |
| SMTP / Mailpit          | Implemented                                            | reset/verify tokens in URLs                 | env                                    |
| SendGrid / SES          | Example env only                                       | —                                           | —                                      |
| S3 / CloudFront         | Planned; no SDK usage found                            | PDFs currently in memory/Redis              | —                                      |
| Sentry                  | Wired in API + web                                     | errors; `sendDefaultPii: false`             | DSN env                                |
| PostHog                 | Wired                                                  | sanitized events + userId                   | env                                    |
| Amplitude               | ADR-018; superseded by PostHog in practice             | —                                           | —                                      |

TLS to third parties depends on Node defaults (TLS 1.2+). No cert pinning (mobile roadmap). No Vault. Rate limiting: global 120/min + auth-specific Redis limits. No IP allowlists.

### 3.3 Critical data flows (summary)

| Flow                       | Sensitivity    | Trust boundaries            | Controls present                                                  | Gaps                                                 |
| -------------------------- | -------------- | --------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| Register / login / refresh | C3 credentials | Browser → API → PG/Redis    | bcrypt 12, lockout, rate limit, refresh rotation, HttpOnly cookie | HS256; email in JWT; captcha not wired               |
| OAuth Google/LinkedIn      | C2/C3          | IdP → API                   | state CSRF, encrypted tokens at rest                              | Apple stub; account-linking edge cases need pentest  |
| CV CRUD                    | C2 career PII  | Web → API → PG              | JWT + `userId` check                                              | No RLS; JSONB plaintext                              |
| Public share `/s/:slug`    | C2             | Unauth → API                | revoke via unpublish                                              | 48-bit default slug; user-chosen URL; no 60/IP limit |
| PDF export                 | C2 + compute   | **Unauth** → Chromium       | size cap 10 MB, throttle 10/min                                   | **Public HTML-to-PDF** (SSRF/DoS/abuse)              |
| Stripe checkout            | C3 billing     | User → Stripe → webhook API | `constructEvent`, idempotency, fail-closed                        | Marketplace PI scope                                 |
| CinetPay                   | C3 billing     | User → CinetPay → notify    | re-verify via API (not HMAC body)                                 | Operator/PII in provider                             |
| AI optimize/ATS            | C2             | API → LLM vendor            | quotas by plan                                                    | Prompt stored; vendor DPA unknown                    |
| Account delete             | C2             | API → PG                    | session revoke, soft-delete                                       | No purge, no Stripe cancel, no export                |

### 3.4 Network architecture

**Not implemented.** VPC module creates an `aws_vpc` only; subnets/SGs/NAT are comments. No NetworkPolicies. Local Redis and Postgres bind host ports with default passwords (`cvstudio`/`cvstudio`, test `postgres`/`postgres`).

### 3.5 Application perimeter — entry points

| Entry                           | Auth                                  | Notes                              |
| ------------------------------- | ------------------------------------- | ---------------------------------- |
| `/api/v1/auth/*`                | Public (by design)                    | Rate-limited                       |
| `/api/v1/health`                | Public                                | Expected                           |
| `/api/v1/public/cvs/:slug`      | Public                                | Full CV JSON if published          |
| `/api/v1/templates` GET         | Public                                | Catalogue                          |
| `POST /api/v1/templates/seed`   | **Public**                            | **Mutates catalogue**              |
| `POST /api/v1/cvs/export/pdf`   | **Public**                            | Chromium render                    |
| Stripe / CinetPay webhooks      | Public + signature/verify             | Correct pattern                    |
| Marketplace public listing GETs | Public                                | Expected                           |
| Remaining REST                  | Global `JwtAuthGuard`                 | Ownership in services              |
| Next.js routes                  | Cookie/session                        | Middleware not fully reviewed here |
| Mobile                          | JWT in SecureStore                    | Both access and refresh stored     |
| Admin console                   | **N/A**                               | App missing                        |
| Swagger                         | Gated in prod unless `ENABLE_SWAGGER` | Implemented                        |

Exit points: Prisma→Postgres, Redis, Stripe/CinetPay/OAuth/LLM HTTPS, SMTP, Sentry/PostHog, filesystem/Chromium for PDF.

---

## 4. Environments & deployment topology

| Environment | URL                           | Infra                           | Data           | Access                     | SLA / DR              |
| ----------- | ----------------------------- | ------------------------------- | -------------- | -------------------------- | --------------------- |
| Local dev   | localhost                     | Docker Compose PG+Redis+Mailpit | Synthetic/seed | Any developer              | N/A                   |
| CI          | GitHub Actions                | Service containers              | Test DB        | GHA                        | N/A                   |
| Staging     | Documented `cvstudio-staging` | **Not evidenced live**          | Unknown        | GHA `environment: staging` | Unset                 |
| Production  | Documented EKS `eu-west-1`    | **Not evidenced live**          | Would be C2/C3 | GHA `production`           | RTO/RPO on paper only |
| DR          | `eu-central-1`                | Runbook only                    | —              | —                          | Unset                 |

Segregation (separate AWS accounts, DBs, secret stores): **designed**, not demonstrated.

**Local security:** no VPN requirement; no endpoint-protection standard; CONTRIBUTING does not require signed commits; branch protection not proven in-repo.

**Staging testing:** Trivy on staging image; no DAST; pentest checklist unused.

**Production access:** MFA/JIT/session recording/quarterly access review — **not applicable until prod exists**; IR on-call unnamed.

**CI/CD**

| Control                                               | Status                              |
| ----------------------------------------------------- | ----------------------------------- |
| GitHub Actions CI (lint, typecheck, test, e2e, build) | Implemented                         |
| Dependabot                                            | Implemented                         |
| OIDC to AWS in CD/terraform workflows                 | Wired                               |
| Trivy                                                 | Staging only                        |
| Cosign                                                | Staging, `\|\| true` (non-blocking) |
| SAST / Gitleaks / CodeQL                              | Missing                             |
| Image verify on prod deploy                           | Missing                             |
| Blue-green manifests                                  | Present; depend on EKS              |
| Canary                                                | Missing                             |
| Terraform apply                                       | `continue-on-error: true`           |

---

## 5. Asset inventory

### Tier 1 — critical

| Asset                     | Availability target (doc) | Sensitivity | Owner (doc) | Reality                                           |
| ------------------------- | ------------------------- | ----------- | ----------- | ------------------------------------------------- |
| Auth (JWT, sessions, MFA) | 99.9% API                 | C3          | Backend     | Implemented in API                                |
| PostgreSQL (users, CVs)   | 99.9%                     | C2/C3       | Platform    | Local/CI only evidenced                           |
| Payments Stripe/CinetPay  | 99.9% billing             | C3 refs     | Backend     | Code ready; live keys must not be used (GO/NO-GO) |
| User accounts             | —                         | C2          | Backend     | Soft-delete only                                  |

### Tier 2 — important

Email SMTP, Sentry, PostHog, Redis (sessions/rate limit/PDF cache), AI gateway, marketplace ledger.

### Tier 3

Docs, Storybook, status page (**not present**), support ticketing (**not present**).

### Single points of failure (current / designed)

| Component                   | Redundancy                          | If it fails                                 |
| --------------------------- | ----------------------------------- | ------------------------------------------- |
| Single Nest process (local) | None                                | Full outage                                 |
| Postgres                    | Designed Multi-AZ; not deployed     | Total data unavailability                   |
| Redis                       | Designed ElastiCache; local no auth | Auth rate-limit/session degradation         |
| Stripe                      | Vendor HA                           | Billing stop; entitlements freeze           |
| CinetPay                    | Vendor HA                           | Africa mobile money stop; Stripe can remain |
| LLM vendor                  | Heuristic fallback                  | AI features degrade                         |
| GitHub + OIDC               | —                                   | Cannot deploy                               |

### Dependencies / CVE process

Dependabot weekly for npm. No max-age SLA enforced in CI. No SBOM artifact in workflows (claimed CycloneDX). EOL tracking not evidenced.

### Personnel / vendors

Key-person risk is **high**: unnamed CISO/DPO/platform; no succession. Critical vendors (AWS, Stripe, CinetPay, Google, OpenAI, Sentry, PostHog, GitHub) lack a TPRM file (NDA/DPA/SOC2 review dates).

---

## 6. Sensitive data inventory

### Classification (aligned to SECURITY C0–C3)

| Class               | Examples                                                                                                        | Volume                | Retention (policy)                | Retention (code)                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------- | --------------------------------------- |
| C0 Public           | Marketing, published templates                                                                                  | Small                 | CDN OK                            | OK                                      |
| C1 Internal         | Metrics, listing metadata                                                                                       | Small                 | —                                 | Analytics events                        |
| C2 Confidential PII | Email, name, phone, DOB, CV JSONB, versions, collab snapshots, ATS/AI prompts, public shares, seller profiles   | **Primary store**     | Account life; CV 30d after delete | Soft-delete; AI unbounded               |
| C3 Restricted       | passwordHash, 2FA secret, backup codes, OAuth tokens, refresh JTI, Stripe/CinetPay ids & webhook JSON, LLM keys | Auth + billing tables | 24 months audit                   | Auth audit yes; webhook payloads stored |

### PII collected

Name, email, phone, location, DOB, bio, avatar, employment/education/skills/projects/certificates, **references (third-party PII)**, photos as URLs, IP/UA on sessions and audit logs, payment method suggestion via geo headers (consent toggle).

**Lawful basis:** documented as examples in SECURITY; **not bound to a live Record of Processing**. Consent: analytics/geo banners on web; no stored ToS acceptance except seller `tosAcceptedAt`.

**Protection:** TLS in transit (assumed Node/HTTPS when deployed). At rest: app AES-256-GCM for 2FA + OAuth tokens (`ENCRYPTION_KEY`, not KMS). CV content **not** field-encrypted. Non-prod data masking: **not implemented**. PII access audit: **auth events only**.

### PCI

No PAN/CVV columns. Subscriptions use Stripe Checkout Sessions. **Do not store cards.** Confirm marketplace UI does not mount card Elements (would change SAQ). CinetPay is alternative payment — still processor PII at vendor.

### Credentials

| Secret              | Storage                                           | Notes                                              |
| ------------------- | ------------------------------------------------- | -------------------------------------------------- |
| User passwords      | bcrypt cost 12                                    | Docs prefer argon2id                               |
| JWT                 | HS256 env secrets, ≥32 chars, fail-closed in prod | Not RS256/JWKS                                     |
| Refresh             | Signed JWT + `refreshJti` in DB/Redis             | Docs wanted opaque hashed token; TTL 7d vs doc 30d |
| TOTP                | AES-GCM                                           | Setup returns secret once (OK)                     |
| API/LLM/Stripe keys | `.env` locally                                    | Prod Secrets Manager **planned**                   |
| Default JWT strings | Blocked by `assertAuthSecrets`                    | Good hardening                                     |

### Logs

HTTP interceptor logs method, URL, userId, duration — **no body redaction**, request-id middleware **not registered**. Payment structured logs optional. Auth audit table append-style at app layer (not DB GRANT revoke of UPDATE/DELETE). No central SIEM. Retention 24 months is policy only.

### Backups / DR

RPO ≤5 min and RTO ≤1 h are **design targets** (`DR-RUNBOOK.md`). No restore drill evidence. Local Docker volumes are not a backup program.

---

## 7. Threat model (STRIDE)

### Actors

| Actor                          | Motivation                                   | Capability          | Likelihood     | Primary targets                             |
| ------------------------------ | -------------------------------------------- | ------------------- | -------------- | ------------------------------------------- |
| Script kiddies / bots          | Abuse, noise                                 | Low                 | **High**       | Public PDF, seed, auth stuffing, share enum |
| Cybercriminals                 | CV/PII resale, account takeover, promo fraud | Medium              | **High** at GA | User DB, sessions, AI cost                  |
| Competitors                    | Templates, pricing, scrape                   | Low–Med             | Medium         | Public catalogue, shares                    |
| Insider (dev with `.env` / DB) | Curiosity or malice                          | High (local access) | Low–Med        | Full PG dump                                |
| Organized crime                | Payment fraud                                | Med                 | Low–Med        | CinetPay/Stripe abuse                       |
| Nation-state                   | Unlikely at current scale                    | High                | Low            | —                                           |
| Hacktivists                    | Low relevance                                | Med                 | Low            | Defacement                                  |

### STRIDE vs assets

|              | Spoofing                                            | Tampering                    | Repudiation                               | Info disclosure                      | DoS                        | Elevation                              |
| ------------ | --------------------------------------------------- | ---------------------------- | ----------------------------------------- | ------------------------------------ | -------------------------- | -------------------------------------- |
| Auth         | Credential stuffing; HS256 key leak forges all JWTs | Session reuse (mitigated)    | Auth audit helps; CV edits weakly audited | Email in JWT                         | Login flood (rate limited) | No RolesGuard; seed is already “admin” |
| CVs          | IDOR if ownership bug                               | JSONB overwrite              | Weak                                      | Share slug, DB dump, backups         | Export flood               | Team schema unused                     |
| PDF          | N/A                                                 | HTML injection into Chromium | —                                         | SSRF/file read class (needs pentest) | **10 MB HTML public**      | N/A                                    |
| Payments     | Webhook forgery (Stripe signed; CinetPay re-check)  | Replay (idempotency)         | Stripe logs                               | Webhook payload in DB                | —                          | Entitlement skip                       |
| AI           | Quota theft via stolen JWT                          | Prompt injection             | Prompts stored                            | **Vendor + AiHistory**               | Cost bomb (quotas)         | Jailbreak                              |
| Supply chain | Compromised npm                                     | Lockfile                     | —                                         | Secrets in CI logs                   | —                          | Cosign not verified                    |

### Realistic scenarios

**S1 — Abuse of public PDF renderer (likely)**  
Unauthenticated client posts large/malicious HTML to `POST /cvs/export/pdf`. Chromium is a DoS, SSRF, or content-injection engine. Impact: origin CPU/memory exhaustion, possible SSRF to metadata/internal. Likelihood: High. Severity: Critical.

**S2 — Catalogue sabotage via public seed (likely)**  
`POST /templates/seed` is `@Public()` and upserts official templates. Impact: integrity of product catalogue; possible stored XSS if template HTML is later rendered unsafely. Likelihood: High if origin is reachable. Severity: Medium–High.

**S3 — Credential phishing of a developer (common)**  
No staff MFA policy, local `.env` holds Stripe/JWT/LLM keys. Impact: full environment compromise. Likelihood: High. Severity: Critical at GA.

**S4 — LLM / AiHistory leakage (plausible)**  
Prompts include CV bullets; stored indefinitely; vendor DPA/zero-retention unknown. Impact: processor breach or subpoena of vendor logs. Likelihood: Medium–High. Severity: High.

**S5 — GDPR complaint / regulatory (certain if EU GA now)**  
No privacy policy, incomplete erasure, no DPIA. Impact: CNIL (or local) investigation, bans, fines, forced shutdown. Likelihood: High if launched. Severity: High.

**S6 — Stripe/CinetPay compromise (low)**  
Mature Stripe; CinetPay smaller regional risk. Impact: payment fraud. Residual reduced by no PAN storage.

### Threat prioritization

| Threat                        | Likelihood       | Impact   | Priority            |
| ----------------------------- | ---------------- | -------- | ------------------- |
| Public PDF / Chromium abuse   | High             | Critical | P0                  |
| Public template seed          | High             | High     | P0                  |
| Phishing / stolen eng secrets | High             | Critical | P0                  |
| GDPR non-compliance at GA     | High             | High     | P0                  |
| AI PII retention / vendor     | Medium           | High     | P0                  |
| JWT HS256 master-secret leak  | Medium           | Critical | P1                  |
| Share-link enumeration        | Medium           | High     | P1                  |
| Supply-chain npm              | Medium           | Critical | P1                  |
| SQL injection (Prisma)        | Low              | Critical | P2 (control exists) |
| DDoS without WAF              | High (if public) | High     | P1 at GA            |
| Insider PG dump               | Low              | Critical | P2                  |
| XSS in CV HTML                | Medium           | Medium   | P2                  |

---

## 8. Risk register

**Formula:** Risk = Likelihood (1–5) × Severity (1–5).  
1–5 Low · 6–9 Medium · 10–15 High · 16–25 Critical.

Owners are **roles** because no named staff exist. Residual assumes current code.

| ID      | Description                                                       | L   | S   | Score | Pri | Current controls              | Residual           | Treatment                                        | Owner           | Timeline         |
| ------- | ----------------------------------------------------------------- | --- | --- | ----- | --- | ----------------------------- | ------------------ | ------------------------------------------------ | --------------- | ---------------- |
| SEC-001 | Unauth PDF HTML→Chromium                                          | 4   | 5   | 20    | P0  | 10 MB cap, 10/min throttle    | Critical           | Mitigate: auth or disable public; sandbox egress | Eng             | This week        |
| SEC-002 | Public `POST /templates/seed`                                     | 4   | 3   | 12    | P1  | None meaningful               | High               | Mitigate: remove `@Public()`, ops secret or CLI  | Eng             | This week        |
| SEC-003 | GDPR erase/export incomplete; Stripe not cancelled                | 5   | 4   | 20    | P0  | Soft-delete + session revoke  | Critical           | Mitigate: export job, purge, billing cancel      | Eng + Legal     | 1–2 weeks        |
| SEC-004 | Security docs claim unimplemented controls (RS256, RLS, KMS, WAF) | 5   | 3   | 15    | P1  | n/a                           | High               | Mitigate: status matrix; avoid 9.1/10 claims     | CISO (vacant)   | This week        |
| SEC-005 | Production AWS/WAF/KMS/backups not provisioned                    | 5   | 5   | 25*   | P0  | Local Docker only             | Critical **if GA** | Avoid GA; build perimeter                        | Platform        | Before GA        |
| SEC-006 | Symmetric JWT (HS256); email in access token                      | 3   | 4   | 12    | P1  | Fail-closed secrets, 15m TTL  | High               | Mitigate: RS256/JWKS; strip email                | Eng             | 2–4 weeks        |
| SEC-007 | RLS designed, not in migrations                                   | 3   | 5   | 15    | P1  | Service `userId` checks       | High               | Mitigate: apply RLS or accept + extra IDOR tests | Eng + DBA       | 1–3 months       |
| SEC-008 | AiHistory + LLM egress unbounded                                  | 4   | 4   | 16    | P0  | Plan quotas                   | Critical           | Mitigate: TTL 30d, DPA, redact logs              | Eng + Legal     | 2–4 weeks        |
| SEC-009 | No SAST/secret-scan in CI                                         | 4   | 3   | 12    | P1  | Dependabot, tests             | High               | Mitigate: CodeQL/Semgrep + Gitleaks              | Platform        | 2 weeks          |
| SEC-010 | IR playbook contacts empty; no SIEM                               | 5   | 4   | 20    | P0  | Paper playbook                | Critical           | Mitigate: roster, paging, wire SEC-01..10 alerts | CISO + Platform | Before any prod  |
| SEC-011 | Share slug 48-bit / user-chosen                                   | 3   | 4   | 12    | P1  | Unpublish                     | High               | Mitigate: opaque 128-bit token; rate limit 60/IP | Eng             | 2–4 weeks        |
| SEC-012 | Delete account leaves billing active                              | 4   | 4   | 16    | P0  | Soft-delete                   | Critical           | Mitigate: Stripe cancel + CinetPay stop          | Eng             | This week        |
| SEC-013 | No bulk-export control / CV access audit                          | 2   | 5   | 10    | P1  | Auth audit only               | High               | Mitigate: audit CV read/export; anomaly alerts   | Eng             | 1–3 months       |
| SEC-014 | Unsigned images; Cosign non-blocking                              | 3   | 5   | 15    | P1  | Trivy staging                 | High               | Mitigate: verify signatures on prod deploy       | Platform        | Before GA        |
| SEC-015 | Staff phishing; no admin MFA hardware policy                      | 4   | 4   | 16    | P0  | User TOTP optional            | Critical           | Mitigate: IdP SSO+MFA for GitHub/AWS             | CISO            | 2–4 weeks        |
| SEC-016 | `ENCRYPTION_KEY` in env, not KMS                                  | 3   | 4   | 12    | P1  | AES-GCM app                   | High               | Transfer/mitigate: SM + CMK                      | Platform        | Before GA        |
| SEC-017 | RequestIdMiddleware unwired; HTTP logs unredacted                 | 4   | 3   | 12    | P1  | Partial PostHog sanitize      | High               | Mitigate: register middleware; redact            | Eng             | 1 week           |
| SEC-018 | No external pentest / ASVS verification                           | 5   | 3   | 15    | P1  | Internal checklists           | High               | Mitigate: hire pentest pre-GA                    | CISO            | Pre-GA           |
| SEC-019 | CinetPay notify not HMAC (API re-check)                           | 2   | 4   | 8     | P2  | Server-side check             | Medium             | Accept with monitoring PAY-01..03                | Eng             | Backlog          |
| SEC-020 | Weak compose passwords reused in CI                               | 3   | 3   | 9     | P2  | Local/CI only                 | Medium             | Mitigate: never copy to shared staging           | Platform        | Policy now       |
| SEC-021 | Mobile stores access token in SecureStore                         | 3   | 3   | 9     | P2  | OS encryption                 | Medium             | Mitigate: memory-only access token               | Mobile          | 1–3 months       |
| SEC-022 | No NetworkPolicy / IRSA when EKS appears                          | 3   | 5   | 15    | P1  | Pod security on api.yaml only | High               | Avoid deploy without them                        | Platform        | With EKS         |
| SEC-023 | No public privacy/ToS; DPIA unsigned                              | 5   | 4   | 20    | P0  | In-app geo consent            | Critical           | Mitigate: legal pages + DPO sign-off             | Legal           | This week        |
| SEC-024 | Special-category data in CVs (health) undetected                  | 3   | 4   | 12    | P1  | ToS intent                    | High               | Mitigate: ToS + optional classifiers             | Legal + Eng     | 1–3 months       |
| SEC-025 | Team/tenant tables without API isolation                          | 2   | 4   | 8     | P2  | Feature unused                | Medium             | Avoid shipping collab until AuthZ done           | Eng             | Before collab GA |

\*SEC-005 scores 25 only if production is declared; as a **current** development repo the treatment is **Avoid public GA**.

### Heat map (likelihood ↓ / severity →)

|                 | Low (2) | Medium (3)                | High (4)                           | Critical (5)              |
| --------------- | ------- | ------------------------- | ---------------------------------- | ------------------------- |
| Very likely (5) | —       | SEC-004, SEC-018          | SEC-003, SEC-010, SEC-023          | SEC-005 (if GA)           |
| Likely (4)      | —       | SEC-002, SEC-009, SEC-017 | SEC-008, SEC-012, SEC-015          | SEC-001                   |
| Possible (3)    | —       | SEC-020, SEC-021          | SEC-006, SEC-011, SEC-016, SEC-024 | SEC-007, SEC-014, SEC-022 |
| Unlikely (2)    | —       | SEC-019, SEC-025          | —                                  | SEC-013                   |

---

## 9. Recommendations

### Priority 1 — this month (block public GA)

1. Authenticate or disable `POST /cvs/export/pdf`; deny arbitrary HTML from anonymous users; lock Chromium egress.
2. Remove `@Public()` from `POST /templates/seed` (CLI or authenticated ops only).
3. Publish `/privacy` and `/terms`; complete DPIA sign-off; appoint DPO/counsel.
4. Implement DSAR export; hard-purge job; cancel Stripe (and CinetPay) on `deleteMe`; stop advertising `purgeScheduled` until true.
5. Fill IR roster; enable paging for refresh-reuse and webhook-signature failures.
6. Add AI prompt TTL (≤30 days) and vendor DPA/zero-retention clause.
7. Keep Stripe **test mode**; do not attach live keys to an unhosted stack.
8. Staff MFA on GitHub/AWS; forbid default JWT/encryption strings (already fail-closed — keep it).

### Priority 2 — within 3 months

1. RS256/JWKS; remove email from JWT.
2. Apply RLS **or** formal risk acceptance + expanded IDOR suite.
3. SAST + Gitleaks in CI; Trivy+Cosign verify on prod path.
4. Opaque share tokens + dedicated public rate limit.
5. Wire `RequestIdMiddleware`; redact URLs/query in logs; audit CV export/delete.
6. Real staging AWS account: encrypted RDS, Redis AUTH, Secrets Manager, WAF.
7. Confirm PCI SAQ with Stripe (Checkout vs Elements).
8. External pentest against staging; retire “ASVS L2 achieved” language until retest.

### Priority 3 — within 6 months

1. ISO 27001 gap assessment; vendor TPRM pack; cyber insurance.
2. Passkeys / WebAuthn (already on security roadmap).
3. Field encryption or tokenized photos; S3 SSE-KMS if uploads ship.
4. Admin console with hardware MFA and no silent impersonation.
5. Mobile access-token memory-only; certificate pinning evaluation.
6. Tabletop IR + backup restore drill with evidence.

### Priority 4 — backlog

1. Argon2id migration; Apple OAuth; mTLS mesh; Shield Advanced; bug bounty; CCPA addendum; African privacy-law mapping.

---

## 10. Compliance gaps (summary)

| Control area           | GDPR                     | CCPA    | ISO 27001             | ASVS L2                        |
| ---------------------- | ------------------------ | ------- | --------------------- | ------------------------------ |
| Lawful basis / notices | Fail                     | Fail    | A.5 policies unsigned | V8 privacy — fail              |
| DSAR / deletion        | Fail                     | Fail    | A.8 asset deletion    | V9 — fail                      |
| DPIA                   | Draft                    | n/a     | Risk assessment       | —                              |
| Encryption in transit  | Intent                   | Intent  | A.8.24                | Partial (no prod TLS evidence) |
| Encryption at rest     | Partial (2FA/OAuth only) | Partial | Partial               | V6/V8 partial                  |
| Access control         | App-layer                | —       | RBAC incomplete       | V4 partial (no RLS)            |
| Logging / monitoring   | Auth only                | —       | A.8.15 weak           | V7 partial                     |
| SDLC                   | Tests yes, SAST no       | —       | A.8.25 partial        | V14 partial                    |
| IR                     | Paper                    | —       | A.5.24 incomplete     | V7 fail operationally          |
| Supplier security      | None on file             | —       | A.5.19 fail           | V1.4 fail                      |

**Audit findings count (this engagement):** 8 Critical / 14 High / 4 Medium governance-or-control items in the register (P0/P1/P2). No Low items opened as separate IDs.

---

## 11. Findings (structured)

**FINDING: Unauthenticated Chromium PDF endpoint**  
Severity: Critical · Component: API (`CvExportController`)  
Description: `POST /cvs/export/pdf` is `@Public()` and accepts `html` up to 10 MB.  
Impact: DoS, SSRF, abuse of compute, possible data exfil patterns — classic untrusted-HTML-to-headless-browser risk.  
Evidence: `apps/api/src/modules/cvs/export/export.controller.ts`.  
Recommendation: Require auth (or signed guest token with strict allowlist); never pass raw HTML from anonymous clients; network-deny the renderer.  
Effort: 4–16 hours.  
Risk if not fixed: Trivial to exploit once the API is on the internet.

**FINDING: Public template seed**  
Severity: High · Component: API  
Description: `POST /templates/seed` remains `@Public()` after the 13 Aug GO/NO-GO called it P0.  
Impact: Integrity of official templates.  
Evidence: `apps/api/src/modules/templates/templates.controller.ts`.  
Recommendation: AuthZ or delete the HTTP route.  
Effort: 1–2 hours.

**FINDING: GDPR erasure is a false completion signal**  
Severity: Critical · Component: API + Compliance  
Description: `deleteMe` sets `deletedAt` and returns `purgeScheduled: true` with no job; Stripe subscription not cancelled.  
Impact: Unlawful continued processing and charging.  
Evidence: `apps/api/src/modules/users/users.service.ts`.  
Recommendation: Implement purge worker + billing cancel; do not return `purgeScheduled` until queued.  
Effort: 2–5 days.

**FINDING: ASVS L2 / 9.1 score overstated**  
Severity: High · Component: Governance  
Description: Target-state docs and a numeric score are treated as current posture. RLS, RS256, KMS, WAF, SAST, DPIA, pentest are not done.  
Impact: Leadership under-invests; customers/regulators misled if the score is published.  
Evidence: ADR-016 vs `auth.module.ts` (HS256); `docs/sql/003_rls.sql` not in Prisma migrations.  
Recommendation: Separate “control target” from “control operating”. Recalibrate score to ~4.8 overall / ~7.2 AppSec-only.  
Effort: documentation + communication.

**FINDING: Request ID middleware dead code**  
Severity: Medium · Component: API  
Description: `RequestIdMiddleware` exists but is not registered on `AppModule`.  
Impact: Cannot correlate incidents; IR and GDPR investigations weaker.  
Recommendation: Register globally.  
Effort: <1 hour.

**FINDING: Infrastructure is a blueprint**  
Severity: Critical (for GA) · Component: Infrastructure  
Description: Terraform modules are comments; Helm deferred; no NetworkPolicy/IRSA/WAF resources.  
Impact: No production confidentiality/availability controls at the network layer.  
Evidence: `infrastructure/terraform/modules/*`, `infrastructure/helm/cvstudio/README.md`.  
Recommendation: Do not declare production until a minimal encrypted RDS + private API + WAF path exists.  
Effort: weeks of platform work.

---

## Appendix A — Assessment checklist status

| Approach item                                                 | Result                                                                                               |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Interview CISO / CTO / PM / DBA / DevOps / Compliance / Legal | **Not possible** — roles vacant / unnamed                                                            |
| Review security policies                                      | Complete (git docs)                                                                                  |
| Architecture / deploy / IR docs                               | Complete                                                                                             |
| Incident logs 12 months                                       | **None** (no prod)                                                                                   |
| Access control lists / IAM                                    | Not in AWS evidence                                                                                  |
| Source code security-relevant paths                           | Sampled (auth, payments, export, users, http-security, CI, TF)                                       |
| Attempt API bypass / exploits                                 | **Not performed** (audit only)                                                                       |
| Secrets in git                                                | `.env` files exist locally (untracked); examples use placeholders; **do not commit** `apps/api/.env` |
| Encryption verification                                       | Code review only (AES-GCM util, bcrypt, Helmet HSTS default)                                         |

## Appendix B — Regulatory references

- GDPR Arts. 5, 6, 15–22, 28, 32–35, 37
- OWASP ASVS 4.0 Level 2 (target, not attested)
- OWASP Top 10 2021 mapping in SECURITY §2 (aspirational vs code)
- NIST CSF 2.0 (Identify/Protect/Detect/Respond/Recover)
- PCI DSS v4.0 — SAQ A vs A-EP scoping
- ISO/IEC 27001:2022 Annex A (future)

## Appendix C — Evidence index

- `docs/SECURITY-CV-STUDIO-AI.md`, `docs/adr/016-security-baseline.md`
- `docs/security/INCIDENT-RESPONSE.md`, `GDPR-DPIA-OUTLINE.md`, `MONITORING-ALERTS.md`
- `docs/pre-launch/GO_NO_GO_DECISION.md` (13 Aug 2026)
- `apps/api/src/modules/auth/*`, `common/http-security.ts`, `users.service.ts`
- `apps/api/prisma/schema.prisma`
- `.github/workflows/*`, `infrastructure/terraform/`, `infrastructure/k8s/`

## Appendix D — Interview notes

None. This audit is documentary and technical. A follow-up with founders should confirm: legal entity, DPO, hosting decision, insurance, and whether any AWS account already exists outside the repo.

---

_End of report. Recalibrated overall posture: **4.8/10**. Application-layer hardening is real; governance, compliance, and production perimeter are not. Do not equate a security *plan* with a security *program*._
