#!/usr/bin/env bash
# One entry point for everything you do with the platform: setup, environment, local services, databases,
# development, builds, tests, workers, scheduled jobs and deployment. Run `./run.sh help` for the list.
# Works with the bash that ships with macOS (3.2) and on Linux. Run it from anywhere; it works from the repo root.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# ----------------------------------------------------------------------------------------------------------
# Output helpers
# ----------------------------------------------------------------------------------------------------------
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; BLUE=""; RESET=""
fi
step() { printf '%s==>%s %s\n' "$BLUE$BOLD" "$RESET" "$*"; }
ok()   { printf '%s✓%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s!%s %s\n' "$YELLOW" "$RESET" "$*" >&2; }
die()  { printf '%s✗%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }
run()  { printf '%s$ %s%s\n' "$DIM" "$*" "$RESET"; "$@"; }
confirm() {
  [ "${YES:-0}" = 1 ] && return 0
  printf '%s [y/N] ' "$1"
  read -r answer
  case "$answer" in y | Y | yes | YES) return 0 ;; *) return 1 ;; esac
}

# Loads .env into this process (values, never printed).
load_env() {
  [ -f .env ] || die ".env is missing. Run: ./run.sh env init"
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
}

# The database URL with another database name (for _test databases and backups).
db_url_for() {
  node -e 'const u=new URL(process.argv[1]);u.pathname="/"+process.argv[2];console.log(u.toString())' "$1" "$2"
}
# DIRECT_URL without Prisma-only parameters, for psql and pg_dump.
plain_db_url() {
  node -e 'const u=new URL(process.argv[1]);for(const k of ["pgbouncer","connection_limit","pool_timeout","schema"])u.searchParams.delete(k);console.log(u.toString())' "${1:-${DIRECT_URL:-$DATABASE_URL}}"
}
is_local_db() {
  node -e 'const h=new URL(process.argv[1]).hostname;process.exit(["localhost","127.0.0.1","::1","[::1]"].includes(h)?0:1)' "$1"
}

# Runs a Postgres client tool: the installed one, else the compose Postgres container, else a throwaway one.
pg_tool() {
  local tool="$1"; shift
  if have "$tool"; then
    "$tool" "$@"
  elif have docker && [ -n "$(compose ps -q --status running postgres 2>/dev/null)" ]; then
    # Inside the container the database listens on its own port 5432.
    local args=() a
    for a in "$@"; do args+=("$(printf '%s' "$a" | sed -E 's#@(127\.0\.0\.1|localhost):[0-9]+/#@127.0.0.1:5432/#')"); done
    compose exec -T postgres "$tool" "${args[@]}"
  elif have docker; then
    local args=() a
    for a in "$@"; do args+=("$(printf '%s' "$a" | sed -e 's#@127\.0\.0\.1:#@host.docker.internal:#' -e 's#@localhost:#@host.docker.internal:#')"); done
    docker run --rm -i postgres:17-alpine "$tool" "${args[@]}"
  else
    die "$tool is not installed and Docker is not available (brew install libpq, or install Docker)."
  fi
}
# docker compose with the project's .env (docker-compose.yml: Postgres, Valkey, SeaweedFS, backend services).
compose() { docker compose --env-file .env "$@"; }

