# A11y rules — components (short)

1. Icon-only controls require `aria-label`.
2. Prefer roles from testing-library (`getByRole`) in tests.
3. Dialogs/Sheets: focus trap + Escape (Radix default).
4. Errors: `role="alert"` or `aria-live`.
5. SaveIndicator: `aria-live="polite"`.
6. Never remove `:focus-visible` ring.
7. Hit target ≥ 44px on touch breakpoints.
8. Color not the only status cue (icon + text).
9. `prefers-reduced-motion` respected (globals + Framer presets).
10. Storybook a11y addon must be green before merge on primitives.
