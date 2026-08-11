# ADR-018 — Amplitude as product analytics + Experiment

**Status:** Accepted  
**Date:** 2026-07-26  
**Deciders:** Data PM, Growth, CTO

## Context

Need product analytics (funnels, retention, experiments) plus finance-grade LTV/CAC in a warehouse. Mixpanel and Amplitude are both strong; team preference is Amplitude Experiment integration and EU data residency options.

## Decision

1. **Amplitude** = primary product analytics + experimentation.
2. **Server + client** dual instrumentation; Stripe webhooks for revenue events.
3. **Warehouse** (BigQuery or Snowflake) for CAC/LTV/NRR (source of truth finance).
4. Taxonomy versioned in `docs/analytics/` — schema-validated.
5. No CV content in event properties (GDPR/Security).

## Consequences

- Web/mobile SDKs + `POST /analytics/track`.
- PostHog may be added later for EU self-host if Legal requires — taxonomy stays portable.
