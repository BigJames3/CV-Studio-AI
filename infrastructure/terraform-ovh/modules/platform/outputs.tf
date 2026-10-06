output "kube_id" {
  value = ovh_cloud_project_kube.this.id
}

output "kubeconfig" {
  description = "Kubeconfig of the cluster: store it as the OVH_KUBECONFIG secret of the GitHub environment."
  value       = ovh_cloud_project_kube.this.kubeconfig
  sensitive   = true
}

output "postgres_endpoints" {
  description = "PostgreSQL endpoints (host, port, SSL mode) to build DATABASE_URL."
  value       = ovh_cloud_project_database.postgres.endpoints
}

output "postgres_database" {
  value = ovh_cloud_project_database_database.app.name
}

output "postgres_user" {
  value = ovh_cloud_project_database_postgresql_user.app.name
}

output "postgres_password" {
  value     = ovh_cloud_project_database_postgresql_user.app.password
  sensitive = true
}

output "valkey_endpoints" {
  description = "Valkey endpoints (host, port, SSL) to build REDIS_URL."
  value       = ovh_cloud_project_database.valkey.endpoints
}

output "valkey_user" {
  value = ovh_cloud_project_database_valkey_user.app.name
}

output "valkey_password" {
  value     = ovh_cloud_project_database_valkey_user.app.password
  sensitive = true
}
