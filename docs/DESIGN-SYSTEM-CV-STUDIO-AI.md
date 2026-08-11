# CV STUDIO AI — DESIGN SYSTEM & UX SPECIFICATION

## Document de référence Design (Frontend + Design)

| Métadonnée        | Valeur                                                    |
| ----------------- | --------------------------------------------------------- |
| **Produit**       | CV Studio AI                                              |
| **Version**       | 1.0                                                       |
| **Date**          | 26 juillet 2026                                           |
| **Auteur**        | Senior Product Designer                                   |
| **Audience**      | Frontend Engineers, Designers, Product                    |
| **Alignement**    | PRD v1.0 — Editor dual-pane, ATS-first, Free/Pro/Business |
| **Fichiers liés** | `design-tokens.json`, `design-tokens.css`                 |

---

## Table des matières

1. [Design Philosophy](#1-design-philosophy)
2. [Brand Guidelines](#2-brand-guidelines)
3. [Color Palette](#3-color-palette)
4. [Typography](#4-typography)
5. [Spacing System](#5-spacing-system)
6. [Border Radius](#6-border-radius)
7. [Shadows & Elevation](#7-shadows--elevation)
8. [Icons & Imagery](#8-icons--imagery)
9. [Animations & Transitions](#9-animations--transitions)
10. [Component Library](#10-component-library)
11. [Layout Patterns & Breakpoints](#11-layout-patterns--breakpoints)
12. [Wireframes — Landing](#12-wireframes--landing-page)
13. [Wireframes — Authentication](#13-wireframes--authentication)
14. [Wireframes — Main Editor](#14-wireframes--main-editor-core)
15. [CV Templates (5 designs)](#15-cv-templates--5-designs-de-base)
16. [Templates Marketplace](#16-templates-marketplace)
17. [Dashboard](#17-dashboard)
18. [Settings & Account](#18-settings--account)
19. [Mobile Design](#19-mobile-design)
20. [Responsive Rules](#20-responsive-design-rules)
21. [Accessibility](#21-accessibility-wcag-aa)
22. [Dark Mode](#22-dark-mode)
23. [Interactions & Micro-animations](#23-interactions--micro-animations)
24. [Design Tokens Export](#24-design-tokens--référence)
25. [Accessibility Checklist](#25-accessibility-checklist)
26. [Handoff Developers](#26-handoff-developers)
27. [Figma / Framer Structure](#27-structure-figma--framer-recommandée)

---

# 1. DESIGN PHILOSOPHY

## 1.1 Principes directeurs

| Principe                     | Signification                                       | Anti-pattern                           |
| ---------------------------- | --------------------------------------------------- | -------------------------------------- |
| **Simplicité avant tout**    | Une action primaire par vue ; defaults excellents   | Toolbars surchargées, 12 CTAs          |
| **Accessible à tous**        | WCAG AA minimum, AAA sur textes critiques dark mode | Contrastes faibles, focus invisible    |
| **Moderne et professionnel** | Interfaces nettes, rythme typographique clair       | Skeuomorphisme, décor inutile          |
| **Pas de distractions**      | Le CV (preview) est le héros dans l’éditeur         | Badges flottants, confettis permanents |

## 1.2 Inspiration produit (sans copier)

- **Canva** : manipulation directe, preview fidèle, sensation « ce que je vois = ce que j’exporte »
- **Figma** : densité maîtrisée, panneaux latéraux, états focus précis, multi-sélection mentale
- **Apple** : hiérarchie typographique, espaces respirants, micro-interactions sobres

## 1.3 Doctrine éditeur (non négociable)

1. **Dual-pane permanent** (desktop) : Formulaire sticky gauche + CV Live droite
2. **Pas de bouton « Prévisualiser »** — la preview est toujours visible
3. **Update à chaque keystroke** (debounce 100–150 ms)
4. **Auto-save ≤ 5 s** avec indicateur Saved / Saving / Error
5. **Drag & drop sections** (pattern Canva-like) + alternative clavier

## 1.4 Voice & tone UI

- Clair, direct, rassurant
- Erreurs = instructions (« Ajoutez une date de fin ou cochez _Poste actuel_ »)
- Upsell Pro = valeur, jamais peur
- Badge « Suggestion IA » sur contenus générés

---

# 2. BRAND GUIDELINES

## 2.1 Logo & wordmark

| Élément     | Spec                                             |
| ----------- | ------------------------------------------------ |
| Wordmark    | « CV Studio » + « AI » en weight différencié     |
| Monogram    | « CS » dans rounded-square `radius.md`           |
| Clear space | ≥ hauteur du « C » autour du logo                |
| Tailles min | 24 px hauteur (UI) ; 16 px monogram seul         |
| Interdit    | Distorsion, ombres rainbow, outline non spécifié |

## 2.2 Tagline (marketing)

> « Des CV qui passent les filtres. »

## 2.3 Brand attributes

Moderne · Fiable · Expert · Efficace · Accessible

## 2.4 Do / Don’t

| Do                                  | Don’t                                  |
| ----------------------------------- | -------------------------------------- |
| Preview CV dominante dans l’éditeur | Cards décoratives dans le hero éditeur |
| Contrast fort sur CTA Primary       | Texte gris clair sur fond gris         |
| Motion courte et utile              | Parallax / glow excessifs              |
| États empty actionnables            | Empty states « rien ici » sans CTA     |

---

# 3. COLOR PALETTE

## 3.1 Primary / Secondary / Accent

| Token                     | Hex       | Usage                                             |
| ------------------------- | --------- | ------------------------------------------------- |
| `color.primary.DEFAULT`   | `#2563eb` | CTA principaux, liens actifs, focus ring          |
| `color.primary.hover`     | `#1d4ed8` | Hover primary                                     |
| `color.primary.active`    | `#1e40af` | Pressed                                           |
| `color.primary.subtle`    | `#eff6ff` | Backgrounds soft, selected rows                   |
| `color.secondary.DEFAULT` | `#7c3aed` | Accents secondaires, badges Pro soft              |
| `color.secondary.hover`   | `#6d28d9` | Hover secondary                                   |
| `color.secondary.subtle`  | `#f5f3ff` | Chips Pro, highlights IA                          |
| `color.accent.DEFAULT`    | `#ec4899` | Moments delight (sparingly), highlights marketing |
| `color.accent.subtle`     | `#fdf2f8` | Backgrounds promo légers                          |

**Règle d’usage :** Primary porte 80 % des actions. Secondary/Accent = emphase ponctuelle (badge Pro, marketing), **jamais** 3 CTAs colorés concurrents sur un même écran.

## 3.2 Neutrals

| Token         | Hex       |
| ------------- | --------- |
| `neutral.50`  | `#f9fafb` |
| `neutral.100` | `#f3f4f6` |
| `neutral.200` | `#e5e7eb` |
| `neutral.300` | `#d1d5db` |
| `neutral.400` | `#9ca3af` |
| `neutral.500` | `#6b7280` |
| `neutral.600` | `#4b5563` |
| `neutral.700` | `#374151` |
| `neutral.800` | `#1f2937` |
| `neutral.900` | `#111827` |

### Mapping sémantique light

| Rôle           | Token         |
| -------------- | ------------- |
| App background | `neutral.50`  |
| Surface / card | `#ffffff`     |
| Border default | `neutral.200` |
| Border strong  | `neutral.300` |
| Text primary   | `neutral.900` |
| Text secondary | `neutral.600` |
| Text muted     | `neutral.500` |
| Text disabled  | `neutral.400` |
| Icon default   | `neutral.600` |

## 3.3 Semantic

| Token            | Hex       | Usage                             |
| ---------------- | --------- | --------------------------------- |
| `success`        | `#10b981` | Saved, ATS grade A, success toast |
| `success.subtle` | `#ecfdf5` | Banner success bg                 |
| `warning`        | `#f59e0b` | ATS medium, warnings overflow     |
| `warning.subtle` | `#fffbeb` | Banner warning bg                 |
| `error`          | `#ef4444` | Errors, destructive               |
| `error.subtle`   | `#fef2f2` | Banner error bg                   |
| `info`           | `#3b82f6` | Info tips                         |
| `info.subtle`    | `#eff6ff` | Banner info bg                    |

## 3.4 Contraste (obligatoire)

| Paire                        | Ratio cible  | Niveau             |
| ---------------------------- | ------------ | ------------------ |
| `neutral.900` sur `#fff`     | ≥ 16:1       | AAA                |
| `neutral.600` sur `#fff`     | ≥ 7:1        | AAA body secondary |
| `primary` sur `#fff` (texte) | ≥ 4.5:1      | AA+                |
| Texte blanc sur `primary`    | ≥ 4.5:1      | AA                 |
| Dark mode body text          | **WCAG AAA** | Voir §22           |

## 3.5 Gradients (marketing only)

```
hero-gradient: linear-gradient(135deg, #2563eb 0%, #7c3aed 55%, #ec4899 100%)
```

Usage : fonds hero landing / illustrations — **interdit dans l’éditeur** (distraction).

---

# 4. TYPOGRAPHY

## 4.1 Font stack

```css
--font-sans:
  'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

| Rôle              | Famille        | Weights |
| ----------------- | -------------- | ------- |
| Headings          | Inter          | 600–700 |
| Body              | Inter          | 400–500 |
| Labels / UI       | Inter          | 500–600 |
| Code / JSON debug | JetBrains Mono | 400–500 |

**Chargement :** `next/font` (Inter + JetBrains_Mono) — `display: swap`, subset latin.

## 4.2 Type scale

| Token          | Size | Weight | Line-height | Letter-spacing | Usage            |
| -------------- | ---- | ------ | ----------- | -------------- | ---------------- |
| `display` / H1 | 48px | 600    | 1.2         | -0.02em        | Landing hero     |
| `h2`           | 36px | 600    | 1.3         | -0.02em        | Section titles   |
| `h3`           | 28px | 600    | 1.4         | -0.01em        | Subsections      |
| `h4`           | 24px | 600    | 1.4         | 0              | Cards titles     |
| `h5`           | 20px | 600    | 1.4         | 0              | Drawer titles    |
| `body-lg`      | 18px | 400    | 1.6         | 0              | Intro paragraphs |
| `body`         | 16px | 400    | 1.5         | 0              | Default UI/forms |
| `body-sm`      | 14px | 400    | 1.5         | 0              | Helper, table    |
| `caption`      | 12px | 500    | 1.4         | 0.01em         | Meta, timestamps |
| `overline`     | 11px | 600    | 1.3         | 0.08em         | UPPERCASE labels |

### Mobile type adjustments

| Token | Desktop | Mobile (≤640)           |
| ----- | ------- | ----------------------- |
| H1    | 48px    | 32px                    |
| H2    | 36px    | 28px                    |
| H3    | 28px    | 22px                    |
| Body  | 16px    | 16px (ne pas descendre) |

## 4.3 Rich text (bullets CV)

Dans le formulaire expériences : plain text multi-line, pas de WYSIWYG lourd.  
Preview : typographie template (peut différer d’Inter — polices template embeddables).

---

# 5. SPACING SYSTEM

## 5.1 Base unit = 4px

| Token      | Value                      |
| ---------- | -------------------------- |
| `space.1`  | 4px                        |
| `space.2`  | 8px                        |
| `space.3`  | 12px                       |
| `space.4`  | 16px                       |
| `space.5`  | 20px _(optionnel interne)_ |
| `space.6`  | 24px                       |
| `space.8`  | 32px                       |
| `space.12` | 48px                       |
| `space.16` | 64px                       |
| `space.24` | 96px                       |
| `space.32` | 128px                      |

Scale officielle demandée : **4, 8, 12, 16, 24, 32, 48, 64, 96, 128**.

## 5.2 Usage guidelines

| Contexte                  | Spacing   |
| ------------------------- | --------- |
| Padding bouton md         | 12px 16px |
| Gap champs formulaire     | 16px      |
| Padding card              | 24px      |
| Section landing verticale | 64–96px   |
| Editor pane padding       | 16–24px   |
| Modal padding             | 24px      |

**Règle :** pas de valeurs arbitraires (ex. 13px, 22px). Si besoin, étendre le scale via token nommé.

---

# 6. BORDER RADIUS

| Token         | Value | Usage                                  |
| ------------- | ----- | -------------------------------------- |
| `radius.sm`   | 4px   | Inputs sm, badges discrets, checkboxes |
| `radius.md`   | 8px   | Buttons, inputs, cards                 |
| `radius.lg`   | 12px  | Modals, drawers, dropdown panels       |
| `radius.xl`   | 16px  | Hero media frames, large panels        |
| `radius.full` | 999px | Pills, avatars, switches               |

---

# 7. SHADOWS & ELEVATION

| Token      | CSS                           | Usage                            |
| ---------- | ----------------------------- | -------------------------------- |
| `shadow.1` | `0 1px 3px rgba(0,0,0,0.1)`   | Cards repos, inputs focus soft   |
| `shadow.2` | `0 4px 6px rgba(0,0,0,0.1)`   | Dropdown, popover                |
| `shadow.3` | `0 10px 15px rgba(0,0,0,0.1)` | Modal                            |
| `shadow.4` | `0 20px 25px rgba(0,0,0,0.1)` | Command palette, elevated sheets |

Dark mode : utiliser ombres plus douces + border `neutral.700` (voir tokens dark).

Focus ring (accessibilité) :

```css
outline: 2px solid #2563eb;
outline-offset: 2px;
```

---

# 8. ICONS & IMAGERY

## 8.1 Icon system

- Librairie recommandée : **Lucide** (stroke 1.5–2)
- Tailles : 16 / 20 / 24 px
- Alignement : optical middle avec label
- Couleur : `currentColor`

## 8.2 Illustrations

- Style : line + flat soft fills (primary/secondary subtles)
- Empty states : 1 illustration + 1 titre + 1 CTA
- Pas d’emojis dans l’UI chrome (autorisés seulement dans copy marketing testée)

---

# 9. ANIMATIONS & TRANSITIONS

| Type               | Duration  | Easing                             | Exemples                                 |
| ------------------ | --------- | ---------------------------------- | ---------------------------------------- |
| Micro-interactions | 150–200ms | `ease-out`                         | Hover button, focus                      |
| Transitions UI     | 300ms     | `ease-out`                         | Drawer, tabs underline                   |
| Page transitions   | 400ms     | `ease-in-out`                      | Route fade                               |
| Spring delight     | ~500ms    | spring (stiffness 300, damping 24) | Score ATS count-up, first export success |

### Tokens motion

```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-moderate: 300ms;
--duration-slow: 400ms;
--easing-standard: cubic-bezier(0.2, 0, 0, 1);
--easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
```

**`prefers-reduced-motion: reduce`** → durées ≈ 0 / opacity only, pas de shake/spring.

### Motions produit obligatoires (PRD)

1. Score ATS count-up (400–600ms)
2. Cross-fade changement de template
3. Onboarding checkmarks séquentiels

---

# 10. COMPONENT LIBRARY

Spécifications : tailles, états, anatomy, a11y.  
Implémentation suggérée : Radix/shadcn + tokens CV Studio.

## 10.1 Button

### Variants

| Variant          | Style                                                           |
| ---------------- | --------------------------------------------------------------- |
| Primary          | bg `primary`, text white                                        |
| Secondary        | bg `secondary.subtle`, text `secondary`, border `secondary` 20% |
| Tertiary / Ghost | transparent, text `neutral.700`, hover `neutral.100`            |
| Destructive      | bg `error`, text white                                          |
| Link             | text `primary`, underline on hover                              |

### Sizes

| Size | Height | Padding | Font        |
| ---- | ------ | ------- | ----------- |
| sm   | 32px   | 8×12    | 14px/500    |
| md   | 40px   | 12×16   | 14–16px/500 |
| lg   | 48px   | 14×20   | 16px/600    |

### States

Default · Hover · Active · Focus-visible · Disabled · Loading (spinner 16px + label)

### Rules

- Min touch target mobile : **48×48** (padding hit area)
- Icon+label gap : 8px
- Loading : disable click, aria-busy

## 10.2 Input (Text, Email, Password, Number)

| Prop      | Spec                               |
| --------- | ---------------------------------- |
| Height md | 40px                               |
| Radius    | `md`                               |
| Border    | 1px `neutral.200`                  |
| Focus     | border `primary` + ring            |
| Error     | border `error` + message `body-sm` |
| Label     | au-dessus, 14px/500                |
| Helper    | sous le champ, `neutral.500`       |
| Password  | toggle show/hide, aria-pressed     |

## 10.3 Select / Dropdown

- Trigger = même anatomie Input
- Panel : `shadow.2`, `radius.lg`, max-height 280px scroll
- Option selected : bg `primary.subtle`
- Keyboard : ↑↓ Enter Esc Home End
- Searchable select si > 10 options

## 10.4 Checkbox / Radio

- Box 16–18px + label 16px
- Hit area 48px mobile
- Indeterminate checkbox supporté (bulk tables)
- Radio group : `role="radiogroup"`

## 10.5 Toggle Switch

- Track 44×24, thumb 20
- On = `primary`, Off = `neutral.300`
- Label à droite
- Ne pas animer si reduced-motion

## 10.6 Textarea

- Min-height 96px
- Resize vertical only
- Compteur caractères optionnel (caption)

## 10.7 Slider Range

- Track 4px, thumb 20px
- Value tooltip on drag
- ATS weight admin uniquement (pas user MVP)

## 10.8 Date Picker / Time Picker

- Month grid accessible
- Format affichage locale (`fr-FR` → MM/YYYY pour expériences CV souvent)
- Pour CV : **Month-Year picker** prioritaire sur date complète

## 10.9 Search Input

- Icon left 20px
- Clear button right quand value
- Debounce 200ms
- `role="searchbox"`

## 10.10 Badge

| Tone    | Bg                 | Text          |
| ------- | ------------------ | ------------- |
| Neutral | `neutral.100`      | `neutral.700` |
| Primary | `primary.subtle`   | `primary`     |
| Pro     | `secondary.subtle` | `secondary`   |
| Success | `success.subtle`   | success-ink   |
| Warning | `warning.subtle`   | warning-ink   |
| Error   | `error.subtle`     | error         |

Height 20–24px, radius `full`, caption 12px/500

## 10.11 Chip / Tag

- Removable chips (skills)
- Input + chips pattern pour Skills
- Max width truncate + tooltip

## 10.12 Avatar

| Size | px  |
| ---- | --- |
| xs   | 24  |
| sm   | 32  |
| md   | 40  |
| lg   | 64  |

- Image ou initials (2 lettres)
- Radius `full`
- Status dot optionnel (collab presence)

## 10.13 Tooltip

- Delay 300ms
- `shadow.2`, radius `sm`, max-width 240px
- Mobile : préférer inline helper (tooltips hover-only = desktop)

## 10.14 Popover

- Comme dropdown, contenu riche
- Focus trap si interactif

## 10.15 Modal / Dialog

| Size | Width                    |
| ---- | ------------------------ |
| sm   | 400px                    |
| md   | 560px                    |
| lg   | 720px                    |
| xl   | 960px (template preview) |

- Overlay `rgba(17,24,39,0.5)`
- Esc close, focus trap, return focus
- Header / Body / Footer sticky actions

## 10.16 Alert / Toast

### Alert inline

Icon + title + description + optional action

### Toast

- Position desktop : top-right
- Mobile : top full-width margin 16
- Auto-dismiss 4–6s (errors persist + dismiss)
- Stack max 3

## 10.17 Progress Bar

- Height 4–8px
- Indeterminate pour AI wait
- ATS score : progress circular optionnel 64px

## 10.18 Skeleton Loader

- `neutral.100` → shimmer vers `neutral.200`
- Respect reduced-motion (static pulse opacity)

## 10.19 Spinner

- 16 / 24 / 32
- Stroke `primary`
- `aria-label="Chargement"`

## 10.20 Empty State

Structure :

1. Illustration 120–160px
2. Title h4
3. Body-sm secondary
4. Primary CTA (+ optional secondary)

## 10.21 Error State

- Icon error
- Message actionnable
- CTA Retry / Support

## 10.22 Card

- bg white, border `neutral.200`, radius `md`, padding 24
- Hover optional `shadow.1` (list cards)
- **Pas de cards dans le hero landing** si on suit une composition brand forte — cards OK pour pricing & interactions

## 10.23 Table

- Header `caption`/`body-sm` 500, sticky optional
- Row height 48–56
- Hover `neutral.50`
- Actions overflow menu

## 10.24 Breadcrumb

- Separator `/` ou chevron
- Last item current non-link
- Collapse middle on mobile

## 10.25 Pagination

- Prev/Next + page numbers
- Ou « Load more » pour listes CV longues

## 10.26 Tabs

- Underline active primary 2px
- Keyboard arrows
- Editor mobile : Contenu | Aperçu | Outils

## 10.27 Accordion

- FAQ landing
- Chevron rotate 200ms
- One-open or multi (FAQ = multi)

## 10.28 Stepper / Timeline

- Onboarding horizontal 3–4 steps
- Interview prep timeline vertical

## 10.29 Composite — Plan Chip / Upgrade

- Chip plan Free/Pro/Business
- Button Upgrade (secondary/primary selon contexte)

## 10.30 Composite — Autosave Indicator

| State  | UI                                |
| ------ | --------------------------------- |
| Saving | Spinner 12 + « Enregistrement… »  |
| Saved  | Check success + « Enregistré »    |
| Error  | Error icon + « Réessayer » button |

---

# 11. LAYOUT PATTERNS & BREAKPOINTS

## 11.1 Grid

- 12 columns
- Gutter : 16px mobile / 24px desktop
- Max content width marketing : **1200px**
- App shell max : full viewport (editor)

## 11.2 Breakpoints

| Name       | Range      | Token   |
| ---------- | ---------- | ------- |
| Mobile     | 320–640px  | `bp.sm` |
| Tablet     | 641–1024px | `bp.md` |
| Desktop    | 1025px+    | `bp.lg` |
| Ultra-wide | 1441px+    | `bp.xl` |

```css
/* Mobile first */
@media (min-width: 641px) {
  /* tablet */
}
@media (min-width: 1025px) {
  /* desktop */
}
@media (min-width: 1441px) {
  /* ultra */
}
```

## 11.3 App shell desktop

```
+-- Topbar 56px --------------------------------------------------+
| Logo | Nav | Spacer | Plan chip | Upgrade | Avatar              |
+-- Sidebar 240px (optional settings) --+-- Main fluid -----------+
```

Editor = layout spécial (pas de sidebar app) — voir §14.

---

# 12. WIREFRAMES — LANDING PAGE

## 12.1 Objectifs UX

- 1 composition hero (brand dominant)
- 1 headline + 1 phrase + 1 CTA group
- Pas de clutter stats/cards dans le premier viewport
- Preuve + features **sous** le fold

## 12.2 Wireframe ASCII — Desktop

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Logo CV Studio AI]          Templates  Pricing  Blog     [Se connecter] │
│                                                           [Créer mon CV] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                         CV STUDIO AI                                     │
│              Des CV qui passent les filtres.                             │
│     Créez un CV ATS-ready, adapté à chaque offre, en 15 minutes.         │
│                                                                          │
│              [ Créer mon CV gratuitement ]   [ Voir les modèles ]        │
│                                                                          │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ FULL-BLEED PRODUCT VISUAL ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│   (Éditeur dual-pane — capture atmosphérique edge-to-edge)               │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  SECTION: Pourquoi CV Studio AI                                          │
│  [ATS explicable]     [IA contextuelle]     [Suite entretien]            │
├──────────────────────────────────────────────────────────────────────────┤
│  SECTION: Comment ça marche (3 steps stepper)                            │
├──────────────────────────────────────────────────────────────────────────┤
│  SECTION: Templates showcase (carousel thumbs)                           │
├──────────────────────────────────────────────────────────────────────────┤
│  SECTION: Témoignages (quotes, pas cards hero)                           │
├──────────────────────────────────────────────────────────────────────────┤
│  SECTION: Pricing  | Free | Pro | Business |                             │
├──────────────────────────────────────────────────────────────────────────┤
│  SECTION: FAQ accordion                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│  FINAL CTA band (primary bg subtle)                                      │
│  Footer: Product · Resources · Legal · Social · Lang                     │
└──────────────────────────────────────────────────────────────────────────┘
```

## 12.3 Specs composants landing

| Bloc           | Spec                              |
| -------------- | --------------------------------- |
| Nav height     | 64px sticky, blur optional        |
| Hero padding   | 64–96 top                         |
| CTA primary    | Button lg                         |
| Product visual | full-bleed, pas de card inset     |
| Pricing        | 3 colonnes desktop ; stack mobile |
| FAQ            | Accordion                         |

## 12.4 Motion landing

- Hero fade-in 400ms
- CTA hover lift shadow.1
- Scroll reveal soft (optional, disabled si reduced-motion)

---

# 13. WIREFRAMES — AUTHENTICATION

## 13.1 Sign Up

```
┌─────────────────────────────┐
│  [Logo]                     │
│  Créer votre compte         │
│  Déjà un compte ? Se connect│
│                             │
│  [ Continuer avec Google  ] │
│  [ Continuer avec LinkedIn] │
│  [ Continuer avec Apple   ] │
│  ──────── ou ────────       │
│  Email                      │
│  [________________________] │
│  Mot de passe               │
│  [________________________] │
│  [x] J’accepte CGU/Privacy  │
│  [ Créer mon compte       ] │
└─────────────────────────────┘
```

Layout : split optional (form left / brand visual right ≥1025px).  
Mobile : form only, centered, max-width 400px.

## 13.2 Sign In

Même structure ; lien « Mot de passe oublié ».

## 13.3 Forgot Password

Email → success state « Vérifiez votre boîte mail ».

## 13.4 Magic Link (option)

Email only CTA « Envoyer un lien magique ».

## 13.5 OAuth flows

- Boutons sociaux full-width, icon+label
- État loading sur redirect
- Erreur provider : Alert inline + fallback email

## 13.6 Email verification

Page état : icône mail + renvoyer lien (rate limited UI)

### Auth a11y

- Labels visibles
- Erreurs liées `aria-describedby`
- Ordre tab logique
- Contrast AAA sur textes

---

# 14. WIREFRAMES — MAIN EDITOR (CORE)

## 14.1 Layout desktop EXACT (référence)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎨 CV Studio AI   Fichier  Édition  Aide          [ATS 78] [Exporter] [●Pro]│
│ resume-title ✎                              Saving… / Enregistré     [Avatar]│
├──────────────┬──────────────────────────────┬───────────────────────────────┤
│ SECTIONS     │ FORMULAIRE (sticky/scroll)   │ CV LIVE VIEW (scroll indep.)  │
│ 56–64px rail │                              │                               │
│              │                              │   ┌─────────────────────────┐ │
│ ○ Profil     │ Personal Info                │   │                         │ │
│ ● Expérience │ Prénom  [____] Nom [____]    │   │      CV RENDER          │ │
│ ○ Formation  │ Email   [____]               │   │      (PDF-like page)    │ │
│ ○ Skills     │ Téléphone [____]             │   │                         │ │
│ ○ Langues    │ Titre   [________________]   │   │   Updates in real time  │ │
│ ○ Certifs    │                              │   │                         │ │
│ ○ Projets    │ Experience #1          [⋮]   │   │                         │ │
│              │ Entreprise [____]            │   │                         │ │
│ [+ Section]  │ Poste [____]                 │   └─────────────────────────┘ │
│              │ Dates [MM/YY]–[MM/YY] [x]Act │   Zoom  90 100 110   Pages 1/2│
│              │ • Bullet [____________] [AI] │                               │
│              │ [+ Bullet]  [= Drag handle]  │   (Drawer optional right AI)  │
├──────────────┴──────────────────────────────┴───────────────────────────────┤
│ Status: Enregistré · Plan Free · Mots 412 · A4 · Template: Atlas            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 14.2 Règles comportementales

| Règle                 | Détail                                                       |
| --------------------- | ------------------------------------------------------------ |
| Split ratio           | 42% form / 58% preview (ajustable drag splitter 32–55% form) |
| Left rail sections    | largeur 56–72px icons+tooltip ou 180px labels                |
| Form sticky header    | titre section courant                                        |
| Preview               | fond `neutral.100`, page blanche shadow.2, ratio A4/Letter   |
| Pas de Preview button | —                                                            |
| Keystroke sync        | debounce 100–150ms                                           |
| Autosave              | ≤5s / onBlur critique                                        |
| DnD                   | handles sur sections & bullets ; ghost opacity 0.6           |
| AI                    | bouton inline sur bullet → popover variants                  |

## 14.3 Topbar editor

Hauteur 56px.  
Gauche : logo (lien dashboard), menu File/Edit/Help (dropdown).  
Centre : nom CV editable inline.  
Droite : ATS chip (click ouvre drawer), Export primary, Plan/Upgrade, Avatar.

## 14.4 Drawer ATS / IA (right overlay 360–400px)

```
┌─ ATS Analyzer ────────── [x]─┐
│  Score  78          [B]      │
│  ████████████░░░░            │
│  Format ●●●●○                │
│  Structure ●●●●●             │
│  Mots-clés ●●●○○             │
│  [Coller une offre — Pro]    │
│  Suggestions list…           │
└──────────────────────────────┘
```

## 14.5 États éditeur

| État          | UI                                       |
| ------------- | ---------------------------------------- |
| Empty section | Empty state compact + CTA Ajouter        |
| Overflow page | Warning banner amber dans preview chrome |
| Offline       | Top banner warning + queue saves         |
| AI loading    | Skeleton dans popover                    |
| Paywall       | Modal md                                 |

## 14.6 Tablet editor (641–1024)

- Split 50/50 ou tabs Contenu / Aperçu si <900px
- Rail sections en horizontal scroll chips

## 14.7 Interactions Canva-like

1. Drag section reorder
2. Drag bullet reorder
3. Click preview highlight → focus related field (deep link)
4. Template switcher modal avec thumbs + apply crossfade

---

# 15. CV TEMPLATES — 5 DESIGNS DE BASE

> Note produit : le PRD privilégie ATS-safe. Le Template Creative porte un **badge warning ATS** si colonnes/icons risqués.

## 15.1 Template 1 — Modern (minimaliste, 2 colonnes)

```
┌────────────┬──────────────────────────┐
│ SIDEBAR    │ MAIN                     │
│ Name       │ Expérience               │
│ Contact    │ Education                │
│ Skills     │ Projets                  │
│ Languages  │                          │
└────────────┴──────────────────────────┘
```

- Couleur primary sidebar soft
- ATS level : **High** (tester parsing dual-col)
- Preview thumb : clean blue accent

## 15.2 Template 2 — Creative (couleurs, icons)

```
┌───────────────────────────────────────┐
│ HEADER color band + Name + icons      │
│ Summary                               │
│ Exp | Edu  (cards soft)               │
│ Skills as icon chips                  │
└───────────────────────────────────────┘
```

- Accent secondary/pink sparingly
- ATS : **Medium** + warning UI à la sélection
- Usage : portfolios créatifs / opt-in

## 15.3 Template 3 — Executive (formel)

```
┌───────────────────────────────────────┐
│ NAME                         Contact  │
│ Headline                              │
│ ───────────────────────────────────── │
│ Expérience (dense, serif optional)    │
│ Leadership / Board                    │
│ Formation                             │
└───────────────────────────────────────┘
```

- Single column, typographie sobre
- ATS : **High / Max**
- Couleurs neutres + primary text links only

## 15.4 Template 4 — Startup (décontracté, moderne)

```
┌───────────────────────────────────────┐
│ Name / Role                           │
│ Links row (GitHub, Site)              │
│ Impact bullets                        │
│ Skills dense                          │
└───────────────────────────────────────┘
```

- Radius soft on separators
- ATS : **High**
- Ton jeune / tech

## 15.5 Template 5 — ATS-Optimized (simple, scannable)

```
┌───────────────────────────────────────┐
│ NAME                                  │
│ email | phone | city | linkedin       │
│ SUMMARY                               │
│ EXPERIENCE                            │
│ EDUCATION                             │
│ SKILLS                                │
└───────────────────────────────────────┘
```

- Single column, headings standards
- ATS : **Max**
- Défaut recommandé onboarding « Premier emploi / ATS »

## 15.6 Template picker UI

Modal xl : grille 2–3 cols, filtres ATS level / persona, badge Pro, CTA Utiliser.

---

# 16. TEMPLATES MARKETPLACE

## 16.1 Browse wireframe

```
┌─ Marketplace ──────────────────────────────────────────────┐
│ Search [____________]  Filters: ATS · Industry · Price · ★ │
│ Sort: Popular | New | Price                                │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                        │
│ │Thumb │ │Thumb │ │Thumb │ │Thumb │                        │
│ │Name  │ │      │ │      │ │      │                        │
│ │$9 ★4.8│ │      │ │      │ │      │                        │
│ └──────┘ └──────┘ └──────┘ └──────┘                        │
└────────────────────────────────────────────────────────────┘
```

## 16.2 Preview & Purchase

- Preview modal xl (CV sample)
- Reviews list
- Buy → Stripe → unlock → « Appliquer à mon CV »
- Library « Mes templates » sous Dashboard

## 16.3 Designer submission (phase later)

Form upload + ATS checklist auto + review status badges

---

# 17. DASHBOARD

## 17.1 Wireframe desktop

```
┌─ Dashboard ────────────────────────────────────────────────┐
│ Bonjour, Léa                        [Nouveau CV]           │
│ ┌ Stat CVs ┐ ┌ Vues lien ┐ ┌ Score ATS moy ┐ ┌ Plan ┐     │
│ │    3     │ │    12     │ │     81        │ │ Free │     │
│ └──────────┘ └───────────┘ └───────────────┘ └──────┘     │
│                                                            │
│ Récents                                                    │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│ │ CV thumb   │ │            │ │  + Créer   │               │
│ │ Title      │ │            │ │            │               │
│ │ Edited 2h  │ │            │ │            │               │
│ └────────────┘ └────────────┘ └────────────┘               │
│                                                            │
│ Templates populaires     Activity feed (right col ≥1441)   │
└────────────────────────────────────────────────────────────┘
```

## 17.2 Quick actions

Nouveau CV · Importer LinkedIn (Pro) · Analyser ATS · Voir Pricing

## 17.3 Empty dashboard

Empty state + CTA Créer mon premier CV

---

# 18. SETTINGS & ACCOUNT

## 18.1 IA nav

```
Settings
├─ Profil
├─ Abonnement
├─ Facturation
├─ Sécurité
├─ Intégrations
└─ Préférences
```

Layout : sidebar 240 + content 720 max.

### Profil

Nom, email, avatar, locale, persona goal

### Abonnement

Plan actuel, usage quotas IA, upgrade/downgrade, portal Stripe

### Facturation

Table factures, download PDF

### Sécurité

Password, 2FA, sessions devices, delete account (danger zone)

### Intégrations

Google / LinkedIn / Apple connection status

### Préférences

Theme (System/Light/Dark), langue UI, emails lifecycle toggles

---

# 19. MOBILE DESIGN

## 19.1 Bottom navigation (App)

```
┌────────────────────────────┐
│         Content            │
│                            │
├────────────────────────────┤
│  Home  Editor*  Templates  │
│  Settings                  │
└────────────────────────────┘
```

*Editor accessible via CV sélectionné.

## 19.2 Editor mobile — stacked tabs

```
┌────────────────────────────┐
│ ← CV Title     [Export]    │
│ [Contenu] [Aperçu] [Outils]│
├────────────────────────────┤
│ Form sections accordion    │
│ OR Preview page            │
│ OR ATS/AI tools            │
└────────────────────────────┘
```

## 19.3 Touch rules

- Targets ≥ 48px
- DnD : long-press + move, ou boutons Reorder
- Sticky Export CTA
- Offline indicator chip

## 19.4 Typography mobile

H1 32 / H2 28 / Body 16 inchangé

---

# 20. RESPONSIVE DESIGN RULES

## 20.1 Mobile 320–640

- 1 colonne
- Bottom nav app / hamburger marketing
- Pricing stack
- Editor tabs
- Tables → cards

## 20.2 Tablet 641–1024

- 2 colonnes possibles (dashboard)
- Editor split si width ≥900 sinon tabs
- Touch + mouse (hover = progressive enhancement)

## 20.3 Desktop 1025+

- Dual-pane editor full
- Sidebar settings
- Modals centrés

## 20.4 Ultra-wide 1441+

- Dashboard 3 colonnes (stats | recent | activity)
- Preview CV max-width page + margins auto (ne pas étirer le PDF-like)

---

# 21. ACCESSIBILITY (WCAG AA+)

## 21.1 Requirements

| Item              | Spec                                                                   |
| ----------------- | ---------------------------------------------------------------------- |
| Contrast text     | ≥ 4.5:1 (AA) ; AAA visé body                                           |
| Contrast UI large | ≥ 3:1                                                                  |
| Keyboard          | Tab, Shift+Tab, Enter, Space, Esc, Arrows                              |
| Focus             | outline 2px primary offset 2px, never `outline:none` sans remplacement |
| Semantics         | landmarks header/nav/main ; headings order                             |
| Forms             | label visible ; errors announced                                       |
| Skip link         | « Aller au contenu »                                                   |
| Images            | alt textuel                                                            |
| Live regions      | autosave & toasts `aria-live=polite`                                   |
| Motion            | `prefers-reduced-motion`                                               |
| Hit targets       | ≥ 24px AA ; **48px** mobile confort                                    |

## 21.2 Editor a11y specifics

- Preview `aria-label="Aperçu du CV"`
- Section rail `nav`
- DnD alternatives « Monter / Descendre »
- AI dialogs labelled

---

# 22. DARK MODE

## 22.1 Mapping

| Light                        | Dark                             |
| ---------------------------- | -------------------------------- |
| bg `neutral.50`              | `#0b1220` / `neutral.900`        |
| surface `#fff`               | `neutral.800`                    |
| border `neutral.200`         | `neutral.700`                    |
| text `neutral.900`           | `neutral.50`                     |
| text secondary `neutral.600` | `neutral.300`                    |
| primary                      | `#3b82f6` (lighten for contrast) |
| secondary                    | `#a78bfa`                        |
| accent                       | `#f472b6`                        |

**Tous les textes body dark mode : viser WCAG AAA** (≥7:1).

## 22.2 Implementation

- `class="dark"` sur `html` ou `data-theme`
- Transition surfaces 200ms
- Preférence : System default + manual toggle Settings
- Preview CV page reste fond blanc (fidélité papier) ; chrome editor dark

## 22.3 Shadows dark

Préférer border + `shadow` très soft `rgba(0,0,0,0.4)`

---

# 23. INTERACTIONS & MICRO-ANIMATIONS

| Interaction     | Spec                                                            |
| --------------- | --------------------------------------------------------------- |
| Page load       | fade-in 300ms opacity                                           |
| Hover button    | bg darken + optional translateY(-1px) 150ms                     |
| Success toast   | slide+fade + icon scale spring                                  |
| Error field     | subtle shake 200ms (disabled si reduced-motion)                 |
| Loading         | skeletons prior to spinners for content panes                   |
| Drag            | cursor grabbing, placeholder gap, drop highlight primary.subtle |
| Template switch | cross-fade preview 300ms                                        |
| ATS score       | count-up 500ms                                                  |
| First export    | success modal soft (optional A/B)                               |

---

# 24. DESIGN TOKENS — RÉFÉRENCE

Les tokens canoniques sont exportés dans :

- `docs/design-tokens.json`
- `docs/design-tokens.css`

Les développeurs doivent consommer les tokens (CSS variables / Tailwind theme extend), **jamais** hardcoder les hex hors exceptions templates CV.

### Naming convention

`category.property.variant` → CSS `--cv-color-primary-default`

---

# 25. ACCESSIBILITY CHECKLIST

## Design

- [ ] Contrast text ≥ 4.5:1 vérifié (Stark / Colour Contrast Analyser)
- [ ] Contrast dark mode AAA body text
- [ ] Focus states designés pour tous les interactifs
- [ ] Pas d’info par la couleur seule (ATS score a label texte)
- [ ] Illustrations avec équivalent textuel
- [ ] Motion specs incluent reduced-motion

## Engineering

- [ ] Skip link
- [ ] Landmark roles
- [ ] Labels `htmlFor`
- [ ] `aria-invalid` + messages liés
- [ ] Focus trap modals
- [ ] Esc ferme overlays
- [ ] Hit targets mobile 48px
- [ ] axe-core CI = 0 critical
- [ ] Keyboard-only parcours signup → export

## QA

- [ ] VoiceOver / NVDA smoke editor
- [ ] Zoom 200% usable
- [ ] Windows High Contrast smoke

---

# 26. HANDOFF DEVELOPERS

## 26.1 Stack UI recommandée

- Next.js 14+ App Router
- Tailwind CSS branché sur `design-tokens`
- Radix UI primitives + wrappers CV Studio
- Framer Motion (respect reduced-motion)
- Lucide icons

## 26.2 Dossiers suggérés

```
/components/ui/          # primitives
/components/editor/      # dual-pane, rails, preview
/components/marketing/   # landing sections
/styles/tokens.css
```

## 26.3 Definition of Done UI

1. Tokens used
2. Light + Dark verified
3. Responsive breakpoints OK
4. Focus visible
5. Loading/Empty/Error states
6. Analytics ids on primary CTAs
7. Storybook story (si adopté) pour chaque primitive

## 26.4 Figma ↔ Code parity

- Naming components alignés (Button/Primary/md)
- Spacings strict scale
- Screenshot QA editor dual-pane vs Figma frame `Editor/Desktop`

---

# 27. STRUCTURE FIGMA / FRAMER RECOMMANDÉE

> Livrable attendu « Figma file » : ce document + tokens constituent la spec. Créer le fichier Figma selon la structure ci-dessous (à exécuter dans Figma).

## Pages Figma

1. **Cover** — brand + version
2. **Foundations** — color, type, space, radius, shadow, motion
3. **Components** — variants & states (// component library)
4. **Patterns** — forms, empty, toasts, paywall
5. **Flows / Wireframes** — Landing, Auth, Editor, Dashboard, Settings, Marketplace, Mobile
6. **Templates CV** — 5 templates + annotation ATS level
7. **Dark Mode** — mirrored key screens
8. **Handoff** — redlines editor + checklist

## Components Figma (auto-layout)

Button · Input · Select · Checkbox · Radio · Switch · Textarea · Badge · Chip · Avatar · Tooltip · Modal · Toast · Tabs · Card · EmptyState · PlanChip · AutosaveIndicator · ATSScoreChip

## Framer (option marketing)

- Landing interactive prototype
- Hero dual-pane animation subtle
- Pricing toggle monthly/yearly

## Export checklist

- [ ] Styles color & text published
- [ ] Components documented descriptions
- [ ] Prototype links Auth → Onboarding → Editor
- [ ] Dev Mode ready (si Figma Dev Mode)
- [ ] Tokens synced vers JSON (Tokens Studio / Style Dictionary)

---

# 28. COMPONENT STATE MATRIX (RÉSUMÉ)

| Component | Default     | Hover | Focus | Active   | Disabled | Loading | Error      |
| --------- | ----------- | ----- | ----- | -------- | -------- | ------- | ---------- |
| Button    | ●           | ●     | ●     | ●        | ●        | ●       | —          |
| Input     | ●           | ●     | ●     | —        | ●        | —       | ●          |
| Select    | ●           | ●     | ●     | open     | ●        | ●       | ●          |
| Switch    | on/off      | ●     | ●     | —        | ●        | —       | —          |
| Modal     | open/closed | —     | trap  | —        | —        | content | —          |
| Toast     | enter       | —     | —     | —        | —        | —       | persistent |
| Tabs      | inactive    | ●     | ●     | selected | ●        | —       | —          |

---

# 29. EDITOR — MICROCOPY FR (EXTRAIT)

| Clé                    | Texte                                               |
| ---------------------- | --------------------------------------------------- |
| editor.autosave.saving | Enregistrement…                                     |
| editor.autosave.saved  | Enregistré                                          |
| editor.autosave.error  | Impossible d’enregistrer. Réessayer                 |
| editor.export          | Exporter PDF                                        |
| editor.ats.analyze     | Analyser l’ATS                                      |
| editor.ats.score       | Score ATS                                           |
| editor.ai.optimize     | Améliorer avec l’IA                                 |
| editor.ai.pro_badge    | Pro                                                 |
| editor.section.add     | Ajouter une section                                 |
| editor.preview.label   | Aperçu du CV en temps réel                          |
| editor.dnd.reorder     | Réordonner                                          |
| editor.offline         | Hors ligne — les modifications seront synchronisées |

---

# 30. Z-INDEX SCALE

| Token        | Value | Usage                  |
| ------------ | ----- | ---------------------- |
| `z.base`     | 0     | content                |
| `z.sticky`   | 10    | topbar, sticky headers |
| `z.dropdown` | 20    | menus                  |
| `z.overlay`  | 30    | drawers                |
| `z.modal`    | 40    | dialogs                |
| `z.toast`    | 50    | toasts                 |
| `z.tooltip`  | 60    | tooltips               |

---

# 31. PERFORMANCE DESIGN BUDGETS

| Item                  | Budget                                           |
| --------------------- | ------------------------------------------------ |
| Hero LCP image        | ≤ 300 KB                                         |
| Fonts Inter+JetBrains | subset, ≤ 2 weights initiaux critiques (400/600) |
| Editor first paint    | skeleton dual-pane ≤ 1s perceived                |
| Preview update        | ≤ 150ms debounce typing                          |
| Animation jank        | 60fps desktop mid-tier                           |

---

# 32. ALIGNEMENT PRD ↔ DESIGN

| PRD requirement       | Design response            |
| --------------------- | -------------------------- |
| Dual-pane live        | §14 layout exact           |
| No preview button     | Preview always on          |
| Autosave 5s           | AutosaveIndicator          |
| ATS score             | ATS chip + drawer          |
| Free PDF no watermark | Export CTA always for 1 CV |
| Pro gating            | Badge + modal paywall      |
| WCAG AA               | §21 + checklist            |
| Lighthouse ≥90        | performance budgets §31    |
| Templates 5 MVP       | §15                        |
| Marketplace           | §16                        |

---

# 33. BRAND COLOR EXPORT (QUICK REF)

```
Primary:   #2563EB
Secondary: #7C3AED
Accent:    #EC4899
Success:   #10B981
Warning:   #F59E0B
Error:     #EF4444
Info:      #3B82F6
Neutral900:#111827
White:     #FFFFFF
```

---

# 34. NEXT STEPS DESIGN TEAM

1. Créer fichier Figma selon §27 (Foundations → Components → Flows)
2. Brancher Tokens Studio → `design-tokens.json`
3. Prototyper Editor dual-pane (priority P0)
4. Usability test 5 users (click test signup→export)
5. QA contraste dark mode AAA
6. Livrer Storybook sync sprint 1–2

---

_CV Studio AI Design System v1.0 — Référence Frontend & Design_
_À utiliser avec le PRD v1.0 et les fichiers `design-tokens.json` / `design-tokens.css`_
