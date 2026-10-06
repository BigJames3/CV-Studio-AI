# Changelog — gouvernance des agents

Journal limité à `docs/agents/`. Pas un changelog produit.

## 2026-09-26 — Merge de la PR #18

- HUMAN-UPGRADE et HUMAN-PAST-DUE tranchées par le propriétaire du produit : retirées des décisions requises, ajoutées aux décisions acceptées de `DECISIONS.md`.
- PR #18 mergée (`e175772`) : SEC-001, BILL-001, BILL-002, BILL-003, API-001, API-002, SEC-003 → `DONE`.
- CI rouge au merge pour des causes préexistantes sur `main`, corrigées par la PR #17 : placée en tête de l'ordre recommandé.

## 2026-09-26 — Mise à jour du task board

Relecture de `claude/dreamy-johnson-ef2lkk` (PR #18, ouverte, non mergée ; contenue dans la PR #19) et exécution des tests ciblés sur cette branche : 18 suites, 216 tests verts.

- Nouveau statut `FIX_ON_BRANCH` (corrigé sur une branche, pas dans `main`) et `DONE` (mergé).
- `FIX_ON_BRANCH` : SEC-001, BILL-001, BILL-002, BILL-003, API-001, API-002, SEC-003.
- BILL-004 reste `OPEN` (partiel).
- `DECISIONS.md` : HUMAN-UPGRADE et HUMAN-PAST-DUE indiquent le choix fait par le correctif, à valider avant merge.
- Aucun fichier applicatif modifié.

## 2026-09-26 — Audit Architect initial

Création du pack opérationnel. Aucun fichier hors `docs/agents/` n'a été modifié par cette mission.

### Ajouts

- `00-README.md` — carte du dépôt, matrice de fonctionnalités, matrice des plans, classement documentaire, règle anti-conflit
- `01-architect.md` … `08-devops.md` — mission, ownership, fichiers, workflow
- `TASK_BOARD.md` — tâches confirmées dans le code (SEC-001 P0 et suite)
- `DECISIONS.md` — ADR relevés et décisions humaines encore ouvertes

### Non fait

- Pas de correctif applicatif
- Pas de migration
- Pas de suppression de documents historiques
- Tests non exécutés
- Cluster AWS non interrogé

### Hypothèses explicitement non transformées en tâches

- SEC-002 (ownership CV) : infirmée
- SEC-004 (bypass global des plans) : infirmée comme énoncé
- OPS-002 (staging absent) : non vérifiable depuis le repo
