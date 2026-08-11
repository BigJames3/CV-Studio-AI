# @cvstudio/web — Next.js 14 App Router

Frontend CV Studio AI (Vercel-ready).

## Spec

Voir [`docs/FRONTEND-CV-STUDIO-AI.md`](../../docs/FRONTEND-CV-STUDIO-AI.md)

## Quick start

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

- App: http://localhost:3000
- API attendue: `NEXT_PUBLIC_API_URL` (défaut `http://localhost:3001/api/v1`)

## Architecture rapide

| Couche       | Techno                                           |
| ------------ | ------------------------------------------------ |
| Pages        | App Router groups `(marketing)` `(auth)` `(app)` |
| Server state | TanStack Query                                   |
| Editor state | Zustand `editorStore`                            |
| Forms        | RHF + Zod                                        |
| Tokens       | `src/app/tokens.css` (Design System)             |
| Auth gate    | `middleware.ts`                                  |

## Routes livrées (scaffold)

- `/` landing
- `/pricing` `/templates`
- `/login` `/register` `/forgot-password`
- `/dashboard` `/editor/[resumeId]`
- `/account/billing` `/marketplace`
- `/p/[slug]` portfolio public
- `/api/health`

## Lighthouse

Cibles ≥90 — RSC marketing, `next/font`, dynamic editor, ISR templates (à brancher), headers sécu dans `next.config.mjs`.
