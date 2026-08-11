# Development guide — CV Studio AI

## Daily loop

```bash
pnpm docker:up   # once per day / machine boot
pnpm dev         # API + Web
```

Useful filters:

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
pnpm --filter @cvstudio/ui storybook
```

## Quality gates (before PR)

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
```

Husky runs `lint-staged` (Prettier) on commit.

## Workspace packages

| Import                   | Package                           |
| ------------------------ | --------------------------------- |
| `@cvstudio/shared-types` | Domain types                      |
| `@cvstudio/shared-utils` | Helpers + Zod schemas             |
| `@cvstudio/ui`           | Design System (canonical)         |
| `@cvstudio/shared-ui`    | Alias → re-exports `@cvstudio/ui` |
| `@cvstudio/ai-service`   | AI gateway scaffold               |

## Conventions

- Conventional commits (see [CONTRIBUTING.md](../CONTRIBUTING.md))
- API envelope `{ success, data|error, meta }` under `/api/v1`
- CV content JSONB is source of truth (see DATABASE doc)
- Never invent facts in AI features

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