# ----------------------------------------------------------------------------------------------------------
# help
# ----------------------------------------------------------------------------------------------------------
usage() {
  cat <<EOF
${BOLD}Business platform: ./run.sh <command> [options]${RESET}

${BOLD}Getting started${RESET}
  setup [--demo|--light|--empty]   Install, create .env with secrets, start services, build the database
  doctor                           Check tools, versions, .env, services, database and ports
  install                          pnpm install and generate the Prisma client
  upgrade                          git pull, install, migrate and regenerate (after pulling new work)

${BOLD}Environment (.env)${RESET}
  env init                         Create .env from .env.example and generate every secret
  env sync                         Add variables that are new in .env.example (keeps your values)
  env secrets                      Generate any secret that is still empty
  env check [--production]         Validate .env (formats, required values, sandbox overrides)
  env keys                         List every variable as set / empty / missing / retired (no values shown)
  env service-keys                 Write the apps' public service keys for the backend (.local/service-keys.json)
  env edit                         Open .env in \$EDITOR

${BOLD}Local services${RESET}
  services up | down | restart     Local stack (docker-compose.yml): Postgres, Valkey, S3 storage, gateway, services
  services status                  What is running, and each service's health
  services logs [service]          Follow the logs (all services, or one)
  services observability           Add Grafana, Prometheus, Loki and Tempo (http://localhost:3300)
  services import-supabase         Move data and files from the old local Supabase stack (one-off)

${BOLD}Database${RESET}
  db reset [--light|--empty|--profile <name>] [--yes]   Fresh local database and files, seeded (local only)
  db migrate                       Apply pending migrations
  db status                        Migration status
  db new <name>                    Create a migration from schema changes (not applied)
  db generate                      Regenerate the Prisma client
  db seed                          Demo data into an empty database (SEED_VOLUME=off for less)
  db bootstrap [--profile <name>] [--overwrite]   Real installation: roles, modules, first admin
  db integrity                     Audit the data against the business rules
  db studio                        Prisma Studio on http://localhost:5555
  db psql                          Open psql on DIRECT_URL
  db backup [file]                 pg_dump to backups/<db>-<time>.dump (or the file given)
  db restore <file> [--yes]        Restore a dump into the configured database (local only unless --force)
  db test-list                     List the disposable *_test databases
  db test-drop [name|--all] [--yes]   Drop disposable *_test databases

${BOLD}Development${RESET}
  dev [all|admin|web|it]           Development servers (admin 3001, website 3000, IT 3002)
  build [--clean]                  Production build of both apps
  start [all|admin|web|it]         Serve the production build
  kill-ports                       Free ports 3000-3003
  clean                            Remove build output and caches
  format                           Prettier over the repository
  lint | types                     ESLint / TypeScript

${BOLD}Tests and checks${RESET}
  check                            Everything CI's static job runs (lint, types, tests, copy, brand, schemas, knip)
  test [unit|checks|all]           Unit tests and static checks (no database)
  test db                          Business-rule checks on disposable bare and seeded databases
  test e2e [playwright args]       Prepare the e2e databases, then Playwright (e.g. --project=admin specs/admin/orders.spec.ts)
  test e2e:prepare                 Rebuild the e2e databases only
  test e2e:ui                      Playwright UI mode (reuses prepared databases)
  test e2e:report                  Open the last Playwright report
  test volume                      2,000 people and 50,000 records, list timings
  test copy | brand | schemas | unused | deployment | workers
  test ci                          The static job, the database job and the e2e job, in that order

${BOLD}Background work${RESET}
  worker <email|revalidation|maintenance|all>   Run a worker (all = the three together)
  worker check                     Worker configuration and queue health
  cron [url]                       Call the admin's /api/cron once with CRON_SECRET (default ADMIN_URL)

${BOLD}Deployment${RESET}
  deploy check                     .env and deployment checks for production (pool limits, keys, storage, e-mail)
  deploy prepare                   check, migrate, then build (run with the production .env)
  deploy migrate                   Apply migrations to the configured database
  deploy vercel <admin|web|all> [--prod]   Deploy with the Vercel CLI (each app is its own Vercel project)
  deploy self <admin|web|all>      Build and start on this server (put a reverse proxy in front)

${BOLD}Other${RESET}
  docs                             Regenerate docs/API_REFERENCE.md
  company list                     Company profiles in company/profiles
  company demo-assets              Regenerate the demo company's artwork
  audit [inventory|identities|security]   Inventory and audit scripts
  urls                             Local addresses of every service
  help                             This list

Options: YES=1 answers yes to every confirmation. NO_COLOR=1 turns colours off.
EOF
}

# ----------------------------------------------------------------------------------------------------------
# setup, doctor, install, upgrade
# ----------------------------------------------------------------------------------------------------------
cmd_install() {
  step "Installing dependencies"
  run pnpm install
  run pnpm db:generate
}

cmd_setup() {
  local mode="${1:---demo}"
  have node || die "Node 22 or newer is needed."
  have pnpm || die "pnpm is needed: corepack enable && corepack prepare pnpm@12 --activate"
  cmd_install
  if [ -f .env ]; then
    step "Updating .env"
    node scripts/env-tool.cjs sync
    node scripts/env-tool.cjs secrets
  else
    step "Creating .env"
    node scripts/env-tool.cjs init
  fi
  load_env
  if [ -z "${SUPER_ADMIN_PASSWORD:-}" ]; then
    warn "SUPER_ADMIN_PASSWORD is empty. Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env, then run: ./run.sh db reset"
  fi
  if is_local_db "$DATABASE_URL"; then
    cmd_services up
  fi
  if [ -n "${SUPER_ADMIN_PASSWORD:-}" ]; then
    case "$mode" in
      --light) YES=1 cmd_db reset --light ;;
      --empty) YES=1 cmd_db reset --empty ;;
      *) YES=1 cmd_db reset ;;
    esac
  fi
  step "Installing the Playwright browser"
  pnpm exec playwright install chromium || warn "Playwright browser not installed; run: pnpm exec playwright install chromium"
  ok "Ready. Start with: ./run.sh dev"
  cmd_urls
}

