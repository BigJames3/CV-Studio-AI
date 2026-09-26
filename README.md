# CV Studio AI

Plateforme SaaS de génération de CV alimentée par l'IA.

## Documentation

- **[Analyse complète](docs/ANALYSE-COMPLETE-CV-STUDIO-AI.md)** — Audit structurel détaillé (existants / manquants / plan d’action)
- **[Product Requirements Document (PRD)](docs/PRD-CV-STUDIO-AI.md)** — Document de référence produit 24 mois (v1.0)
- **[Design System & UX](docs/DESIGN-SYSTEM-CV-STUDIO-AI.md)** — Philosophie, composants, wireframes, a11y, dark mode
- **[Design Tokens JSON](docs/design-tokens.json)** — Tokens canoniques (Figma / Tailwind / code)
- **[Design Tokens CSS](docs/design-tokens.css)** — Variables CSS prêtes à brancher
- **[Brand Guidelines](docs/BRAND-GUIDELINES.md)** — Logo, couleurs, do/don’t
- **[Accessibility Checklist](docs/ACCESSIBILITY-CHECKLIST.md)** — WCAG AA+
- **[Editor UI Spec](docs/EDITOR-UI-SPEC.md)** — Dual-pane live preview (cœur produit)
- **[Architecture Technique](docs/ARCHITECTURE-CV-STUDIO-AI.md)** — C4, DDD/CQRS, API, sécu, K8s, UML
- **[Database Architecture](docs/DATABASE-CV-STUDIO-AI.md)** — PostgreSQL scale, RLS, partitions, GDPR, ERD
- **[API REST NestJS](docs/API-CV-STUDIO-AI.md)** — Endpoints, envelope, entitlements, Swagger
- **[Frontend Next.js 14](docs/FRONTEND-CV-STUDIO-AI.md)** — App Router, Zustand, TanStack Query, SEO, Lighthouse
- **[AI / ML Features](docs/AI-FEATURES-CV-STUDIO-AI.md)** — 12 features, prompts, models, quotas, FinOps
- **[AI Prompts](docs/ai/prompts/)** — Prompt engineering versionné (guardrails + 01→12)
- **[Mobile React Native / Expo](docs/MOBILE-CV-STUDIO-AI.md)** — Navigation, Zustand, WatermelonDB offline sync, payments, deep links
- **[Plan Sécurité (CISO)](docs/SECURITY-CV-STUDIO-AI.md)** — OWASP, encryption, JWT/OAuth/MFA, GDPR, IR, monitoring
- **[Pen test checklist](docs/security/PENTEST-CHECKLIST.md)** — ASVS L2 / WSTG
- **[Incident Response](docs/security/INCIDENT-RESPONSE.md)** — Playbook P1–P4 + GDPR 72h
- **[Infrastructure & CI/CD](docs/INFRASTRUCTURE-CV-STUDIO-AI.md)** — EKS, Terraform, GHA, Prometheus/ELK, DR
- **[DR Runbook](docs/infrastructure/DR-RUNBOOK.md)** — Failover régional
- **[Product Analytics](docs/ANALYTICS-CV-STUDIO-AI.md)** — Events, funnels, cohorts, A/B, LTV/CAC, NPS
- **[Event taxonomy](docs/analytics/EVENT-TAXONOMY.md)** — Catalogue d’événements v1
- **[Marketplace Designs](docs/MARKETPLACE-CV-STUDIO-AI.md)** — Sellers, 30% commission, QA, disputes, IP
- **[Templates Sprint 4](docs/TEMPLATES-SPRINT-4.md)** — 5 CV templates + customizer
- **[Roadmap 24 mois (CTO)](docs/ROADMAP-24M-CV-STUDIO-AI.md)** — Phases, sprints, Go/No-Go, staffing
- **[Roadmap one-pager](docs/roadmap/ONE-PAGER.md)** — Vue synthétique
- **[Design System UX](docs/DESIGN-SYSTEM-CV-STUDIO-AI.md)** — Philosophie, wireframes, tokens
- **[Design System Impl (shadcn)](docs/DESIGN-SYSTEM-IMPL-CV-STUDIO-AI.md)** — 50+ components, Storybook, a11y
- **[Component inventory](docs/design-system/COMPONENT-INVENTORY.md)** — Statut composants `@cvstudio/ui`
- **[apps/api](apps/api)** — Implémentation NestJS (controllers, services, DTOs, guards)
- **[apps/web](apps/web)** — Application Next.js 14 (pages, editor dual-pane, hooks, stores)
- **[apps/mobile](apps/mobile)** — Application Expo (navigation, offline sync, notifications, Stripe)
- **[packages/ai-service](packages/ai-service)** — Gateway IA (cible d’implémentation)
- **[packages/ui](packages/ui)** — Design System React (shadcn/Radix, Storybook)
- **[Prisma schema](apps/api/prisma/schema.prisma)** — Schéma canonique (pointer docs : [`docs/prisma/README.md`](docs/prisma/README.md))
- **[SQL ops](docs/sql/)** — Extensions, partitioning, RLS, indexes, seeds
- **[ADRs](docs/adr/)** — Décisions d’architecture
- **[infrastructure/](infrastructure)** — Terraform, K8s, Docker Compose
- **[Docker Compose](infrastructure/docker/README.md)** — PG + Redis + Mailpit (`pnpm docker:up`)
- **[.github/workflows](.github/workflows)** — CI, CD staging/prod, Terraform

