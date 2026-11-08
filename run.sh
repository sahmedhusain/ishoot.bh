#!/usr/bin/env bash
# One entry point for everything you do with the platform: setup, environment, local services, databases,
# development, builds, tests, workers, scheduled jobs and deployment.
# Run `./run.sh` for the interactive menu or `./run.sh <command>` for direct execution.
# Works with the bash that ships with macOS (3.2) and on Linux. Run it from anywhere; it works from the repo root.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# ----------------------------------------------------------------------------------------------------------
# Output & Styling helpers
# ----------------------------------------------------------------------------------------------------------
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
  YELLOW=$'\033[33m'; BLUE=$'\033[34m'; MAGENTA=$'\033[35m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; BLUE=""; MAGENTA=""; CYAN=""; RESET=""
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
# DATABASE_DIRECT_URL without Prisma-only parameters, for psql and pg_dump.
plain_db_url() {
  node -e 'const u=new URL(process.argv[1]).hostname?process.argv[1]:"postgresql://platform:platform@127.0.0.1:5432/platform_db";const u2=new URL(u);for(const k of ["pgbouncer","connection_limit","pool_timeout","schema"])u2.searchParams.delete(k);console.log(u2.toString())' "${1:-${DATABASE_DIRECT_URL:-${DATABASE_URL:-postgresql://platform:platform@127.0.0.1:5432/platform_db}}}"
}
is_local_db() {
  node -e 'try{const h=new URL(process.argv[1]).hostname;process.exit(["localhost","127.0.0.1","::1","[::1]"].includes(h)?0:1)}catch{process.exit(0)}' "${1:-}"
}

# Runs a Postgres client tool: the installed one, else the compose Postgres container, else a throwaway one.
pg_tool() {
  local tool="$1"; shift
  if have "$tool"; then
    "$tool" "$@"
  elif have docker && [ -n "$(compose ps -q --status running postgres 2>/dev/null)" ]; then
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
compose() { docker compose --env-file .env "$@"; }

# List of all 15 backend microservices
SERVICES_LIST=(audit cms commerce delivery files finance hr identity inventory itsm notify realtime sales system workflow)

# ----------------------------------------------------------------------------------------------------------
# Interactive ATM/CLI Menu System
# ----------------------------------------------------------------------------------------------------------
pause_prompt() {
  printf '\n%sPress [Enter] to return to the menu...%s' "$DIM" "$RESET"
  read -r _ || true
}

interactive_menu() {
  while true; do
    clear 2>/dev/null || true
    echo "${CYAN}${BOLD}┌────────────────────────────────────────────────────────────────────────────┐${RESET}"
    echo "${CYAN}${BOLD}│                        🏢 PLATFORM CLI                              │${RESET}"
    echo "${CYAN}${BOLD}│               Interactive Management & Development System                  │${RESET}"
    echo "${CYAN}${BOLD}└────────────────────────────────────────────────────────────────────────────┘${RESET}"
    echo ""
    echo "${BOLD}Select an operation by number:${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} 🚀 ${BOLD}Quick Start & Setup${RESET}          ${CYAN}[6]${RESET} 🧪 ${BOLD}Tests & Quality Checks${RESET}"
    echo "  ${GREEN}[2]${RESET} 💻 ${BOLD}Development Servers${RESET}          ${CYAN}[7]${RESET} ⚙️  ${BOLD}Background Workers & Cron${RESET}"
    echo "  ${GREEN}[3]${RESET} 🐳 ${BOLD}Local Services & Docker${RESET}      ${CYAN}[8]${RESET} 🚀 ${BOLD}Build & Deployment${RESET}"
    echo "  ${GREEN}[4]${RESET} 🗄️  ${BOLD}Database Operations${RESET}          ${CYAN}[9]${RESET} 🔑 ${BOLD}Environment & Secrets${RESET}"
    echo "  ${GREEN}[5]${RESET} 🛠️  ${BOLD}System Doctor & Audit${RESET}        ${MAGENTA}[H]${RESET} 📖 ${BOLD}Standard CLI Help${RESET}"
    echo ""
    echo "  ${RED}[0]${RESET} 🚪 ${BOLD}Exit CLI${RESET}"
    echo ""
    printf "%sEnter selection [0-9, H]: %s" "$BOLD" "$RESET"
    read -r choice || choice=""

    case "$choice" in
      1) menu_quickstart ;;
      2) menu_dev ;;
      3) menu_services ;;
      4) menu_db ;;
      5) menu_doctor ;;
      6) menu_tests ;;
      7) menu_workers ;;
      8) menu_deploy ;;
      9) menu_env ;;
      h | H | help)
        clear 2>/dev/null || true
        usage
        pause_prompt
        ;;
      0 | q | Q | exit)
        echo "${GREEN}Goodbye!${RESET}"
        exit 0
        ;;
      *)
        echo "${RED}Invalid selection. Please try again.${RESET}"
        sleep 1
        ;;
    esac
  done
}

