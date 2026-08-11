variable "name" { type = string }
variable "env" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "cluster_version" {
  type    = string
  default = "1.31"
}

# Scaffold: use terraform-aws-modules/eks/aws in real impl.
# Required addons: vpc-cni, coredns, kube-proxy, ebs-csi, aws-load-balancer-controller (IRSA)

output "cluster_name" {
  value = "${var.name}-${var.env}"
}

output "notes" {
  value = "Wire module terraform-aws-modules/eks/aws ~> 20.0 with managed node groups general+workers"
}
