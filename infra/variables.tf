#============================================
# Terraform Variables - Huawei Cloud Todo App
#============================================

variable "region" {
  description = "Huawei Cloud region (default: cn-north-4 Beijing 4)"
  type        = string
  default     = "cn-north-4"
}

variable "access_key" {
  description = "Huawei Cloud Access Key (set via terraform.tfvars, do NOT hardcode)"
  type        = string
  sensitive   = true
}

variable "secret_key" {
  description = "Huawei Cloud Secret Key (set via terraform.tfvars, do NOT hardcode)"
  type        = string
  sensitive   = true
}

variable "domain_id" {
  description = "Huawei Cloud account domain ID"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret for signing JWT tokens"
  type        = string
  sensitive   = true
  default     = "todo-app-jwt-secret-prod-2024"
}
