# CV STUDIO AI — DESIGN SYSTEM (IMPLEMENTATION)

## Design System Lead — Document de référence ingénierie UI

| Métadonnée    | Valeur                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------- |
| **Package**   | `@cvstudio/ui` (`packages/ui`)                                                                  |
| **Version**   | 2.0.0                                                                                           |
| **Date**      | 26 juillet 2026                                                                                 |
| **Stack**     | React 18 · TypeScript · **Tailwind CSS** · **shadcn/ui patterns** · Radix · CVA · Framer Motion |
| **Docs UX**   | [DESIGN-SYSTEM-CV-STUDIO-AI.md](DESIGN-SYSTEM-CV-STUDIO-AI.md) (philosophie, wireframes)        |
| **Tokens**    | [design-tokens.json](design-tokens.json) · [design-tokens.css](design-tokens.css)               |
| **Storybook** | `packages/ui` → `pnpm storybook`                                                                |
| **A11y**      | WCAG **2.2 AA** (AAA texte critique)                                                            |

---

## 0. Décision styling (CSS-in-JS strategy)

### Verdict

**Pas de CSS-in-JS runtime comme système principal.**

| Approche                               | Usage CV Studio                                     |
| -------------------------------------- | --------------------------------------------------- |
| **CSS variables + Tailwind utilities** | **Source of truth** (RSC-friendly, zero runtime)    |
| **CVA** (`class-variance-authority`)   | Variants composants                                 |
| **tailwind-merge + clsx**              | Composition classes                                 |
| **Framer Motion**                      | Animations / layout transitions (style props OK)    |
| **CSS Modules**                        | Évité — unicité via package UI                      |
| **styled-components / Emotion**        | **Interdit** en app code (hydratation, bundle, RSC) |
| **Inline `style={{}}`**                | Uniquement valeurs dynamiques (ex. progress %)      |

**Pourquoi (Vercel doctrine) :** App Router / RSC, perf, theming dark via `.dark` + tokens, alignement shadcn.

**shadcn integration :** copy-own pattern — composants **vivant dans le repo** (`packages/ui`), Radix primitives, pas de dépendance opaque `shadcn` runtime. CLI `npx shadcn@latest` utilisable pour **générer** puis adapter aux tokens CV Studio.

---

## 1. Architecture package

```
packages/ui/
├── .storybook/
├── src/
│   ├── components/     # 60+ primitives + product
│   ├── hooks/
│   ├── animations/
│   ├── lib/utils.ts    # cn()
│   ├── styles/globals.css
│   └── index.ts
├── package.json
└── vitest.config.ts
```

**Consommateurs :** `apps/web`, Storybook ; mobile réutilise tokens JSON (pas React DOM).

---

## 2. Catalogue — 60+ composants

### 2.1 Actions

| #   | Component     | shadcn base  | Notes                       |
| --- | ------------- | ------------ | --------------------------- |
| 1   | `Button`      | button       | variants, sizes, loading    |
| 2   | `IconButton`  | button       | aria-label required         |
| 3   | `ButtonGroup` | —            | segmented actions           |
| 4   | `Link`        | —            | Next-aware wrapper optional |
| 5   | `Toggle`      | toggle       |                             |
| 6   | `ToggleGroup` | toggle-group |                             |

### 2.2 Forms

| #   | Component     | Notes         |
| --- | ------------- | ------------- |
| 7   | `Input`       |               |
| 8   | `Textarea`    |               |
| 9   | `Label`       |               |
| 10  | `Checkbox`    |               |
| 11  | `RadioGroup`  |               |
| 12  | `Switch`      |               |
| 13  | `Select`      |               |
| 14  | `Combobox`    | cmdk pattern  |
| 15  | `Slider`      |               |
| 16  | `Form`        | RHF provider  |
| 17  | `FormField`   |               |
| 18  | `FieldError`  |               |
| 19  | `SearchInput` |               |
| 20  | `FileUpload`  | dropzone a11y |
| 21  | `DatePicker`  |               |
| 22  | `Calendar`    |               |
| 23  | `OTPInput`    | MFA           |

