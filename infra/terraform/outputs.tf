output "namespace" {
  description = "Provisioned Kubernetes namespace"
  value       = kubernetes_namespace_v1.platform.metadata[0].name
}

output "frontend_services" {
  description = "Cluster-internal frontend service DNS names"
  value = {
    for name, svc in kubernetes_service_v1.frontend :
    name => "${svc.metadata[0].name}.${svc.metadata[0].namespace}.svc.cluster.local"
  }
}

output "backend_services" {
  description = "Cluster-internal Go microservice DNS names"
  value = {
    for name, svc in kubernetes_service_v1.backend :
    name => "${svc.metadata[0].name}.${svc.metadata[0].namespace}.svc.cluster.local"
  }
}
