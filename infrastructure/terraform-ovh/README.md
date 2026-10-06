# CV Studio AI — Terraform OVHcloud

Infrastructure de production sur OVHcloud Public Cloud. Elle remplace à terme `infrastructure/terraform` (AWS), qui sera supprimé après la bascule.

## Ce qui est créé, par environnement

| Ressource                           | staging                         | prod                                                       |
| ----------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| Réseau privé (vRack) + sous-réseau  | VLAN 110, `10.110.0.0/16`       | VLAN 120, `10.120.0.0/16`                                  |
| Gateway (sortie internet des nœuds) | modèle `s`                      | modèle `s`                                                 |
| Managed Kubernetes (MKS), `GRA11`   | plan `free`, 2 à 3 nœuds `b3-8` | plan `standard`, 3 à 6 nœuds `b3-16`                       |
| PostgreSQL 16 managé                | `essential`, 1 nœud `db1-4`     | `business`, 2 nœuds `db1-7`, protégé contre la suppression |
| Valkey 8 managé (compatible Redis)  | `essential`, `db1-4`            | `business`, `db1-4`, protégé contre la suppression         |

Les bases ne sont joignables que depuis le sous-réseau privé. Les images Docker viennent de GHCR (aucun registre à créer).

## Prérequis (une fois, dans l'espace client OVHcloud)

1. Un projet Public Cloud, relié à un vRack.
2. Un conteneur Object Storage S3 (région `gra`) pour l'état Terraform, avec un utilisateur S3 dédié.
3. Des clés d'API OVH (application key, application secret, consumer key) limitées au projet.

## Secrets GitHub

Dans les environnements GitHub `terraform-staging` et `terraform-prod` (avec relecteurs obligatoires) :

| Secret                                                              | Contenu                                         |
| ------------------------------------------------------------------- | ----------------------------------------------- |
| `OVH_APPLICATION_KEY`, `OVH_APPLICATION_SECRET`, `OVH_CONSUMER_KEY` | Clés d'API OVH                                  |
| `OVH_CLOUD_PROJECT_ID`                                              | ID du projet Public Cloud                       |
| `TF_STATE_BUCKET`                                                   | Nom du conteneur Object Storage de l'état       |
| `TF_STATE_ACCESS_KEY`, `TF_STATE_SECRET_KEY`                        | Identifiants S3 de l'utilisateur Object Storage |

## Utilisation

Tout passe par le workflow **Terraform (OVHcloud)** (`.github/workflows/terraform.yml`) :

- sur une PR : `fmt` et `validate` des deux environnements, sans identifiants ;
- en lancement manuel : choisir l'environnement puis `plan` (lecture seule) ou `apply` (applique exactement le plan affiché). Le job attend l'approbation de l'environnement GitHub.

Il n'y a pas de verrou d'état sur Object Storage : le workflow sérialise les exécutions par environnement. Ne lancez pas `terraform apply` en local en parallèle.

## Après le premier `apply`

Les sorties fournissent de quoi remplir les secrets de déploiement (étape suivante du plan) :

```bash
terraform output -raw kubeconfig          # → secret OVH_KUBECONFIG
terraform output postgres_endpoints       # hôte et port de DATABASE_URL
terraform output -raw postgres_password   # mot de passe de DATABASE_URL
terraform output valkey_endpoints         # hôte et port de REDIS_URL
terraform output -raw valkey_password     # mot de passe de REDIS_URL
```

Ne collez jamais ces valeurs dans le dépôt, une issue ou un ticket : uniquement dans les secrets GitHub.
