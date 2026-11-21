#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WITH_LEGACY=0
for arg in "$@"; do
  case "$arg" in
    --with-legacy|--with-legacy-admin)
      WITH_LEGACY=1
      ;;
    -h|--help)
      echo "Usage: ./scripts/run-full-qa.sh [--with-legacy]"
      echo "  Runs manifest generation, Go backend tests (-p 1), Vitest + tsc across all 4 apps,"
      echo "  live-stack Playwright E2E suites across all 4 apps, and strict 4-tier log audit."
      echo "  --with-legacy   Run full Playwright suite including legacy testDatabase() specs."
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

mkdir -p .local/qa-logs
RUN_STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
printf '%s\n' "$RUN_STARTED_AT" > .local/qa-logs/run-started-at.txt
echo "==> QA Run Started At (UTC): $RUN_STARTED_AT"

echo "==> [1/5] Generating coverage manifest (.local/qa-manifest.json)..."
node scripts/generate-coverage-manifest.cjs

echo "==> [2/5] Running Go backend tests (serialized -p 1)..."
(cd backend && go test -p 1 ./...)

echo "==> [3/5] Running Vitest suites & TypeScript checks across web, store, it, admin..."
for app in web store it admin; do
  echo "  -> $app: vitest run + tsc --noEmit"
  npm --prefix "apps/$app" run test
  (cd "apps/$app" && npx tsc --noEmit)
done

echo "==> [4/5] Running Playwright E2E suites across web, store, it, admin..."
for app in web store it admin; do
  if [ "$WITH_LEGACY" -eq 1 ]; then
    echo "  -> $app: full Playwright E2E suite (including testDatabase specs)"
    npm --prefix "apps/$app" run test:e2e
  else
    specs=()
    while IFS= read -r spec; do
      [ -n "$spec" ] && specs+=("$spec")
    done < <(cd "apps/$app" && grep -rnL "testDatabase" tests/e2e/*.spec.ts | sort)
    echo "  -> $app: live-stack Playwright E2E specs (${#specs[@]} files)"
    if [ "${#specs[@]}" -gt 0 ]; then
      (cd "apps/$app" && npx playwright test "${specs[@]}")
    fi
  fi
done

echo "==> [5/5] Running strict 4-tier stack log audit..."
node scripts/analyze-stack-logs.cjs --strict

echo "🎉 FULL QA SUITE PASSED WITH 0 ERRORS."