cmd_doctor() {
  local failures=0
  check_tool() { if have "$1"; then ok "$1 $($1 --version 2>/dev/null | head -1)"; else warn "$1 not found${2:+ ($2)}"; [ "${3:-}" = required ] && failures=$((failures + 1)); fi; return 0; }
  step "Tools"
  check_tool node "Node 22 or newer" required
  if have node; then
    local major; major="$(node -p 'process.versions.node.split(".")[0]')"
    [ "$major" -ge 22 ] || { warn "Node $major is older than 22"; failures=$((failures + 1)); }
  fi
  check_tool pnpm "corepack enable" required
  check_tool docker "needed for the local stack" required
  check_tool git
  check_tool psql "optional: brew install libpq"
  check_tool vercel "optional: only for ./run.sh deploy vercel"
  step "Environment"
  if [ -f .env ]; then node scripts/env-tool.cjs check || failures=$((failures + 1)); else warn ".env missing: ./run.sh env init"; failures=$((failures + 1)); fi
  step "Dependencies"
  if [ -d node_modules ]; then ok "node_modules present"; else warn "dependencies not installed: ./run.sh install"; failures=$((failures + 1)); fi
  if [ -f .env ]; then
    load_env
    step "Database"
    local status pending
    status="$(pnpm exec prisma migrate status --schema=packages/database/prisma/schema.prisma 2>&1 || true)"
    pending="$(printf '%s\n' "$status" | grep -cE '^[0-9]{14}_' || true)"
    if printf '%s' "$status" | grep -q "up to date"; then
      ok "database reachable, migrations up to date"
    elif [ "${pending:-0}" -gt 0 ]; then
      warn "$pending migration(s) not applied yet: ./run.sh db migrate"
    else
      warn "database unreachable: ./run.sh services up (or check DATABASE_URL)"
    fi
  fi
  step "Ports"
  local port
  for port in 3000 3001 54321 54322; do
    if lsof -ti ":$port" >/dev/null 2>&1; then ok "$port in use"; else printf '  %s free\n' "$port"; fi
  done
  [ "$failures" -eq 0 ] && ok "No blocking problems." || die "$failures blocking problem(s)."
}

cmd_upgrade() {
  step "Pulling"
  run git pull --ff-only
  cmd_install
  [ -f .env ] && node scripts/env-tool.cjs sync
  load_env
  run pnpm db:migrate
  ok "Up to date."
}

# ----------------------------------------------------------------------------------------------------------
# env
# ----------------------------------------------------------------------------------------------------------
cmd_env() {
  local sub="${1:-keys}"; shift || true
  case "$sub" in
    init | sync | secrets | keys | service-keys) node scripts/env-tool.cjs "$sub" "$@" ;;
    check) node scripts/env-tool.cjs check "$@" ;;
    edit) [ -f .env ] || die ".env is missing. Run: ./run.sh env init"; "${EDITOR:-vi}" .env ;;
    *) die "Unknown: env $sub (init, sync, secrets, check, keys, service-keys, edit)" ;;
  esac
}

