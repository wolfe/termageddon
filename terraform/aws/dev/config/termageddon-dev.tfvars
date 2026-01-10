okta_client_id    = "your-okta-client-id"
okta_issuer_uri   = "https://sso.uat.verisk.com/oauth2/aus2kwrfxskZ9UAGF0h8"
okta_redirect_uri = "http://your-dev-alb-dns-name/callback"

# Use existing roles (you don't have permission to create new ones)
ecs_task_execution_role_arn = "arn:aws:iam::753029624111:role/ecsTaskExecutionRole"
ecs_task_role_arn           = "arn:aws:iam::753029624111:role/ecsTaskRole"
