# ADR-016 — Security baseline (ASVS L2 + encryption + RLS)

**Status:** Accepted  
**Date:** 2026-07-26  
**Deciders:** CISO, CTO, Principal Architect

## Context

CV Studio AI stores career PII and integrates payments + LLMs. A single security baseline is required before implementation hardens randomly.

## Decision

1. Adopt **OWASP ASVS Level 2** as product security target for GA.
2. **Encryption:** TLS in transit; AES-256 at rest (RDS/S3/ElastiCache); AES-256-GCM envelope via KMS for TOTP secrets and equivalent C3 fields.
3. **Auth:** Access JWT ≤15m (RS256/ES256) + rotating refresh; OAuth code+PKCE; MFA TOTP with step-up for sensitive actions.
4. **AuthZ:** Application checks **and** PostgreSQL RLS.
5. **Edge:** CloudFront + WAF + rate limits Redis; Shield Standard minimum.
6. **Secrets:** AWS Secrets Manager / KMS only in prod — no long-lived keys in git/CI.
7. **Privacy:** GDPR program with DPIA before EU GA; AI prompt retention ≤30 days or redact.
8. **Assurance:** Annual external pen test; IR playbook; security monitoring with P1 paging.

## Consequences

- Engineering must implement refresh reuse detection, audit_logs append-only, and payment-sheet/webhook verification before GA.
- Legal owns DPA/DPIA; CISO owns exceptions/risk acceptance.
- Full detail: `docs/SECURITY-CV-STUDIO-AI.md`.