# ----------------------------------------------------------------------------------------------------------
# services
# ----------------------------------------------------------------------------------------------------------
cmd_services() {
  local sub="${1:-status}"; shift || true
  [ -f .env ] || die ".env is missing. Run: ./run.sh env init"
  have docker || die "Docker is needed for the local stack."
  docker info >/dev/null 2>&1 || die "Docker is not running."
  case "$sub" in
    up | start)
      node scripts/env-tool.cjs service-keys >/dev/null
      step "Starting the local stack"
      run compose up -d --build --wait
      ok "Gateway on http://127.0.0.1:${GATEWAY_PORT:-8080}, Postgres on 127.0.0.1:${POSTGRES_PORT:-5432}, S3 on 127.0.0.1:${S3_PORT:-8333}"
      ;;
    down | stop) step "Stopping the local stack"; run compose --profile observability --profile tools down ;;
    restart) cmd_services down; cmd_services up ;;
    status)
      compose ps
      for svc in gateway files; do
        printf '%s: ' "$svc"; compose exec -T "$svc" /app healthcheck >/dev/null 2>&1 && echo ready || echo "not ready"
      done
      ;;
    logs) run compose logs -f "$@" ;;
    observability) run compose --profile observability up -d; ok "Grafana on http://localhost:${GRAFANA_PORT:-3300}" ;;
    import-supabase) services_import_supabase "$@" ;;
    *) die "Unknown: services $sub (up, down, restart, status, logs, observability, import-supabase)" ;;
  esac
}

