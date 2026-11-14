variable "environment" {
  description = "Deployment environment (staging or production)"
  type        = string
  default     = "production"
}

variable "namespace" {
  description = "Kubernetes namespace for platform workloads"
  type        = string
  default     = "platform-prod"
}

variable "image_registry" {
  description = "Container registry prefix for platform images"
  type        = string
  default     = "ghcr.io/ishoot-bh"
}

variable "image_tag" {
  description = "Immutable release image tag (e.g. git SHA)"
  type        = string
  default     = "latest"
}

variable "web_domain" {
  description = "Public corporate website hostname"
  type        = string
  default     = "ishoot.bh"
}

variable "store_domain" {
  description = "Public storefront hostname"
  type        = string
  default     = "store.ishoot.bh"
}

variable "admin_domain" {
  description = "Internal admin ERP hostname"
  type        = string
  default     = "admin.ishoot.bh"
}

variable "it_domain" {
  description = "Internal IT operations portal hostname"
  type        = string
  default     = "it.ishoot.bh"
}

variable "replicas_frontend" {
  description = "Replica count for Next.js frontend deployments"
  type        = number
  default     = 2
}

variable "replicas_backend" {
  description = "Replica count for Go microservice deployments"
  type        = number
  default     = 2
}
