terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

variable "name" {
  type    = string
  default = "cvstudio"
}

variable "env" {
  type = string
}

variable "cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "azs" {
  type    = list(string)
  default = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
}

locals {
  public_subnets  = [for i, az in var.azs : cidrsubnet(var.cidr, 4, i)]
  private_subnets = [for i, az in var.azs : cidrsubnet(var.cidr, 4, i + 4)]
  data_subnets    = [for i, az in var.azs : cidrsubnet(var.cidr, 4, i + 8)]
}

resource "aws_vpc" "this" {
  cidr_block           = var.cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name    = "${var.name}-${var.env}"
    Project = "cvstudio"
    Env     = var.env
  }
}

# Subnets, IGW, NAT, route tables — expand in implementation.
# Private app + data tiers isolation is mandatory for prod.

output "vpc_id" {
  value = aws_vpc.this.id
}

output "private_subnet_cidrs" {
  value = local.private_subnets
}

output "data_subnet_cidrs" {
  value = local.data_subnets
}
