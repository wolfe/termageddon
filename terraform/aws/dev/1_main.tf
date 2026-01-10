module "termageddon" {
  source = "../modules"

  environment = "dev"
  aws_region  = "us-east-2"

  vpc_cidr = "10.0.0.0/16"

  db_instance_class    = "db.t3.micro"
  db_allocated_storage = 20

  ecs_task_cpu    = 256  # 0.25 vCPU
  ecs_task_memory = 512  # 512 MB
  desired_task_count = 1

  domain_name = ""
  enable_https = false

  # Secrets (provided via environment variables)
  db_password        = var.db_password
  django_secret_key  = var.django_secret_key

  okta_client_id    = var.okta_client_id
  okta_issuer_uri   = var.okta_issuer_uri
  okta_redirect_uri = var.okta_redirect_uri

  allowed_cidr_blocks = ["0.0.0.0/0"] # Adjust for internal access

  # IAM Role Configuration - using existing roles due to permission constraints
  use_existing_iam_roles              = true
  existing_ecs_task_execution_role_arn = "arn:aws:iam::753029624111:role/ecsTaskExecutionRole"
  existing_ecs_task_role_arn          = "arn:aws:iam::753029624111:role/ecsTaskExecutionRole"

  tags = {
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}
