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

## Agents

La gouvernance des agents existe déjà et fait foi :

- `AGENTS.md` — charte commune (priorités P0→P4, Definition of Done, sécurité, git, format de rapport)
- `docs/agents/00-README.md` — carte du dépôt, matrice features/plans, règle anti-conflit
- `docs/agents/01-architect.md` … `08-devops.md` — fiche de chaque agent (ownership, fichiers autorisés/interdits)
- `docs/agents/TASK_BOARD.md` et `DECISIONS.md` — tâches confirmées et décisions humaines ouvertes

`.claude/agents/` expose ces 8 agents comme sous-agents Claude Code (`architect`, `security`, `qa`, `backend`, `frontend`, `ai`, `billing`, `devops`). Chaque fichier y renvoie à sa fiche `docs/agents/` : modifier la fiche, pas le wrapper.

Tâche qui touche plusieurs zones : `architect` découpe → `security` confirme le risque (lecture) → le propriétaire implémente → `qa` teste → `architect` vérifie le diff.
