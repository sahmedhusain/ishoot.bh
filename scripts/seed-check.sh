#!/bin/bash
# Pure SQL database seed runner with verification
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🌱 Running database seed (pure SQL)..."
"$ROOT_DIR/run.sh" db seed "$@"
node "$ROOT_DIR/scripts/verify-seed-dates.js"
echo "✅ Database seed verified."
