# ANALYSE COMPLÈTE DU PROJET CV STUDIO AI

**Date**: 2026-07-28  
**Statut Global**: Moyen (structure OK · runtime non bootstrappé)  
**Couverture structure requise**: **88 %**  
**Fichier companion**: [`STRUCTURE-AUDIT-REPORT.md`](./STRUCTURE-AUDIT-REPORT.md)

---

## Vue d'ensemble

| Métrique                                   | Valeur                                                           |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Total fichiers requis (checklist)          | **85**                                                           |
| Fichiers / dossiers existants              | **77**                                                           |
| Fichiers OK                                | **72** (85 %)                                                    |
| Fichiers à corriger / incomplets           | **5**                                                            |
| Fichiers manquants (strict)                | **8**                                                            |
| Fichiers source totaux (hors node_modules) | **422**                                                          |
| Sévérité                                   | Moyen — **ne pas recréer** turbo/package/workflows déjà présents |

> **Correction importante sur la checklist « PRIORITÉ 1 » du prompt**  
> `turbo.json`, root `package.json`, `.github/workflows/`, `docker-compose.yml`, `infrastructure/`, `packages/shared-*` **EXISTENT DÉJÀ et sont valides**.  
> Les vrais critiques à traiter **maintenant** sont le **bootstrap runtime** (install, Docker, Git, migrations Prisma).

---

## FICHIERS EXISTANTS & CORRECTS (72+)

### Root

- [x] `turbo.json` — Turbo 2 `tasks` + `globalDependencies` + build/lint/test/dev/db
- [x] `package.json` — scripts monorepo + turbo/typescript/eslint/prettier + `packageManager: pnpm@9.15.0`
- [x] `pnpm-workspace.yaml` — `apps/*`, `packages/*`
- [x] `tsconfig.json` + `tsconfig.base.json`
- [x] `.eslintrc.json` — `root: true`, plugins, rules
- [x] `.prettierrc.json` — semi, trailingComma, singleQuote, printWidth 100
- [x] `.gitignore` — node_modules, dist, .next, .env, .turbo…
- [x] `.env.example` — DATABASE_URL, REDIS_URL, JWT_*, Stripe, OAuth, AWS, AI
- [x] `docker-compose.yml` — postgres + redis + volumes + networks + healthchecks
- [x] `README.md`, `CONTRIBUTING.md`, `Makefile`, `.nvmrc`, `.npmrc`

### Apps

- [x] `apps/web/` — Next.js 14 (`src/`, `public/`, package, tsconfig, `next.config.mjs`, `tailwind.config.ts`, `.env.example`, Dockerfile)
- [x] `apps/api/` — NestJS (`src/`, `prisma/schema.prisma`, seed, package, tsconfig, `.env.example`, Dockerfile)
- [x] `apps/mobile/` — Expo scaffold (`src/`, package, app.json)

### Packages

- [x] `packages/shared-types/` — User, CvContent, CV/Template, DTOs
- [x] `packages/shared-ui/` — alias → `@cvstudio/ui`
- [x] `packages/shared-utils/` — helpers + Zod
- [x] `packages/ai-service/` — gateway scaffold
- [x] `packages/ui/` — Design System (~38 composants) **bonus**

### Infrastructure & CI

- [x] `infrastructure/docker/` — compose, Dockerfile.api/web, nginx.conf
- [x] `infrastructure/k8s/` — équivalent de `kubernetes/`
- [x] `infrastructure/terraform/` — présent (stubs)
- [x] `.github/workflows/lint.yml`, `test.yml`, `build.yml`, `deploy.yml` (+ ci, cd-*, terraform, pr-checks)

### Docs

- [x] `docs/01` → `15` + `SETUP.md` + `DEVELOPMENT.md` + `TROUBLESHOOTING.md`
- [x] Specs canoniques Phase 0 (PRD, Architecture, API, Security…)

---

## FICHIERS À CORRIGER (5)

