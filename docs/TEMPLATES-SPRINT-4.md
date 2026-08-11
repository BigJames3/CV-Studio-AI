# Sprint 4 — CV Templates

Five official templates: **Modern**, **Creative**, **Executive**, **Startup**, **ATS-Optimized**.

## App routes

| Route                  | Purpose                              |
| ---------------------- | ------------------------------------ |
| `/dashboard/templates` | Selection + live customizer + create |
| `/editor/[id]`         | Live preview via `TemplateWrapper`   |
| Marketing `/templates` | Public gallery                       |

## Components

`apps/web/src/components/templates/`

- `ModernTemplate.tsx` — 2-column, Inter, blue accents
- `CreativeTemplate.tsx` — gradient header, icons, timeline
- `ExecutiveTemplate.tsx` — formal, gold accents
- `StartupTemplate.tsx` — asymmetric, Poppins, neon
- `ATSTemplate.tsx` — single column, black/white, no graphics
- `TemplateWrapper.tsx` — selects renderer + merges customization

## Customization (stored in `CV.content.customization`)

primary/accent/background · header/body fonts · density · showPhoto/summary/experience/education/skills/references

## API

`GET /templates` · `GET /templates/:id` (includes `designData`) · seeds in `apps/api/src/modules/templates/template-seeds.ts`
