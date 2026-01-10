variable "db_password" {
  type        = string
  description = "Database password (provide via TF_VAR_db_password)"
  sensitive   = true
}

variable "django_secret_key" {
  type        = string
  description = "Django SECRET_KEY (provide via TF_VAR_django_secret_key)"
  sensitive   = true
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

variable "ecs_task_execution_role_arn" {
  type        = string
  description = "ARN of existing IAM role for ECS task execution"
}

variable "ecs_task_role_arn" {
  type        = string
  description = "ARN of existing IAM role for ECS task (not used, kept for tfvars compatibility)"
  default     = ""
}

variable "image_tag" {
  type        = string
  description = "Docker image tag to deploy"
  default     = "latest"
}
