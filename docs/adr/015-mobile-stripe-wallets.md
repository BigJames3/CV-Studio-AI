# ADR-015 — Mobile payments via Stripe Payment Sheet (wallets)

**Status:** Proposed (Legal review required before Store GA)  
**Date:** 2026-07-26

## Context

Mobile needs Apple Pay and Google Pay. Selling digital subscriptions may require Apple IAP depending on jurisdiction and App Store rules.

## Decision (engineering default)

Use `@stripe/stripe-react-native` Payment Sheet with Apple Pay / Google Pay for SaaS parity with web Stripe billing, gated behind Legal sign-off. Fallback path: map Pro SKU to StoreKit / Play Billing if required.

## Consequences

- Backend needs `POST /payments/payment-sheet` (Customer + EphemeralKey + Intent).
- Entitlements remain server-driven via Stripe webhooks (or IAP server notifications if fallback).
