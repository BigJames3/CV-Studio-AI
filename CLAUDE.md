# CV Studio AI — guide pour Claude Code

SaaS de création de CV assistée par IA. Monorepo Turborepo + pnpm 9 (Node ≥ 20.11).

## Carte du monorepo

| Chemin                | Contenu                                                     |
| --------------------- | ----------------------------------------------------------- |
| `apps/api`            | API NestJS 10 + Prisma 6 (PostgreSQL) + BullMQ/Redis        |
| `apps/web`            | Next.js 14 App Router, Tailwind, Zustand, React Query       |
| `apps/mobile`         | Expo 52 / React Native 0.76                                 |
| `packages/ai-service` | Gateway IA : routage de modèles, prompts, providers         |
| `packages/ui`         | Design system partagé (`@cvstudio/ui`, Storybook, Vitest)   |
| `packages/shared-*`   | Types, utilitaires et UI partagés                           |
| `infrastructure`      | Docker, Kubernetes (kustomize), Terraform AWS               |
| `docs`                | PRD, architecture, ADR (`docs/adr`), prompts IA (`docs/ai`) |

## Commandes

```bash
pnpm install
pnpm docker:up          # postgres, redis, mailpit
pnpm db:migrate         # migrations Prisma
pnpm dev                # api + web
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @cvstudio/<paquet> <script>   # cibler un paquet
```

## Conventions

- TypeScript strict, Prettier (hook `lint-staged` en pre-commit), commits conventionnels (`feat:`, `fix:`, `refactor:`…).
- Réutiliser les paquets `@cvstudio/*` plutôt que dupliquer.
- Tests à côté du code (`*.spec.ts` côté API) ; ne jamais désactiver un test pour obtenir du vert.
- Aucun secret dans le dépôt ; aucune donnée personnelle de CV dans les logs.

## Sous-agents (`.claude/agents/`)

Délègue selon le domaine touché :

| Agent              | Quand l'utiliser                                                   |
| ------------------ | ------------------------------------------------------------------ |
| `backend-api`      | Endpoints NestJS, Prisma/migrations, jobs, guards (hors paiements) |
| `frontend-web`     | Pages Next.js, éditeur, templates CV, `packages/ui`                |
| `mobile`           | App Expo, hors-ligne, navigation                                   |
| `ai-engineer`      | `packages/ai-service`, `modules/ai`, prompts et routage de modèles |
| `payments-billing` | Stripe, CinetPay, plans, entitlements, factures, commissions       |
| `devops-infra`     | Docker, k8s, Terraform, GitHub Actions                             |
| `qa-tester`        | Écrire/réparer des tests Jest, Vitest, Playwright ; CI rouge       |
| `code-reviewer`    | Relecture en lecture seule avant commit / PR                       |

Flux type pour une fonctionnalité transverse : `backend-api` (contrat + endpoint) → `frontend-web` / `mobile` (consommation) → `qa-tester` (tests) → `code-reviewer` (relecture).
