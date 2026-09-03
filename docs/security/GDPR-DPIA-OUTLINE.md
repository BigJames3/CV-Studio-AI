# CV Studio AI — DPIA Outline (GDPR Art. 35)

**Status:** Draft completed in [DPIA-SIGNED.md](./DPIA-SIGNED.md) — Legal/DPO signature still required before EU GA  
**Related:** [SECURITY-CV-STUDIO-AI.md](../SECURITY-CV-STUDIO-AI.md) · [DPO.md](./DPO.md)

---

## 1. Processing description

| Item                    | Draft content                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Purpose                 | Provide AI-assisted CV creation, storage, export, ATS scoring, billing             |
| Data subjects           | Job seekers (B2C), possibly employees of Business seats                            |
| Personal data           | Identity, contact, education/employment history, skills, uploaded docs, usage logs |
| Special categories      | Not intended; users must not upload health/religion data — ToS + detection soft    |
| Recipients              | AWS hosting, Stripe payments, LLM providers, email, error tracking (DPAs)          |
| International transfers | Document regions + SCCs/TIA                                                        |
| Retention               | See Security Plan §11.4                                                            |

---

## 2. Necessity & proportionality

- Minimisation: CV fields user-entered; AI logs short retention
- No sale of CV data
- Marketing separate consent
- AI training on user content: **opt-in only** or not done

---

## 3. Risks to rights & freedoms

| Risk                      | Likelihood | Impact | Mitigations                                |
| ------------------------- | ---------- | ------ | ------------------------------------------ |
| Unauthorized access to CV | M          | H      | RLS, JWT, MFA, pen tests                   |
| LLM vendor exposure       | M          | H      | DPA, zero-retention, redact logs           |
| Over-retention            | L          | M      | TTL jobs, purge                            |
| Automated decision ATS    | M          | M      | Advisory only; human confirm; transparency |
| Account takeover          | M          | H      | MFA, refresh rotation, monitoring          |

---

## 4. Consultation

- DPO review
- If residual high risk: prior consultation authority (rare if mitigations strong)

---

## 5. Sign-off

| Role    | Date | Decision                     |
| ------- | ---- | ---------------------------- |
| DPO     |      | Proceed / Conditional / Stop |
| CISO    |      |                              |
| Product |      |                              |
