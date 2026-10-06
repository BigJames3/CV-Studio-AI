# One environment of CV Studio AI on OVHcloud Public Cloud:
# private network (vRack) + gateway, Managed Kubernetes, PostgreSQL and Valkey,
# the databases reachable only from the private subnet.

locals {
  name = "cvstudio-${var.env}"
  # Regional OpenStack ID of the private network, expected by MKS and the databases.
  network_openstack_id = tolist(ovh_cloud_project_network_private.this.regions_attributes[*].openstackid)[0]
}

# --- Network -----------------------------------------------------------------

resource "ovh_cloud_project_network_private" "this" {
  service_name = var.service_name
  name         = local.name
  vlan_id      = var.vlan_id
  regions      = [var.region]
}

resource "ovh_cloud_project_network_private_subnet" "this" {
  service_name = var.service_name
  network_id   = ovh_cloud_project_network_private.this.id
  region       = var.region
  network      = var.network_cidr
  start        = cidrhost(var.network_cidr, 2)
  end          = cidrhost(var.network_cidr, -2)
  dhcp         = true
  no_gateway   = false
}

# Outbound internet for the nodes (Stripe, OpenAI, SMTP, image pulls from GHCR).
resource "ovh_cloud_project_gateway" "this" {
  service_name = var.service_name
  name         = local.name
  model        = "s"
  region       = var.region
  network_id   = local.network_openstack_id
  subnet_id    = ovh_cloud_project_network_private_subnet.this.id
}

# --- Kubernetes --------------------------------------------------------------

resource "ovh_cloud_project_kube" "this" {
  service_name  = var.service_name
  name          = local.name
  region        = var.region
  plan          = var.kube_plan
  version       = var.kube_version
  update_policy = "MINIMAL_DOWNTIME"

  private_network_id = local.network_openstack_id
  nodes_subnet_id    = ovh_cloud_project_network_private_subnet.this.id

  private_network_configuration {
    default_vrack_gateway              = ""
    private_network_routing_as_default = false
  }

  depends_on = [ovh_cloud_project_gateway.this]
}

resource "ovh_cloud_project_kube_nodepool" "default" {
  service_name  = var.service_name
  kube_id       = ovh_cloud_project_kube.this.id
  name          = "default"
  flavor_name   = var.node_flavor
  desired_nodes = var.node_min
  min_nodes     = var.node_min
  max_nodes     = var.node_max
  autoscale     = true

  lifecycle {
    # The autoscaler owns the current size.
    ignore_changes = [desired_nodes]
  }
}

# --- PostgreSQL ----------------------------------------------------------------

resource "ovh_cloud_project_database" "postgres" {
  service_name        = var.service_name
  description         = "${local.name}-postgres"
  engine              = "postgresql"
  version             = var.postgres_version
  plan                = var.postgres_plan
  flavor              = var.postgres_flavor
  deletion_protection = var.deletion_protection

  dynamic "nodes" {
    for_each = range(var.postgres_nodes)
    content {
      region     = var.db_region
      network_id = local.network_openstack_id
      subnet_id  = ovh_cloud_project_network_private_subnet.this.id
    }
  }

  ip_restrictions {
    description = "${local.name} private subnet"
    ip          = var.network_cidr
  }
}

resource "ovh_cloud_project_database_database" "app" {
  service_name = var.service_name
  engine       = ovh_cloud_project_database.postgres.engine
  cluster_id   = ovh_cloud_project_database.postgres.id
  name         = "cvstudio"
}

resource "ovh_cloud_project_database_postgresql_user" "app" {
  service_name = var.service_name
  cluster_id   = ovh_cloud_project_database.postgres.id
  name         = "cvstudio"
}

# --- Valkey (Redis-compatible) -------------------------------------------------

resource "ovh_cloud_project_database" "valkey" {
  service_name        = var.service_name
  description         = "${local.name}-valkey"
  engine              = "valkey"
  version             = var.valkey_version
  plan                = var.valkey_plan
  flavor              = var.valkey_flavor
  deletion_protection = var.deletion_protection

  nodes {
    region     = var.db_region
    network_id = local.network_openstack_id
    subnet_id  = ovh_cloud_project_network_private_subnet.this.id
  }

  ip_restrictions {
    description = "${local.name} private subnet"
    ip          = var.network_cidr
  }
}

# BullMQ, the cache and the locks need the full command set on every key.
resource "ovh_cloud_project_database_valkey_user" "app" {
  service_name = var.service_name
  cluster_id   = ovh_cloud_project_database.valkey.id
  name         = "cvstudio"
  categories   = ["+@all"]
  keys         = ["*"]
  channels     = ["*"]
}
