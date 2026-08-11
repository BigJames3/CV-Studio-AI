# Accessibility Checklist — CV Studio AI

Référence : Design System §21–§25 · Objectif **WCAG 2.2 AA** (AAA dark body text)

## Foundations

- [ ] Contraste texte courant ≥ 4.5:1
- [ ] Contraste texte large / UI ≥ 3:1
- [ ] Dark mode body text ≥ 7:1 (AAA)
- [ ] Focus visible sur tous les interactifs (`--cv-focus-ring`)
- [ ] `prefers-reduced-motion` respecté

## Navigation

- [ ] Skip link « Aller au contenu »
- [ ] Landmarks `header` / `nav` / `main` / `footer`
- [ ] Ordre de tabulation logique
- [ ] Esc ferme modal / drawer / dropdown

## Forms

- [ ] Labels visibles (pas placeholder-only)
- [ ] Erreurs liées via `aria-describedby`
- [ ] `aria-invalid` sur champs en erreur
- [ ] Instructions autosave en `aria-live="polite"`

## Editor

- [ ] Preview nommé (`aria-label`)
- [ ] Alternative clavier au drag-and-drop (Monter/Descendre)
- [ ] Drawer ATS/IA focus trap
- [ ] Touch targets ≥ 48px mobile

## Media

- [ ] Alt text images / illustrations
- [ ] Icônes décoratives `aria-hidden`
- [ ] Icônes informatives avec nom accessible

## QA

- [ ] axe-core : 0 critical
- [ ] Parcours clavier : signup → editor → export
- [ ] VoiceOver ou NVDA smoke
- [ ] Zoom navigateur 200%
