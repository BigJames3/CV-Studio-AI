# CV Studio AI — Incident Response Playbook

**Owner:** CISO  
**On-call:** Platform + Backend primary · CISO for P1/P2 security  
**Related:** [SECURITY-CV-STUDIO-AI.md](../SECURITY-CV-STUDIO-AI.md)

---

## 1. Detection sources

- WAF / Shield / CloudWatch alarms
- SIEM rules (auth anomalies, refresh reuse, export spikes)
- Sentry / error budgets
- Stripe Radar / webhook failures
- User reports / support
- Researcher / bug bounty

**Declare incident** if confidentiality, integrity, or availability of customer data or core auth/billing is impacted — or suspected.

---

## 2. Severity

| Sev    | Definition                                                       | Examples                              | Notify                              |
| ------ | ---------------------------------------------------------------- | ------------------------------------- | ----------------------------------- |
| **P1** | Active exploit or confirmed mass PII exposure / RCE / ransomware | CV database dump, stolen signing keys | CISO, CTO, Legal, Comms — immediate |
| **P2** | Targeted account compromise or limited PII leak                  | Credential stuffing success wave      | CISO, Eng lead                      |
| **P3** | Vulnerability high, no evidence of exploit                       | IDOR found internally                 | Eng owner                           |
| **P4** | Low / defense-in-depth                                           | Missing header                        | Backlog                             |

---

## 3. Response phases (NIST)

### 3.1 Identify

1. Create incident channel `#inc-YYYYMMDD-shortname`
2. Assign **Incident Commander (IC)** + scribe
3. Record: detection time, reporter, symptoms, systems, customer impact hypothesis
4. Preserve evidence: logs, snapshots — **do not wipe** without IC approval

### 3.2 Contain

| Scenario                     | Immediate actions                                    |
| ---------------------------- | ---------------------------------------------------- |
| Stolen JWT signing key       | Rotate keys; invalidate sessions; force re-login     |
| Refresh token theft campaign | Revoke families; enable step-up MFA                  |
| IDOR / data leak endpoint    | Feature flag kill / WAF block path / hotfix          |
| Stripe webhook abuse         | Rotate `whsec`; replay protection check              |
| LLM key leak                 | Rotate vendor key; audit spend                       |
| Ransomware / host compromise | Isolate node/ASG; preserve forensics volume          |
| DDoS                         | Enable Shield/WAF emergency rules; degrade AI/export |

### 3.3 Eradicate

- Patch root cause
- Rotate **all** potentially exposed secrets (assume blast radius)
- Rebuild compromised nodes from known-good images

### 3.4 Recover

- Gradual traffic restore (canary)
- Verify AuthZ + RLS smoke tests
- Monitor elevated 24–72 h

### 3.5 Lessons learned

- Postmortem blameless ≤ 5 business days (P1/P2)
- Track actions in Sec backlog with owners/dates

---

## 4. GDPR / breach notification

Trigger assessment if personal data breach likely:

1. DPO / Legal within **1 hour** of P1/P2 personal data suspicion
2. Document: nature, categories, approx data subjects, consequences, measures
3. If risk to rights/freedoms: notify supervisory authority **≤ 72 hours**
4. High risk to users: communicate without undue delay (clear language, no marketing)
5. Keep breach register (Art. 33.5)

---

## 5. Communication templates (internal)

**P1 kickoff:**

> INCIDENT P1 declared. IC=@… Channel=#inc-… Symptom=… Suspected impact=… DO NOT discuss externally. Preserve logs.

**Customer status (Comms only):**  
Facts known · what we did · what users should do (reset password / revoke shares) · next update time.

---

## 6. Contacts

See **[IR_ROSTER.md](./IR_ROSTER.md)** for paging env vars. Checklist: [INCIDENT-RESPONSE-PLAYBOOK.md](./INCIDENT-RESPONSE-PLAYBOOK.md). Notify: [BREACH-NOTIFICATION.md](./BREACH-NOTIFICATION.md).

| Role               | Primary                               | Backup            |
| ------------------ | ------------------------------------- | ----------------- |
| Incident commander | Engineering lead (interim)            | Founder           |
| CISO               | Vacant — founder interim              | —                 |
| DPO / Legal        | privacy@cvstudio.ai                   | legal@cvstudio.ai |
| Stripe             | Dashboard (test mode until prod host) | —                 |
| Paging             | `IR_WEBHOOK_URL` + Sentry             | —                 |

---

## 7. Tabletop exercises

- Cadence: **bi-annual**
- Scenarios: CV dump via IDOR · OAuth account takeover · ransomware on worker · LLM key abuse · insider export

Checklist after tabletop: gaps → update this playbook.

---

## 8. Evidence & legal hold

- Export SIEM window ± 7 days around incident
- Snapshot RDS / S3 versions if data integrity questioned
- Chain of custody log for forensic images
