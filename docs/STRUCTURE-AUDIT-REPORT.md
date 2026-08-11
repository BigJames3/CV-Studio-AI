# CV Studio AI — Rapport d’audit structurel

**Date:** 2026-07-27  
**Périmètre:** fichiers / configs vs structure requise (Sprint 0 monorepo)  
**Sévérité globale:** Moyen (structure code OK · bootstrap runtime critique)

---

## 1. Résumé exécutif

| Indicateur                          | Valeur                                                   |
| ----------------------------------- | -------------------------------------------------------- |
| Couverture structure requise        | **~88 %** (chemins équivalents inclus)                   |
| Fichiers / dossiers checklist OK    | **72 / 85**                                              |
| Manquants (strict)                  | **8**                                                    |
| Présents mais incomplets / déviants | **5**                                                    |
| Erreurs de config bloquantes        | **0** dans les JSON/YAML lus                             |
| Blockers runtime                    | **4** (lockfile, node_modules, Docker, Git, migrations)  |
| Sévérité                            | Moyen — prêt structurellement, pas exécutable localement |

---

## 2. Existants & OK

### Root

| Fichier               | Verdict                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `turbo.json`          | OK — `globalDependencies` + tasks `build/lint/test/dev/db:*`                                |
| `package.json`        | OK — scripts `dev/build/lint/test/db:migrate` + turbo/ts/eslint/prettier + `packageManager` |
| `pnpm-workspace.yaml` | OK — remplace npm `workspaces`                                                              |
| `.eslintrc.json`      | OK — `root: true`, plugins, rules                                                           |
| `.prettierrc.json`    | OK — semi, trailingComma, singleQuote, printWidth…                                          |
| `.gitignore`          | OK — node_modules, dist, .next, .env, .turbo…                                               |
| `.env.example`        | OK — DATABASE_URL, REDIS_URL, JWT_*, Stripe, OAuth, AWS, AI                                 |
| `docker-compose.yml`  | OK — postgres + redis + volumes + networks + healthchecks                                   |
| `README.md`           | OK — setup, structure, commandes                                                            |
| `CONTRIBUTING.md`     | OK — conventional commits + standards                                                       |

### Apps

| Élément                                                                                                     | Verdict                            |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `apps/web/` + `src/` + `public/` + `package.json` + `tsconfig` + `.env.example` + `Dockerfile`              | OK                                 |
| `apps/web/next.config.mjs` + `tailwind.config.ts`                                                           | OK (noms modernes vs `.js` requis) |
| `apps/api/` + `src/` + `prisma/schema.prisma` + `package.json` + `tsconfig` + `.env.example` + `Dockerfile` | OK                                 |
| `apps/mobile/` + `src/` + `package.json`                                                                    | OK (scaffold)                      |

### Packages

| Élément                                                              | Verdict                               |
| -------------------------------------------------------------------- | ------------------------------------- |
| `packages/shared-types` (`package.json`, `src/index.ts`, `tsconfig`) | OK — User/CV/Template/DTOs présents   |
| `packages/shared-utils` (+ zod)                                      | OK                                    |
| `packages/ai-service`                                                | OK                                    |
| `packages/ui`                                                        | OK+ (DS canonique, au-delà du prompt) |

### Infra / CI / Docs

| Élément                                              | Verdict                          |
| ---------------------------------------------------- | -------------------------------- |
| `infrastructure/docker/Dockerfile.api                | web`+`nginx.conf`                | OK    |
| `infrastructure/k8s/`                                | OK (équivalent de `kubernetes/`) |
| `infrastructure/terraform/`                          | Présent (stubs)                  |
| `.github/workflows/lint                              | test                             | build | deploy.yml` | OK  |
| `docs/01` → `15` + SETUP/DEVELOPMENT/TROUBLESHOOTING | OK                               |

---

## 3. Existants mais incomplets

| Élément                     | Problème                                            | Impact                                     |
| --------------------------- | --------------------------------------------------- | ------------------------------------------ |
| `turbo.json`                | Utilise `tasks` (Turbo 2), pas `pipeline` (Turbo 1) | Aucun si Turbo ≥2 — **écart volontaire**   |
| `package.json`              | Pas de clé `workspaces` npm                         | Normal avec **pnpm**                       |
| `tsconfig.json` root        | Pas de `compilerOptions.baseUrl/paths` (refs only)  | Paths dans les apps / `tsconfig.base.json` |
| `packages/shared-ui`        | Alias → `@cvstudio/ui`, pas un DS autonome          | OK architecte ; prompt « incomplete »      |
| `infrastructure/terraform/` | Modules stubs (~0.1–1.7 KB)                         | Pas de provision AWS réelle                |
| `docs/01–15`                | Indexes vers docs canoniques                        | Contenu réel ailleurs (PRD, ARCH…)         |
| Dual compose                | Root + `infrastructure/docker/`                     | Confusion possible pour l’équipe           |

