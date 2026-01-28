# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "termageddon-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-cluster"
    }
  )
}

# Locals for role ARNs
locals {
  ecs_task_execution_role_arn = var.use_existing_iam_roles ? var.existing_ecs_task_execution_role_arn : aws_iam_role.ecs_task_execution[0].arn
  ecs_task_role_arn           = var.use_existing_iam_roles ? var.existing_ecs_task_role_arn : aws_iam_role.ecs_task[0].arn
}

# ECS Task Execution Role - only create if not using existing
resource "aws_iam_role" "ecs_task_execution" {
  count = var.use_existing_iam_roles ? 0 : 1
  name  = "termageddon-${var.environment}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-ecs-execution-role"
    }
  )
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  count      = var.use_existing_iam_roles ? 0 : 1
  role       = aws_iam_role.ecs_task_execution[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role - only create if not using existing
resource "aws_iam_role" "ecs_task" {
  count = var.use_existing_iam_roles ? 0 : 1
  name  = "termageddon-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-ecs-task-role"
    }
  )
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/termageddon-${var.environment}"
  retention_in_days = 30

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-ecs-logs"
    }
  )
}

# ECS Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "termageddon-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = local.ecs_task_execution_role_arn
  task_role_arn            = local.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "django"
      image = "${aws_ecr_repository.backend.repository_url}:${var.image_tag}"

      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "DJANGO_SETTINGS_MODULE"
          value = "Termageddon.settings"
        },
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "ALLOWED_HOSTS"
          value = "*"
        },
        {
          name  = "STATIC_URL"
          value = "/static/"
        },
        {
          name  = "STATIC_ROOT"
          value = "/app/staticfiles"
        },
        {
          name  = "DB_HOST"
          value = aws_db_instance.main.address
        },
        {
          name  = "DB_PORT"
          value = tostring(aws_db_instance.main.port)
        },
        {
          name  = "DB_NAME"
          value = var.db_name
        },
        {
          name  = "DB_USER"
          value = var.db_username
        },
        {
          name  = "DB_PASSWORD"
          value = var.db_password
        },
        {
          name  = "SECRET_KEY"
          value = var.django_secret_key
        },
        {
          name  = "OKTA_CLIENT_ID"
          value = var.okta_client_id
        },
        {
          name  = "OKTA_ISSUER_URI"
          value = var.okta_issuer_uri
        },
        {
          name  = "OKTA_REDIRECT_URI"
          value = var.okta_redirect_uri
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/api/health/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      essential = true
    }
  ])

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-task"
    }
  )
}

# ECS Service
resource "aws_ecs_service" "main" {
  name                   = "termageddon-${var.environment}-service"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.backend.arn
  desired_count          = var.desired_task_count
  launch_type            = "FARGATE"
  force_new_deployment   = true

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = "django"
    container_port   = 8000
  }

  depends_on = [
    aws_lb_listener.main,
    aws_lb_listener.http_redirect
  ]

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-service"
    }
  )
}