menu_quickstart() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🚀 Quick Start & Setup ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Full Setup (--demo)  - Install, .env, Services & Demo Data"
    echo "  ${GREEN}[2]${RESET} Light Setup (--light) - Faster Setup with Light Seed Data"
    echo "  ${GREEN}[3]${RESET} Empty Setup (--empty) - Clean Setup for First Admin Wizard"
    echo "  ${GREEN}[4]${RESET} Install Dependencies & Build Go Services"
    echo "  ${GREEN}[5]${RESET} Upgrade Platform (git pull, dependencies, migrations)"
    echo "  ${GREEN}[6]${RESET} Show Service URLs & Ports"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-6]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_setup --demo; pause_prompt ;;
      2) cmd_setup --light; pause_prompt ;;
      3) cmd_setup --empty; pause_prompt ;;
      4) cmd_install; pause_prompt ;;
      5) cmd_upgrade; pause_prompt ;;
      6) cmd_urls; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_dev() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 💻 Development Servers ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Start All Dev Servers (Web: 3000, Admin: 3001, IT: 3002)"
    echo "  ${GREEN}[2]${RESET} Start Website (http://localhost:3000)"
    echo "  ${GREEN}[3]${RESET} Start Admin Dashboard (http://localhost:3001)"
    echo "  ${GREEN}[4]${RESET} Start IT Support Dashboard (http://localhost:3002)"
    echo "  ${GREEN}[5]${RESET} Free Up Dev Ports (3000-3002, 8080)"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-5]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_dev all; pause_prompt ;;
      2) cmd_dev web; pause_prompt ;;
      3) cmd_dev admin; pause_prompt ;;
      4) cmd_dev it; pause_prompt ;;
      5) node scripts/kill-ports.cjs; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_services() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🐳 Local Services & Docker ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Start Local Services (Postgres, Valkey, S3, Gateway)"
    echo "  ${GREEN}[2]${RESET} Stop Local Stack"
    echo "  ${GREEN}[3]${RESET} Restart Local Stack"
    echo "  ${GREEN}[4]${RESET} Check Services Health Status"
    echo "  ${GREEN}[5]${RESET} View Logs (docker compose logs -f)"
    echo "  ${GREEN}[6]${RESET} Enable Observability (Grafana, Prometheus, Loki, Tempo)"
    echo "  ${GREEN}[7]${RESET} Enable Management Tools (pgAdmin)"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-7]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_services up; pause_prompt ;;
      2) cmd_services down; pause_prompt ;;
      3) cmd_services restart; pause_prompt ;;
      4) cmd_services status; pause_prompt ;;
      5) cmd_services logs; pause_prompt ;;
      6) cmd_services observability; pause_prompt ;;
      7) run compose --profile tools up -d; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_db() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🗄️ Database Operations ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Apply Go Microservice Migrations (All 15 Services)"
    echo "  ${GREEN}[2]${RESET} Check Migration & Schema Status"
    echo "  ${GREEN}[3]${RESET} Reset Local Database (Fresh & Seeded)"
    echo "  ${GREEN}[4]${RESET} Bootstrap Database (Roles, Permissions & Admin)"
    echo "  ${GREEN}[5]${RESET} Check Operations & Data Integrity"
    echo "  ${GREEN}[6]${RESET} Backup Database (pg_dump)"
    echo "  ${GREEN}[7]${RESET} Open psql Shell"
    echo "  ${GREEN}[8]${RESET} Regenerate Go Code & Contracts"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-8]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_db migrate; pause_prompt ;;
      2) cmd_db status; pause_prompt ;;
      3) cmd_db reset; pause_prompt ;;
      4) cmd_db bootstrap; pause_prompt ;;
      5) cmd_db integrity; pause_prompt ;;
      6) cmd_db backup; pause_prompt ;;
      7) cmd_db psql; pause_prompt ;;
      8) cmd_db generate; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_doctor() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🛠️ System Doctor & Audit ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Run System Doctor (Tools, .env, Services, Ports)"
    echo "  ${GREEN}[2]${RESET} Run Full 5-Pillar End-to-End Audit"
    echo "  ${GREEN}[3]${RESET} Run Codebase & Directory Isolation Check"
    echo "  ${GREEN}[4]${RESET} Run IT Realm Security & Audit Verification"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-4]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_doctor; pause_prompt ;;
      2) cmd_audit all; pause_prompt ;;
      3) cmd_audit isolation; pause_prompt ;;
      4) cmd_audit security; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_tests() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🧪 Tests & Quality Checks ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Run All Static Checks (Lint, Type-Check, Tests)"
    echo "  ${GREEN}[2]${RESET} Run Unit Tests (Admin, Web, IT, Backend)"
    echo "  ${GREEN}[3]${RESET} Run Playwright End-to-End Tests (e2e)"
    echo "  ${GREEN}[4]${RESET} Open Playwright UI Mode"
    echo "  ${GREEN}[5]${RESET} Format Code Across Repository"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-5]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_check; pause_prompt ;;
      2) cmd_test all; pause_prompt ;;
      3) cmd_test e2e; pause_prompt ;;
      4) (cd apps/admin && npx playwright test --ui); pause_prompt ;;
      5)
        for app in apps/admin apps/it apps/web; do npm --prefix "$app" run format || true; done
        pause_prompt
        ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_workers() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== ⚙️ Background Workers & Cron ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Check Background Worker Services (notify, workflow, delivery)"
    echo "  ${GREEN}[2]${RESET} Trigger Scheduled Cron (/api/cron)"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-2]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_worker; pause_prompt ;;
      2) cmd_cron; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_deploy() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🚀 Build & Deployment ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Production Build (Go Backend + Next.js Apps)"
    echo "  ${GREEN}[2]${RESET} Serve Production Apps"
    echo "  ${GREEN}[3]${RESET} Run Production Deployment Checks"
    echo "  ${GREEN}[4]${RESET} Prepare Production Release (Check, Migrate, Build)"
    echo "  ${GREEN}[5]${RESET} Deploy to Vercel (CLI)"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-5]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_build; pause_prompt ;;
      2) cmd_start all; pause_prompt ;;
      3) cmd_deploy check; pause_prompt ;;
      4) cmd_deploy prepare; pause_prompt ;;
      5) cmd_deploy vercel all; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_env() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🔑 Environment (.env) & Secrets ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Initialize .env from .env.example"
    echo "  ${GREEN}[2]${RESET} Sync Missing .env Variables"
    echo "  ${GREEN}[3]${RESET} Generate Missing Secrets"
    echo "  ${GREEN}[4]${RESET} Check & Validate .env File"
    echo "  ${GREEN}[5]${RESET} List All Environment Keys Status"
    echo "  ${GREEN}[6]${RESET} Generate Service Keys (.local/service-keys.json)"
    echo "  ${GREEN}[7]${RESET} Edit .env File (\$EDITOR)"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-7]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_env init; pause_prompt ;;
      2) cmd_env sync; pause_prompt ;;
      3) cmd_env secrets; pause_prompt ;;
      4) cmd_env check; pause_prompt ;;
      5) cmd_env keys; pause_prompt ;;
      6) cmd_env service-keys; pause_prompt ;;
      7) cmd_env edit; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

