variable "environment" {
  type        = string
  description = "Environment name (used for resource naming and tagging)"
}


variable "aws_region" {
  type        = string
  description = "AWS region for resources"
  default     = "us-east-2"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
  default     = "10.0.0.0/16"
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  type        = number
  description = "RDS allocated storage in GB"
  default     = 20
}

variable "db_name" {
  type        = string
  description = "Database name"
  default     = "termageddon"
}

variable "db_username" {
  type        = string
  description = "Database master username"
  default     = "termageddon"
}

variable "ecs_task_cpu" {
  type        = number
  description = "CPU units for ECS task (256 = 0.25 vCPU, 512 = 0.5 vCPU)"
  default     = 256
}

variable "ecs_task_memory" {
  type        = number
  description = "Memory for ECS task in MB"
  default     = 512
}

variable "desired_task_count" {
  type        = number
  description = "Desired number of ECS tasks"
  default     = 1
}

variable "domain_name" {
  type        = string
  description = "Domain name for ACM certificate (optional, leave empty for HTTP-only)"
  default     = ""
}

variable "okta_client_id" {
  type        = string
  description = "Okta client ID"
  default     = ""
}

variable "okta_issuer_uri" {
  type        = string
  description = "Okta issuer URI"
  default     = ""
}

variable "okta_redirect_uri" {
  type        = string
  description = "Okta redirect URI. Must be updated after first deployment with the actual ALB DNS name (get from 'terraform output alb_dns_name'). Format: http://<alb-dns-name>/callback"
  default     = ""

  validation {
    condition     = var.okta_redirect_uri == "" || can(regex("^https?://.*/callback$", var.okta_redirect_uri))
    error_message = "Okta redirect URI must be empty or a valid URL ending with /callback"
  }
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks allowed to access ALB (for internal use)"
  default     = ["0.0.0.0/0"]
}

variable "enable_https" {
  type        = bool
  description = "Enable HTTPS listener (requires domain_name and ACM certificate)"
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "Common tags for all resources"
  default     = {}
}
