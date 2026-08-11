# RAPPORT D'ANALYSE — AUDIT CV STUDIO AI

**Date audit**: 27 Juillet 2026  
**Rescan live**: 28 Juillet 2026 15:50 UTC  
**Statut**: Prêt pour fin de bootstrap (structure 92 % · deps OK)  
**Machine**: Windows · PowerShell 5.1 · Node v24.18.0 · pnpm 9.15.0

---

## VERDICT

| Domaine                | Verdict                                          |
| ---------------------- | ------------------------------------------------ |
| Structure              | 421+ fichiers · ~92 % — EXCELLENT                |
| Configuration          | turbo / pnpm / eslint / compose / workflows — OK |
| Bootstrap              | **Partiel** — 1/4 P0 résolu · 3 restants         |
| ETA jusqu’à `pnpm dev` | **20–40 min** (Docker engine + Git + migrate)    |

### État live vs audit du 27

| Item audit P0            | Audit 27/07   | **Live 28/07**                                 |
| ------------------------ | ------------- | ---------------------------------------------- |
| pnpm-lock / node_modules | MISSING       | **DONE**                                       |
| Docker                   | NOT INSTALLED | CLI OK · engine **pas prêt** (erreur 500 pipe) |
| Git                      | repo missing  | **`git` absente du PATH**                      |
| Prisma migrations        | MISSING       | Toujours **MISSING**                           |
| apps/api/.env            | à créer       | **DONE**                                       |
| apps/web/.env            | à créer       | **DONE**                                       |

> L’audit du 27 est **obsolète** sur pnpm et Docker install.  
> **Ne pas** relancer `pnpm install` ni réinstaller Docker Desktop.

---

## CE QUI EST BON

### Structure

- Monorepo Turborepo 2 + pnpm workspaces
- apps: api · web · mobile
- packages: shared-* · ui · ai-service · configs

### Config

- turbo.json (`tasks`) · package.json · pnpm-workspace.yaml
- ESLint + Prettier · docker-compose.yml (PG16 + Redis)
- 9 GitHub workflows · .env.example

### Docs

- Volumes 01–15 · Phase 0 specs · ADRs · AI prompts · SETUP/DEVELOPMENT

### Déjà bootstrapé (depuis audit)

- `pnpm install` réussi
- `pnpm-lock.yaml` + `node_modules`
- `apps/api/.env` + `apps/web/.env`

---

## BLOCKERS P0 — ANALYSE + FIX

### 1) pnpm install — RÉSOLU

|                   |                                                       |
| ----------------- | ----------------------------------------------------- |
| Pourquoi critique | Sans deps → turbo/lint/dev impossibles                |
| Impact            | Bloquait 100 % du runtime                             |
| Fix               | **Déjà fait** — skip                                  |
| Vérif             | `Test-Path pnpm-lock.yaml` · `Test-Path node_modules` |

Si PowerShell dit `pnpm` inconnu (PATH périmé) :

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
pnpm -v
```

| Erreur                | Solution                                                                         |
| --------------------- | -------------------------------------------------------------------------------- |
| `pnpm` not recognized | Nouvelle fenêtre + refresh PATH ci-dessus                                        |
| `corepack` missing    | Node installé → `corepack enable` puis `corepack prepare pnpm@9.15.0 --activate` |

---

### 2) Docker engine — BLOQUANT (installé mais pas prêt)

|                   |                                                                     |
| ----------------- | ------------------------------------------------------------------- |
| Pourquoi critique | Postgres + Redis locaux                                             |
| Impact            | `db:migrate` / API / seed bloqués                                   |
| Fix time          | 5–15 min                                                            |
| Erreur live       | `500 ... dockerDesktopLinuxEngine` → Desktop démarre / WSL pas prêt |

**Commandes** (1 ligne à la fois) :

```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

Attendre l’icône **verte** (1–5 min), puis :

```powershell
docker version
docker info
docker compose version
```

**Vérif OK** :

```powershell
docker ps
```

| Erreur                  | Solution                                                |
| ----------------------- | ------------------------------------------------------- |
| 500 / pipe introuvable  | Attendre · redémarrer Docker Desktop · reboot si besoin |
| WSL 2 required          | `wsl --install` puis reboot                             |
| Virtualization disabled | BIOS VT-x/AMD-V                                         |

---

### 3) Git — `git` non installé

|                   |                           |
| ----------------- | ------------------------- |
| Pourquoi critique | Historique, PR, CI, husky |
| Impact            | Pas de commit / remote    |
| Fix time          | 5–10 min                  |

```powershell
winget install Git.Git --accept-package-agreements --accept-source-agreements
```

**Fermer / rouvrir PowerShell**, puis :

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
git --version
cd "D:\Projets\CV Studio AI"
git init
git config user.name "Ton Nom"
git config user.email "ton@email.com"
git add .
git commit -m "chore: bootstrap CV Studio AI monorepo (Sprint 0)"
```

**Vérif** :

```powershell
Test-Path .git
git log -1 --oneline
```

| Erreur                  | Solution                                      |
| ----------------------- | --------------------------------------------- |
| `git` not recognized    | Nouvelle PowerShell après winget              |
| Author identity unknown | `git config user.name` / `user.email` (local) |

---

### 4) Prisma migrations — EN ATTENTE (après Docker)

|                   |                                       |
| ----------------- | ------------------------------------- |
| Pourquoi critique | Schema non versionné / non déployable |
| Impact            | Pas de déploiement reproductible      |
| Prérequis         | Docker `ps` OK                        |

```powershell
cd "D:\Projets\CV Studio AI"
docker compose up -d
docker compose ps
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Nom de migration si demandé : `init`