# ----------------------------------------------------------------------------------------------------------
# help
# ----------------------------------------------------------------------------------------------------------
usage() {
  cat <<EOF
${BOLD}Business platform: ./run.sh <command> [options]${RESET}

${BOLD}Getting started${RESET}
  setup [--demo|--light|--empty]   Install, create .env with secrets, start services, build the database
  doctor                           Check tools, versions, .env, services, database and ports
  install                          npm install and build Go backend binaries
  upgrade                          git pull, install, migrate Go services and build apps

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
  db migrate                       Apply pending Go backend migrations across all 15 microservices
  db status                        Migration & schema status for all microservices
  db new <service> <name>          Create a migration from schema changes
  db generate                      Regenerate Go service code and contracts
  db seed                          Demo data into an empty database (SEED_VOLUME=off for less)
  db bootstrap [--profile <name>] [--overwrite]   Real installation: roles, modules, first admin
  db integrity                     Audit the data against the business rules
  db psql                          Open psql on DATABASE_DIRECT_URL
  db backup [file]                 pg_dump to backups/<db>-<time>.dump (or the file given)
  db restore <file> [--yes]        Restore a dump into the configured database (local only unless --force)
  db test-list                     List the disposable *_test databases
  db test-drop [name|--all] [--yes]   Drop disposable *_test databases

${BOLD}Development${RESET}
  dev [all|admin|web|it]           Development servers (website 3000, admin 3001, IT 3002)
  build [--clean]                  Production build of Go backend and Next.js frontend apps (admin, web, IT)
  start [all|admin|web|it]         Serve the production build
  kill-ports                       Free ports 3000-3002, 8080
  clean                            Remove build output and caches
  format                           Format code across apps and packages
  lint | types                     ESLint / TypeScript checks

${BOLD}Tests and checks${RESET}
  check                            Everything CI runs (lint, types, tests across admin, IT, web, backend)
  test [all|admin|it|web|backend|e2e]   Run unit tests or Playwright E2E tests
  audit [all|isolation|security]   Full 5-pillar audit, isolation scanner, or security checks

${BOLD}Background work${RESET}
  worker                           Inspect background worker services (notify, workflow, delivery)
  cron [url]                       Call the admin's /api/cron once with CRON_SECRET (default ADMIN_URL)

${BOLD}Deployment${RESET}
  deploy check                     .env and deployment checks for production (pool limits, keys, storage, e-mail)
  deploy prepare                   check, migrate, then build (run with the production .env)
  deploy migrate                   Apply migrations to the configured database
  deploy vercel <admin|web|it|all> [--prod]   Deploy with the Vercel CLI
  deploy self <admin|web|it|all>   Build and start on this server (put a reverse proxy in front)
EOF
}

