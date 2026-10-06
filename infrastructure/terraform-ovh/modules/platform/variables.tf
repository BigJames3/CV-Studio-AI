variable "service_name" {
  description = "OVHcloud Public Cloud project ID."
  type        = string
}

variable "env" {
  description = "Environment name (staging, prod): prefixes every resource."
  type        = string
}

# --- Network -----------------------------------------------------------------

variable "region" {
  description = "Public Cloud region of the private network and the Kubernetes cluster (e.g. GRA11)."
  type        = string
}

variable "vlan_id" {
  description = "vRack VLAN of the private network. One per environment."
  type        = number
}

variable "network_cidr" {
  description = "CIDR of the private subnet shared by the nodes, the load balancers and the databases."
  type        = string
}

# --- Kubernetes --------------------------------------------------------------

variable "kube_plan" {
  description = "MKS plan: free or standard. It cannot be changed after creation."
  type        = string
}

variable "kube_version" {
  description = "Kubernetes version. null = latest available at creation."
  type        = string
  default     = null
}

variable "node_flavor" {
  description = "Flavor of the worker nodes (e.g. b3-8)."
  type        = string
}

variable "node_min" {
  description = "Minimum number of worker nodes (autoscaling floor, also the initial size)."
  type        = number
}

variable "node_max" {
  description = "Maximum number of worker nodes (autoscaling ceiling)."
  type        = number
}

# --- Databases ---------------------------------------------------------------

variable "db_region" {
  description = "Public Cloud Databases region (e.g. GRA). Must serve the private network region."
  type        = string
}

variable "postgres_version" {
  description = "PostgreSQL major version (the app is developed and tested on 16)."
  type        = string
  default     = "16"
}

variable "postgres_plan" {
  description = "PostgreSQL plan: essential (1 node), business (2 nodes, HA) or enterprise."
  type        = string
}

variable "postgres_flavor" {
  description = "PostgreSQL node flavor (e.g. db1-4)."
  type        = string
}

variable "postgres_nodes" {
  description = "Number of PostgreSQL nodes required by the plan (essential: 1, business: 2)."
  type        = number
}

variable "valkey_version" {
  description = "Valkey (Redis-compatible) version used for cache, locks and BullMQ queues."
  type        = string
  default     = "8.0"
}

variable "valkey_plan" {
  description = "Valkey plan: essential or business."
  type        = string
}

variable "valkey_flavor" {
  description = "Valkey node flavor (e.g. db1-4)."
  type        = string
}

variable "deletion_protection" {
  description = "Block deletion of the managed databases (keep true in prod)."
  type        = bool
}
