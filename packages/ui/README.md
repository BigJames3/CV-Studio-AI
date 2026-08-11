# @cvstudio/ui

Design System package for CV Studio AI — shadcn/Radix patterns, Tailwind + CSS variables, Framer Motion presets.

## Docs

- [Implementation Design System](../../docs/DESIGN-SYSTEM-IMPL-CV-STUDIO-AI.md)
- [UX Design System](../../docs/DESIGN-SYSTEM-CV-STUDIO-AI.md)
- [Component inventory](../../docs/design-system/COMPONENT-INVENTORY.md)

## Scripts

```bash
pnpm install
pnpm storybook      # http://localhost:6006
pnpm test
pnpm typecheck
```

## Usage

```tsx
import { Button, SaveIndicator, CvPreviewFrame } from '@cvstudio/ui';
import '@cvstudio/ui/styles.css';
```

## Styling strategy

**No CSS-in-JS runtime.** Tokens → CSS variables → Tailwind utilities → CVA variants.
