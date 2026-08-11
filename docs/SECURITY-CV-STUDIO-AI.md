# CV STUDIO AI — PLAN SÉCURITÉ COMPLET

## Chief Information Security Officer (CISO) — Document de référence

| Métadonnée         | Valeur                                                        |
| ------------------ | ------------------------------------------------------------- |
| **Classification** | Interne — Confidentiel                                        |
| **Version**        | 1.0                                                           |
| **Date**           | 26 juillet 2026                                               |
| **Owner**          | CISO                                                          |
| **Review cadence** | Trimestrielle + post-incident                                 |
| **Alignement**     | PRD · Architecture · Database (RLS) · API · Web · Mobile · AI |
| **Cadres**         | OWASP ASVS L2 · NIST CSF 2.0 · ISO 27001 controls map · GDPR  |

---

## 0. Résumé exécutif

CV Studio AI traite des **données personnelles sensibles de carrière** (CV, emails, éventuellement documents d’identité via OCR, paiements via Stripe). Le risque principal n’est pas seulement la disponibilité : c’est la **fuite de CV / PII**, l’**abus d’IA** (injection / exfiltration via prompts), et la **fraude billing**.

### Objectifs sécurité (24 mois)

| Objectif        | Cible                                                  |
| --------------- | ------------------------------------------------------ |
| Confidentialité | Zéro fuite mass PII ; chiffrement at-rest + in-transit |
| Intégrité       | AuthZ forte (JWT + RLS) ; audit immuable               |
| Disponibilité   | 99.9% API ; mitigation DDoS L3–L7                      |
| Conformité      | GDPR ready (DPA, DPIA, droits sujets) avant GA EU      |
| Détection       | MTTD < 15 min (critiques) · MTTR < 4 h (P1)            |

### Principes

1. **Defense in depth** — edge → API → app → DB → KMS
2. **Least privilege** — IAM, RLS, entitlements
3. **Secure by default** — deny-by-default, fail closed
4. **Zero trust interne** — mTLS service-to-service, pas de trust réseau
5. **Privacy by design** — minimisation, rétention courte IA, droit à l’effacement

---

## 1. Threat model (STRIDE)

| Asset                        | Menaces principales                 | Mitigations                                            |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------ |
| Comptes utilisateurs         | Credential stuffing, session hijack | Argon2id, MFA, refresh rotation, device binding soft   |
| Contenu CV (JSONB)           | IDOR, dump SQL, backup leak         | RLS, object-level AuthZ, encrypted backups, KMS        |
| Tokens JWT / refresh         | Theft XSS / mobile malware          | HttpOnly cookies web, SecureStore mobile, short TTL    |
| Secrets Stripe / LLM         | Repo leak, env dump                 | Secrets Manager, no CI logs, rotation                  |
| Jobs PDF / AI                | SSRF, prompt injection, cost abuse  | Allowlist, sandboxed Chromium, quotas, guardrails      |
| Webhooks Stripe              | Forgery                             | Signature verify, idempotency                          |
| Partages publics `/s/:token` | Enumeration                         | Unpredictable tokens, rate limit, revoke               |
| Mobile offline DB            | Device theft                        | OS disk encrypt, SecureStore tokens, optional app lock |

### Trust boundaries

```
Internet → CloudFront/WAF → ALB → API (Nest) → Redis / PG / S3 / Workers
                              ↘ AI Gateway → LLM vendors (egress allowlist)
Mobile/Web → OAuth IdPs (Google/Apple)
Stripe → Webhook endpoint (signed)
```

---

## 2. OWASP Top 10 (2021) — Mapping CV Studio AI