### 2.3 Feedback

| #   | Component           |
| --- | ------------------- |
| 24  | `Alert`             |
| 25  | `Toast` / `Toaster` |
| 26  | `Progress`          |
| 27  | `Spinner`           |
| 28  | `Skeleton`          |
| 29  | `EmptyState`        |
| 30  | `ErrorState`        |
| 31  | `Banner`            |
| 32  | `SaveIndicator`     | editor Saved/Saving/Error |

### 2.4 Data display

| #   | Component     |
| --- | ------------- |
| 33  | `Badge`       |
| 34  | `Avatar`      |
| 35  | `AvatarGroup` |
| 36  | `Card`        |
| 37  | `Separator`   |
| 38  | `Table`       |
| 39  | `DataTable`   | sorting/pagination hooks |
| 40  | `Stat`        |
| 41  | `Kbd`         |
| 42  | `Code`        |
| 43  | `RatingStars` | marketplace              |
| 44  | `AspectRatio` |
| 45  | `ScrollArea`  |

### 2.5 Overlays & navigation

| #   | Component          |
| --- | ------------------ |
| 46  | `Tooltip`          |
| 47  | `Popover`          |
| 48  | `HoverCard`        |
| 49  | `DropdownMenu`     |
| 50  | `ContextMenu`      |
| 51  | `Dialog`           |
| 52  | `AlertDialog`      |
| 53  | `Sheet`            |
| 54  | `Drawer`           | mobile |
| 55  | `Tabs`             |
| 56  | `Accordion`        |
| 57  | `Breadcrumb`       |
| 58  | `Pagination`       |
| 59  | `Navbar`           |
| 60  | `Sidebar`          |
| 61  | `CommandPalette`   |
| 62  | `Menubar`          |
| 63  | `NavigationMenu`   |
| 64  | `Stepper`          |
| 65  | `SegmentedControl` |

### 2.6 Product-specific

| #   | Component           |
| --- | ------------------- |
| 66  | `AiSuggestionBadge` |
| 67  | `PaywallBanner`     |
| 68  | `CvPreviewFrame`    |
| 69  | `TemplateCard`      |
| 70  | `OfflineBanner`     |
| 71  | `EntitlementGate`   |

---

## 3. Responsive patterns

| Token | Breakpoint |
| ----- | ---------- |
| `sm`  | 640px      |
| `md`  | 768px      |
| `lg`  | 1024px     |
| `xl`  | 1280px     |
| `2xl` | 1536px     |

### Patterns

1. **Editor dual-pane** : `lg+` side-by-side ; `&lt;lg` tabs Contenu / Aperçu
2. **Stack → inline** : `flex-col md:flex-row`
3. **Fluid type** : `text-sm md:text-base` ; headings clamp
4. **Touch targets** : min **44×44** mobile
5. **Safe areas** : `env(safe-area-inset-*)` mobile web
6. **Container** : `max-w-content` (1200) / `max-w-prose`

Hook : `useMediaQuery` / `useBreakpoint`.

---

## 4. Dark mode

### Strategy

- Class strategy : `html.dark` (next-themes)
- Tokens sémantiques : `--cv-bg`, `--cv-fg`, `--cv-border`, `--cv-primary`
- Jamais de couleurs hardcodées hors tokens

### Rules

| Do                                                                 | Don’t                           |
| ------------------------------------------------------------------ | ------------------------------- |
| Surfaces `bg-background` / `bg-card`                               | `bg-white` fixe                 |
| Primary légèrement plus claire en dark (`#3B82F6`)                 | Même `#2563EB` si contraste KO  |
| Charts/CV preview : thème **indépendant** optionnel (papier clair) | Forcer dark sur aperçu CV print |

`ThemeProvider` déjà dans `apps/web` — package UI lit les CSS vars.

---

## 5. Animation library

**Lib :** Framer Motion (`motion`) + CSS transitions tokens.

