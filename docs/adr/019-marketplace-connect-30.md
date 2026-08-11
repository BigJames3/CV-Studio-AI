# ADR-019 — Marketplace via Stripe Connect · 30% commission

**Status:** Accepted  
**Date:** 2026-07-26  
**Deciders:** Marketplace Architect, Finance, Legal, CTO

## Context

PRD defines a design marketplace with **30%** platform commission. Need seller payouts, KYC, and MoR clarity.

## Decision

1. **Stripe Connect Express** for sellers.
2. **30% of net** (after processor fees) to platform; **70%** to seller.
3. Human + automated **quality approval** before publish.
4. Verified-purchase **reviews**; bayesian rating.
5. **Dispute** window 14 days; DMCA-style **copyright** takedown.
6. Buyer licence is in-app usage — not transferable template redistribution.

## Consequences

- Expand Prisma marketplace domain (seller profiles, purchases, ledger, payouts, moderation, disputes).
- Admin moderation queue required before GA marketplace.
- See `docs/MARKETPLACE-CV-STUDIO-AI.md`.
