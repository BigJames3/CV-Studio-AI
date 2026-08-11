# Contributing to CV Studio AI

Thank you for your interest in contributing. This guide gets you productive fast.

## Development setup

See [README.md](./README.md) and [docs/MONOREPO-SETUP.md](./docs/MONOREPO-SETUP.md).

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm docker:up
pnpm db:migrate
pnpm dev
```

## Development workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test**

   ```bash
   pnpm format
   pnpm typecheck
   pnpm test
   ```

3. **Commit with conventional commits**

   ```bash
   git commit -m "feat: add new feature"
   ```

4. **Push and open a Pull Request**
   ```bash
   git push -u origin HEAD
   ```

## Commit convention

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only
- `style:` Code formatting (no logic change)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Dependencies, config, no feature/fix
- `ci:` CI/CD changes
- `build:` Build system / tooling

Examples:

```
feat: implement ATS analyzer API endpoint
fix: resolve CV export timing issue
docs: update installation guide
```

## Code standards

- TypeScript strict mode required
- ESLint + Prettier enforced (`pnpm lint` · `pnpm format`)
- Follow Design System (`docs/DESIGN-SYSTEM-IMPL-CV-STUDIO-AI.md`, `@cvstudio/ui`)
- Document complex logic; JSDoc on public exports
- Prefer workspace packages (`@cvstudio/*`) over copy-paste

## Testing

```bash
pnpm test
pnpm test:coverage
```

- Unit: Jest / Vitest per package
- Integration: API endpoints
- E2E: critical user journeys (Playwright — later sprints)

## Pull request process

1. `pnpm test` · `pnpm lint` · `pnpm typecheck` pass
2. Update relevant docs when behavior changes
3. Meaningful PR description + test plan
4. Request review (see `.github/CODEOWNERS`)

## Need help?

- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)
- [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- GitHub Discussions / Issues