# One-off move from the old local Supabase stack: copies its database into the compose Postgres and its stored
# files into the new storage. Run it once, with the Supabase stack still running, before pointing .env at compose.
services_import_supabase() {
  local source_url="${1:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
  load_env
  local target_url="postgresql://${POSTGRES_USER:-platform}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-platform_db}"
  confirm "Replace the compose database ${POSTGRES_DB:-platform_db} with a copy of $source_url?" || die "Cancelled."
  cmd_services up
  local dump; dump="$(mktemp -t platform-supabase-XXXXXX).dump"
  step "Copying the database"
  docker run --rm --network host postgres:17-alpine pg_dump --format=custom --no-owner --no-privileges --schema=public "$source_url" >"$dump"
  docker run --rm -i --network host postgres:17-alpine pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$target_url" <"$dump"
  rm -f "$dump"
  step "Moving uploads into the files schema"
  DATABASE_URL="$target_url" DIRECT_URL="$target_url" run pnpm --filter @platform/database exec prisma migrate deploy --schema=prisma/schema.prisma
  run compose run --rm files-migrate
  step "Copying stored files"
  warn "Supabase Storage's S3 keys are shown by: pnpm dlx supabase status (S3 Access Key / S3 Secret Key)."
  printf 'Supabase S3 access key: '; read -r access
  printf 'Supabase S3 secret key: '; read -rs secret; echo
  (cd backend && DATABASE_URL="$target_url?sslmode=disable" S3_ENDPOINT="http://127.0.0.1:${S3_PORT:-8333}" \
    S3_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" S3_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
    go run ./tools/storage-copy -from-s3 http://127.0.0.1:54321/storage/v1/s3 -from-access-key "$access" -from-secret-key "$secret" -from-region local)
  if [ -d apps/admin/private/uploads ]; then
    (cd backend && DATABASE_URL="$target_url?sslmode=disable" S3_ENDPOINT="http://127.0.0.1:${S3_PORT:-8333}" \
      S3_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" S3_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
      go run ./tools/storage-copy -from-dir ../apps/admin/private/uploads)
  fi
  ok "Imported. Set DATABASE_URL and DIRECT_URL in .env to $target_url, then stop Supabase: pnpm dlx supabase stop"
}

# ----------------------------------------------------------------------------------------------------------
# db
# ----------------------------------------------------------------------------------------------------------
cmd_db() {
  local sub="${1:-status}"; shift || true
  load_env
  case "$sub" in
    reset)
      local args=() a
      for a in "$@"; do args+=("$a"); done
      [ "${YES:-0}" = 1 ] && args+=("--yes")
      node scripts/db-reset.cjs ${args[@]+"${args[@]}"}
      ;;
    migrate) run pnpm db:migrate ;;
    status) run pnpm db:status ;;
    new)
      [ -n "${1:-}" ] || die "Usage: ./run.sh db new <name>"
      run pnpm db:migrate:new --name "$1"
      warn "Review the SQL, add CHECK constraints by hand, then run: ./run.sh db migrate && ./run.sh db generate"
      ;;
    generate) run pnpm db:generate ;;
    seed) run pnpm db:seed ;;
    bootstrap)
      local profile="" overwrite=""
      while [ $# -gt 0 ]; do
        case "$1" in --profile) profile="$2"; shift 2 ;; --overwrite) overwrite=1; shift ;; *) die "Unknown option $1" ;; esac
      done
      COMPANY_PROFILE="${profile:-${COMPANY_PROFILE:-}}" COMPANY_PROFILE_OVERWRITE="$overwrite" run pnpm db:bootstrap
      ;;
    integrity | check) run pnpm db:check-integrity ;;
    studio) run pnpm db:studio ;;
    psql) pg_tool psql "$(plain_db_url)" ;;
    backup)
      local url name file
      url="$(plain_db_url)"
      name="$(node -e 'console.log(new URL(process.argv[1]).pathname.slice(1)||"postgres")' "$url")"
      file="${1:-backups/${name}-$(date +%Y%m%d-%H%M%S).dump}"
      mkdir -p "$(dirname "$file")"
      step "Backing up $name to $file"
      pg_tool pg_dump --format=custom --no-owner --no-privileges "$url" >"$file"
      ok "Saved $file ($(du -h "$file" | cut -f1)). Back up the storage buckets with it: file URLs point into storage."
      ;;
    restore)
      local file="${1:-}" force=0 url
      [ -f "$file" ] || die "Usage: ./run.sh db restore <file.dump> [--yes] [--force]"
      case " $* " in *" --force "*) force=1 ;; esac
      case " $* " in *" --yes "*) YES=1 ;; esac
      url="$(plain_db_url)"
      if ! is_local_db "$url" && [ "$force" != 1 ]; then die "Refusing to restore into a remote database without --force."; fi
      confirm "Replace the data in the configured database with $file?" || die "Cancelled."
      pg_tool pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$url" <"$file"
      ok "Restored. Run ./run.sh db migrate if the dump is older than the code."
      ;;
    test-list)
      pg_tool psql "$(plain_db_url)" -Atc "select datname from pg_database where datname like '%\_test' order by 1"
      ;;
    test-drop)
      local target="${1:-}" names
      [ -n "$target" ] || die "Usage: ./run.sh db test-drop <name_test|--all> [--yes]"
      case " $* " in *" --yes "*) YES=1 ;; esac
      if [ "$target" = "--all" ]; then
        names="$(pg_tool psql "$(plain_db_url)" -Atc "select datname from pg_database where datname like '%\_test'")"
      else
        case "$target" in *_test) names="$target" ;; *) die "Only databases whose name ends in _test can be dropped here." ;; esac
      fi
      [ -n "$names" ] || { ok "No test databases."; return 0; }
      printf '%s\n' "$names"
      confirm "Drop these databases?" || die "Cancelled."
      local n
      for n in $names; do pg_tool psql "$(plain_db_url)" -c "drop database if exists \"$n\" with (force)"; done
      ok "Dropped."
      ;;
    *) die "Unknown: db $sub (see ./run.sh help)" ;;
  esac
}

