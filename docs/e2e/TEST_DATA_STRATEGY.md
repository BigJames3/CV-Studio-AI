# Stratégie de données de test E2E

---

## 1. Principes

1. **Aucun user partagé** (`test@example.com` interdit). Collision CI + local + staging.
2. **Email unique** : `e2e.{timestamp}-{rand}@cvstudio.test`.
3. **Teardown** : `DELETE /api/v1/users/me` (soft-delete GDPR déjà en prod).
4. **Pas de Prisma dans web.** Lecture via API.
5. **Seed** = plans + templates, pas des comptes humains.

---

## 2. Seed DB (obligatoire avant E2E)

```bash
pnpm db:seed
```

`apps/api/prisma/seed.ts` :

| Plan     | `cvLimit` | Prix mois |
| -------- | --------- | --------- |
| Free     | 1         | 0         |
| Pro      | 999999    | 9.99      |
| Business | 999999    | 29.99     |

Checkout bypass et webhooks `applyStripeSubscription` **throw** si plan absent (P0-2). Seed manquant = E2E rouge immédiat.

Templates : nécessaires à l’éditeur, pas au quota.

---

## 3. Users

| Champ                | Valeur                                      |
| -------------------- | ------------------------------------------- |
| email                | `uniqueEmail()`                             |
| password             | `E2E_PASSWORD` ou `TestPassword123!`        |
| firstName / lastName | `E2E` / `User` (welcome = « Bonjour, E2E ») |
| tier initial         | `free` (default Prisma)                     |
| 2FA                  | off                                         |

Provisioning : `POST /auth/register` (plus rapide et déterministe que l’UI). Le test **login** rejoue ensuite le formulaire.

Mot de passe : regex API `lettre + chiffre`, min 8. `Test123!` du brief **échoue** le register (trop court / policy). Ne pas l’utiliser.

---

## 4. Cartes Stripe (test mode uniquement)

Source : [Stripe testing](https://docs.stripe.com/testing)

| Cas          | PAN                | Tag                              |
| ------------ | ------------------ | -------------------------------- |
| Succès       | `4242424242424242` | `@stripe`                        |
| Declined     | `4000000000000002` | `@stripe`                        |
| Expired      | `4000000000000069` | `@stripe`                        |
| Insufficient | `4000000000009995` | dispo helper, pas de spec dédiée |
| Invalid      | `1234567890123456` | helper                           |

Expiry / CVC E2E : `1234` / `123` (Checkout reformate MM/YY).

**CI default n’envoie aucune carte** : clé `sk_test_xxx` → bypass.

---

## 5. Isolation & concurrence

| Ressource          | Stratégie                                                   |
| ------------------ | ----------------------------------------------------------- |
| Users              | Email unique + soft-delete                                  |
| CVs                | Cascade / `userId` ; quota compte `deletedAt: null`         |
| Subscriptions      | 1:1 `userId` unique — upsert, pas de 2e row                 |
| Webhook events     | PK = `event.id` Stripe ; tests Jest                         |
| Redis locks        | Préfixe `stripe:webhook:` ; E2E bypass n’écrit pas d’events |
| Rate limit auth    | `AUTH_RATE_LIMIT_DISABLED=true` **E2E only**                |
| Playwright workers | **1** (Throttler 120/min)                                   |

Ne pas pointer E2E sur la DB **prod**. CI utilise `cvstudio_e2e`. Local : docker `cvstudio` (données de dev mélangées aux `@cvstudio.test` — acceptable, filtrable).

---

## 6. Cleanup

### Par test (automatique)

```
DELETE /users/me  → deletedAt, sessions revoked
```

Soft-delete : l’email **ne peut pas** se ré-enregistrer (`findFirst deletedAt: null`). Les timestamps rendent la collision improbable.

### Optionnel ops (staging)

```sql
-- revue manuelle uniquement, jamais en prod
DELETE FROM stripe_webhook_events
 WHERE id LIKE 'evt_%' AND created_at < now() - interval '14 days';
```

Users E2E : pas de `DELETE FROM users WHERE email LIKE '%@cvstudio.test'` dans le CI (FK, RLS, audits). Soft-delete suffit.

### Stripe Dashboard (test mode)

Customers créés par `@stripe` : purge périodique (Test data → Remove test data) ou cancel subscription via l’API cancel déjà appelée.

---

## 7. Privacy

- Domaine `@cvstudio.test` : pas de vrais PII, pas d’envoi SMTP réel si Mailpit.
- Interdit : emails de collègues, PAN live, `sk_live_`.
- Artifacts Playwright (video, trace) : peuvent contenir l’email unique — retention CI 14j, pas de secrets carte (bypass).
- `@stripe` : PAN test uniquement ; traces = données test Stripe.

Mail : register peut déclencher verify-email. Mailpit local (`:1025`). CI n’a pas Mailpit : l’envoi échoue silencieusement si SMTP down — **ne pas** faire dépendre l’E2E de l’inbox.

---

## 8. Variables

| Var                         | Default                                                 | Rôle                     |
| --------------------------- | ------------------------------------------------------- | ------------------------ |
| `E2E_API_URL`               | `NEXT_PUBLIC_API_URL` ou `http://localhost:3001/api/v1` | Helpers                  |
| `E2E_PASSWORD`              | `TestPassword123!`                                      | Register/login           |
| `E2E_STRIPE`                | unset                                                   | Inclut `@stripe`         |
| `E2E_REAL_PDF`              | unset                                                   | Réservé (non branché T1) |
| `PLAYWRIGHT_BASE_URL`       | `http://localhost:3000`                                 | Browser                  |
| `PLAYWRIGHT_SKIP_WEBSERVER` | unset                                                   | Stack déjà up            |
| `AUTH_RATE_LIMIT_DISABLED`  | **true en E2E**                                         | Register N tests         |
| `DATABASE_URL`              | docker / CI e2e                                         | API                      |
| `STRIPE_SECRET_KEY`         | `sk_test_xxx`                                           | Bypass vs réel           |

Jamais committer `.env` réel. Templates : `apps/api/.env.example`, `apps/web/.env.example`.
