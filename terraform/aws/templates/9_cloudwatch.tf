# CloudWatch Log Group for ECS
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
