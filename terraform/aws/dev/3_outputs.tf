output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.termageddon.alb_dns_name
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.termageddon.vpc_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.termageddon.ecs_cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = module.termageddon.ecs_service_name
}