| #                                     | Risque                                                         | Exposition produit                                                                | Contrôles obligatoires | Owner |
| ------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------- | ----- |
| **A01 Broken Access Control**         | IDOR `/cvs/:id`, collab, shares                                | JWT scopes + ownership checks + **PostgreSQL RLS** ; tests automatisés IDOR       | Backend                |
| **A02 Cryptographic Failures**        | CV at rest, secrets 2FA, backups                               | TLS 1.2+ ; AES-256-GCM app-level champs sensibles ; RDS encryption ; S3 SSE-KMS   | Platform               |
| **A03 Injection**                     | SQL (Prisma), NoSQL Redis keys, **prompt injection**, HTML PDF | Prisma paramétré ; prompt guardrails ; sanitize HTML templates ; Chromium sandbox | Backend + AI           |
| **A04 Insecure Design**               | Free abuse, AI cost bombs                                      | Entitlements, quotas, abuse playbooks, threat model reviews                       | CISO + PM              |
| **A05 Security Misconfiguration**     | Swagger public prod, CORS *, debug                             | Hardened baselines, CIS EKS, deny default SG, `/docs` gated                       | Platform               |
| **A06 Vulnerable Components**         | npm/Nest/Expo CVEs                                             | Dependabot/Snyk, CI fail on Critical, SBOM                                        | Eng                    |
| **A07 Auth Failures**                 | JWT weak, no MFA, refresh reuse                                | Voir §4–§5 ; lockout progressif ; anomaly login                                   | Backend                |
| **A08 Software & Data Integrity**     | Poisoned deps, unsigned webhooks                               | Lockfile, Cosign images, Stripe signature, CI provenance                          | Platform               |
| **A09 Logging & Monitoring Failures** | Pas d’audit delete CV                                          | Audit log partitionné + SIEM ; alertes                                            | SecOps                 |
| **A10 SSRF**                          | Export URL / OCR fetch                                         | Block private IP ranges, allowlist schemes, metadata IP deny (AWS)                | Backend                |

### ASVS cible

- **Production GA** : OWASP ASVS **Level 2**
- Paiements / admin : contrôles Level 3 sélectifs (session, crypto, logging)

---

## 3. Data classification & encryption (AES-256)

### 3.1 Classification

| Classe                  | Exemples                                                                 | Contrôles                       |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------- |
| **C0 Public**           | Templates marketing, pricing                                             | CDN cache OK                    |
| **C1 Internal**         | Metrics agrégées                                                         | Accès staff limité              |
| **C2 Confidential PII** | Email, nom, CV content, phone                                            | Encryption + RLS + audit        |
| **C3 Restricted**       | Password hashes, 2FA secrets, refresh tokens, payment refs, LLM API keys | KMS + least privilege + no logs |

### 3.2 In transit

- TLS 1.2+ (TLS 1.3 préféré) partout
- HSTS préload sur domaines apex
- mTLS ou mesh (Istio/Linkerd) entre API ↔ workers ↔ AI gateway (roadmap)
- Interdiction HTTP cleartext hors health local

### 3.3 At rest — AES-256

| Donnée                     | Mécanisme                                             | Notes                               |
| -------------------------- | ----------------------------------------------------- | ----------------------------------- |
| RDS PostgreSQL             | Storage encryption AES-256 (AWS KMS CMK)              | Obligatoire                         |
| S3 (PDF, uploads, avatars) | SSE-KMS (CMK dédiée `cvstudio-data`)                  | Bucket policies deny non-TLS        |
| Redis                      | Encryption in-transit + at-rest (ElastiCache)         | Pas de PII CV en clair longue durée |
| Backups RDS/S3             | Encrypted ; accès break-glass                         | Restore test quarterly              |
| `users.two_factor_secret`  | **AES-256-GCM** app-level, DEK via KMS                | Jamais en clair DB                  |
| Refresh tokens hash        | SHA-256 / HMAC stocké ; raw uniquement client         | Rotation famille                    |
| Mobile WatermelonDB        | Chiffrement disque OS ; tokens SecureStore / Keystore | Pas de JWT en AsyncStorage          |
| Secrets applicatifs        | AWS Secrets Manager (AES-256 KMS)                     | Pas `.env` prod                     |

