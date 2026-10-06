output "kube_id" {
  value = module.platform.kube_id
}

output "kubeconfig" {
  value     = module.platform.kubeconfig
  sensitive = true
}

output "postgres_endpoints" {
  value = module.platform.postgres_endpoints
}

output "postgres_database" {
  value = module.platform.postgres_database
}

output "postgres_user" {
  value = module.platform.postgres_user
}

output "postgres_password" {
  value     = module.platform.postgres_password
  sensitive = true
}

output "valkey_endpoints" {
  value = module.platform.valkey_endpoints
}

output "valkey_user" {
  value = module.platform.valkey_user
}

output "valkey_password" {
  value     = module.platform.valkey_password
  sensitive = true
}
