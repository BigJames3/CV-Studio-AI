# ADR-013: Hybrid CV storage (JSONB + normalized sections)

- **Status:** Accepted
- **Date:** 2026-07-26
- **Deciders:** Database Architect, Principal Architect

## Context

L’éditeur exige un autosave rapide (document unique). Le reporting, l’ordre des sections et certaines requêtes métier bénéficient d’un modèle 3NF (`experiences`, `education`, …).

## Decision

1. **`cvs.content` JSONB** = source de vérité runtime (éditeur, PDF, versions).
2. **Tables sections** = projection synchronisée transactionnellement (ou job immédiat post-save).
3. **`cv_versions`** snapshot JSONB uniquement.

## Consequences

- (+) Load editor 1 round-trip
- (+) Intégrité relationnelle + indexes `(cv_id, sort_order)`
- (-) Dual-write à maintenir (tests de sync obligatoires)
- Remplace partiellement ADR-005 (JSONB-only) en l’étendant
