# 05 — Frontend

## Mission

Rendre l'interface Next.js (et l'UI mobile) fidèle au **comportement backend**, pas au texte marketing quand les deux divergent. Le frontend n'autorise rien : il affiche et appelle l'API.

## Responsabilités

- `apps/web` : routes App Router, layouts, `middleware.ts`, stores Zustand, TanStack Query, client API, éditeur, billing UI, templates, marketplace UI, analytics client
- `packages/ui` : design system
- `apps/mobile` : écrans et client (domaine secondaire). Pas de promesse de parité Phase 4 tant que le contrat API n'existe pas
- Corriger l'affichage des plans (FE-001, FE-002) **après** décision humaine si le choix est « changer l'offre » plutôt que « afficher le runtime »

## Ownership

| Zone                          | Droit                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `apps/web/**`                 | Écriture                                                                                                         |
| `packages/ui/**`              | Écriture                                                                                                         |
| `apps/mobile/**`              | Écriture                                                                                                         |
| `packages/shared-utils` gates | Lecture. Toute modification de `canDownloadPDF` / `CV_LIMIT_BY_TIER` est cross-cutting : Architect, avec Billing |

## Allowed files

- `apps/web/**` hors génération de secrets
- `packages/ui/**`
- `apps/mobile/**`
- Tests Playwright seulement si la vague QA n'est pas séparée et que l'Architect l'autorise. Par défaut, QA possède `apps/web/e2e`.

## Forbidden files

- `apps/api/**`
- `packages/ai-service/**`
- `infrastructure/**`, `.github/**`
- Prisma
- Écrire un gate client qui **autorise** ce que le serveur refuse, ou l'inverse comme seule correction d'un bug d'argent

## Documentation to read

- [00-README.md](./00-README.md) matrice des plans
- `docs/FRONTEND-CV-STUDIO-AI.md`
- `docs/EDITOR-UI-SPEC.md`
- `apps/web/src/hooks/useFeatureGate.ts`
- `apps/api/src/modules/plans/plans.service.ts` (`mapPlanToPublicDto`) — lecture, pour ne pas recopier un DTO faux dans un second catalogue

## Dependencies

- Le DTO plans est produit par Billing (`plans.service.ts`). FE-001 a deux moitiés : le DTO (`downloadPdf` included pour Free) est un bug Billing/catalogue ; la phrase pricing « Sans watermark sur le PDF Free » est Frontend. L'Architect séquence. Ne pas patcher les deux zones dans la même vague sans accord.
- `packages/shared-utils` est la vérité des gates. L'UI doit appeler ces fonctions, pas redéfinir 1/5/20.
- Mobile dépend du contrat API Backend. Ne pas inventer `POST /devices` côté client comme s'il existait.

## Security rules

- Pas de secret dans `NEXT_PUBLIC_*` autre que des clés publiques déjà prévues (PostHog).
- Ne pas stocker de PDF d'un autre utilisateur, ni faire confiance à un `jobId` comme capacité : après SEC-001, le client ne doit afficher un download que pour un job créé par la session, et le serveur doit quand même refuser.
- XSS : le HTML d'aperçu CV est sensible (SEC-007 côté rendu serveur). Ne pas étendre `dangerouslySetInnerHTML` sans revue Security.

## Testing rules

Vérifier dans le navigateur les flux UI touchés (pricing, éditeur, billing) avant de déclarer terminé. Playwright : agent QA, sauf tâche qui inclut explicitement le spec.

Ne pas coder un test qui fige le texte marketing faux (« PDF inclus en Free ») si le serveur refuse.

## Workflow

```text
Lire le gate partagé et la réponse API
→ afficher la même règle
→ si le texte produit contredit le serveur : marquer HUMAN_DECISION_REQUIRED et ne changer que le libellé si l'Architect a dit « aligner l'UI sur le runtime »
```

## Definition of Done

- L'écran ne promet pas un droit que `EntitlementsService` refuse, une fois FE-001/FE-002 décidés
- Parcours cliqué (ou substitut documenté si le navigateur n'est pas disponible)
- Aucun fichier API modifié

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

`HUMAN_DECISION_REQUIRED` avant de changer l'offre affichée (prix, PDF Free, nombre de CV, templates Pro). Alignement mécanique du texte sur le runtime déjà codé peut être fait si l'Architect l'écrit dans la tâche. Un changement d'offre (donner le PDF au Free) est Billing + produit, pas un correctif UI.

## Réalité UI au 2026-09-26

- Pricing : `apps/web/src/app/(marketing)/pricing/page.tsx` affirme l'absence de watermark sur le PDF Free. `mapPlanToPublicDto` marque `downloadPdf` et `share` included pour **tous** les plans. Le runtime refuse les deux au Free.
- Templates : le catalogue dit `unlimited` pour Pro. `getAvailableTemplateTypes` ne retourne `pro`/`business` que pour le tier `business`.
- Éditeur : `components/editor/editor-shell.tsx`, formulaires de sections, templates Modern/Creative/Executive/Startup/ATS. État IMPLEMENTED.
- Analytics client : PostHog (`apps/web/src/lib/analytics/`). Pas d'Amplitude dans le code.
- Mobile : `apps/mobile/src` a navigation, éditeur, paywall, sync. Pas de suite de tests. Traiter comme PARTIAL.
