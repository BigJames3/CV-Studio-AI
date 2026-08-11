# ADR-001: Monorepo Turborepo + pnpm

- **Status:** Accepted
- **Date:** 2026-07-26
- **Deciders:** Principal Architect, CTO

## Context

CV Studio AI a plusieurs surfaces (web, api, workers, mobile, admin) et des contrats TypeScript partagés. Une équipe jusqu’à ~20 devs doit évoluer 24 mois sans friction de versioning cross-repo.

## Decision

Adopter un **monorepo Turborepo** avec **pnpm workspaces**.

## Consequences

- (+) Atomic PRs cross app/package
- (+) Shared types & UI tokens
- (+) Remote cache CI
- (-) CI complexity ; mitiger via `turbo affected`
- (-) Droits d’accès repo unique (OK early-stage)
