# Observability and debugging

| Signal  | Produced by                               | Stored in                                   | Read in                         |
| ------- | ----------------------------------------- | ------------------------------------------- | ------------------------------- |
| Logs    | `pkg/logx`: JSON on stdout                | Loki (Grafana Alloy ships container logs)   | Grafana, IT dashboard (Phase 4) |
| Metrics | `pkg/httpx`: `/metrics` on the admin port | Prometheus (ServiceMonitor in Kubernetes)   | Grafana, IT dashboard           |
| Traces  | `pkg/telemetry`: OpenTelemetry, OTLP/HTTP | Tempo (through the OpenTelemetry Collector) | Grafana                         |

## What every log line carries

`time`, `level`, `msg`, `service`, `version`, `env`, `request_id`, `trace_id`, plus `user_id` and `realm` once a
token is verified. Each HTTP request is logged once, with:

- the method, the route template (not the raw path, so logs stay groupable) and the path;
- the status, size, duration and client IP.

Responses of 4xx are logged at `warn`, and 5xx at `error` with the cause.

Every response carries `X-Request-ID` (the apps will forward and show it once they call the API). Searching Loki for it finds every log
line of that request in every service. The `trace_id` on those lines opens the trace in Tempo.

## Metrics

- `http_requests_total{service,method,route,status}`
- `http_request_duration_seconds{service,method,route}` (histogram)
- `http_requests_in_flight{service}`
- Go runtime and process metrics.

## Debugging

- **Log level at runtime:** `PUT /runtime/log-level` on the admin port (`debug`, `info`, `warn`, `error`). The IT
  dashboard will offer this per service.
- **SQL logging:** `DATABASE_LOG_QUERIES=true` logs every statement with its duration at `debug` level. Bound
  arguments are never logged.
- **Profiling:** `ADMIN_ENABLE_PPROF=true` serves `/debug/pprof/` on the admin port, which is not reachable from
  outside the cluster. Use it in development or briefly in production.
- **Readiness:** `/readyz` names each failing dependency and how long its check took.

## Locally

```bash
docker compose --profile observability up -d   # Collector, Prometheus, Loki, Tempo, Alloy, Grafana
# set OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 in .env, then: docker compose up -d gateway
open http://localhost:3300                      # Grafana (admin / GRAFANA_ADMIN_PASSWORD)
```

The data sources are provisioned: Prometheus, Loki (with links from `trace_id` to Tempo) and Tempo (with links back
to the logs).
