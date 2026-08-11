# CV Studio AI — Mobile (`apps/mobile`)

Expo (dev client) · React Native · TypeScript · React Navigation · Zustand · WatermelonDB · Expo Notifications · Stripe Payment Sheet.

## Docs

Architecture complète : [`docs/MOBILE-CV-STUDIO-AI.md`](../../docs/MOBILE-CV-STUDIO-AI.md)

## Prerequisites

- Node 20+
- EAS CLI (`npm i -g eas-cli`)
- **Dev client / prebuild** required for WatermelonDB + Stripe (Expo Go insuffisant pour offline prod)

## Setup

```bash
cd apps/mobile
cp .env.example .env
pnpm install
npx expo prebuild
npx expo run:ios   # or run:android
```

## Key modules

| Path                            | Role                                |
| ------------------------------- | ----------------------------------- |
| `src/navigation/`               | Auth / Tabs / Editor + deep linking |
| `src/stores/`                   | Zustand auth, UI, editor, sync      |
| `src/db/`                       | WatermelonDB schema + sync engine   |
| `src/services/notifications.ts` | Push registration                   |
| `src/services/payments.ts`      | Apple Pay / Google Pay via Stripe   |
| `src/components/cv-preview/`    | Live preview (native v1)            |

## Deep links

- Scheme: `cvstudio://`
- Universal: `https://app.cvstudio.ai/cv/:id`

## Backend dependencies (à brancher)

- `POST /devices`
- `POST /payments/payment-sheet`
- `GET /cvs?updatedSince=`

## Status

Phase 0 scaffold — aligné PRD Phase 4 (M9–M12).
