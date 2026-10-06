# Production: Standard MKS (SLA), room for blue-green (2 x 3 API pods), HA PostgreSQL.
module "platform" {
  source = "../../modules/platform"

  service_name = var.ovh_cloud_project_id
  env          = "prod"

  region       = "GRA11"
  vlan_id      = 120
  network_cidr = "10.120.0.0/16"

  kube_plan   = "standard"
  node_flavor = "b3-16"
  node_min    = 3
  node_max    = 6

  db_region       = "GRA"
  postgres_plan   = "business"
  postgres_flavor = "db1-7"
  postgres_nodes  = 2
  valkey_plan     = "business"
  valkey_flavor   = "db1-4"

  deletion_protection = true
}
