# ADR-014 — Mobile offline-first with WatermelonDB + Expo

**Status:** Accepted  
**Date:** 2026-07-26  
**Deciders:** Mobile Lead, Principal Architect

## Context

CV Studio AI needs a mobile client (Phase 4) with offline edit, sync, notifications, and wallet payments. Web uses TanStack Query + Zustand; mobile network is intermittent.

## Decision

1. **Expo + dev client** (not bare RN day-1) for EAS Build / OTA.
2. **React Navigation** (Native Stack + Tabs) — explicit deep linking config.
3. **Zustand** for ephemeral UI/session only; **WatermelonDB (SQLite)** as local SoT for CVs/templates/sync queue.
4. **SyncEngine** push queue + incremental pull (`updatedSince`); conflict policy LWW with dirty-local preference during active edit.
5. **Stripe React Native Payment Sheet** for Apple Pay / Google Pay; IAP decision deferred to Legal.
6. **Expo Notifications** + `POST /devices` for push.

## Consequences

- Requires native build (WatermelonDB JSI / Stripe).
- Shared HTML preview package later for PDF parity.
- Backend must add devices + payment-sheet + incremental CV list.