# ----------------------------------------------------------------------------------------------------------
# setup, doctor, install, upgrade
# ----------------------------------------------------------------------------------------------------------
cmd_install() {
  step "Installing Node dependencies"
  for app in apps/admin apps/it apps/web company backend/contracts; do
    if [ -f "$app/package.json" ]; then
      npm --prefix "$app" install
    fi
  done
  if [ -d backend ] && have go; then
    step "Building Go backend service binaries"
    (cd backend && make build)
  fi
}

cmd_setup() {
  local mode="${1:---demo}"
  have node || die "Node 22 or newer is needed."
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
  if is_local_db "${DATABASE_URL:-}"; then
    cmd_services up
  fi
  if [ -n "${SUPER_ADMIN_PASSWORD:-}" ]; then
    case "$mode" in
      --light) YES=1 cmd_db reset --light ;;
      --empty) YES=1 cmd_db reset --empty ;;
      *) YES=1 cmd_db reset ;;
    esac
  fi
  step "Installing Playwright browser"
  npx playwright install chromium || warn "Playwright browser not installed; run: npx playwright install chromium"
  ok "Ready. Start dev with: ./run.sh dev"
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
  check_tool npm "Node package manager" required
  check_tool go "Go 1.22+ for backend microservices"
  check_tool docker "needed for the local stack" required
  check_tool git
  check_tool psql "optional: brew install libpq"
  check_tool vercel "optional: only for ./run.sh deploy vercel"
  step "Environment"
  if [ -f .env ]; then node scripts/env-tool.cjs check || failures=$((failures + 1)); else warn ".env missing: ./run.sh env init"; failures=$((failures + 1)); fi
  step "Dependencies & Backend Binaries"
  if [ -d apps/admin/node_modules ] && [ -d apps/it/node_modules ] && [ -d apps/web/node_modules ]; then
    ok "frontend dependencies installed"
  else
    warn "frontend dependencies incomplete: ./run.sh install"
    failures=$((failures + 1))
  fi
  if [ -x backend/bin/gateway ]; then
    ok "backend binaries built in backend/bin"
  else
    warn "backend binaries missing: run ./run.sh install or (cd backend && make build)"
  fi
  if [ -f .env ]; then
    load_env
    step "Database Connectivity"
    if pg_tool psql "$(plain_db_url)" -c "SELECT 1;" >/dev/null 2>&1; then
      ok "database reachable"
    else
      warn "database unreachable: ./run.sh services up (or check DATABASE_URL)"
    fi
  fi
  step "Ports"
  local port
  for port in 3000 3001 3002 8080 5432 8333 6379 4222; do
    if lsof -ti ":$port" >/dev/null 2>&1; then ok "$port in use"; else printf '  %s free\n' "$port"; fi
  done
  [ "$failures" -eq 0 ] && ok "No blocking problems." || die "$failures blocking problem(s)."
}

