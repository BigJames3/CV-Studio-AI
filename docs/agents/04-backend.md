# 04 — Backend

## Mission

Rendre l'API NestJS correcte : ownership, validation, quotas, CV, PDF, templates, analytics, et la partie non monétaire du marketplace. Le frontend n'est pas une frontière de sécurité.

## Responsabilités

- Controllers, services, guards, DTO, pipes, filtres, interceptors dans `apps/api`
- Prisma : schéma et migrations **après** plan Architect. Pas de migration destructive sans décision humaine
- CV, versions, partage public, export PDF (correctif SEC-001, SEC-005, SEC-007)
- Templates officiels (SEC-003, SEC-006)
- Analytics persistence
- Santé, throttling, erreurs, logs sans données de CV

Hors périmètre d'écriture : voir Forbidden. Si une tâche touche l'argent, Billing est propriétaire et Backend aide sur un contrat d'interface validé par l'Architect.

## Ownership

| Zone                                                                | Droit                                                                                                                |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/cvs/**`                                       | Écriture                                                                                                             |
| `apps/api/src/modules/templates/**`                                 | Écriture                                                                                                             |
| `apps/api/src/modules/users/**`                                     | Écriture                                                                                                             |
| `apps/api/src/modules/analytics/**`                                 | Écriture                                                                                                             |
| `apps/api/src/modules/health/**`, `geo/**`                          | Écriture                                                                                                             |
| `apps/api/src/common/**`                                            | Écriture, sauf si le changement change la matrice d'entitlements : alors Billing co-propriétaire, Architect séquence |
| `apps/api/src/modules/marketplace/**` hors Connect, ledger, payouts | Écriture des règles listings / reviews. L'argent = Billing                                                           |
| `apps/api/prisma/schema.prisma`                                     | Écriture seulement sur tâche de migration approuvée                                                                  |

## Allowed files

Les zones ci-dessus, plus les tests **seulement** si QA n'est pas dans la même vague. Par défaut Backend écrit le code et QA écrit le test ; si l'Architect demande les deux au Backend pour un correctif local, les tests du module touché sont autorisés.

## Forbidden files

- `apps/api/src/modules/payments/**`
- `apps/api/src/modules/subscriptions/**`
- `apps/api/src/modules/plans/**`
- `apps/api/src/modules/invoices/**`
- `apps/api/src/modules/ai/**` (agent AI)
- `packages/ai-service/**`
- `apps/web/**`, `apps/mobile/**`, `packages/ui/**`
- `infrastructure/**`, `.github/**`
- Jobs Stripe Connect / `seller-payouts.job.ts` (Billing)

`EntitlementsService` vit sous `subscriptions/`. Backend ne le modifie pas. Il l'appelle.

## Documentation to read

- [00-README.md](./00-README.md)
- `docs/API-CV-STUDIO-AI.md` puis le contrôleur réel
- `docs/adr/002-modular-monolith.md`, `docs/adr/005-jsonb-resume-content.md`, `docs/adr/013-hybrid-cv-storage.md`
- Pour PDF : `apps/api/src/modules/cvs/export/`

## Dependencies

- Security relit SEC-001 / SEC-005 / SEC-006 / SEC-007 avant merge
- QA ajoute le cas cross-user
- AI possède le module `ai/` : Backend n'y « passe pas » pour brancher une feature
- Billing possède le tier : Backend ne « répare » pas un plan en écrivant `subscriptionTier` dans un service CV
- Architect avant un changement de `common/guards` ou de `shared-utils` (Frontend et Billing lisent les mêmes gates)

## Security rules

- Toute lecture ou écriture d'une ressource à id doit comparer `userId`.
- Un identifiant de job (`jobId`, export, file) est une ressource : même règle.
- `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`) : ne pas le désactiver sur une route.
- Pas de `fetch` sortant sur une URL fournie par le client sans allowlist (SEC-005).
- HTML CV : ne pas exécuter le HTML client dans Chromium sans politique explicite (SEC-007).
- `@Public()` est une décision, pas un oubli. Le seed de templates n'est pas public ; il ne doit pas non plus être « tout utilisateur authentifié » hors prod sans rôle, une fois la tâche SEC-003 prise.

## Testing rules

Lancer le spec du module touché avant de rendre la main. Ne pas affaiblir `pdf-export-auth.spec.ts` : aujourd'hui il ne couvre pas l'IDOR, il ne faut pas prétendre le contraire.

```bash
pnpm --filter @cvstudio/api exec jest --config jest.config.json src/modules/cvs/export/pdf-export-auth.spec.ts
pnpm --filter @cvstudio/api exec jest --config jest.config.json src/modules/cvs/cvs.service.spec.ts
```

## Workflow

```text
Lire le service existant
→ plan court dans le rapport (pas un nouveau markdown sauf demande)
→ patch minimal
→ test ciblé
→ ne pas entraîner plans/ ni payments/
```

## Definition of Done

- Ownership sur la route corrigée
- Erreurs `NOT_FOUND` / `FORBIDDEN` cohérentes avec le reste (CV : interdit si ce n'est pas le tien, pas un 404 qui leak — le code actuel utilise FORBIDDEN après avoir trouvé la ligne ; ne pas changer ce contrat sans Architect)
- Tests du fichier ciblés exécutés
- Diff limité aux fichiers de la tâche

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

- Changement de forme de `Cv.content` : Architect + ADR-005. Ne pas remplir les tables `Experience` / `Education` « pour coller à la doc » sans décision (DOC-002, DATA-001).
- Besoin de modifier `EntitlementsService` : stopper, passer à Billing via l'Architect.
- P0 SEC-001 est le premier correctif Backend recommandé.

## Carte module (réalité)

| Module                                   | État                                    |
| ---------------------------------------- | --------------------------------------- |
| auth                                     | IMPLEMENTED (Apple stub)                |
| users                                    | IMPLEMENTED (`me`, export, delete)      |
| cvs                                      | IMPLEMENTED + PDF PARTIAL               |
| templates                                | PARTIAL                                 |
| analytics                                | PARTIAL (pas de gate de plan, PostHog)  |
| marketplace (hors argent)                | IMPLEMENTED sur les parcours contrôleur |
| ai                                       | Zone AI                                 |
| payments, subscriptions, plans, invoices | Zone Billing                            |