### 3.4 Key management

```
CMK (KMS, rotate yearly)
  └─ DEK data-key (envelope encryption) per field/batch
       └─ Ciphertext in PG / S3
```

- Séparation CMKs : `kms-app`, `kms-backups`, `kms-secrets`
- Accès KMS via IAM roles (IRSA) — **pas** de clés longues dans pods
- Rotation secrets : 90 jours (API keys LLM) ; immédiat si leak
- Procédure destroy : crypto-shredding via disable CMK pour données obsolètes (cas extrême)

### 3.5 Password hashing

- **Argon2id** (memory ≥ 19 MiB, iterations ≥ 2, parallelism 1) — ou bcrypt cost ≥ 12 si legacy
- Pepper optionnel en KMS (HMAC avant hash) pour C3

---

## 4. JWT security

### 4.1 Token design

| Token          | TTL                    | Stockage                                                         | Contenu                                                 |
| -------------- | ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| **Access JWT** | **15 min**             | Mémoire web / SecureStore mobile                                 | `sub`, `sid`, `plan`, `amr`, `iat`, `exp`, `iss`, `aud` |
| **Refresh**    | **30 jours** (rolling) | HttpOnly Secure SameSite=Lax cookie (web) · SecureStore (mobile) | Opaque random 256-bit ; **hash en DB**                  |

### 4.2 Cryptographie JWT

- Algorithme : **RS256** ou **ES256** (pas HS256 en multi-service)
- Clés dans KMS / JWKS endpoint interne
- Rotation clés : overlap 24–48 h (`kid` header)
- Claims obligatoires : `iss=https://api.cvstudio.ai`, `aud=cvstudio`, `jti` unique
- **Interdit** dans JWT : email, CV payload, secrets, PII riche

### 4.3 Protections

- Refresh **rotation** + reuse detection → revoke **toute la famille** (`sid`)
- Logout = revoke refresh family + blacklist `jti` access restant (Redis TTL = remaining exp)
- Binding soft : `user-agent` hash / device id mobile (signal anomaly, pas hard fail day-1)
- Clock skew max 60s
- Pas de JWT dans query strings / logs / analytics

### 4.4 Endpoints auth (sécurisés)

Alignés API existante :

- `POST /auth/login` — rate limit strict + optional captcha after N fails
- `POST /auth/refresh` — cookie/body ; rotate
- `POST /auth/logout` — revoke
- `POST /auth/2fa/*` — step-up

---

## 5. OAuth 2.0 flows

### 5.1 Flows autorisés

| Client            | Flow                                      | Notes                                                    |
| ----------------- | ----------------------------------------- | -------------------------------------------------------- |
| Web (Next.js)     | **Authorization Code + PKCE**             | Google / Apple ; state + nonce OIDC                      |
| Mobile (Expo)     | **Authorization Code + PKCE**             | `expo-auth-session` ; redirect `cvstudio://` allowlisted |
| Machine (workers) | **Client credentials** (interne)          | Jamais exposé public                                     |
| **Interdit**      | Implicit, ROPC password grant pour social | —                                                        |

### 5.2 Contrôles OAuth

- Redirect URI **exact match** allowlist
- `state` cryptographically random (≥ 128 bit) ; one-time
- PKCE `S256`
- Lier compte social ↔ email vérifié (pas d’account takeover par email non vérifié)
- Scopes minimaux (`openid email profile`)
- Token IdP jamais stocké long terme sauf refresh IdP chiffré si besoin sync profil

### 5.3 Account linking threats

- Prévenir : login social sur email déjà password sans preuve → forcer link flow authentifié
- Audit event `auth.oauth.link`

---

## 6. 2FA / MFA

### 6.1 Politique

