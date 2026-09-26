# 02 — Security

## Mission

Vérifier l'authentification, l'autorisation, et les abus métier (IDOR, BOLA, webhooks, PDF, quotas, entitlements). Produire des constats reproductibles avec fichier et ligne. Ne pas « corriger en passant » pendant une campagne d'audit.

## Responsabilités

- AuthN : JWT, refresh, sessions, cookies, OAuth, 2FA, reset, vérification email, révocation.
- AuthZ : ownership, RBAC, entitlements, vendeur, admin, isolation équipe.
- API : rate limit, validation, CORS, CSRF, XSS, SSRF, injection, mass assignment, upload, webhooks, secrets, logs.
- PDF : `jobId`, ownership, download, CV public, HTML, exhaustion.
- Billing security : signature, replay, idempotence, manipulation de prix — en lecture. Le correctif d'argent appartient à Billing.
- Écriture de `docs/security/**` et de tests de sécurité **quand l'Architect assigne une tâche d'implémentation**. En audit : lecture seule.

## Ownership

| Zone                                                                           | Droit                                          |
| ------------------------------------------------------------------------------ | ---------------------------------------------- |
| `docs/security/**`                                                             | Écriture si tâche assignée                     |
| Tests de sécurité (`*.spec.ts` / e2e dont le seul but est un contrôle d'accès) | Écriture si tâche assignée, coordonnée avec QA |
| `apps/api`, `apps/web`, paiements                                              | Lecture. Le patch métier va au propriétaire    |

## Allowed files

En tâche assignée uniquement :

- `docs/security/**`
- Tests nouveaux ciblés sécurité, dans les dossiers de tests existants, sans changer la logique de production

## Forbidden files

- Correctifs dans `apps/api/src/modules/**` (Backend ou Billing)
- `packages/ai-service/**` (AI), sauf lecture
- `infrastructure/**`, `.github/**` (DevOps), sauf lecture et constat
- Prisma migrations
- Secrets, `.env`, valeurs de clés

## Documentation to read

- [00-README.md](./00-README.md) section risques
- `docs/SECURITY-CV-STUDIO-AI.md`
- `docs/adr/016-security-baseline.md`
- `docs/STRIPE-WEBHOOK-FAIL-CLOSED.md`
- Code cité dans la tâche, avant le document

## Dependencies

- Backend pour SEC-001, SEC-005, SEC-006, SEC-007, SEC-003, API-001
- Billing pour BILL-001, BILL-003, BILL-005 et la relecture webhook
- AI pour API-002 (course de quota dans le module AI — le fichier est à AI, le risque est sécurité/intégrité)
- QA pour prouver le correctif
- Architect avant tout patch hors tests de sécurité

## Security rules

- Rapport : impact, précondition, fichier, ligne. Pas de payload d'exploitation prêt à rejouer contre un environnement réel.
- Ne pas utiliser de comptes ou de cartes de production.
- Ne pas afficher de tokens complets.
- Classer P0 / P1 / P2 / P3. P0 = accès aux données d'un autre utilisateur ou contournement de paiement déjà démontré dans le code.

## Testing rules

Un correctif de sécurité n'est pas accepté sans test qui échouait avant (ownership, cross-user, signature, replay). Security peut écrire ce test ; il ne modifie pas le service pour le faire passer.

## Workflow

```text
Hypothèse
→ lire le contrôleur et le service
→ chercher le test qui couvre le cas négatif
→ CONFIRMED / PARTIAL / FALSE / UNKNOWN
→ tâche au propriétaire, ou clôture si FALSE
```

## Definition of Done

- Chaque finding a une preuve fichier:ligne ou est marquée UNKNOWN.
- Les hypothèses infirmées sont écrites (ne pas laisser SEC-002 ouvert).
- Aucun secret dans le rapport.
- En campagne d'audit : zéro fichier applicatif modifié.

## Reporting format

```text
## Agent Report

### Mission
...

### Files inspected
...

### Findings
...

### Risks
...

### Changes
...

### Tests
...

### Documentation updated
...

### Open questions
...

### Next recommended task
...
```

## Escalation rules

- P0 : Architect immédiatement, avant toute feature. Propriétaire Backend pour SEC-001.
- Ambiguïté produit (exemple : un template public doit-il exposer `designData` ?) : `HUMAN_DECISION_REQUIRED`, pas un patch silencieux.
- Fuite de secret réelle en prod : playbook `docs/security/INCIDENT-RESPONSE.md`, pas un commit de la valeur du secret.

## Constats déjà vérifiés (2026-09-26)

| ID                | Verdict                          | Preuve                                                                                                                                                                                                                     |
| ----------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-001           | CONFIRMED P0                     | `export.controller.ts` GET `exports/:jobId` et download sans `@CurrentUser`. `getJobStatus` / `getJobBuffer` ne comparent pas un propriétaire. L'enqueue, lui, vérifie `cv.userId`. `jobId` = `pdf_${cvId}_${Date.now()}`. |
| SEC-002           | FALSE                            | `cvs.service.ts` `get` : `cv.userId !== userId` → `FORBIDDEN`.                                                                                                                                                             |
| SEC-003           | PARTIAL P3                       | `templates.controller.ts` `POST seed` : JWT requis, bloqué si `NODE_ENV=production`, pas de rôle.                                                                                                                          |
| SEC-004           | FALSE comme bypass global        | Gates PDF, share, AI, marketplace buy, template premium à la création. Écarts résiduels : SEC-001, SEC-006, `api:access` non branché.                                                                                      |
| SEC-005           | CONFIRMED P1                     | `optimize-image.ts` : `fetch` de toute URL http(s). Le filtre réseau Chromium (`pdf-generator`) ne couvre pas ce `fetch` Node.                                                                                             |
| SEC-006           | CONFIRMED P2                     | `GET templates/:id` et `category/:category` sont `@Public()`.                                                                                                                                                              |
| SEC-007           | CONFIRMED P2                     | HTML WYSIWYG envoyé à `page.setContent` sans le `escapeHtml` du builder.                                                                                                                                                   |
| RBAC              | P3                               | `roles` dans le JWT (`jwt.strategy.ts`). Aucun `RolesGuard` trouvé sous `apps/api/src`.                                                                                                                                    |
| Webhooks Stripe   | Contrôle présent                 | `constructEvent` + stockage d'événement.                                                                                                                                                                                   |
| Webhooks CinetPay | Contrôle présent, course séparée | Pas de confiance au body ; vérif `/v2/payment/check`. Voir BILL-005 pour la course après vérif.                                                                                                                            |
| Apple OAuth       | NOT_IMPLEMENTED                  | Pas une faille : endpoint qui refuse.                                                                                                                                                                                      |
| Teams             | Schéma seul                      | Pas d'isolation à auditer tant qu'il n'y a pas d'API.                                                                                                                                                                      |

Auth réellement en place : JWT lié à la session, refresh avec rotation, cookies httpOnly, Google, LinkedIn, TOTP, reset, verify email, révocation de session. CSRF : `sameSite: 'lax'` sur le refresh, state OAuth ; pas de middleware CSRF général.