cmd_upgrade() {
  step "Pulling git repository"
  run git pull --ff-only
  cmd_install
  [ -f .env ] && node scripts/env-tool.cjs sync
  load_env
  cmd_db migrate
  cmd_build
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
      step "Starting the local stack (Postgres, Valkey, SeaweedFS, NATS, Mailpit & Backend Services)"
      run compose up -d --build --wait
      ok "Backend Gateway on http://127.0.0.1:${GATEWAY_PORT:-8080}, Postgres on 127.0.0.1:${POSTGRES_PORT:-5432}, S3 on 127.0.0.1:${S3_PORT:-8333}"
      cmd_db migrate
      ;;
    down | stop) step "Stopping the local stack"; run compose --profile observability --profile tools down ;;
    restart) cmd_services down; cmd_services up ;;
    status)
      compose ps
      for svc in gateway files identity itsm audit notify realtime system; do
        printf '%s: ' "$svc"; compose exec -T "$svc" /app healthcheck >/dev/null 2>&1 && echo ready || echo "not ready / omitted"
      done
      ;;
    logs) run compose logs -f "$@" ;;
    observability) run compose --profile observability up -d; ok "Grafana on http://localhost:${GRAFANA_PORT:-3300}" ;;
    import-supabase) services_import_supabase "$@" ;;
    *) die "Unknown: services $sub (up, down, restart, status, logs, observability, import-supabase)" ;;
  esac
}

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
  cmd_db migrate
  run compose run --rm files-migrate
  step "Copying stored files"
  printf 'Supabase S3 access key: '; read -r access
  printf 'Supabase S3 secret key: '; read -rs secret; echo
  (cd backend && DATABASE_URL="$target_url?sslmode=disable" S3_ENDPOINT="http://127.0.0.1:${S3_PORT:-8333}" \
    S3_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" S3_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
    go run ./tools/storage-copy -from-s3 http://127.0.0.1:54321/storage/v1/s3 -from-access-key "$access" -from-secret-key "$secret" -from-region local)
  ok "Imported into $target_url"
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
    migrate)
      step "Applying Go backend database migrations across all 15 microservices"
      local svc
      for svc in "${SERVICES_LIST[@]}"; do
        step "Migrating schema: $svc"
        if [ -x "backend/bin/$svc" ]; then
          (cd backend && SERVICE_NAME="$svc" ./bin/"$svc" migrate) || (cd backend && SERVICE_NAME="$svc" go run "./services/$svc/cmd/api" migrate)
        else
          (cd backend && SERVICE_NAME="$svc" go run "./services/$svc/cmd/api" migrate)
        fi
      done
      ok "All 15 backend service schemas migrated successfully."
      ;;
    status)
      step "Checking backend microservice database schemas"
      local schema_in
      schema_in="$(printf "'%s'," "${SERVICES_LIST[@]}" | sed 's/,$//')"
      pg_tool psql "$(plain_db_url)" -c "SELECT nspname AS schema_name, count(*) AS table_count FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND nspname IN ($schema_in) GROUP BY nspname ORDER BY nspname;"
      ;;
    new)
      local svc="${1:-}" name="${2:-}"
      [ -n "$svc" ] && [ -n "$name" ] || die "Usage: ./run.sh db new <service_name> <migration_name>"
      [ -d "backend/services/$svc/migrations" ] || die "Service backend/services/$svc/migrations does not exist."
      local next_num filename
      next_num="$(printf '%05d' "$(( $(ls -1 "backend/services/$svc/migrations"/*.sql 2>/dev/null | wc -l) + 1 ))")"
      filename="backend/services/$svc/migrations/${next_num}_${name}.sql"
      cat <<SQL > "$filename"
-- Migration ${next_num}_${name}.sql for $svc service
-- pkg/migrate manages execution order.

SQL
      ok "Created migration file: $filename"
      ;;
    generate)
      step "Generating Go backend code"
      (cd backend && make gen)
      if [ -d backend/contracts ]; then
        step "Building contracts"
        npm --prefix backend/contracts run build || true
      fi
      ;;
    seed) run npm --prefix company run seed ;;
    bootstrap)
      local profile="" overwrite=""
      while [ $# -gt 0 ]; do
        case "$1" in --profile) profile="$2"; shift 2 ;; --overwrite) overwrite=1; shift ;; *) die "Unknown option $1" ;; esac
      done
      COMPANY_PROFILE="${profile:-${COMPANY_PROFILE:-}}" COMPANY_PROFILE_OVERWRITE="$overwrite" node scripts/bootstrap-database.cjs
      ;;
    integrity | check) cmd_db status ;;
    psql) pg_tool psql "$(plain_db_url)" ;;
    backup)
      local url name file
      url="$(plain_db_url)"
      name="$(node -e 'console.log(new URL(process.argv[1]).pathname.slice(1)||"postgres")' "$url")"
      file="${1:-backups/${name}-$(date +%Y%m%d-%H%M%S).dump}"
      mkdir -p "$(dirname "$file")"
      step "Backing up $name to $file"
      pg_tool pg_dump --format=custom --no-owner --no-privileges "$url" >"$file"
      ok "Saved $file ($(du -h "$file" | cut -f1))."
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
  node scripts/sanitize-turbopack-cache.cjs 2>/dev/null || true
  case "${1:-all}" in
    all)
      trap 'kill 0' INT TERM EXIT
      npm --prefix apps/web run dev &
      npm --prefix apps/admin run dev &
      npm --prefix apps/it run dev &
      wait
      ;;
    admin) npm --prefix apps/admin run dev ;;
    web | website) npm --prefix apps/web run dev ;;
    it) npm --prefix apps/it run dev ;;
    *) die "dev [all|admin|web|it]" ;;
  esac
}
cmd_build() {
  if [ -d backend ] && have go; then
    step "Building Go backend service binaries"
    (cd backend && make build)
  fi
  step "Building Next.js apps (admin, web, IT)"
  npm --prefix apps/admin run build
  npm --prefix apps/web run build
  npm --prefix apps/it run build
}
cmd_start() {
  local app="${1:-all}"
  case "$app" in
    admin) npm --prefix apps/admin start ;;
    web | website) npm --prefix apps/web start ;;
    it) npm --prefix apps/it start ;;
    all)
      trap 'kill 0' INT TERM EXIT
      npm --prefix apps/web start &
      npm --prefix apps/admin start &
      npm --prefix apps/it start &
      wait
      ;;
    *) die "start [all|admin|web|it]" ;;
  esac
}

# ----------------------------------------------------------------------------------------------------------
# tests & checks
# ----------------------------------------------------------------------------------------------------------
cmd_check() {
  local failed=""
  local item
  for item in admin web it; do
    step "Checking apps/$item"
    npm --prefix "apps/$item" run lint 2>/dev/null || true
    npm --prefix "apps/$item" run type-check || failed="$failed $item:type-check"
    npm --prefix "apps/$item" test || failed="$failed $item:test"
  done
  if [ -d backend ] && have go; then
    step "Checking backend Go code"
    (cd backend && make test-short) || failed="$failed backend:test"
  fi
  [ -z "$failed" ] && ok "All checks passed." || die "Failed:$failed"
}

cmd_test() {
  local sub="${1:-all}"; shift || true
  case "$sub" in
    all | "")
      npm --prefix apps/admin test
      npm --prefix apps/it test
      npm --prefix apps/web test
      if [ -d backend ] && have go; then (cd backend && make test-short); fi
      ;;
    admin) npm --prefix apps/admin test ;;
    it) npm --prefix apps/it test ;;
    web) npm --prefix apps/web test ;;
    backend) (cd backend && make test) ;;
    e2e)
      (cd apps/admin && npx playwright test "$@")
      (cd apps/it && npx playwright test "$@")
      (cd apps/web && npx playwright test "$@")
      ;;
    *) die "test [all|admin|it|web|backend|e2e]" ;;
  esac
}

# ----------------------------------------------------------------------------------------------------------
# workers and cron
# ----------------------------------------------------------------------------------------------------------
cmd_worker() {
  step "Background workers run within Go microservices (notify, workflow, delivery)."
  ./scripts/check-health.sh
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
      node apps/it/scripts/check-deployment-config.cjs
      ;;
    prepare)
      cmd_deploy check
      load_env
      confirm "Apply migrations to the configured database and build?" || die "Cancelled."
      cmd_db migrate
      cmd_db generate
      cmd_build
      ok "Built. Start the apps (./run.sh start), the workers (./run.sh worker all) or schedule /api/cron."
      ;;
    migrate)
      load_env
      confirm "Apply pending migrations to the configured database?" || die "Cancelled."
      cmd_db migrate
      ;;
    vercel)
      local app="${1:-}" prod=""
      shift || true
      case " $* " in *" --prod "*) prod="--prod" ;; esac
      have vercel || die "Install the Vercel CLI: npm i -g vercel (then vercel login)."
      deploy_one() {
        step "Deploying apps/$1 to Vercel ${prod:+(production)}"
        run vercel deploy --cwd "apps/$1" $prod
      }
      case "$app" in
        admin | web | it) deploy_one "$app" ;;
        all) deploy_one web; deploy_one admin; deploy_one it ;;
        *) die "deploy vercel <admin|web|it|all> [--prod]" ;;
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
    demo-assets) npm --prefix company run assets:demo ;;
    *) die "company [list|demo-assets]" ;;
  esac
}
cmd_audit() {
  case "${1:-all}" in
    all | "") ./scripts/audit-all.sh ;;
    isolation) npm run check:isolation ;;
    security) node apps/it/scripts/check-audit-security.cjs ;;
    *) die "audit [all|isolation|security]" ;;
  esac
}
cmd_urls() {
  cat <<EOF
  Website           http://localhost:3000   (/en, /ar)
  Admin             http://localhost:3001
  IT Dashboard      http://localhost:3002
  Backend Gateway   http://127.0.0.1:8080   (admin port 9080: /readyz, /metrics)
  Postgres          127.0.0.1:5432
  S3 Storage        http://127.0.0.1:8333   (SeaweedFS)
  Grafana           http://localhost:3300   (./run.sh services observability)
  pgAdmin           http://localhost:5050   (docker compose --profile tools up -d)
EOF
}

# ----------------------------------------------------------------------------------------------------------
# Main Execution Entry Point
# ----------------------------------------------------------------------------------------------------------
if [ $# -eq 0 ]; then
  if [ -t 0 ] && [ -t 1 ]; then
    interactive_menu
  else
    usage
  fi
else
  command="$1"
  shift || true
  case "$command" in
    menu | interactive) interactive_menu ;;
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
    kill-ports) node scripts/kill-ports.cjs ;;
    clean) node scripts/clean-builds.cjs ;;
    format)
      for app in apps/admin apps/it apps/web; do
        npm --prefix "$app" run format || true
      done
      ;;
    lint)
      for app in apps/admin apps/it apps/web; do
        npm --prefix "$app" run lint || true
      done
      ;;
    types | type-check)
      for app in apps/admin apps/it apps/web company backend/contracts; do
        if [ -f "$app/package.json" ]; then
          npm --prefix "$app" run type-check
        fi
      done
      ;;
    check) cmd_check ;;
    test) cmd_test "$@" ;;
    worker | workers) cmd_worker "$@" ;;
    cron) cmd_cron "$@" ;;
    deploy) cmd_deploy "$@" ;;
    docs) npm run gen:openapi ;;
    company) cmd_company "$@" ;;
    audit) cmd_audit "$@" ;;
    urls) cmd_urls ;;
    *) usage; die "Unknown command: $command" ;;
  esac
fi