## Quickstart (monorepo)

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm docker:up          # Postgres 16 + Redis + Mailpit (infrastructure/docker/)
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev                # API :3001 · Web :3000
```

Guides: [`docs/SETUP.md`](docs/SETUP.md) · [`docs/MONOREPO-SETUP.md`](docs/MONOREPO-SETUP.md) · [`CONTRIBUTING.md`](CONTRIBUTING.md) · `make help`

### Spec volumes (index → canonical docs)

| #   | Index                                       | Canonical              |
| --- | ------------------------------------------- | ---------------------- |
| 01  | [Product Vision](docs/01-PRODUCT-VISION.md) | PRD                    |
| 02  | [UX/UI](docs/02-UX-UI-DESIGN.md)            | Design System + Editor |
| 03  | [Architecture](docs/03-ARCHITECTURE.md)     | Architecture           |
| 04  | [Database](docs/04-DATABASE.md)             | Database               |
| 05  | [Backend API](docs/05-BACKEND-API.md)       | API                    |
| 06  | [Frontend](docs/06-FRONTEND.md)             | Frontend               |
| 07  | [AI](docs/07-AI.md)                         | AI Features            |
| 08  | [Mobile](docs/08-MOBILE.md)                 | Mobile                 |
| 09  | [Business](docs/09-BUSINESS.md)             | PRD + Marketplace      |
| 10  | [Security](docs/10-SECURITY.md)             | Security               |
| 11  | [DevOps](docs/11-DEVOPS.md)                 | Infrastructure         |
| 12  | [Analytics](docs/12-ANALYTICS.md)           | Analytics              |
| 13  | [Marketplace](docs/13-MARKETPLACE.md)       | Marketplace            |
| 14  | [Roadmap](docs/14-ROADMAP.md)               | Roadmap 24m            |
| 15  | [Design System](docs/15-DESIGN-SYSTEM.md)   | DS UX + Impl           |

## Stack cible

- Monorepo : Turborepo 2 + pnpm 9 workspaces
- Frontend : Next.js 14+ (App Router) — `apps/web` (`@cvstudio/web`)
- Backend : NestJS modular monolith + BullMQ — `apps/api` (`@cvstudio/api`)
- AI : Gateway multi-modèles — `packages/ai-service`
- UI kit : shadcn/Radix — `packages/ui`
- Shared : `packages/shared-types`, `packages/shared-utils`
- Mobile : Expo — `apps/mobile` (Phase 4)
- Database : PostgreSQL 16 + Prisma · Cache : Redis
- Infra : `infrastructure/` (Docker Compose, Terraform, K8s) · CI/CD : `.github/workflows`

## Statut

Monorepo Turborepo en exécution Phase 1–2 · Auth/PDF/Billing opérationnels · AI: `optimize-resume` live · **ATS panel éditeur** branché sur `check-ats` · autres features IA encore scaffold · Mobile/marketplace partiels.