| Segment             | Exigence                                                                    |
| ------------------- | --------------------------------------------------------------------------- |
| Tous les users      | MFA **optionnel** GA ; **recommandé** post-login banner                     |
| Pro / Business      | MFA **encouragé** ; Business admin **obligatoire** (M13+)                   |
| Staff / admin panel | MFA **obligatoire** + hardware key préférée                                 |
| Actions sensibles   | **Step-up MFA** : delete account, change email, disable MFA, billing portal |

### 6.2 Méthodes

1. **TOTP** (RFC 6238) — primary (Authenticator apps)
2. **WebAuthn / Passkeys** — roadmap M12–M15 (phishing resistant)
3. Backup codes — 10 codes one-time, hashed at rest
4. SMS — **déconseillé** (SIM swap) ; uniquement fallback marché régulé si requis

### 6.3 Implémentation

- Secret TOTP : AES-256-GCM (KMS) en DB
- Fenêtre ±1 step ; rate limit verify
- Recovery : email + backup codes ; support manual IDV pour takeover (SOP)
- Events : `mfa.enable`, `mfa.disable`, `mfa.challenge.fail`

### 6.4 UX sécurité

- Ne jamais afficher secret TOTP après setup sans re-auth
- QR + manual key ; HTTPS only enrollment

---

## 7. Rate limiting & abuse prevention

### 7.1 Couches

| Couche             | Technologie              | Cible                  |
| ------------------ | ------------------------ | ---------------------- |
| Edge               | CloudFront + AWS WAF     | IP / path / bot scores |
| API gateway / Nest | Redis sliding window     | User + IP + route      |
| Application        | Entitlements + AI quotas | Plan-aware             |

### 7.2 Budgets (baseline prod)

| Route class              | Limit                     | Burst                 |
| ------------------------ | ------------------------- | --------------------- |
| `POST /auth/login`       | 5 / 15 min / IP+email     | Captcha après 3 fails |
| `POST /auth/register`    | 3 / h / IP                | —                     |
| `POST /auth/refresh`     | 30 / min / sid            | Reuse → revoke        |
| `POST /auth/2fa/verify`  | 5 / 10 min                | Lock MFA 15 min       |
| Authenticated REST read  | 120 / min / user          | 429 + `Retry-After`   |
| Authenticated REST write | 60 / min / user           | —                     |
| AI endpoints             | Plan quotas (voir AI doc) | Cost circuit breaker  |
| Export PDF               | 10 / h Free · higher Pro  | Queue fairness        |
| Public share pages       | 60 / min / IP             | Token entropy         |

Headers : `X-RateLimit-Limit`, `Remaining`, `Reset`.

### 7.3 Abuse signals

- Credential stuffing patterns → WAF managed rules + blocklist
- AI prompt flooding → per-user $ budget hard stop
- Mass CV create → entitlement Free max 1 + anomaly

---

## 8. DDoS protection

| Layer   | Contrôle                                                                 |
| ------- | ------------------------------------------------------------------------ |
| L3/L4   | AWS Shield Standard (min) ; **Shield Advanced** si ARR le justifie       |
| L7      | AWS WAF : rate-based rules, AWS Managed Core + SQLi + Known Bad Inputs   |
| CDN     | CloudFront ; cache agressif marketing / templates publics                |
| Origin  | ALB only from CloudFront prefix list ; security groups tight             |
| App     | Graceful degradation : disable AI first, then exports, keep auth+read CV |
| Runbook | Status page + traffic scrubbing contact                                  |

**Synthetic canaries** + anomaly traffic alerts (5xx rate, request surge p99).

---

## 9. Secrets management

### 9.1 Inventaire (exemples)

| Secret               | Store           | Rotation               |
| -------------------- | --------------- | ---------------------- |
| `DATABASE_URL`       | Secrets Manager | 90j + on compromise    |
| JWT signing keys     | KMS / Secrets   | 180j overlap           |
| Stripe sk / whsec    | Secrets Manager | On compromise + annual |
| LLM API keys         | Secrets Manager | 90j                    |
| OAuth client secrets | Secrets Manager | Annual                 |
| Sentry / analytics   | Secrets Manager | Annual                 |

