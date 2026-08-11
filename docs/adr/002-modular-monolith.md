# ADR-002: Modular monolith NestJS (defer microservices)

- **Status:** Accepted
- **Date:** 2026-07-26

## Context

La tentation microservices (auth, cv, ai, billing) existe, mais le produit n’a pas encore les signaux (taille équipe, scaling indépendant, charge ops).

## Decision

Ship un **modular monolith NestJS** (`apps/api`) + **workers séparés** (même codebase, autre process) pour PDF/AI/email.

## Consequences

- (+) Vélocité MVP, transactions simples, debugging
- (+) Modules = futurs extract boundaries
- (-) Scaling CPU Chromium/AI → process/node pools séparés (déjà prévu)
- Revisit microservices si deploy coupling ou scaling divergent douloureux (post-M18)
