# Storybook — @cvstudio/ui

```bash
cd packages/ui
pnpm install
pnpm storybook
```

- Port **6006**
- Themes: Light / Dark via addon-themes (`class="dark"`)
- A11y panel: fix violations before merge
- Stories: CSF3 `*.stories.tsx` colocated with components

CI (recommended): `pnpm build-storybook` artifact + optional Chromatic.
