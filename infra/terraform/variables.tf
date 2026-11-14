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
  default     = "ghcr.io/platform"
}

variable "image_tag" {
  description = "Immutable release image tag (e.g. git SHA)"
  type        = string
  default     = "latest"
}

variable "web_domain" {
  description = "Public corporate website hostname"
  type        = string
  default     = "localhost"
}

variable "store_domain" {
  description = "Public storefront hostname"
  type        = string
  default     = "store.localhost"
}

variable "admin_domain" {
  description = "Internal admin ERP hostname"
  type        = string
  default     = "admin.localhost"
}

variable "it_domain" {
  description = "Internal IT operations portal hostname"
  type        = string
  default     = "it.localhost"
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