### 9.2 Règles absolues

- **Jamais** commit `.env`, clés dans Prisma seed prod, Slack, tickets
- CI : OIDC → cloud roles (pas de long-lived AWS keys sur GitHub si possible)
- Injection runtime via CSI driver / env from Secrets Manager
- Scan pre-commit + Gitleaks in CI
- Break-glass admin credentials in sealed offline procedure

### 9.3 Developer local

- `.env.example` sans secrets
- Doppler / 1Password / `aws sso` pour le partage
- Prefixed `EXPO_PUBLIC_*` = **non-secret only**

---

## 10. Audit logging

### 10.1 Quoi logger (immuable métier)

| Event                                   | Acteur      | Objet    | Résultat                                 |
| --------------------------------------- | ----------- | -------- | ---------------------------------------- |
| `auth.login.success/fail`               | user/ip     | —        | —                                        |
| `auth.mfa.*`                            | user        | —        | —                                        |
| `cv.create/update/delete/export`        | user        | cv_id    | —                                        |
| `cv.share.create/revoke`                | user        | token_id | —                                        |
| `billing.checkout / entitlement.change` | user/system | sub_id   | —                                        |
| `admin.impersonate` (si existe)         | staff       | target   | **forbidden unless break-glass**         |
| `gdpr.export / gdpr.erase`              | user/system | user_id  | —                                        |
| `ai.invoke`                             | user        | feature  | tokens/cost (pas prompt brut long terme) |

### 10.2 Schéma & rétention

- Table `audit_logs` **partitionnée** (DATABASE doc)
- Champs : `id`, `actor_id`, `action`, `resource_type`, `resource_id`, `ip`, `ua`, `request_id`, `meta` (JSONB minimisé), `created_at`
- **Append-only** app-level ; role DB sans UPDATE/DELETE pour app user
- Rétention : **24 mois** security audit (ou exigence légale) ; export SIEM
- Corrélation : `X-Request-Id` bout-en-bout

### 10.3 Ce qu’on ne log **jamais**

- Passwords, TOTP secrets, raw refresh, Authorization headers, CV body complet, prompts PII bruts (hash/redact), cartes bancaires (Stripe gère)

---

## 11. GDPR compliance

### 11.1 Rôles

- **Controller** : entité légale CV Studio AI
- **Processors** : AWS, Stripe, LLM vendors, email provider, Sentry (DPA signés)

### 11.2 Bases légales (exemples)

| Traitement          | Base                                              |
| ------------------- | ------------------------------------------------- |
| Compte + CV storage | Contrat (ToS)                                     |
| Billing             | Contrat + obligation légale facturation           |
| Marketing email     | Consentement                                      |
| Security logs       | Intérêt légitime (minimisé)                       |
| AI improvement      | Consentement **opt-in** distinct ou anonymisation |

### 11.3 Droits sujets (API / process)

| Droit | Implémentation |
|---|---|---|
| Accès / portabilité | `GET` export ZIP JSON+PDF (job async) |
| Rectification | Editor + profile PATCH |
| Effacement | `DELETE /users/me` → soft delete → purge job (30 jours cooling) |
| Opposition marketing | Pref center |
| Restriction | Flag `processing_restricted` |

### 11.4 Rétention

| Data | Rétention |
|---|---|---|
| Compte actif | Durée contrat |
| CV soft-deleted | 30 jours puis hard delete (+ S3) |
| AI prompts/completions | **≤ 30 jours** ou redact immédiat (préféré) |
| Audit security | 24 mois |
| Invoices | 7–10 ans (compta locale) |
| Backups | rolling 35 jours max ; erasure propagates best-effort |

### 11.5 DPIA

Obligatoire avant GA EU : AI profiling léger, large PII CV scale. Outline : `docs/security/GDPR-DPIA-OUTLINE.md`.