| Fichier                      | Problème                              | Correction suggérée                                                   |
| ---------------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `turbo.json`                 | Checklist attend `pipeline` (Turbo 1) | **Ne pas rétrograder.** Garder `tasks` (Turbo 2). Documenter l’écart. |
| `package.json`               | Pas de clé npm `workspaces`           | **OK avec pnpm.** Workspaces = `pnpm-workspace.yaml`.                 |
| `tsconfig.json`              | Pas de `baseUrl`/`paths` au root      | Optionnel : paths déjà gérés dans apps + `tsconfig.base.json`.        |
| `packages/shared-ui`         | Pas un DS autonome                    | Documenter : importer `@cvstudio/ui`. Ou enrichir re-exports.         |
| `infrastructure/terraform/*` | Modules stubs                         | Remplir VPC/EKS/RDS en Sprint 0–1 (pas bloquant local).               |

---

## FICHIERS MANQUANTS (8)

### PRIORITÉ CRITIQUE (maintenant)

| Manquant                      | Pourquoi                          |
| ----------------------------- | --------------------------------- |
| `pnpm-lock.yaml`              | CI + installs reproductibles      |
| `node_modules/`               | Déps non installées               |
| `.git/`                       | Pas de VCS                        |
| `apps/api/prisma/migrations/` | Schema sans historique migrate    |
| Docker Desktop (machine)      | Postgres/Redis locaux impossibles |

### PRIORITÉ HAUTE

| Manquant                           | Pourquoi           |
| ---------------------------------- | ------------------ |
| `.github/pull_request_template.md` | Qualité PR         |
| Tests API (`apps/api/test/*`)      | CI test.yml faible |

### PRIORITÉ BASSE / NICE TO HAVE

| Manquant                         | Pourquoi                           |
| -------------------------------- | ---------------------------------- |
| `apps/admin/`                    | Post-MVP                           |
| `packages/analytics/`            | Analytics déjà dans apps + docs    |
| `infrastructure/kubernetes/`     | Équivalent : `infrastructure/k8s/` |
| `infrastructure/github-actions/` | Équivalent : `.github/workflows/`  |

---

## PROBLÈMES CRITIQUES

1. **Runtime non bootstrappé** — `pnpm install` jamais exécuté → pas de lockfile / node_modules
2. **Docker absent** sur la machine — `docker compose` / `docker-compose` indisponibles
3. **Pas de Git** — aucun historique / remote / CI trigger
4. **Pas de migrations Prisma** — `schema.prisma` (41 KB) existe, dossier `migrations/` non
5. **PowerShell 5.1** — `&&` invalide ; une commande par ligne
6. **Fausse alerte checklist P1** — recréer turbo/package/workflows serait une **régression**

Non-bloquant mais à traiter :

- Dual types `CvContent` vs `CVContent` dans shared-types
- CI dupliquée (`ci.yml` + lint/test/build)
- `apps/api/.env` présent localement (ne pas committer)

---

## STRUCTURE ACTUELLE

```
cv-studio-ai/
├── .editorconfig · .env.example · .eslintrc.json · .gitignore
├── .npmrc · .nvmrc · .prettierrc.json · .prettierignore
├── CONTRIBUTING.md · README.md · Makefile
├── docker-compose.yml · package.json · pnpm-workspace.yaml
├── tsconfig.json · tsconfig.base.json · turbo.json
├── .github/
│   ├── CODEOWNERS · dependabot.yml
│   └── workflows/  (build, ci, cd-prod, cd-staging, deploy, lint, pr-checks, terraform, test)
├── .husky/pre-commit
├── .vscode/
├── apps/
│   ├── api/        (NestJS · prisma/schema+seed · src/modules · Dockerfile)  ✅
│   ├── web/        (Next.js 14 · editor · templates · Dockerfile)           ✅
│   ├── mobile/     (Expo scaffold)                                         ✅
│   └── admin/      ❌ MANQUANT
├── packages/
│   ├── shared-types/ · shared-utils/ · shared-ui/                          ✅
│   ├── ui/ · ai-service/ · typescript-config/ · eslint-config/             ✅
│   └── analytics/  ❌ MANQUANT
├── infrastructure/
│   ├── docker/     (compose, Dockerfile.api/web, nginx)                    ✅
│   ├── k8s/        (base + overlays + monitoring)                          ✅
│   ├── terraform/  (stubs)                                                 ⚠️
│   └── helm/cvstudio/ (vide)                                               ❌
├── docs/           (01–15 + Phase 0 specs + ADRs + AI prompts)             ✅
├── pnpm-lock.yaml  ❌
├── node_modules/   ❌
└── .git/           ❌
```

