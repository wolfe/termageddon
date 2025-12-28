module "termageddon" {
  source = "../templates"

  environment = "prod"
  aws_region  = "us-east-2"

  vpc_cidr = "10.1.0.0/16"

  db_instance_class    = "db.t3.small"
  db_allocated_storage = 20

  ecs_task_cpu    = 512  # 0.5 vCPU
  ecs_task_memory = 1024 # 1 GB
  desired_task_count = 1

  domain_name = ""
  enable_https = false

  okta_client_id    = var.okta_client_id
  okta_issuer_uri   = var.okta_issuer_uri
  okta_redirect_uri = var.okta_redirect_uri

  allowed_cidr_blocks = ["0.0.0.0/0"] # Adjust for internal access

  tags = {
    Environment = "prod"
    ManagedBy   = "terraform"
  }
}

variable "okta_client_id" {
  type        = string
  description = "Okta client ID"
}

variable "okta_issuer_uri" {
  type        = string
  description = "Okta issuer URI"
}

variable "okta_redirect_uri" {
  type        = string
  description = "Okta redirect URI"
}
