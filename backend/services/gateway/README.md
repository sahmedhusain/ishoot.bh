# gateway

The single public entry point of the backend. It does not own any data. Every request goes through these steps:

1. **Routing.** The longest matching prefix in the route table picks the upstream service.
2. **Authentication.** On a non-public route, the caller must present an access token for one of the route's realms.
   The token is verified locally against the identity service's JWKS, which is cached and refreshed when keys rotate.
   The upstream service verifies the token again.
3. **Rate limiting.** One limit per route, shared by every gateway replica through Valkey. Signed-in callers are
   counted per account, everyone else per client IP.
4. **Proxying.** The request goes to the upstream service with `X-Request-ID`, the trace context and the
   `X-Forwarded-*` headers. Paths with dot segments are refused. Upstream server banners are removed.

## Route table

Mounted from [`config/routes.yaml`](config/routes.yaml) locally, and from the Helm values (`services.gateway.configFiles`)
in Kubernetes. Upstream names are mapped to URLs by `GATEWAY_UPSTREAMS` (`identity=http://identity:8080,…`).

```yaml
rateLimits:
  default: { requests: 300, window: 1m }
  sensitive: { requests: 10, window: 1m, burst: 5 }
routes:
  - name: tickets # unique; used in logs
    prefix: /v1/tickets/ # starts and ends with /
    upstream: itsm # a name from GATEWAY_UPSTREAMS
    realms: [staff, it] # or [public]
    stripPrefix: true # send /v1/tickets/42 as <upstream base>/42
    rateLimit: default
```

The gateway refuses to start if the table has unknown fields, duplicate names or prefixes, unknown upstreams, realms
or rate limits. It also refuses if a route needs a token while `AUTH_ISSUER` and `AUTH_JWKS_URL` are not set.

## Configuration

All variables, defaults and rules: [docs/backend/CONFIG.md#gateway](../../../docs/backend/CONFIG.md#gateway).

## Responses the gateway itself produces

| Status | `code`                | When                                                        |
| ------ | --------------------- | ----------------------------------------------------------- |
| 400    | `bad_request`         | dot segments or encoded slashes in the path                 |
| 401    | `unauthenticated`     | missing, invalid or expired token, or wrong realm           |
| 404    | `not_found`           | no route matches                                            |
| 413    | `payload_too_large`   | body over `HTTP_BODY_LIMIT`                                 |
| 429    | `rate_limited`        | over the route's limit (`Retry-After` is set)               |
| 502    | `bad_gateway`         | the upstream refused the connection or failed               |
| 503    | `service_unavailable` | Valkey unreachable and `GATEWAY_RATE_LIMIT_FAIL_OPEN=false` |
| 504    | `timeout`             | the upstream did not answer in time                         |

## Runbook

- **Readiness is down.** `curl <pod>:9090/readyz` names the failing check; the only one is `redis`. Check Valkey.
- **Everyone gets 401.** Check that `AUTH_ISSUER` matches the identity service's issuer and that `AUTH_JWKS_URL` is
  reachable from the gateway (NetworkPolicy egress). The cached key set keeps working through short identity outages.
- **More detail is needed.** `curl -X PUT <pod>:9090/runtime/log-level -d '{"level":"debug"}'` raises the log level
  without a restart (set it back to `info` afterwards).