---

## STATISTIQUES DÉTAILLÉES

| Zone              | Fichiers |
| ----------------- | -------: |
| `apps/`           |      180 |
| `docs/`           |       95 |
| `packages/`       |       81 |
| `infrastructure/` |       35 |
| `.github/`        |       11 |
| Root              |      ~20 |
| **Total**         | **~422** |

| App / pkg                | Métrique      |
| ------------------------ | ------------- |
| `apps/web/src`           | 59 fichiers   |
| `apps/api/src`           | 53 fichiers   |
| `apps/mobile/src`        | 42 fichiers   |
| `packages/ui` components | ~38           |
| `prisma/schema.prisma`   | 41 125 octets |

---

## DÉTAILS DES FICHIERS EXISTANTS (critiques)

| Chemin                               | Taille | Modif      | Preview                                    | Santé                       |
| ------------------------------------ | -----: | ---------- | ------------------------------------------ | --------------------------- |
| `turbo.json`                         |  1 064 | 2026-07-26 | `$schema` · `tasks` · build/lint/dev       | OK                          |
| `package.json`                       |  2 991 | 2026-07-26 | `cv-studio-ai` · pnpm@9.15 · turbo scripts | OK                          |
| `pnpm-workspace.yaml`                |     43 | 2026-07-26 | `apps/*` `packages/*`                      | OK                          |
| `tsconfig.json`                      |    298 | 2026-07-26 | `references` apps/packages                 | WARNING (pas de paths root) |
| `.eslintrc.json`                     |  1 135 | 2026-07-26 | `root: true` · plugins                     | OK                          |
| `.prettierrc.json`                   |    184 | 2026-07-26 | semi · singleQuote                         | OK                          |
| `.env.example`                       |  1 272 | 2026-07-26 | DATABASE_URL · REDIS · JWT                 | OK                          |
| `docker-compose.yml`                 |  1 135 | 2026-07-26 | postgres · redis · healthchecks            | OK                          |
| `README.md`                          |  6 125 | 2026-07-26 | Quickstart monorepo                        | OK                          |
| `apps/web/package.json`              |  1 524 | 2026-07-26 | `@cvstudio/web`                            | OK                          |
| `apps/api/package.json`              |  2 000 | 2026-07-26 | `@cvstudio/api`                            | OK                          |
| `apps/api/prisma/schema.prisma`      | 41 125 | 2026-07-26 | Prisma schema v2                           | OK (migrations manquantes)  |
| `packages/shared-types/src/index.ts` |  6 785 | 2026-07-26 | User · CvContent · DTOs                    | WARNING (dual model)        |
| `packages/shared-ui/src/index.ts`    |    322 | 2026-07-26 | re-export `@cvstudio/ui`                   | WARNING                     |
| `.github/workflows/lint.yml`         |    777 | 2026-07-26 | pnpm lint + type-check                     | OK                          |
| `.github/workflows/ci.yml`           |  1 579 | 2026-07-26 | CI agrégé                                  | WARNING (doublon)           |

---

## CONTENU À CORRIGER (détail)

### 1) `tsconfig.json` root — optionnel

**Manque:** `compilerOptions.baseUrl` / `paths` (checklist prompt).  
**État actuel:** solution-style (`references` only) — correct pour monorepo TS.  
**Correction suggérée:** ne rien casser ; si désirée, ajouter paths dans `tsconfig.base.json` uniquement.

