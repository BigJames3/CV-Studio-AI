terraform {
  required_version = ">= 1.7.0"
  backend "s3" {
    # bucket         = "cvstudio-tfstate-prod"
    # key            = "prod/terraform.tfstate"
    # region         = "eu-west-1"
    # dynamodb_table = "cvstudio-tf-locks"
    # encrypt        = true
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project = "cvstudio"
      Env     = "prod"
      Managed = "terraform"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

module "vpc" {
  source = "../../modules/vpc"
  name   = "cvstudio"
  env    = "prod"
}

module "eks" {
  source             = "../../modules/eks"
  name               = "cvstudio"
  env                = "prod"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = [] # wire from vpc module outputs when expanded
}

module "rds" {
  source              = "../../modules/rds"
  name                = "cvstudio"
  env                 = "prod"
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = []
  multi_az            = true
  create_read_replica = true
  backup_retention_days = 35
}

module "redis" {
  source     = "../../modules/redis"
  name       = "cvstudio"
  env        = "prod"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = []
}

module "s3_cdn" {
  source = "../../modules/s3_cdn"
  name   = "cvstudio"
  env    = "prod"
}

module "waf" {
  source = "../../modules/waf"
  name   = "cvstudio"
  env    = "prod"
}

module "observability" {
  source = "../../modules/observability"
  env    = "prod"
}
