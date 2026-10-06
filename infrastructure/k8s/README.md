# CV Studio AI — manifestes Kubernetes (OVHcloud MKS)

| Dossier                                             | Contenu                                                                         | Appliqué par                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------- |
| `base/`                                             | API (blue + green), web, Services, HPA, Ingress, CronJob `stripe-webhook-retry` | `kubectl apply -k overlays/<env>`  |
| `overlays/staging`, `overlays/prod`, `overlays/dev` | Hôtes et nombre de réplicas par environnement                                   | workflow de déploiement            |
| `jobs/db-migrate.yaml`                              | `prisma migrate deploy` avec l'image de la release                              | workflow, avant chaque déploiement |
| `platform/cluster-issuer.yaml`                      | Émetteurs Let's Encrypt pour cert-manager                                       | une fois par cluster (`envsubst`)  |
| `monitoring/`                                       | Prometheus, Fluent Bit, Grafana (optionnel)                                     | à la main                          |

Chaque overlay est généré et validé (kubeconform) sur les PR par `.github/workflows/k8s-manifests.yml`.

## Images

`ghcr.io/bigjames3/cvstudio-api` et `ghcr.io/bigjames3/cvstudio-web`, taguées `sha-<12 caractères>` par le workflow. Le CronJob utilise l'image de l'API au même tag.

## Hôtes

| Environnement | Web                   | API                       |
| ------------- | --------------------- | ------------------------- |
| prod          | `cvstudio.ai`         | `api.cvstudio.ai`         |
| staging       | `staging.cvstudio.ai` | `api.staging.cvstudio.ai` |

Les enregistrements DNS (zone OVH) pointent vers l'IP du Load Balancer créé par ingress-nginx.

## Prérequis sur chaque cluster

1. ingress-nginx (Service `LoadBalancer`, provisionné par OVHcloud).
2. cert-manager, puis `envsubst < platform/cluster-issuer.yaml | kubectl apply -f -` avec `ACME_EMAIL`.
3. Les secrets du namespace `cvstudio`, créés par le workflow depuis les secrets de l'environnement GitHub :
   - `api-secrets` : les variables de `apps/api/.env.example` (`DATABASE_URL`, `REDIS_URL`, `JWT_*`, `ENCRYPTION_KEY`, `STRIPE_*`, …) ;
   - `web-secrets` (optionnel) : variables serveur de Next.js. Les `NEXT_PUBLIC_*` sont fixées au build de l'image.

## Génération des PDF

L'API génère les PDF elle-même avec Chromium (`pdf-export.service.ts`). Son système de fichiers est en lecture seule : `/tmp` et `/dev/shm` sont des volumes `emptyDir`. Les anciens Deployments `worker-pdf` / `worker-ai` ont été retirés : aucune file ne leur envoyait de travail et `dist/worker-ai.js` n'existe pas.