### 2) `packages/shared-types` — dual CV model

**Problème:** `CvContent` (Sprint 4 / JSONB) + `CVContent` (prompt) coexistent.  
**Correction:** documenter dans README package :

```ts
/** Canonical runtime shape for CV JSONB = CvContent */
/** Prompt/legacy DTO shape = CVContent — prefer CvContent in new code */
```

### 3) CI — doublons

**Problème:** `ci.yml` + `lint.yml` + `test.yml` + `build.yml`.  
**Correction:** garder `ci.yml` **ou** la triade lint/test/build ; désactiver l’autre set.

### 4) Après `pnpm install` — figer le lockfile

Dans workflows, remplacer :

```yaml
pnpm install --no-frozen-lockfile
```

par :

```yaml
pnpm install --frozen-lockfile
```

---

## PLAN D'ACTION DÉTAILLÉ

> **Ne pas** recréer turbo.json / package.json / workflows / shared-packages — déjà OK.  
> Stack réelle = **pnpm** (pas npm). PowerShell 5.1 = **une commande par ligne**.

### Phase 1 — Bootstrap critique (~20–40 min)

```powershell
# Nouvelle fenêtre PowerShell (PATH Node/pnpm)
cd "D:\Projets\CV Studio AI"
node -v
pnpm -v

# Install deps + lockfile
pnpm install

# Env
Copy-Item apps\api\.env.example apps\api\.env -Force
Copy-Item apps\web\.env.example apps\web\.env -Force
```

### Phase 2 — Docker + DB (~30–60 min + install Docker)

```powershell
winget install Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
# Redémarrer / lancer Docker Desktop, puis :
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### Phase 3 — Validation (~15–30 min)

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm dev
```

### Phase 4 — Git + polish (~20 min)

```powershell
git init
git add .
git commit -m "chore: bootstrap CV Studio AI monorepo"
# Créer .github/pull_request_template.md
# Committer pnpm-lock.yaml
# Passer CI en --frozen-lockfile
```

### Phase 5 — Nice to have (plus tard)

- `apps/admin` (Phase 2+)
- `packages/analytics` si extraction cross-app
- Enrichir Terraform
- Helm Chart.yaml ou supprimer dossier vide

**Estimations totales Phase 1–4 :** ~1.5–3 h (selon install Docker).

---

## FICHIERS À CRÉER AVEC CURSOR (uniquement le manquant)

| Fichier                            | Priorité | Contenu minimal                       |
| ---------------------------------- | -------- | ------------------------------------- |
| `.github/pull_request_template.md` | P1       | Summary + Test plan                   |
| `apps/api/prisma/migrations/*`     | P0       | Via `pnpm db:migrate` (pas à la main) |
| `pnpm-lock.yaml`                   | P0       | Via `pnpm install`                    |
| Tests `apps/api/test/`             | P1       | health + auth smoke                   |
| `apps/admin/`                      | P2       | Différer                              |

**Ne pas** relancer le prompt « créer turbo.json / package.json / workflows » — déjà livrés.

---

## RECOMMANDATIONS (ordre)

1. **Aujourd’hui** : `pnpm install` → Docker → migrate → `pnpm dev`
2. **Aujourd’hui** : `git init` + commit lockfile
3. **Sprint 0** : PR template + tests API + dédoublonner CI
4. **Ne pas** basculer vers npm / Turbo 1
5. **Ne pas** vider `@cvstudio/ui`

---

## Synthèse finale

| Question                         | Réponse                                 |
| -------------------------------- | --------------------------------------- |
| Monorepo structuré ?             | **Oui (~88 %)**                         |
| Faut-il recréer la config root ? | **Non**                                 |
| Bloqueur réel ?                  | **Install + Docker + Git + migrations** |
| Prochaine commande               | `pnpm install` (nouvelle PowerShell)    |

---

END OF ANALYSIS