### 11.6 Transferts hors UE

- AWS région primaire **eu-west-1** (recommandé EU customers) ou SCCs + TIA si US
- LLM : choisir région / zero-retention vendors ; contractual no-train

### 11.7 Cookies / tracking

- Consent Mode ; pas de trackers marketing avant consent
- Auth cookies : Secure, HttpOnly, SameSite

---

## 12. Application security controls (stack-specific)

### 12.1 NestJS API

- Validation globale `class-validator` whitelist
- Helmet-equivalent headers via edge + Nest
- CORS allowlist exact origins (web + mobile schemes n/a)
- Stripe webhook raw body signature
- Idempotency-Key on writes critiques
- Prisma : pas de `$queryRaw` non paramétré
- File upload : type sniff, size cap, virus scan (ClamAV / S3)
- PDF worker : network egress deny by default

### 12.2 Next.js

- CSP stricte (nonce) ; pas `unsafe-eval` prod
- Middleware auth sur `/app/*`
- Pas de secrets `NEXT_PUBLIC_*`
- XSS : React escape + sanitize si HTML template preview

### 12.3 Mobile

- Tokens SecureStore
- Certificate pinning roadmap M18
- Deep link validation
- ProGuard / Play App Signing
- Screen capture option executive

### 12.4 AI gateway

- System guardrails (déjà `docs/ai/prompts/_system-guardrails.md`)
- Input size caps ; PII scrubbing logs
- Output schema validation
- Block tools that fetch arbitrary URLs

---

## 13. Network, infra & supply chain

| Domaine      | Baseline                                                     |
| ------------ | ------------------------------------------------------------ |
| EKS          | Private nodes, IRSA, Pod Security Standards restricted       |
| Images       | Distroless/alpine minimal ; scan Trivy ; sign Cosign         |
| Terraform    | State encrypted ; PR plan reviews ; no secrets in state      |
| GitHub       | Branch protection, required reviews, signed commits optional |
| SBOM         | CycloneDX per release                                        |
| Dependencies | Renovate/Dependabot ; max age policy Critical ≤ 7j           |

---

## 14. Security monitoring & detection

### 14.1 Telemetry

- Centralized logs (CloudWatch / OpenSearch / Datadog)
- Metrics : 401/403/429 spikes, auth fail ratio, WAF blocks
- Traces : OpenTelemetry (`request_id`)
- Product security events → SIEM rules

### 14.2 Alertes P1 (pages SecOps / on-call)

| Alerte | Condition |
|---|---|---|
| Refresh token reuse | Any |
| Mass export / GDPR erase anomaly | > N / hour |
| WAF anomaly | 10× baseline |
| Secrets Manager access deny spike | Unusual principal |
| Stripe webhook signature fail burst | Possible attack |
| AI cost circuit open | Budget exceed |
| RDS CPU + connections | Possible scrape |

### 14.3 UEBA léger

- Login new country + MFA absent → challenge
- Impossible travel

### 14.4 Vulnerability management

- Weekly container + deps scan
- Quarterly external pen test (pré-GA + annuel)
- Bug bounty private (post-GA)

---

## 15. Pen testing checklist

Document opérationnel : [`docs/security/PENTEST-CHECKLIST.md`](security/PENTEST-CHECKLIST.md)

Périmètre minimum :

- AuthN/AuthZ / IDOR CV
- JWT/refresh abuse
- OAuth redirect / PKCE bypass
- MFA bypass
- Rate limit evasion
- SSRF PDF/OCR
- Prompt injection / jailbreak AI
- Webhook Stripe
- Share link enumeration
- Mobile deep link / token storage
- Tenant isolation RLS

---

## 16. Incident response

Runbook : [`docs/security/INCIDENT-RESPONSE.md`](security/INCIDENT-RESPONSE.md)

### Severities

