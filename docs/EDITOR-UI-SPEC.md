# Editor Dual-Pane — Spec technique UI (extrait)

Complément opérationnel du Design System §14 pour les développeurs front-end.

## Structure DOM recommandée

```html
<div class="editor-shell" data-testid="cv-editor">
  <header class="editor-topbar">...</header>
  <div class="editor-body">
    <nav class="editor-section-rail" aria-label="Sections du CV">...</nav>
    <section class="editor-form-pane" aria-label="Formulaire">...</section>
    <div class="editor-splitter" role="separator" aria-orientation="vertical"></div>
    <section class="editor-preview-pane" aria-label="Aperçu du CV en temps réel">
      <div class="cv-page" data-paper="A4">...</div>
    </section>
  </div>
  <footer class="editor-statusbar">...</footer>
  <aside class="editor-drawer" hidden>...</aside>
</div>
```

## CSS layout (principe)

```css
.editor-shell {
  display: grid;
  grid-template-rows: var(--cv-topbar-height) 1fr auto;
  height: 100dvh;
  background: var(--cv-surface-app);
}

.editor-body {
  display: grid;
  grid-template-columns: var(--cv-editor-rail-width) minmax(280px, 42fr) 6px minmax(320px, 58fr);
  min-height: 0;
}

.editor-form-pane,
.editor-preview-pane {
  overflow: auto;
  min-height: 0;
}

.editor-preview-pane {
  background: var(--cv-color-neutral-100);
  display: flex;
  justify-content: center;
  padding: var(--cv-space-6);
}

.cv-page {
  width: min(100%, 210mm);
  aspect-ratio: 210 / 297; /* A4 — Letter override via data-paper */
  background: #fff;
  box-shadow: var(--cv-shadow-2);
  border-radius: var(--cv-radius-sm);
}
```

## Sync preview

1. Form state (React controlled / Zustand)
2. Debounce `150ms` (`--cv-editor-debounce-ms`)
3. Re-render template component
4. **Aucun** bouton Prévisualiser

## Autosave

1. Dirty flag on change
2. Interval ≤ 5000ms + flush on blur/unmount
3. PATCH `/resumes/:id`
4. Update AutosaveIndicator states

## Breakpoints editor

| Width    | Layout                         |
| -------- | ------------------------------ |
| ≥1025    | Dual-pane + rail               |
| 900–1024 | Dual-pane 50/50, rail icons    |
| <900     | Tabs Contenu / Aperçu / Outils |

## Interdit

- Cards décoratives sur la preview
- Watermark Free sur le 1er PDF (PRD)
- Masquer la preview derrière un CTA