# ----------------------------------------------------------------------------------------------------------
# dev, build, start
# ----------------------------------------------------------------------------------------------------------
cmd_dev() {
  case "${1:-all}" in
    all) run pnpm dev ;;
    admin) run pnpm dev:admin ;;
    web | website) run pnpm dev:web ;;
    it) run pnpm dev:it ;;
    *) die "dev [all|admin|web|it]" ;;
  esac
}
cmd_build() {
  if [ "${1:-}" = "--clean" ]; then run pnpm build:clean; else run pnpm build; fi
}
cmd_start() {
  local app="${1:-all}"
  case "$app" in
    admin) run pnpm --filter @platform/admin start ;;
    web | website) run pnpm --filter @platform/web start ;;
    it) run pnpm --filter @platform/it start ;;
    all)
      trap 'kill 0' INT TERM EXIT
      pnpm --filter @platform/web start &
      pnpm --filter @platform/admin start &
      pnpm --filter @platform/it start &
      wait
      ;;
    *) die "start [all|admin|web|it]" ;;
  esac
}

# ----------------------------------------------------------------------------------------------------------
# tests
# ----------------------------------------------------------------------------------------------------------
cmd_check() {
  local failed=""
  local item
  for item in lint type-check test test:copy test:brand test:action-schemas audit:unused; do
    step "pnpm $item"
    pnpm "$item" || failed="$failed $item"
  done
  [ -z "$failed" ] && ok "All checks passed." || die "Failed:$failed"
}

cmd_test() {
  local sub="${1:-all}"; shift || true
  case "$sub" in
    all | "") run pnpm test ;;
    unit) run pnpm test:unit ;;
    checks | static) run pnpm test:checks ;;
    db | database)
      load_env
      local bare seeded
      bare="$(db_url_for "${DIRECT_URL:-$DATABASE_URL}" platform_bare_test)"
      seeded="$(db_url_for "${DIRECT_URL:-$DATABASE_URL}" platform_seeded_test)"
      step "Preparing platform_bare_test and platform_seeded_test"
      run node tests/e2e/prepare-db.cjs bare platform_bare_test
      SEED_VOLUME=on run node tests/e2e/prepare-db.cjs seeded platform_seeded_test
      CHECKS_BARE_DATABASE_URL="$bare" CHECKS_SEEDED_DATABASE_URL="$seeded" run pnpm test:checks:db
      ;;
    e2e) run pnpm test:e2e:prepare; run pnpm exec playwright test "$@" ;;
    e2e:prepare) run pnpm test:e2e:prepare ;;
    e2e:ui) run pnpm exec playwright test --ui "$@" ;;
    e2e:report) run pnpm exec playwright show-report tests/.results/playwright-report ;;
    volume) run pnpm test:volume ;;
    copy) run pnpm test:copy ;;
    brand) run pnpm test:brand ;;
    schemas) run pnpm test:action-schemas ;;
    unused) run pnpm audit:unused ;;
    deployment) run pnpm check:deployment ;;
    workers) run pnpm check:workers ;;
    ci) cmd_check; cmd_test db; cmd_test e2e ;;
    *) die "Unknown: test $sub (see ./run.sh help)" ;;
  esac
}

# ----------------------------------------------------------------------------------------------------------
# workers and cron
# ----------------------------------------------------------------------------------------------------------
cmd_worker() {
  case "${1:-}" in
    email) run pnpm worker:email ;;
    revalidation) run pnpm worker:revalidation ;;
    maintenance) run pnpm worker:maintenance ;;
    all)
      trap 'kill 0' INT TERM EXIT
      pnpm worker:email &
      pnpm worker:revalidation &
      pnpm worker:maintenance &
      wait
      ;;
    check) run pnpm check:workers ;;
    *) die "worker <email|revalidation|maintenance|all|check>" ;;
  esac
}
cmd_cron() {
  load_env
  [ -n "${CRON_SECRET:-}" ] || die "CRON_SECRET is empty. Run: ./run.sh env secrets"
  local base="${1:-${ADMIN_URL:-http://localhost:3001}}"
  step "GET ${base%/}/api/cron"
  curl -fsS -H "Authorization: Bearer $CRON_SECRET" "${base%/}/api/cron"
  echo
}

