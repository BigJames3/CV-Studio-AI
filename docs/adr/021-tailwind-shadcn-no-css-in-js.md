# ADR-021 — Tailwind + shadcn patterns · no CSS-in-JS runtime

**Status:** Accepted  
**Date:** 2026-07-26  
**Deciders:** Design System Lead, Frontend Architect, CTO

## Context

Need a scalable DS for Next.js App Router (RSC), dark mode, and shadcn-compatible primitives. CSS-in-JS (Emotion/styled-components) conflicts with RSC and adds runtime cost.

## Decision

1. **Tailwind CSS + CSS variables** as styling system.
2. **shadcn/ui copy-own** components in `packages/ui` on Radix + CVA.
3. **Framer Motion** for intentional animation only.
4. **Forbid** styled-components/Emotion in product code.
5. Storybook + vitest-axe as quality gates.

## Consequences

- Tokens live in `docs/design-tokens.*` and `packages/ui/src/styles/globals.css`.
- Apps import `@cvstudio/ui`.
- See `docs/DESIGN-SYSTEM-IMPL-CV-STUDIO-AI.md`.
