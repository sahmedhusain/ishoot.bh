terraform {
  required_version = ">= 1.6.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.32"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}

locals {
  common_labels = {
    "app.kubernetes.io/part-of"    = "business-platform"
    "app.kubernetes.io/managed-by" = "terraform"
    "environment"                  = var.environment
  }

  frontend_apps = {
    web   = { port = 3000, domain = var.web_domain }
    admin = { port = 3001, domain = var.admin_domain }
    it    = { port = 3002, domain = var.it_domain }
    store = { port = 3003, domain = var.store_domain }
  }

  backend_services = {
    gateway   = 8080
    identity  = 8081
    system    = 8082
    audit     = 8083
    cms       = 8084
    commerce  = 8085
    finance   = 8086
    hr        = 8087
    inventory = 8088
    sales     = 8089
    delivery  = 8090
    itsm      = 8091
    files     = 8092
    notify    = 8093
    realtime  = 8094
    workflow  = 8095
  }
}

resource "kubernetes_namespace_v1" "platform" {
  metadata {
    name   = var.namespace
    labels = local.common_labels
  }
}

resource "kubernetes_config_map_v1" "platform_urls" {
  metadata {
    name      = "platform-service-urls"
    namespace = kubernetes_namespace_v1.platform.metadata[0].name
    labels    = local.common_labels
  }

  data = {
    NODE_ENV         = "production"
    IT_INTERNAL_URL  = "http://it.${var.namespace}.svc.cluster.local:3002"
    GATEWAY_BASE_URL = "http://gateway.${var.namespace}.svc.cluster.local:8080"
    IDENTITY_API_URL = "http://identity.${var.namespace}.svc.cluster.local:8081"
    SYSTEM_API_URL   = "http://system.${var.namespace}.svc.cluster.local:8082"
    AUDIT_API_URL    = "http://audit.${var.namespace}.svc.cluster.local:8083"
    CMS_API_URL      = "http://cms.${var.namespace}.svc.cluster.local:8084"
    ITSM_API_URL     = "http://itsm.${var.namespace}.svc.cluster.local:8091"
  }
}

resource "kubernetes_deployment_v1" "frontend" {
  for_each = local.frontend_apps

  metadata {
    name      = each.key
    namespace = kubernetes_namespace_v1.platform.metadata[0].name
    labels    = merge(local.common_labels, { app = each.key, tier = "frontend" })
  }

  spec {
    replicas = var.replicas_frontend

    selector {
      match_labels = { app = each.key }
    }

    template {
      metadata {
        labels = merge(local.common_labels, { app = each.key, tier = "frontend" })
      }

      spec {
        container {
          name  = each.key
          image = "${var.image_registry}/${each.key}:${var.image_tag}"

          port {
            container_port = each.value.port
          }

          env_from {
            config_map_ref {
              name = kubernetes_config_map_v1.platform_urls.metadata[0].name
            }
          }

          env_from {
            secret_ref {
              name     = "platform-secrets"
              optional = true
            }
          }

          liveness_probe {
            http_get {
              path = "/api/health"
              port = each.value.port
            }
            initial_delay_seconds = 15
            period_seconds        = 20
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "frontend" {
  for_each = local.frontend_apps

  metadata {
    name      = each.key
    namespace = kubernetes_namespace_v1.platform.metadata[0].name
    labels    = merge(local.common_labels, { app = each.key })
  }

  spec {
    selector = { app = each.key }
    port {
      port        = each.value.port
      target_port = each.value.port
    }
  }
}

resource "kubernetes_deployment_v1" "backend" {
  for_each = local.backend_services

  metadata {
    name      = each.key
    namespace = kubernetes_namespace_v1.platform.metadata[0].name
    labels    = merge(local.common_labels, { app = each.key, tier = "backend" })
  }

  spec {
    replicas = var.replicas_backend

    selector {
      match_labels = { app = each.key }
    }

    template {
      metadata {
        labels = merge(local.common_labels, { app = each.key, tier = "backend" })
      }

      spec {
        container {
          name  = each.key
          image = "${var.image_registry}/${each.key}:${var.image_tag}"

          port {
            container_port = each.value
          }

          env_from {
            secret_ref {
              name     = "platform-secrets"
              optional = true
            }
          }

          liveness_probe {
            http_get {
              path = "/healthz"
              port = each.value
            }
            initial_delay_seconds = 10
            period_seconds        = 15
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "backend" {
  for_each = local.backend_services

  metadata {
    name      = each.key
    namespace = kubernetes_namespace_v1.platform.metadata[0].name
    labels    = merge(local.common_labels, { app = each.key })
  }

  spec {
    selector = { app = each.key }
    port {
      port        = each.value
      target_port = each.value
    }
  }
}