# ----------------------------------------------------------------------------------------------------------
# deploy
# ----------------------------------------------------------------------------------------------------------
cmd_deploy() {
  local sub="${1:-check}"; shift || true
  case "$sub" in
    check)
      step "Checking .env for production"
      node scripts/env-tool.cjs check --production || true
      step "Deployment configuration"
      run pnpm check:deployment
      ;;
    prepare)
      cmd_deploy check
      load_env
      confirm "Apply migrations to the configured database and build?" || die "Cancelled."
      run pnpm db:migrate
      run pnpm db:generate
      run pnpm build
      ok "Built. Start the apps (./run.sh start), the workers (./run.sh worker all) or schedule /api/cron."
      ;;
    migrate)
      load_env
      confirm "Apply pending migrations to the configured database?" || die "Cancelled."
      run pnpm db:migrate
      ;;
    vercel)
      local app="${1:-}" prod=""
      shift || true
      case " $* " in *" --prod "*) prod="--prod" ;; esac
      have vercel || die "Install the Vercel CLI: pnpm add -g vercel (then vercel login)."
      deploy_one() {
        step "Deploying apps/$1 to Vercel ${prod:+(production)}"
        warn "First time: link the project with 'vercel link --cwd apps/$1' and set its root directory to apps/$1, its environment variables, and a cron calling /api/cron on the admin."
        run vercel deploy --cwd "apps/$1" $prod
      }
      case "$app" in
        admin | web) deploy_one "$app" ;;
        all) deploy_one web; deploy_one admin ;;
        *) die "deploy vercel <admin|web|all> [--prod]" ;;
      esac
      ;;
    self)
      local app="${1:-all}"
      cmd_deploy prepare
      warn "Keep these running with a process manager (systemd, pm2…), with the workers or a scheduled /api/cron."
      cmd_start "$app"
      ;;
    *) die "Unknown: deploy $sub (check, prepare, migrate, vercel, self)" ;;
  esac
}

# ----------------------------------------------------------------------------------------------------------
# other
# ----------------------------------------------------------------------------------------------------------
cmd_company() {
  case "${1:-list}" in
    list) ls -1 company/profiles | grep -v '^\.' | grep -v README ;;
    demo-assets) run pnpm company:demo-assets ;;
    *) die "company [list|demo-assets]" ;;
  esac
}
cmd_audit() {
  case "${1:-inventory}" in
    inventory) run pnpm audit:inventory ;;
    identities) run pnpm audit:customer-identities ;;
    security) run pnpm test:audit-security ;;
    *) die "audit [inventory|identities|security]" ;;
  esac
}
cmd_urls() {
  cat <<EOF
  Website           http://localhost:3000   (/en, /ar)
  Admin             http://localhost:3001
  Backend gateway   http://127.0.0.1:8080   (admin port 9080: /readyz, /metrics)
  Postgres          127.0.0.1:5432
  S3 storage        http://127.0.0.1:8333   (SeaweedFS)
  Grafana           http://localhost:3300   (./run.sh services observability)
  Prisma Studio     http://localhost:5555   (./run.sh db studio)
  pgAdmin           http://localhost:5050   (docker compose --profile tools up -d)
  E2E test servers  admin 3101, website 3102, setup wizard 3103
EOF
}

command="${1:-help}"
shift || true
case "$command" in
  help | -h | --help) usage ;;
  setup) cmd_setup "$@" ;;
  doctor) cmd_doctor ;;
  install) cmd_install ;;
  upgrade | update) cmd_upgrade ;;
  env) cmd_env "$@" ;;
  services | svc) cmd_services "$@" ;;
  db) cmd_db "$@" ;;
  dev) cmd_dev "$@" ;;
  build) cmd_build "$@" ;;
  start) cmd_start "$@" ;;
  kill-ports) run pnpm kill-ports ;;
  clean) run pnpm clean ;;
  format) run pnpm format ;;
  lint) run pnpm lint ;;
  types | type-check) run pnpm type-check ;;
  check) cmd_check ;;
  test) cmd_test "$@" ;;
  worker | workers) cmd_worker "$@" ;;
  cron) cmd_cron "$@" ;;
  deploy) cmd_deploy "$@" ;;
  docs) run pnpm docs:api ;;
  company) cmd_company "$@" ;;
  audit) cmd_audit "$@" ;;
  urls) cmd_urls ;;
  *) usage; die "Unknown command: $command" ;;
esac
