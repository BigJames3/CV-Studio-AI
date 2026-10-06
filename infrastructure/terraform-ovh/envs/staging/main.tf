# Staging: smallest footprint, no HA, databases deletable.
module "platform" {
  source = "../../modules/platform"

  service_name = var.ovh_cloud_project_id
  env          = "staging"

  region       = "GRA11"
  vlan_id      = 110
  network_cidr = "10.110.0.0/16"

  kube_plan   = "free"
  node_flavor = "b3-8"
  node_min    = 2
  node_max    = 3

  db_region       = "GRA"
  postgres_plan   = "essential"
  postgres_flavor = "db1-4"
  postgres_nodes  = 1
  valkey_plan     = "essential"
  valkey_flavor   = "db1-4"

  deletion_protection = false
}
