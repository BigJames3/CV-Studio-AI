# ADR-020 — 24-month roadmap governance (sprint + phase gates)

**Status:** Accepted  
**Date:** 2026-07-26  
**Deciders:** CTO, CPO, CEO

## Context

CV Studio AI has complete Phase 0 specs across product, eng, security, infra, AI, mobile, marketplace, and analytics. Execution needs a single sequenced plan with kill criteria.

## Decision

1. Adopt `docs/ROADMAP-24M-CV-STUDIO-AI.md` as the **execution source of truth**.
2. **2-week sprints** with explicit Go/No-Go per sprint and **phase exit gates**.
3. Quality/security gates **never** traded for date (slip scope instead).
4. Quarterly reforecast mandatory; silent scope creep forbidden.
5. Phase order fixed: MVP → Core → AI → Marketplace+Mobile → Advanced → Scale/i18n.

## Consequences

- Hiring and budget follow phase capacity tables.
- Feature requests map to a sprint or explicit backlog — not “squeeze in”.
