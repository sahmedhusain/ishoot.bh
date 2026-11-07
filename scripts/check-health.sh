#!/usr/bin/env bash
set -e

SERVICES="
audit:9085
cms:9088
commerce:9089
delivery:9090
files:9081
finance:9091
gateway:9080
hr:9092
identity:9082
inventory:9093
itsm:9083
notify:9086
realtime:9087
sales:9094
system:9084
workflow:9095
"

echo "🔍 Checking micro-service health across all 16 platform services..."

failures=0

for entry in $SERVICES; do
  [ -z "$entry" ] && continue
  svc="${entry%%:*}"
  port="${entry##*:}"

  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/readyz" 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/livez" 2>/dev/null || echo "ERR")
  if [ "$code" = "200" ]; then
    echo "  ✅ $svc healthy (port $port)"
  else
    echo "  ❌ $svc returned HTTP $code on port $port"
    failures=$((failures + 1))
  fi
done

if [ "$failures" -eq 0 ]; then
  echo "✅ All 16 platform micro-services are healthy."
  exit 0
else
  echo "❌ $failures service(s) failed health check."
  exit 1
fi