---

## 4. Fichiers manquants

| Manquant                           | Sévérité | Commentaire                                 |
| ---------------------------------- | -------- | ------------------------------------------- |
| `apps/admin/`                      | P2       | Hors MVP Sprint 0                           |
| `packages/analytics/`              | P2       | Analytics dans apps + docs (pas de package) |
| `infrastructure/kubernetes/`       | —        | **Équivalent:** `infrastructure/k8s/`       |
| `infrastructure/github-actions/`   | —        | **Équivalent:** `.github/workflows/`        |
| `.github/pull_request_template.md` | P2       | À créer                                     |
| `apps/api/prisma/migrations/`      | **P0**   | Schema sans historique migrate              |
| `pnpm-lock.yaml`                   | **P0**   | `pnpm install` non exécuté                  |
| `node_modules/`                    | **P0**   | Idem                                        |
| `.git/`                            | **P0**   | Repo non initialisé                         |
| `apps/web/next.config.js`          | —        | Existe en `.mjs`                            |
| `apps/web/tailwind.config.js`      | —        | Existe en `.ts`                             |

---

## 5. Erreurs de configuration

Aucune erreur JSON/YAML bloquante détectée dans les configs root lues.

| Point                                | Niveau  | Détail                                                                 |
| ------------------------------------ | ------- | ---------------------------------------------------------------------- |
| Checklist « pipeline » absente       | Info    | Remplacée par Turbo 2 `tasks` — **correct** pour turbo ^2.3            |
| Checklist « workspaces » npm absente | Info    | `pnpm-workspace.yaml` + `packageManager` — **correct**                 |
| `JWT_SECRET` vs `JWT_ACCESS_SECRET`  | Warning | Les deux sont dans `.env.example` ; API utilise surtout access/refresh |
| CI `--no-frozen-lockfile`            | Warning | Tant que le lockfile n’existe pas                                      |
| Scripts `test` API                   | Warning | Dossier `apps/api/test/` vide                                          |
| `shared-types` dual model            | Warning | `CvContent` (Sprint 4) + `CVContent` (prompt) coexistent               |

---

## 6. Statistiques

| Zone              | Fichiers (approx.) |
| ----------------- | -----------------: |
| `apps/`           |                180 |
| `docs/`           |                 94 |
| `packages/`       |                 81 |
| `infrastructure/` |                 35 |
| `.github/`        |                 11 |
| Root configs      |                ~15 |
| **Total source**  |           **~421** |

| Apps   | Contenu notable                                                                         |
| ------ | --------------------------------------------------------------------------------------- |
| API    | Modules Nest : auth, users, cvs, templates, AI, billing, marketplace, analytics, health |
| Web    | App Router, editor, templates Sprint 4, marketplace/seller                              |
| Mobile | Expo + WatermelonDB scaffold                                                            |
| UI     | ~38 composants shadcn                                                                   |

---

## 7. Recommandations & plan d’action

### Priorité P0 (aujourd’hui)

1. **Nouvelle PowerShell** → `pnpm install` → committer `pnpm-lock.yaml`
2. Installer **Docker Desktop** → `docker compose up -d`
3. `pnpm db:generate` → `pnpm db:migrate` → `pnpm db:seed`
4. `pnpm typecheck` · `pnpm lint` · `pnpm dev`
5. `git init` + premier commit

### Priorité P1 (Sprint 0)

1. Tests API smoke (health + auth)
2. `.github/pull_request_template.md`
3. Consolider CI (`ci.yml` **ou** lint/test/build)
4. Documenter canonical CV type (`CvContent`)

### Priorité P2 (plus tard)

1. `apps/admin` (Phase 2+)
2. `packages/analytics` si extraction cross-app nécessaire
3. Helm chart ou supprimer le dossier vide
4. Enrichir Terraform au-delà des stubs

### Ne pas « corriger »

- Remplacer pnpm par npm
- Remplacer Turbo 2 `tasks` par `pipeline`
- Vider `packages/ui` au profit d’un `shared-ui` placeholder

---

## 8. Checklist rapide (structure requise)

```
ROOT .......... 10/10 présents (écarts pnpm/Turbo2 acceptés)
APPS .......... 3/4  (admin ❌)
PACKAGES ...... 4/5  (analytics ❌ · ui ✅ bonus)
DOCKER INFRA .. 3/3
K8s/TF ........ OK via k8s/ + terraform/
GITHUB WF ..... 4/4 + PR template ❌
DOCS .......... 18/18
RUNTIME ....... 0/4  (lock · modules · git · migrations)
```
