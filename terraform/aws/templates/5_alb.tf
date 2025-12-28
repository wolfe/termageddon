# Application Load Balancer
resource "aws_lb" "main" {
  name               = "termageddon-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups     = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "prod"

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-alb"
    }
  )
}

# Target Group
resource "aws_lb_target_group" "main" {
  name        = "termageddon-${var.environment}-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health/"
    protocol            = "HTTP"
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-tg"
    }
  )
}

# ACM Certificate (optional, only if domain_name and enable_https are set)
data "aws_acm_certificate" "main" {
  count    = var.enable_https && var.domain_name != "" ? 1 : 0
  domain   = var.domain_name
  statuses = ["ISSUED"]
}

# HTTPS Listener (if enabled)
resource "aws_lb_listener" "main" {
  count             = var.enable_https && var.domain_name != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn    = data.aws_acm_certificate.main[0].arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

# HTTP Listener (redirects to HTTPS if HTTPS enabled, otherwise forwards)
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = var.enable_https && var.domain_name != "" ? "redirect" : "forward"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }

    target_group_arn = var.enable_https && var.domain_name != "" ? null : aws_lb_target_group.main.arn
  }
}
