# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "termageddon-${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-db-subnet-group"
    }
  )
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  name   = "termageddon-${var.environment}-postgres"
  family = "postgres15"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-db-params"
    }
  )
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier             = "termageddon-${var.environment}"
  engine                  = "postgres"
  engine_version          = "15.4"
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  storage_type            = "gp3"
  storage_encrypted       = true
  db_name                 = var.db_name
  username                = var.db_username
  password                = random_password.db_password.result
  db_subnet_group_name    = aws_db_subnet_group.main.name
  parameter_group_name    = aws_db_parameter_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  publicly_accessible     = false
  skip_final_snapshot = var.environment == "dev"
  final_snapshot_identifier = var.environment == "prod" ? "termageddon-${var.environment}-final-snapshot" : null
  backup_retention_period  = 7
  backup_window            = "03:00-04:00"
  maintenance_window       = "mon:04:00-mon:05:00"
  multi_az                 = false # Single-AZ for internal use

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-db"
    }
  )
}

# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store database credentials in Secrets Manager
resource "aws_secretsmanager_secret" "db" {
  name = "termageddon-${var.environment}-db-credentials"

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-db-secret"
    }
  )
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    engine   = "postgres"
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = var.db_name
  })
}
