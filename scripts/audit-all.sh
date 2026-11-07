#!/bin/sh
set -e

echo "=================================================="
echo "🚀 ishoot.bh – Full End-to-End Audit & Verification"
echo "=================================================="

echo ""
echo "▶ [Pillar 1/5] Verifying Seed & Preset Date Parity..."
node scripts/verify-seed-dates.js

echo ""
echo "▶ [Pillar 2/5] Running Codebase & Directory Isolation Scan..."
npm run check:isolation

echo ""
echo "▶ [Pillar 3/5] Checking Microservice Health (16 Services)..."
./scripts/check-health.sh

echo ""
echo "▶ [Pillar 3/5] Generating OpenAPI & Running Spectral Lint..."
npm run gen:openapi
npx @stoplight/spectral-cli lint docs/api/combined-openapi.yaml

echo ""
echo "▶ [Pillar 3/5] Generating & Verifying Per-App API Contracts..."
npm run gen:contracts
diff -qr apps/web/contracts apps/admin/contracts
diff -qr apps/web/contracts apps/it/contracts
echo "✅ Contracts verified identical across apps."

echo ""
echo "▶ [Pillar 3/5] Running Newman Contract Smoke Tests (EdDSA Signed)..."
node scripts/generate-postman-artifacts.cjs
npx newman run docs/api/combined-openapi.postman_collection.json -e docs/api/gateway.env.json --bail

echo ""
echo "▶ [Pillar 4/5] Running Monorepo TypeScript Checks (Web, Admin, IT)..."
npm run type-check

echo ""
echo "=================================================="
echo "🎉 ALL AUDIT & REPAIR CHECKS PASSED WITH EXIT CODE 0!"
echo "=================================================="
