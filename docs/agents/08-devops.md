# 08 — DevOps

## Mission

Rendre le chemin build, test, déploiement et exploitation reproductible, sans masquer les échecs. Ne pas exposer de secrets dans les rapports.

## Responsabilités

- `.github/workflows/**`
- `infrastructure/**` (Terraform, k8s, docker de déploiement)
- Docker Compose de dev : le fichier racine est la référence ; `infrastructure/docker/docker-compose.yml` l'inclut
- Health checks, probes, cron Kubernetes de paiements (le **manifeste** ; la logique Nest reste Billing)
- Observabilité dans le repo (Prometheus, Fluent Bit, notes Grafana)
- Secrets CI via OIDC / GitHub secrets, jamais dans le git

## Ownership

| Zone                              | Droit                                                                  |
| --------------------------------- | ---------------------------------------------------------------------- |
| `.github/**`                      | Écriture                                                               |
| `infrastructure/**`               | Écriture                                                               |
| `docker-compose*.yml` à la racine | Écriture                                                               |
| Dockerfiles de `apps/*`           | Écriture coordonnée avec le propriétaire de l'app si le binaire change |

## Allowed files

Les zones ci-dessus, plus `docs/infrastructure/**` et `docs/runbooks/**` sur tâche.

## Forbidden files

- `apps/api/src/**`, `apps/web/src/**`, `packages/**` pour « faire passer la CI »
- Prisma migrations
- Ajouter `continue-on-error: true` ou `|| true` pour cacher un échec réel (charte maintainer)
- `pnpm db:reset`, `docker compose down -v` sur un environnement partagé

## Documentation to read

- [00-README.md](./00-README.md) section infra
- `docs/INFRASTRUCTURE-CV-STUDIO-AI.md` comme cible
- `docs/adr/017-eks-terraform-cicd.md`
- `docs/infrastructure/DR-RUNBOOK.md`, `docs/runbooks/production-deploy.md`
- Workflows réels avant le runbook

## Dependencies

- Architect avant un apply Terraform ou un changement de pipeline qui déploie `main`
- Billing si le CronJob d'expiration change de contrat avec le job Nest
- Security pour les secrets, l'OIDC, et la signature d'images (cosign)
- Ne pas « réparer » un test applicatif dans le workflow

## Security rules

- Pas de secret dans les logs de workflow.
- `terraform apply -auto-approve` avec `continue-on-error: true` est un risque : un échec devient vert. Ne pas étendre ce motif.
- Cosign en `|| true` signifie qu'une image non signée peut continuer. Traiter comme écart supply-chain, pas comme succès.
- Le backend Terraform commenté et `subnet_ids` vides : ne pas appliquer ce scaffold contre un compte réel sans revue.

## Testing rules

Un changement de workflow se prouve par la lecture du YAML et, si l'humain le demande, par un run CI. Ne pas désactiver un job e2e pour obtenir un check vert.

## Workflow

```text
Lire le workflow qui échoue
→ reproduire la cause
→ patch minimal
→ pas de package installé ni de lockfile pour un problème d'environnement, sans justification
```

La charte maintainer demande d'observer, prouver, proposer, et d'attendre une validation avant de modifier un problème purement environnemental. Pour une tâche déjà assignée sur le board, le patch suit la tâche.

## Definition of Done

- Le workflow échoue si l'étape critique échoue
- Aucun secret ajouté
- Distinction écrite entre « manifeste présent » et « cluster vérifié »
- Diff limité à l'infra / CI

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

`HUMAN_DECISION_REQUIRED` avant : premier apply réel, changement de région, destruction de state, ou choix « on garde le scaffold Terraform vs on le retire du CD ». L'existence du cluster `cvstudio-staging` est UNKNOWN : ne pas la déclarer cassée ni saine.

## Réalité au 2026-09-26

| Élément                             | Constat                                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                            | Lint, typecheck, unit, e2e API, coverage AI/payments/marketplace, build. `codecov` en `continue-on-error` (upload).               |
| `cd-staging.yml` / `cd-prod.yml`    | Forme réelle OIDC, ECR, kustomize. `cosign … \|\| true` sur staging. Rollbacks avec `\|\| true`.                                  |
| `deploy.yml`                        | Appelle `cd-prod.yml`.                                                                                                            |
| `lint.yml`, `test.yml`, `build.yml` | `workflow_dispatch`, recouvrement de `ci.yml`.                                                                                    |
| `terraform.yml`                     | `fmt` et credentials AWS en `continue-on-error`. Apply staging sur push `main` avec `-auto-approve` et `continue-on-error: true`. |
| Terraform resources                 | Seul `aws_vpc` trouvé. Pas de cluster ni de RDS dans les `.tf`.                                                                   |
| K8s                                 | Déploiements, probes `/api/v1/health`, cron paiements et retry webhook.                                                           |
| Backups                             | Variable de rétention dans le scaffold RDS. Pas de ressource AWS backup trouvée.                                                  |
| Health API                          | `GET /api/v1/health` et `/ready`.                                                                                                 |
| Compose                             | Racine = Postgres 16 + Redis + Mailpit. Ne pas lancer la stack test en même temps.                                                |

Tâches : OPS-001 (ne plus masquer fmt/apply/cosign), OPS-003 (observabilité repo). OPS-002 n'est pas ouvert : cluster non vérifié.