**Vérif** :

```powershell
Test-Path apps\api\prisma\migrations
```

| Erreur                   | Solution                                  |
| ------------------------ | ----------------------------------------- |
| connection refused :5432 | Docker pas ready · `docker compose up -d` |
| DIRECT_DATABASE_URL      | Déjà dans `apps/api/.env`                 |
| Port 5432 busy           | Stopper autre Postgres local              |

---

## IMPROVEMENTS P1 / P2

| Pri | Item            | Action                                 | Quand            |
| --- | --------------- | -------------------------------------- | ---------------- |
| P1  | API tests vides | Jest smoke health + auth               | Après `pnpm dev` |
| P1  | Terraform stubs | Modules AWS                            | Sprint 0–1       |
| P2  | apps/admin      | Différer                               | Post-MVP         |
| P2  | Helm vide       | Différer (Kustomize OK)                | —                |
| P2  | CI doublons     | Garder `ci.yml` **ou** lint/test/build | Sprint 0         |

---

## PLAN D'ACTION PAR PHASE

### Phase 1 — Docker engine (5–15 min)

1. Start Docker Desktop
2. `docker info` OK

### Phase 2 — Git (5–10 min)

1. `winget install Git.Git`
2. Nouvelle PowerShell · `git init` · commit

### Phase 3 — Data plane (5 min)

1. `docker compose up -d`
2. Vérifier postgres + redis

### Phase 4 — Database (10 min)

1. `pnpm db:generate`
2. `pnpm db:migrate`
3. `pnpm db:seed`

### Phase 5 — Verify (10–20 min)

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm dev`

**Total restant** : ~25–45 min (plus 60 min audit — pnpm déjà fait).

---

## COMMANDES EXACTES — SÉQUENCE COMPLÈTE (PS 5.1)

**Pas de `&&`.** Une commande par ligne.

```powershell
cd "D:\Projets\CV Studio AI"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# --- SKIP: pnpm install (déjà fait) ---

# PHASE 1 — Docker
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
# Attendre icône verte...
docker info
docker compose up -d
docker compose ps

# PHASE 4 — DB
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# PHASE 5 — Quality + run
pnpm typecheck
pnpm lint
pnpm dev
```

**Terminal 2 — Git** (après winget) :

```powershell
winget install Git.Git --accept-package-agreements --accept-source-agreements
# Nouvelle fenêtre PowerShell :
cd "D:\Projets\CV Studio AI"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
git --version
git init
git config user.name "Ton Nom"
git config user.email "ton@email.com"
git add .
git commit -m "chore: bootstrap CV Studio AI monorepo (Sprint 0)"
```

---

## GUIDE D'EXÉCUTION (par commande)

| Commande               | Fait quoi                     | Durée     | Vérif                    |
| ---------------------- | ----------------------------- | --------- | ------------------------ |
| Refresh PATH           | Rend `pnpm`/`docker` visibles | 5 s       | `pnpm -v`                |
| Start Docker Desktop   | Lance le daemon               | 1–5 min   | `docker info`            |
| `docker compose up -d` | Démarre PG16 + Redis          | 30–90 s   | `docker compose ps` → Up |
| `pnpm db:generate`     | Génère Prisma Client          | 30–60 s   | pas d’erreur             |
| `pnpm db:migrate`      | Crée + applique migration     | 1–3 min   | `migrations/` existe     |
| `pnpm db:seed`         | Seeds templates               | 30–60 s   | OK seed                  |
| `pnpm typecheck`       | TS strict monorepo            | 1–5 min   | exit 0                   |
| `pnpm lint`            | ESLint                        | 1–5 min   | exit 0                   |
| `pnpm dev`             | API + Web                     | permanent | :3000 + :3001            |
| `winget … Git.Git`     | Installe Git                  | 2–5 min   | `git --version`          |
| `git init` + commit    | Premier historique            | 1–2 min   | `git log -1`             |

---

## CHECKLIST FINALE

```powershell
Test-Path pnpm-lock.yaml
Test-Path node_modules
Test-Path .git
Test-Path apps\api\prisma\migrations
Test-Path apps\api\.env
Test-Path apps\web\.env
docker ps
pnpm -v
git --version
```

| Check                   | Attendu                                                     |
| ----------------------- | ----------------------------------------------------------- |
| lockfile / node_modules | True (déjà)                                                 |
| .env api + web          | True (déjà)                                                 |
| docker ps               | postgres + redis Up                                         |
| migrations              | True                                                        |
| .git                    | True                                                        |
| URLs                    | http://localhost:3000 · http://localhost:3001/api/v1/health |

---

## RÉSULTAT ATTENDU

1. Docker engine healthy
2. PG + Redis Up
3. Migration `init` + seed
4. `pnpm typecheck` / `lint` / `dev`
5. Premier commit Git

**Ensuite (Sprint 0)** : tests API smoke · PR template · CI `--frozen-lockfile` · dédoublonner workflows.

---

## NE PAS FAIRE

- Recréer turbo.json / package.json / workflows
- Relancer `pnpm install` sans besoin
- Réinstaller Docker Desktop (déjà là)
- Utiliser `npm` à la place de `pnpm`
- `&&` sous PowerShell 5.1

---

END OF ANALYSIS