| Sev    | Exemple                               | Response          |
| ------ | ------------------------------------- | ----------------- |
| **P1** | Fuite CV mass / RCE prod / ransomware | War room < 15 min |
| **P2** | Account takeover campaign             | < 1 h             |
| **P3** | Vuln high non-exploited               | < 1 jour ouvré    |
| **P4** | Low / informational                   | Backlog           |

### GDPR breach

Si risque pour les personnes : notification **CNIL / autorité** ≤ **72 h** ; communication users si high risk.

---

## 17. Secure SDLC

| Gate | Exigence |
|---|---|---|
| Design | Threat model pour features PII/AI/billing |
| Code | PR review ; secret scan ; SAST (Semgrep OWASP) |
| CI | Unit + IDOR tests critiques ; dependency scan |
| Deploy | Signed images ; canary ; WAF sync |
| Prod | Audit events ; feature flags kill-switch AI |

Security champions par squad ; formation phishing + OWASP annuelle.

---

## 18. Roles & RACI (extrait)

| Activité         | CISO | Eng | Platform | Legal | Support |
| ---------------- | ---- | --- | -------- | ----- | ------- |
| Security policy  | A    | C   | C        | C     | I       |
| Vuln remediation | C    | R   | R        | I     | I       |
| Pen test         | A    | C   | R        | I     | I       |
| Incident P1      | A    | R   | R        | C     | C       |
| DPA vendors      | C    | I   | C        | A     | I       |
| GDPR requests    | C    | R   | I        | A     | R       |

R=Responsible A=Accountable C=Consulted I=Informed

---

## 19. Roadmap sécurité 24 mois

| Phase | Livrables |
|---|---|---|
| **Phase 0** (now) | Ce plan · checklists · ADR baseline · secrets hygiene |
| **M0–M3** | WAF+Shield · JWT RS256+refresh rotation · RLS enforced · audit_logs · rate limits Redis · Secrets Manager |
| **M3–M6** | MFA TOTP GA · CSP strict · SAST/DAST CI · DPIA + DPA LLM/Stripe · backup restore drill |
| **M6–M9** | External pen test · SIEM alerts P1 · virus scan uploads · PDF egress lock |
| **M9–M12** | Mobile SecureStore audit · payment Legal ADR · private bug bounty |
| **M12–M18** | Passkeys · mTLS mesh · cert pinning mobile · Shield Advanced eval |
| **M18–M24** | ISO 27001 readiness · continuous red team · privacy automation |

---

## 20. KPIs sécurité

| KPI | Cible |
|---|---|---|
| Critical vulns open > 7j | 0 |
| MFA adoption (Pro) | ≥ 40% M12 · ≥ 70% M24 |
| Failed pen-test Critical | 0 à retest |
| MTTD P1 | < 15 min |
| MTTR P1 | < 4 h |
| Secrets in git | 0 |
| GDPR requests SLA | ≤ 30 jours |
| Auth fail false-block | < 0.1% legit users |

---

## 21. Documents liés

| Doc                                                   | Rôle                           |
| ----------------------------------------------------- | ------------------------------ |
| [PENTEST-CHECKLIST.md](security/PENTEST-CHECKLIST.md) | Checklist tests                |
| [INCIDENT-RESPONSE.md](security/INCIDENT-RESPONSE.md) | IR playbook                    |
| [GDPR-DPIA-OUTLINE.md](security/GDPR-DPIA-OUTLINE.md) | DPIA skeleton                  |
| [ADR-016](adr/016-security-baseline.md)               | Baseline acceptée              |
| DATABASE / API / AI / MOBILE                          | Contrôles techniques détaillés |

---

## 22. Approbations

| Rôle                | Nom | Date | Signature |
| ------------------- | --- | ---- | --------- |
| CISO                |     |      |           |
| CTO                 |     |      |           |
| Legal / DPO         |     |      |           |
| Head of Engineering |     |      |           |

---

_CV Studio AI — Security Program v1.0 — Classification: Internal Confidential_
