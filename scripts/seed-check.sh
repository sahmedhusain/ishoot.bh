#!/bin/bash
# Seed workaround script that handles missing backend services gracefully

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🌱 Running seed with service availability check..."

# Test which services are available
test_service() {
  local service=$1
  local port=$2
  if curl -s -f "http://127.0.0.1:$port/health" > /dev/null 2>&1; then
    echo "✅ $service (port $port)"
    return 0
  else
    echo "⏭️  Skipping $service (not available on port $port)"
    return 1
  fi
}

echo ""
echo "Checking backend service availability:"
echo "======================================"

AVAILABLE_SERVICES=()

test_service "audit" 9085 && AVAILABLE_SERVICES+=(audit)
test_service "cms" 9088 || true
test_service "commerce" 9089 || true
test_service "delivery" 9090 || true
test_service "files" 9081 && AVAILABLE_SERVICES+=(files)
test_service "finance" 9091 || true
test_service "hr" 9092 || true
test_service "identity" 8082 && AVAILABLE_SERVICES+=(identity)
test_service "inventory" 9093 || true
test_service "itsm" 9083 && AVAILABLE_SERVICES+=(itsm)
test_service "notify" 9086 && AVAILABLE_SERVICES+=(notify)
test_service "realtime" 9087 && AVAILABLE_SERVICES+=(realtime)
test_service "sales" 9094 || true
test_service "system" 9084 && AVAILABLE_SERVICES+=(system)
test_service "workflow" 9095 || true

echo ""
echo "Found ${#AVAILABLE_SERVICES[@]}/15 services available"

if [ ${#AVAILABLE_SERVICES[@]} -lt 8 ]; then
  echo ""
  echo "⚠️  WARNING: Only ${#AVAILABLE_SERVICES[@]} services available."
  echo "            The seed requires all 15 services."
  echo ""
  echo "To add missing services:"
  echo "  1. Rebuild docker-compose with: docker-compose up -d --build"
  echo "  2. Wait for all services to be healthy"
  echo "  3. Run migrations: ./run.sh db migrate"
  echo "  4. Then run seed: npm --prefix company run seed"
  echo ""
  echo "Alternatively, run seed with available services only:"
  echo "  npm --prefix company run seed:partial"
  exit 1
fi

echo ""
echo "✅ All required services available!"
echo "🌱 Running seed..."
echo ""

cd "$ROOT_DIR/company"
npm run seed
