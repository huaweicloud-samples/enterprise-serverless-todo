terraform {
  required_version = ">= 1.0.0"
  required_providers {
    huaweicloud = {
      source  = "huaweicloud/huaweicloud"
      version = "1.96.1"
    }
  }
}

provider "huaweicloud" {
  region     = var.region
  access_key = var.access_key
  secret_key = var.secret_key
  domain_id  = var.domain_id
}

data "huaweicloud_vpc" "main" {
  id = "0aaf27d8-49dc-42c3-966b-61a35e0e3ca3"
}

data "huaweicloud_vpc_subnet" "main" {
  id = "9ba9f351-a43c-4e02-827b-df39c20c2f1e"
}

resource "huaweicloud_networking_secgroup" "todo_sg" {
  name        = "todo-sg"
  description = "Security group for Todo app functions"
}

resource "huaweicloud_networking_secgroup_rule" "allow_geminidb" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  remote_ip_prefix  = data.huaweicloud_vpc.main.cidr
  port_range_min    = 8635
  port_range_max    = 8635
  security_group_id = huaweicloud_networking_secgroup.todo_sg.id
}

resource "huaweicloud_obs_bucket" "frontend" {
  bucket = "todo-frontend-lambda2024"
  acl    = "private"
  cors_rule {
    allowed_origins = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}

resource "huaweicloud_obs_bucket_object" "function_code" {
  bucket       = huaweicloud_obs_bucket.frontend.bucket
  key          = "functions/lambda-functions.zip"
  content      = filebase64("${path.module}/functions.zip")
  content_type = "application/zip"
}

locals {
  functions = {
    getTodo:      { handler = "functions/getTodo/app.getToDoItem" }
    getAllTodo:   { handler = "functions/getAllTodo/app.getAllToDoItem" }
    addTodo:      { handler = "functions/addTodo/app.addToDoItem" }
    updateTodo:   { handler = "functions/updateTodo/app.updateToDoItem" }
    completeTodo: { handler = "functions/completeTodo/app.completeToDoItem" }
    deleteTodo:   { handler = "functions/deleteTodo/app.deleteToDoItem" }
  }
}

resource "huaweicloud_fgs_function" "todo_functions" {
  for_each = local.functions

  name         = "${each.key}-prod"
  app          = "default"
  handler      = each.value.handler
  memory_size  = 1024
  timeout      = 60
  runtime      = "Node.js12.13"
  code_type    = "zip"
  func_code    = filebase64("${path.module}/functions.zip")

  user_data = jsonencode({
    DB_URI     = "mongodb://root:Todo@prod2024@GEMINI_DB_LB_IP:8635/todos"
    JWT_SECRET = "your-secret-key-change-in-production"
    FUNCTION   = each.key
  })

  description = "Todo app ${each.key} function"
}

output "api_gateway_url" {
  description = "API Gateway URL"
  value       = "Requires manual APIG setup"
}

output "obs_bucket_name" {
  description = "OBS bucket name"
  value       = huaweicloud_obs_bucket.frontend.bucket
}

output "function_names" {
  description = "List of deployed function names"
  value       = [for f in huaweicloud_fgs_function.todo_functions : f.name]
}

output "function_urns" {
  description = "List of deployed function URNs"
  value       = [for f in huaweicloud_fgs_function.todo_functions : f.urn]
}

output "security_group_id" {
  description = "Security group ID"
  value       = huaweicloud_networking_secgroup.todo_sg.id
}

output "vpc_id" {
  description = "VPC ID"
  value       = data.huaweicloud_vpc.main.id
}
