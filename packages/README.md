# Packages — CV Studio AI

| Package             | Name                          | Role                                                       |
| ------------------- | ----------------------------- | ---------------------------------------------------------- |
| `shared-types`      | `@cvstudio/shared-types`      | Domain types (CV, API envelope, plans, DTOs)               |
| `shared-utils`      | `@cvstudio/shared-utils`      | Helpers + Zod validators                                   |
| `ui`                | `@cvstudio/ui`                | Design system (shadcn / Radix / Storybook) — **canonical** |
| `shared-ui`         | `@cvstudio/shared-ui`         | Compatibility alias → re-exports `@cvstudio/ui`            |
| `ai-service`        | `@cvstudio/ai-service`        | AI gateway scaffold + model routing                        |
| `typescript-config` | `@cvstudio/typescript-config` | Shared tsconfig presets                                    |
| `eslint-config`     | `@cvstudio/eslint-config`     | Shared ESLint presets                                      |

Consume via `workspace:*` in app `package.json` files.
