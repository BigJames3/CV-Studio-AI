# CV Studio AI — Mobile (`apps/mobile`)

Expo (dev client) · React Native · TypeScript · React Navigation · Zustand · WatermelonDB · Expo Notifications · Paystack (page de paiement web, Android uniquement).

## Docs

Architecture complète : [`docs/MOBILE-CV-STUDIO-AI.md`](../../docs/MOBILE-CV-STUDIO-AI.md)

## Prerequisites

- Node 20+
- EAS CLI (`npm i -g eas-cli`)
- **Dev client / prebuild** required for WatermelonDB (Expo Go insuffisant pour offline prod)

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
| `src/services/payments.ts`      | Paystack checkout (Android only)    |
| `src/components/cv-preview/`    | Live preview (native v1)            |

## Deep links

- Scheme: `cvstudio://`
- Universal: `https://app.cvstudio.ai/cv/:id`

## Backend dependencies (à brancher)

- `POST /devices`
- `GET /cvs?updatedSince=`

## Paiements

Les formules Pro et Business sont des périodes prépayées (un mois ou un an) payées en une fois via Paystack :

- **Android** : `POST /subscriptions/checkout` renvoie l’URL de la page Paystack, ouverte dans le navigateur (`Linking.openURL`). Au retour dans l’app, la référence est envoyée à `POST /payments/checkout/confirm` puis la formule est relue (`GET /subscriptions/me`).
- **iOS** : aucun achat ni lien d’achat dans l’app (règle App Store 3.1.1 sur les contenus numériques payés hors In-App Purchase). Le paywall affiche seulement la formule actuelle.

## Status

Phase 0 scaffold — aligné PRD Phase 4 (M9–M12).
