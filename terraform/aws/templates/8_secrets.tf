# Django Secret Key
resource "aws_secretsmanager_secret" "django_secret" {
  name = "termageddon-${var.environment}-django-secret"

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-django-secret"
    }
  )
}

resource "aws_secretsmanager_secret_version" "django_secret" {
  secret_id = aws_secretsmanager_secret.django_secret.id
  secret_string = jsonencode({
    SECRET_KEY = random_password.django_secret_key.result
  })
}

# Random password for Django SECRET_KEY
resource "random_password" "django_secret_key" {
  length  = 50
  special = true
}

# Okta Configuration
resource "aws_secretsmanager_secret" "okta_config" {
  name = "termageddon-${var.environment}-okta-config"

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-okta-config"
    }
  )
}

resource "aws_secretsmanager_secret_version" "okta_config" {
  secret_id = aws_secretsmanager_secret.okta_config.id
  secret_string = jsonencode({
    OKTA_CLIENT_ID    = var.okta_client_id
    OKTA_ISSUER_URI   = var.okta_issuer_uri
    OKTA_REDIRECT_URI = var.okta_redirect_uri
  })
}
