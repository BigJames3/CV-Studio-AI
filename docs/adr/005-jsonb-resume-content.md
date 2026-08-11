# ADR-005: Resume content as versioned JSONB

- **Status:** Accepted
- **Date:** 2026-07-26

## Context

Le CV editor a un modèle flexible (sections optionnelles, templates). Une normalisation complète Experience/Education en tables multiplie jointures et migrations pour peu de gain au MVP.

## Decision

Stocker `resumes.content` en **JSONB** avec `schemaVersion` + validation Zod partagée (`packages/shared-types`). Snapshots dans `resume_versions`.

## Consequences

- (+) Itération produit rapide, autosave simple
- (+) Templates consomment le même document
- (-) Requêtes analytiques ad hoc plus dures → projections ultérieures si besoin
- (-) Besoin strict de validateurs pour éviter drift