| Token     | Duration | Easing                         |
| --------- | -------- | ------------------------------ |
| `instant` | 0ms      | —                              |
| `fast`    | 120ms    | ease-out                       |
| `base`    | 200ms    | cubic-bezier(0.2, 0.8, 0.2, 1) |
| `slow`    | 320ms    | ease-in-out                    |
| `spring`  | —        | stiffness 400 damping 30       |

### Presets (`src/animations/presets.ts`)

- `fadeIn` · `fadeInUp` · `scaleIn` · `slideFromRight`
- `staggerChildren`
- `reduceMotion` : respect `prefers-reduced-motion` (disable / opacity only)

### Budget

- Landing : 2–3 motions intentionnelles
- Editor : autosave pulse subtle ; pas de confettis

---

## 6. Accessibility guidelines

Full checklist : [ACCESSIBILITY-CHECKLIST.md](ACCESSIBILITY-CHECKLIST.md)

### Non-négociables composants

1. Focus visible (`ring-2 ring-ring ring-offset-2`)
2. `aria-*` sur IconButton, Dialog, Tabs
3. Labels liés (`htmlFor` / `aria-labelledby`)
4. Erreurs annoncées (`aria-live="polite"` / `role="alert"`)
5. Escape / focus trap (Radix Dialog/Sheet)
6. Keyboard : DnD sections = alternatives boutons
7. Contrast AA : texte 4.5:1 · UI 3:1
8. Hit area ≥ 24px desktop / 44px touch

### Testing a11y

- Storybook **a11y addon**
- `vitest-axe` sur primitives
- Playwright axe en CI smoke

---

## 7. Component documentation

Chaque composant documente dans Storybook MDX / CSF3 :

```
## Anatomy
## Variants / sizes
## Accessibility
## Do / Don’t
## Related
## Code examples
```

Fichiers : `ComponentName.stories.tsx` + JSDoc props.

Handoff Figma : mêmes noms que exports `@cvstudio/ui`.

---

## 8. Storybook setup

```bash
cd packages/ui && pnpm storybook
```

| Addon                         | Rôle           |
| ----------------------------- | -------------- |
| `@storybook/addon-essentials` | Controls, docs |
| `@storybook/addon-a11y`       | Violations     |
| `@storybook/addon-themes`     | light/dark     |
| `addon-viewport`              | responsive     |

Themes : Light / Dark / System.  
CI : `test-storybook` + chromatic optional.

Config : `packages/ui/.storybook/*`

---

## 9. Testing patterns

| Layer         | Tool                  | Quoi               |
| ------------- | --------------------- | ------------------ |
| Unit variants | Vitest                | CVA class maps     |
| Component     | RTL + user-event      | interactions       |
| A11y          | vitest-axe            | axe violations = 0 |
| Visual        | Storybook / Chromatic | regressions        |
| Contract      | TypeScript            | props publiques    |

### Patterns

```tsx
// Arrange — render with theme
// Act — userEvent.click
// Assert — roles not CSS classes
expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
```

**Interdit :** tests couplés aux classnames Tailwind.

---

## 10. Theming API

```ts
// Semantic tokens (CSS)
--background --foreground --card --primary --secondary
--muted --accent --destructive --border --ring --radius
```

Mapped from `design-tokens.css` → Tailwind `theme.extend.colors`.

---

## 11. Contribution guide

1. Ajouter composant dans `packages/ui/src/components`
2. Exporter depuis `index.ts`
3. Story + test a11y
4. Documenter variants
5. Pas de breaking props sans major version

---

## 12. Related

| File                                                             | Role             |
| ---------------------------------------------------------------- | ---------------- |
| [COMPONENT-INVENTORY.md](design-system/COMPONENT-INVENTORY.md)   | Liste status     |
| [A11Y-COMPONENT-RULES.md](design-system/A11Y-COMPONENT-RULES.md) | Règles courtes   |
| [STORYBOOK.md](design-system/STORYBOOK.md)                       | Runbook          |
| [ADR-021](adr/021-tailwind-shadcn-no-css-in-js.md)               | Décision styling |
| `packages/ui`                                                    | Code             |

---

_Design System Implementation v2.0 — Design System Lead_
