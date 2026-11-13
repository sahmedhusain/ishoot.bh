#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

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

load_env() {
  [ -f .env ] || die ".env is missing. Run: ./run.sh env init"
  set -a
  . ./.env
  set +a
}

db_url_for() {
  node -e 'const u=new URL(process.argv[1]);u.pathname="/"+process.argv[2];console.log(u.toString())' "$1" "$2"
}

plain_db_url() {
  node -e 'const u=new URL(process.argv[1]).hostname?process.argv[1]:"postgresql://platform:platform@127.0.0.1:5432/platform_db";const u2=new URL(u);for(const k of ["pgbouncer","connection_limit","pool_timeout","schema"])u2.searchParams.delete(k);console.log(u2.toString())' "${1:-${DATABASE_DIRECT_URL:-${DATABASE_URL:-postgresql://platform:platform@127.0.0.1:5432/platform_db}}}"
}

is_local_db() {
  node -e 'try{const h=new URL(process.argv[1]).hostname;process.exit(["localhost","127.0.0.1","::1","[::1]"].includes(h)?0:1)}catch{process.exit(0)}' "${1:-}"
}

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

run_sql_script() {
  local file="$1"
  [ -f "$file" ] || die "SQL file $file not found."
  pg_tool psql "$(plain_db_url)" -v ON_ERROR_STOP=1 -f - < "$file"
}

compose() { docker compose --env-file .env "$@"; }

SERVICES_LIST=(audit cms commerce delivery files finance hr identity inventory itsm notify realtime sales system workflow gateway)

pause_prompt() {
  printf '\n%sPress [Enter] to return to the menu...%s' "$DIM" "$RESET"
  read -r _ || true
}

show_system_banner() {
  local node_ver="N/A" go_ver="N/A" docker_stat="OFF" db_stat="OFF" profile_stat="N/A"
  have node && node_ver="$(node -v 2>/dev/null || echo "N/A")"
  have go && go_ver="$(go version 2>/dev/null | awk '{print $3}' || echo "N/A")"
  have docker && docker info >/dev/null 2>&1 && docker_stat="ONLINE"
  [ -f .env ] && load_env 2>/dev/null || true
  if [ -n "${DATABASE_URL:-}" ] && pg_tool psql "$(plain_db_url)" -c "SELECT 1;" >/dev/null 2>&1; then
    db_stat="ONLINE"
  fi
  profile_stat="${COMPANY_PROFILE:-empty}"
  [ -z "$profile_stat" ] && profile_stat="empty (wizard)"

  echo "${CYAN}${BOLD}┌────────────────────────────────────────────────────────────────────────────┐${RESET}"
  echo "${CYAN}${BOLD}│                        🏢 PLATFORM CONTROL CLI                             │${RESET}"
  echo "${CYAN}${BOLD}│            Enterprise Microservices & Docker Engine v3.0                  │${RESET}"
  echo "${CYAN}${BOLD}├────────────────────────────────────────────────────────────────────────────┤${RESET}"
  printf "${CYAN}${BOLD}│${RESET} ${BOLD}System:${RESET} Node: %-7s Go: %-8s Docker: %-6s DB: %-6s Profile: %-8s ${CYAN}${BOLD}│${RESET}\n" "$node_ver" "$go_ver" "$docker_stat" "$db_stat" "$profile_stat"
  echo "${CYAN}${BOLD}└────────────────────────────────────────────────────────────────────────────┘${RESET}"
}

interactive_menu() {
  while true; do
    clear 2>/dev/null || true
    show_system_banner
    echo ""
    echo "${BOLD}Select an operation by number or hotkey:${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} 🚀 ${BOLD}Quick Start & Setup${RESET}              ${CYAN}[6]${RESET} 🧪 ${BOLD}Tests & Quality Suite${RESET}"
    echo "  ${GREEN}[2]${RESET} 💻 ${BOLD}Frontend Apps & Docker${RESET}           ${CYAN}[7]${RESET} 🛠️  ${BOLD}Doctor & Diagnostics${RESET}"
    echo "  ${GREEN}[3]${RESET} ⚙️  ${BOLD}Backend Microservices (Go)${RESET}      ${CYAN}[8]${RESET} 🚀 ${BOLD}Build & Production Release${RESET}"
    echo "  ${GREEN}[4]${RESET} 🐳 ${BOLD}Docker Infrastructure Stack${RESET}    ${CYAN}[9]${RESET} 🔑 ${BOLD}Secrets & Key Management${RESET}"
    echo "  ${GREEN}[5]${RESET} 🗄️  ${BOLD}Database Engine & Migrations${RESET}    ${MAGENTA}[R]${RESET} 🔄 ${BOLD}Rebuild & Reset Stack${RESET}"
    echo "  ${MAGENTA}[W]${RESET} ⚙️  ${BOLD}Workers & Scheduled Cron${RESET}        ${BLUE}[G]${RESET} 📚 ${BOLD}Guides & System Docs${RESET}"
    echo "  ${MAGENTA}[H]${RESET} 📖 ${BOLD}Standard CLI Help${RESET}"
    echo ""
    echo "  ${RED}[0]${RESET} 🚪 ${BOLD}Exit Platform CLI${RESET}"
    echo ""
    printf "%sEnter selection [0-9, R, W, G, H]: %s" "$BOLD" "$RESET"
    read -r choice || choice=""

    case "$choice" in
      1) menu_quickstart ;;
      2) menu_dev ;;
      3) menu_backend ;;
      4) menu_services ;;
      5) menu_db ;;
      6) menu_tests ;;
      7) menu_doctor ;;
      8) menu_deploy ;;
      9) menu_env ;;
      r | R | rebuild) menu_rebuild ;;
      w | W) menu_workers ;;
      g | G | guides) menu_guides ;;
      h | H | help)
        clear 2>/dev/null || true
        usage
        pause_prompt
        ;;
      0 | q | Q | exit)
        echo "${GREEN}Exiting Platform CLI. Goodbye!${RESET}"
        exit 0
        ;;
      *)
        echo "${RED}Invalid selection. Please try again.${RESET}"
        sleep 1
        ;;
    esac
  done
}

menu_guides() {
  while true; do
    clear 2>/dev/null || true
    echo "${CYAN}${BOLD}=== 📚 System Guides & Architectural Documentation ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Read System Architecture & Microservice Map (ARCHITECTURE.md)"
    echo "  ${GREEN}[2]${RESET} Read Backend Engineering & Schema Principles (backend/README.md)"
    echo "  ${GREEN}[3]${RESET} Read Operations & Deployment Guide (OPERATIONS.md)"
    echo "  ${GREEN}[4]${RESET} Read Security & Authentication Model (SECURITY.md)"
    echo "  ${GREEN}[5]${RESET} Read Database & Migration Architecture (DATABASE.md)"
    echo "  ${GREEN}[6]${RESET} Read Testing Strategy & Playwright Setup (TESTING.md)"
    echo "  ${GREEN}[7]${RESET} Read Integrations & Payment Gateways (INTEGRATIONS.md)"
    echo "  ${GREEN}[8]${RESET} Read API Reference Catalog (API_REFERENCE.md)"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-8]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) [ -f docs/ARCHITECTURE.md ] && less docs/ARCHITECTURE.md || warn "File not found."; pause_prompt ;;
      2) [ -f backend/README.md ] && less backend/README.md || warn "File not found."; pause_prompt ;;
      3) [ -f docs/OPERATIONS.md ] && less docs/OPERATIONS.md || warn "File not found."; pause_prompt ;;
      4) [ -f docs/SECURITY.md ] && less docs/SECURITY.md || warn "File not found."; pause_prompt ;;
      5) [ -f docs/DATABASE.md ] && less docs/DATABASE.md || warn "File not found."; pause_prompt ;;
      6) [ -f docs/TESTING.md ] && less docs/TESTING.md || warn "File not found."; pause_prompt ;;
      7) [ -f docs/INTEGRATIONS.md ] && less docs/INTEGRATIONS.md || warn "File not found."; pause_prompt ;;
      8) [ -f docs/API_REFERENCE.md ] && less docs/API_REFERENCE.md || warn "File not found."; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_quickstart() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🚀 Quick Start & Environment Initialization ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Full Interactive Setup (--demo)   - Northwind Studio Demo Data & Stack"
    echo "  ${GREEN}[2]${RESET} iShoot Production Setup (--ishoot) - iShoot Cinema Production Profile"
    echo "  ${GREEN}[3]${RESET} Empty Setup (--empty)              - Clean DB for Fresh Setup Wizard"
    echo "  ${GREEN}[4]${RESET} Install Dependencies & Build All Go Binaries"
    echo "  ${GREEN}[5]${RESET} Upgrade Repository (git pull, npm install, migrations, build)"
    echo "  ${GREEN}[6]${RESET} Show Service Endpoint URLs & Network Ports"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-6]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_setup --demo; pause_prompt ;;
      2) cmd_setup --ishoot; pause_prompt ;;
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
    echo "${GREEN}${BOLD}=== 💻 Frontend Applications & Development Servers ===${RESET}"
    echo ""
    echo "  ${BOLD}--- Terminal Mode (Local Next.js Dev / Turbopack) ---${RESET}"
    echo "  ${GREEN}[1]${RESET} Start All Dev Frontends (Web: 3000, Admin: 3001, IT: 3002, Store: 3003)"
    echo "  ${GREEN}[2]${RESET} Start Web App Only (http://localhost:3000)"
    echo "  ${GREEN}[3]${RESET} Start Admin App Only (http://localhost:3001)"
    echo "  ${GREEN}[4]${RESET} Start IT Support App Only (http://localhost:3002)"
    echo "  ${GREEN}[S]${RESET} Start Store App Only (http://localhost:3003)"
    echo ""
    echo "  ${BOLD}--- Docker Mode (Containerized Frontend Apps) ---${RESET}"
    echo "  ${CYAN}[5]${RESET} Start Containerized Frontends (web, admin, it, store)"
    echo "  ${CYAN}[6]${RESET} Rebuild & Start Containerized Frontends"
    echo "  ${CYAN}[7]${RESET} View Container Logs for Frontends"
    echo "  ${CYAN}[8]${RESET} Stop Containerized Frontends"
    echo ""
    echo "  ${MAGENTA}[9]${RESET} Free Up Dev Ports (3000, 3001, 3002, 3003, 8080)"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-9, S]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_dev all; pause_prompt ;;
      2) cmd_dev web; pause_prompt ;;
      3) cmd_dev admin; pause_prompt ;;
      4) cmd_dev it; pause_prompt ;;
      s | S) cmd_dev store; pause_prompt ;;
      5) cmd_apps up all; pause_prompt ;;
      6) cmd_apps build all && cmd_apps up all; pause_prompt ;;
      7) cmd_apps logs web; pause_prompt ;;
      8) cmd_apps down; pause_prompt ;;
      9) node scripts/kill-ports.cjs; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_backend() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== ⚙️ Go Microservices Backend Engine ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Build All Go Microservice Binaries (backend/bin/*)"
    echo "  ${GREEN}[2]${RESET} Check Health Status of All 16 Microservices"
    echo "  ${GREEN}[3]${RESET} Run Specific Go Microservice Locally"
    echo "  ${GREEN}[4]${RESET} Run Backend Go Microservice Unit Tests"
    echo "  ${GREEN}[5]${RESET} Run Go Benchmarks Across Microservices"
    echo "  ${GREEN}[6]${RESET} Regenerate Go Code & Sqlc Schemas"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-6]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) (cd backend && make build); pause_prompt ;;
      2) cmd_backend_health; pause_prompt ;;
      3)
        printf "Enter service name (%s): " "${SERVICES_LIST[*]}"
        read -r svc_name
        cmd_backend_run "$svc_name"
        pause_prompt
        ;;
      4) (cd backend && make test); pause_prompt ;;
      5) (cd backend && go test -bench=. ./...); pause_prompt ;;
      6) cmd_db generate; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

cmd_backend_health() {
  step "Inspecting 16 Go Microservices Health Probes"
  load_env 2>/dev/null || true
  local svc
  for svc in "${SERVICES_LIST[@]}"; do
    if have docker && compose ps -q "$svc" 2>/dev/null | grep -q .; then
      printf "  %-15s : " "$svc"
      compose exec -T "$svc" /app healthcheck >/dev/null 2>&1 && ok "HEALTHY (Docker)" || warn "UNHEALTHY / STARTING"
    else
      printf "  %-15s : " "$svc"
      warn "STOPPED / NOT CONTAINERIZED"
    fi
  done
}

cmd_backend_run() {
  local svc="${1:-}"
  [ -n "$svc" ] || die "Usage: ./run.sh backend run <service_name>"
  [ -d "backend/services/$svc" ] || die "Service backend/services/$svc does not exist."
  load_env
  step "Running Go microservice: $svc"
  (cd backend && SERVICE_NAME="$svc" go run "./services/$svc/cmd/api")
}

menu_services() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🐳 Local Stack & Docker Container Operations ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Start Local Infrastructure Stack (Postgres, Valkey, SeaweedFS, NATS)"
    echo "  ${GREEN}[2]${RESET} Stop Local Infrastructure Stack"
    echo "  ${GREEN}[3]${RESET} Restart Infrastructure Stack"
    echo "  ${GREEN}[4]${RESET} Check Container Status & Health"
    echo "  ${GREEN}[5]${RESET} Tail Live Container Logs (docker compose logs -f)"
    echo "  ${GREEN}[6]${RESET} Start Observability Stack (Grafana, Prometheus, Loki, Tempo)"
    echo "  ${GREEN}[7]${RESET} Start Management Tools (pgAdmin & Redis UI)"
    echo "  ${GREEN}[8]${RESET} Prune Unused Docker Containers & Images"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-8]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_services up; pause_prompt ;;
      2) cmd_services down; pause_prompt ;;
      3) cmd_services restart; pause_prompt ;;
      4) cmd_services status; pause_prompt ;;
      5) cmd_services logs; pause_prompt ;;
      6) cmd_services observability; pause_prompt ;;
      7) run compose --profile tools up -d; pause_prompt ;;
      8) docker system prune -f; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_db() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🗄️ PostgreSQL Database Engine & Migrations ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Apply Schema Migrations Across All 15 Microservices"
    echo "  ${GREEN}[2]${RESET} Check Migration & Schema Status"
    echo "  ${GREEN}[3]${RESET} Create New Migration File for Service"
    echo "  ${GREEN}[4]${RESET} Reset Local Database (Fresh & Seeded)"
    echo "  ${GREEN}[5]${RESET} Seed Database with Selected Preset Profile"
    echo "  ${GREEN}[6]${RESET} Execute Direct SQL Query against Database"
    echo "  ${GREEN}[7]${RESET} Open Interactive psql Console"
    echo "  ${GREEN}[8]${RESET} Backup PostgreSQL Database (pg_dump)"
    echo "  ${GREEN}[9]${RESET} Restore Database from Backup File"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-9]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_db migrate; pause_prompt ;;
      2) cmd_db status; pause_prompt ;;
      3)
        printf "Service name: "; read -r s_name
        printf "Migration name: "; read -r m_name
        cmd_db new "$s_name" "$m_name"
        pause_prompt
        ;;
      4) cmd_db reset; pause_prompt ;;
      5)
        printf "Preset profile (demo|northwind|bootstrap|ishoot): "; read -r p_name
        cmd_db seed "$p_name"
        pause_prompt
        ;;
      6)
        printf "Enter SQL Query: "; read -r sql_q
        cmd_db query "$sql_q"
        pause_prompt
        ;;
      7) cmd_db psql; pause_prompt ;;
      8) cmd_db backup; pause_prompt ;;
      9)
        printf "Dump file path: "; read -r dump_f
        cmd_db restore "$dump_f"
        pause_prompt
        ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_rebuild() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🔄 Rebuild & Reset Platform Stack ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Rebuild Everything (All Microservices, Frontends & Reset DB)"
    echo "  ${GREEN}[2]${RESET} Rebuild Frontend Apps Docker Images (Web, Admin, IT)"
    echo "  ${GREEN}[3]${RESET} Rebuild Backend Microservices Docker Images (16 Go Services)"
    echo "  ${GREEN}[4]${RESET} Rebuild & Reset Database Engine (Wipe volumes, re-migrate, re-seed)"
    echo "  ${GREEN}[5]${RESET} Rebuild Specific Service or App Container"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-5]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_rebuild all; pause_prompt ;;
      2) cmd_rebuild apps; pause_prompt ;;
      3) cmd_rebuild services; pause_prompt ;;
      4) cmd_rebuild db; pause_prompt ;;
      5)
        printf "Enter container service name (web|admin|it|gateway|identity|...): "; read -r r_svc
        cmd_rebuild single "$r_svc"
        pause_prompt
        ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_doctor() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🛠️ System Doctor & Verification Audits ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Run Comprehensive System Doctor Check"
    echo "  ${GREEN}[2]${RESET} Run Full 5-Pillar Platform Audit"
    echo "  ${GREEN}[3]${RESET} Run Directory & Codebase Isolation Scanner"
    echo "  ${GREEN}[4]${RESET} Run Security & Realm Permission Auditor"
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
    echo "${GREEN}${BOLD}=== 🧪 Testing Suite & Quality Assurance ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Run All Static Checks (Lint, Type-Check, Tests)"
    echo "  ${GREEN}[2]${RESET} Run Unit Tests (Web, Admin, IT, Backend)"
    echo "  ${GREEN}[3]${RESET} Run Playwright End-to-End Tests (e2e)"
    echo "  ${GREEN}[4]${RESET} Open Interactive Playwright UI Test Runner"
    echo "  ${GREEN}[5]${RESET} Run Code Coverage Analysis (HTML & Summary)"
    echo "  ${GREEN}[6]${RESET} Run Go Race Detector Audit"
    echo "  ${GREEN}[7]${RESET} Format Repository Source Code"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-7]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_check; pause_prompt ;;
      2) cmd_test all; pause_prompt ;;
      3) cmd_test e2e; pause_prompt ;;
      4) (cd apps/admin && npx playwright test --ui); pause_prompt ;;
      5) cmd_test coverage; pause_prompt ;;
      6) cmd_test race; pause_prompt ;;
      7)
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
    echo "${GREEN}${BOLD}=== ⚙️ Background Workers & Scheduled Cron ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Inspect Worker Microservices (notify, workflow, delivery)"
    echo "  ${GREEN}[2]${RESET} Trigger Scheduled Cron Handler (/api/cron)"
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
    echo "${GREEN}${BOLD}=== 🚀 Production Build & Deployment Engine ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Production Build (Go Microservices + Next.js Frontends)"
    echo "  ${GREEN}[2]${RESET} Build Frontend Applications Only"
    echo "  ${GREEN}[3]${RESET} Build Backend Go Binaries Only"
    echo "  ${GREEN}[4]${RESET} Serve Built Production Applications"
    echo "  ${GREEN}[5]${RESET} Run Pre-flight Production Deployment Checks"
    echo "  ${GREEN}[6]${RESET} Prepare Full Release (Check, Migrate, Build)"
    echo "  ${GREEN}[7]${RESET} Deploy to Vercel via CLI"
    echo "  ${GREEN}[8]${RESET} Clean All Build Outputs & Cache Directories"
    echo "  ${RED}[0]${RESET} Back to Main Menu"
    echo ""
    printf "%sEnter choice [0-8]: %s" "$BOLD" "$RESET"
    read -r subchoice || subchoice=""
    case "$subchoice" in
      1) cmd_build; pause_prompt ;;
      2) npm --prefix apps/admin run build && npm --prefix apps/web run build && npm --prefix apps/it run build && npm --prefix apps/store run build; pause_prompt ;;
      3) (cd backend && make build); pause_prompt ;;
      4) cmd_start all; pause_prompt ;;
      5) cmd_deploy check; pause_prompt ;;
      6) cmd_deploy prepare; pause_prompt ;;
      7) cmd_deploy vercel all; pause_prompt ;;
      8) node scripts/clean-builds.cjs; pause_prompt ;;
      0) return ;;
      *) echo "${RED}Invalid choice.${RESET}"; sleep 1 ;;
    esac
  done
}

menu_env() {
  while true; do
    clear 2>/dev/null || true
    echo "${GREEN}${BOLD}=== 🔑 Secrets & Environment Key Management ===${RESET}"
    echo ""
    echo "  ${GREEN}[1]${RESET} Initialize .env File from .env.example"
    echo "  ${GREEN}[2]${RESET} Sync Missing Environment Variables"
    echo "  ${GREEN}[3]${RESET} Generate Missing Cryptographic Secrets"
    echo "  ${GREEN}[4]${RESET} Validate & Check .env File Structure"
    echo "  ${GREEN}[5]${RESET} List Environment Variable Statuses"
    echo "  ${GREEN}[6]${RESET} Generate Service Keys (.local/service-keys.json)"
    echo "  ${GREEN}[7]${RESET} Open .env File in System Editor"
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

usage() {
  cat <<EOF
${BOLD}Platform Management CLI: ./run.sh <command> [options]${RESET}

${BOLD}Getting Started & Quick Control${RESET}
  setup [--demo|--ishoot|--empty] Install, prepare .env, spin up local services & build DB
  doctor                           Check runtime binaries (Node, Go, Docker), .env, services & ports
  install                          Install npm dependencies & compile Go microservices
  upgrade                          Pull latest repository changes, migrate schemas & rebuild

${BOLD}Frontend Docker & Dev Apps${RESET}
  apps up|start [web|admin|it|store|all] Start containerized Next.js frontend applications
  apps down|stop                         Stop containerized frontend applications
  apps restart [web|admin|it|store|all]  Restart frontend app containers
  apps build [web|admin|it|store|all]    Build Docker images for frontend applications
  apps logs [web|admin|it|store]         Tail container logs for frontend applications
  apps status                            Inspect container status of frontend applications
  dev [all|admin|web|it|store]           Launch Next.js development servers (3000, 3001, 3002, 3003)

${BOLD}Rebuild & Stack Maintenance${RESET}
  rebuild all                      Rebuild all Docker containers, microservices, frontends & DB
  rebuild apps                     Rebuild frontend Next.js Docker images (web, admin, it, store)
  rebuild services                 Rebuild backend Go microservice Docker images
  rebuild db [preset]              Wipe database container, re-apply migrations & seed data
  rebuild single <name>            Rebuild specific container service image

${BOLD}Backend Go Microservices${RESET}
  backend build [svc|all]          Compile Go microservices into backend/bin/
  backend run <service>            Run a specific Go microservice locally
  backend health                   Check HTTP health probes across all 16 microservices
  backend test                     Run Go microservice unit test suite

${BOLD}Environment & Security (.env)${RESET}
  env init                         Initialize .env from template with generated secrets
  env sync                         Merge new missing configuration keys into current .env
  env secrets                      Auto-generate any empty secret variables
  env check [--production]         Strict schema validation for active environment
  env keys                         Inspect status of required environment variables
  env service-keys                 Generate backend public service key pair mapping
  env edit                         Open .env file in default system editor

${BOLD}Docker Infrastructure${RESET}
  services up | down | restart     Control container stack (Postgres, Valkey, NATS, SeaweedFS)
  services status                  Inspect container state and service readiness
  services logs [service]          Tail live container logs
  services observability           Spin up Grafana, Prometheus, Loki & Tempo (http://localhost:3300)

${BOLD}Database Engine & Migrations${RESET}
  db migrate                       Run Goose migrations across all 15 stateful service schemas
  db status                        Inspect schema migration state & table counts
  db new <service> <name>          Generate new SQL migration file for target service
  db generate                      Regenerate Go model code (sqlc) & frontend contract types
  db seed [profile]                Seed database using specific preset (demo, northwind, ishoot)
  db preset <name>                 Apply an activity preset on top of a seed (all, commerce, services, media)
  db query "<SQL>"                 Execute direct SQL query on active database
  db psql                          Launch interactive psql terminal
  db backup [file]                 Dump database to backups/
  db restore <file>                Restore custom database dump

${BOLD}Quality Assurance & Testing${RESET}
  check                            Run full static suite (Lint, TypeScript, Unit Tests)
  test [all|admin|it|web|backend]  Execute targeted unit tests
  test e2e                         Execute Playwright E2E browser tests
  test coverage                    Generate code coverage statistics
  test race                        Run Go race detector on microservices
  audit [all|isolation|security]   Run 5-pillar architecture audit & security verification

${BOLD}Deployment${RESET}
  deploy check                     Validate production environment configuration
  deploy prepare                   Check, migrate schemas, and run production builds
  deploy vercel <app|all>          Deploy Next.js applications to Vercel
EOF
}

cmd_install() {
  step "Installing Node dependencies"
  for app in apps/admin apps/it apps/web apps/store backend/contracts; do
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
      --light | --ishoot)
        node scripts/env-tool.cjs set COMPANY_PROFILE "ishoot" SEED_PRESET ""
        YES=1 cmd_db reset --profile ishoot
        ;;
      --empty)
        node scripts/env-tool.cjs set COMPANY_PROFILE "" SEED_PRESET ""
        YES=1 cmd_db reset --empty
        ;;
      *)
        node scripts/env-tool.cjs set COMPANY_PROFILE "demo" SEED_PRESET "all"
        YES=1 cmd_db reset --demo all
        ;;
    esac
  fi
  step "Installing Playwright browser"
  npx playwright install chromium || warn "Playwright browser not installed; run: npx playwright install chromium"
  ok "Ready. Start dev with: ./run.sh dev or container apps with: ./run.sh apps up"
  cmd_urls
}

cmd_doctor() {
  local failures=0
  check_tool() { if have "$1"; then ok "$1 $($1 --version 2>/dev/null | head -1)"; else warn "$1 not found${2:+ ($2)}"; [ "${3:-}" = required ] && failures=$((failures + 1)); fi; return 0; }
  step "Checking Platform System Dependencies & Tools"
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
  step "Checking Environment Configuration (.env)"
  if [ -f .env ]; then node scripts/env-tool.cjs check || failures=$((failures + 1)); else warn ".env missing: ./run.sh env init"; failures=$((failures + 1)); fi
  step "Checking Frontend Dependencies & Backend Binaries"
  if [ -d apps/admin/node_modules ] && [ -d apps/it/node_modules ] && [ -d apps/web/node_modules ] && [ -d apps/store/node_modules ]; then
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
    step "Checking Database Connectivity"
    if pg_tool psql "$(plain_db_url)" -c "SELECT 1;" >/dev/null 2>&1; then
      ok "database reachable"
    else
      warn "database unreachable: ./run.sh services up (or check DATABASE_URL)"
    fi
  fi
  step "Checking Required Network Ports"
  local port
  for port in 3000 3001 3002 3003 8080 5432 8333 6379 4222; do
    if lsof -ti ":$port" >/dev/null 2>&1; then ok "Port $port in use"; else printf '  Port %s free\n' "$port"; fi
  done
  [ "$failures" -eq 0 ] && ok "No blocking issues detected." || die "$failures blocking issue(s) found."
}

cmd_upgrade() {
  step "Pulling latest git changes"
  run git pull --ff-only
  cmd_install
  [ -f .env ] && node scripts/env-tool.cjs sync
  load_env
  cmd_db migrate
  cmd_build
  ok "Upgrade complete."
}

cmd_env() {
  local sub="${1:-keys}"; shift || true
  case "$sub" in
    init | sync | secrets | keys | service-keys | set) node scripts/env-tool.cjs "$sub" "$@" ;;
    check) node scripts/env-tool.cjs check "$@" ;;
    edit) [ -f .env ] || die ".env is missing. Run: ./run.sh env init"; "${EDITOR:-vi}" .env ;;
    *) die "Unknown: env $sub (init, sync, secrets, check, keys, service-keys, set, edit)" ;;
  esac
}

cmd_apps() {
  local sub="${1:-status}"; shift || true
  [ -f .env ] || die ".env is missing. Run: ./run.sh env init"
  have docker || die "Docker is needed for containerized frontend apps."
  docker info >/dev/null 2>&1 || die "Docker is not running."
  case "$sub" in
    up | start)
      local app="${1:-all}"
      step "Starting Containerized Frontend Apps ($app)"
      if [ "$app" = "all" ]; then
        run compose up -d web admin it store
      else
        run compose up -d "$app"
      fi
      ok "Frontend container(s) running."
      ;;
    down | stop)
      step "Stopping Containerized Frontend Apps"
      run compose stop web admin it store
      ;;
    restart)
      local app="${1:-all}"
      step "Restarting Containerized Frontend Apps ($app)"
      if [ "$app" = "all" ]; then
        run compose restart web admin it store
      else
        run compose restart "$app"
      fi
      ;;
    build)
      local app="${1:-all}"
      step "Building Frontend App Docker Images ($app)"
      if [ "$app" = "all" ]; then
        local a
        for a in web admin it store; do
          run compose build "$a"
        done
      else
        run compose build "$app"
      fi
      ok "Frontend App Docker image build complete."
      ;;
    logs)
      local app="${1:-web}"
      run compose logs -f "$app"
      ;;
    status)
      step "Frontend Containers Status:"
      compose ps web admin it store
      ;;
    *)
      die "Unknown command: apps $sub (up, down, restart, build, logs, status)"
      ;;
  esac
}

cmd_rebuild() {
  local sub="${1:-all}"; shift || true
  [ -f .env ] || die ".env is missing. Run: ./run.sh env init"
  have docker || die "Docker is needed to rebuild stack services."
  docker info >/dev/null 2>&1 || die "Docker is not running."
  case "$sub" in
    all)
      step "Rebuilding FULL PLATFORM STACK (All Microservices + Frontend Apps + Database)"
      confirm "Rebuild all Docker containers and reset database to current profile?" || die "Cancelled."
      node scripts/env-tool.cjs service-keys >/dev/null
      step "Rebuilding Docker images"
      local svc
      for svc in db-roles whatsapp-sandbox "${SERVICES_LIST[@]}" web admin it store; do
        run compose build "$svc"
      done
      step "Restarting containers"
      run compose down --volumes --remove-orphans
      run compose up -d --wait
      step "Re-applying schema migrations"
      cmd_db migrate
      load_env
      step "Seeding database profile (${COMPANY_PROFILE:-ishoot})"
      YES=1 cmd_db reset
      ok "Full Platform Stack Rebuild Complete!"
      ;;
    apps | frontend)
      step "Rebuilding Frontend Next.js Docker Images (web, admin, it, store)"
      local a
      for a in web admin it store; do
        run compose build "$a"
      done
      ok "Frontend App Docker Images Rebuilt Successfully."
      ;;
    services | backend)
      step "Rebuilding Go Microservice Docker Images"
      local svc
      for svc in "${SERVICES_LIST[@]}"; do
        step "Building image for: $svc"
        run compose build --no-cache "$svc"
      done
      ok "Backend Microservices Rebuilt Successfully."
      ;;
    db | database)
      step "Rebuilding Database Engine & Re-seeding Data"
      confirm "Wipe database container data and re-apply all migrations and seeds?" || die "Cancelled."
      YES=1 cmd_db reset "$@"
      ok "Database Rebuilt and Re-seeded Successfully."
      ;;
    single)
      local target="${1:-}"
      [ -n "$target" ] || die "Usage: ./run.sh rebuild single <service_name|web|admin|it>"
      step "Rebuilding Docker container image for $target"
      run compose build --no-cache "$target"
      run compose up -d --no-deps "$target"
      ok "Service $target rebuilt and restarted."
      ;;
    *)
      die "Unknown rebuild target: $sub (options: all, apps, services, db, single <name>)"
      ;;
  esac
}

cmd_services() {
  local sub="${1:-status}"; shift || true
  [ -f .env ] || die ".env is missing. Run: ./run.sh env init"
  have docker || die "Docker is needed for the local stack."
  docker info >/dev/null 2>&1 || die "Docker is not running."
  case "$sub" in
    up | start)
      node scripts/env-tool.cjs service-keys >/dev/null
      step "Starting local container stack (Postgres, Valkey, SeaweedFS, NATS, Mailpit & Backend Gateway)"
      local svc
      for svc in db-roles whatsapp-sandbox "${SERVICES_LIST[@]}" web admin it store; do
        compose build "$svc"
      done
      run compose up -d --wait
      ok "Backend Gateway running at http://127.0.0.1:${GATEWAY_PORT:-8080}"
      cmd_db migrate
      ;;
    down | stop) step "Stopping local container stack"; run compose --profile observability --profile tools down ;;
    restart) cmd_services down; cmd_services up ;;
    status)
      compose ps
      cmd_backend_health
      ;;
    logs) run compose logs -f "$@" ;;
    observability) run compose --profile observability up -d; ok "Grafana available at http://localhost:${GRAFANA_PORT:-3300}" ;;
    import-supabase) services_import_supabase "$@" ;;
    *) die "Unknown: services $sub (up, down, restart, status, logs, observability, import-supabase)" ;;
  esac
}

services_import_supabase() {
  local source_url="${1:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
  load_env
  local target_url="postgresql://${POSTGRES_USER:-platform}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-platform_db}"
  confirm "Replace database ${POSTGRES_DB:-platform_db} with data from $source_url?" || die "Cancelled."
  cmd_services up
  local dump; dump="$(mktemp -t platform-supabase-XXXXXX).dump"
  step "Exporting legacy Supabase schema"
  docker run --rm --network host postgres:17-alpine pg_dump --format=custom --no-owner --no-privileges --schema=public "$source_url" >"$dump"
  docker run --rm -i --network host postgres:17-alpine pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$target_url" <"$dump"
  rm -f "$dump"
  step "Migrating uploads into files schema"
  cmd_db migrate
  run compose run --rm files-migrate
  ok "Supabase import completed successfully."
}

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
      step "Applying Goose DB migrations across all 15 stateful service schemas"
      local svc
      for svc in "${SERVICES_LIST[@]}"; do
        step "Migrating schema: $svc"
        if [ -x "backend/bin/$svc" ]; then
          (cd backend && SERVICE_NAME="$svc" ./bin/"$svc" migrate) || (cd backend && SERVICE_NAME="$svc" go run "./services/$svc/cmd/api" migrate)
        else
          (cd backend && SERVICE_NAME="$svc" go run "./services/$svc/cmd/api" migrate)
        fi
      done
      ok "All 15 stateful service schemas migrated successfully."
      ;;
    status)
      step "Checking PostgreSQL microservice schema table counts"
      local schema_in
      schema_in="$(printf "'%s'," "${SERVICES_LIST[@]}" | sed 's/,$//')"
      pg_tool psql "$(plain_db_url)" -c "SELECT nspname AS schema_name, count(*) AS table_count FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND nspname IN ($schema_in) GROUP BY nspname ORDER BY nspname;"
      ;;
    query)
      local sql_cmd="${1:-}"
      [ -n "$sql_cmd" ] || die "Usage: ./run.sh db query \"<SQL_STATEMENT>\""
      pg_tool psql "$(plain_db_url)" -c "$sql_cmd"
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

SQL
      ok "Created migration file: $filename"
      ;;
    generate)
      step "Generating Go sqlc code & frontend contracts"
      (cd backend && make gen)
      if [ -d backend/contracts ]; then
        step "Building typescript contracts"
        npm --prefix backend/contracts run build || true
      fi
      ;;
    seed)
      local target_profile="${1:-${COMPANY_PROFILE:-ishoot}}"
      local seed_file="seeds/sql/seed_ishoot.sql"
      if [ "$target_profile" = "demo" ] || [ "$target_profile" = "northwind" ]; then
        seed_file="seeds/sql/seed_northwind.sql"
      elif [ "$target_profile" = "bootstrap" ]; then
        seed_file="seeds/sql/seed_bootstrap.sql"
      elif [ -f "seeds/sql/seed_${target_profile}.sql" ]; then
        seed_file="seeds/sql/seed_${target_profile}.sql"
      elif [ -f "seeds/seed.sql" ]; then
        seed_file="seeds/seed.sql"
      fi
      step "Seeding database ($seed_file)"
      run_sql_script "$seed_file"
      node scripts/env-tool.cjs set COMPANY_PROFILE "${target_profile}"
      ok "Seeded database from $seed_file."
      ;;
    preset)
      local preset="${1:-}"
      [ -n "$preset" ] || die "Usage: ./run.sh db preset <name> (see seeds/sql/presets/)"
      local preset_file="seeds/sql/presets/preset_${preset}.sql"
      [ -f "$preset_file" ] || die "Unknown preset \"$preset\"; available: $(ls -1 seeds/sql/presets/preset_*.sql 2>/dev/null | sed -E 's#.*preset_(.*)\.sql#\1#' | paste -sd, - | sed 's/,/, /g')"
      step "Applying activity preset ($preset_file)"
      run_sql_script "$preset_file"
      ok "Applied activity preset: $preset."
      ;;
    bootstrap)
      step "Bootstrapping minimal clean database"
      run_sql_script "seeds/sql/seed_bootstrap.sql"
      node scripts/env-tool.cjs set COMPANY_PROFILE "" SEED_PRESET ""
      ok "Database bootstrapped."
      ;;
    integrity | check) cmd_db status ;;
    psql) pg_tool psql "$(plain_db_url)" ;;
    backup)
      local url name file
      url="$(plain_db_url)"
      name="$(node -e 'console.log(new URL(process.argv[1]).pathname.slice(1)||"postgres")' "$url")"
      file="${1:-backups/${name}-$(date +%Y%m%d-%H%M%S).dump}"
      mkdir -p "$(dirname "$file")"
      step "Backing up database to $file"
      pg_tool pg_dump --format=custom --no-owner --no-privileges "$url" >"$file"
      ok "Saved backup: $file"
      ;;
    restore)
      local file="${1:-}" force=0 url
      [ -f "$file" ] || die "Usage: ./run.sh db restore <file.dump> [--yes] [--force]"
      case " $* " in *" --force "*) force=1 ;; esac
      case " $* " in *" --yes "*) YES=1 ;; esac
      url="$(plain_db_url)"
      if ! is_local_db "$url" && [ "$force" != 1 ]; then die "Refusing to restore into a remote database without --force."; fi
      confirm "Restore database from $file?" || die "Cancelled."
      pg_tool pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$url" <"$file"
      ok "Database restored successfully."
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
      [ -n "$names" ] || { ok "No test databases found."; return 0; }
      printf '%s\n' "$names"
      confirm "Drop target test databases?" || die "Cancelled."
      local n
      for n in $names; do pg_tool psql "$(plain_db_url)" -c "drop database if exists \"$n\" with (force)"; done
      ok "Test databases dropped."
      ;;
    *) die "Unknown command: db $sub (see ./run.sh help)" ;;
  esac
}

cmd_dev() {
  local app="${1:-all}"
  local mode="${2:-terminal}"
  if [ "$app" = "--docker" ] || [ "$mode" = "--docker" ] || [ "$app" = "docker" ]; then
    cmd_apps up all
    return
  fi
  node scripts/sanitize-turbopack-cache.cjs 2>/dev/null || true
  case "$app" in
    all)
      trap 'kill 0' INT TERM EXIT
      npm --prefix apps/web run dev &
      npm --prefix apps/admin run dev &
      npm --prefix apps/it run dev &
      npm --prefix apps/store run dev &
      wait
      ;;
    admin) npm --prefix apps/admin run dev ;;
    web | website) npm --prefix apps/web run dev ;;
    it) npm --prefix apps/it run dev ;;
    store) npm --prefix apps/store run dev ;;
    *) die "dev [all|admin|web|it|store] [--docker|--terminal]" ;;
  esac
}

cmd_build() {
  if [ -d backend ] && have go; then
    step "Building Go backend service binaries"
    (cd backend && make build)
  fi
  step "Building Next.js apps (admin, web, IT, store)"
  npm --prefix apps/admin run build
  npm --prefix apps/web run build
  npm --prefix apps/it run build
  npm --prefix apps/store run build
}

cmd_start() {
  local app="${1:-all}"
  case "$app" in
    admin) npm --prefix apps/admin start ;;
    web | website) npm --prefix apps/web start ;;
    it) npm --prefix apps/it start ;;
    store) npm --prefix apps/store start ;;
    all)
      trap 'kill 0' INT TERM EXIT
      npm --prefix apps/web start &
      npm --prefix apps/admin start &
      npm --prefix apps/it start &
      npm --prefix apps/store start &
      wait
      ;;
    *) die "start [all|admin|web|it|store]" ;;
  esac
}

cmd_check() {
  local failed=""
  local item
  for item in admin web it store; do
    step "Checking apps/$item (lint, type-check, unit test)"
    npm --prefix "apps/$item" run lint 2>/dev/null || true
    npm --prefix "apps/$item" run type-check || failed="$failed $item:type-check"
    npm --prefix "apps/$item" test || failed="$failed $item:test"
  done
  if [ -d backend ] && have go; then
    step "Checking Go backend code"
    (cd backend && make test-short) || failed="$failed backend:test"
  fi
  [ -z "$failed" ] && ok "All quality checks passed!" || die "Failed checks:$failed"
}

cmd_test() {
  local sub="${1:-all}"; shift || true
  case "$sub" in
    all | "")
      npm --prefix apps/admin test
      npm --prefix apps/it test
      npm --prefix apps/web test
      npm --prefix apps/store test
      if [ -d backend ] && have go; then (cd backend && make test-short); fi
      ;;
    admin) npm --prefix apps/admin test ;;
    it) npm --prefix apps/it test ;;
    web) npm --prefix apps/web test ;;
    store) npm --prefix apps/store test ;;
    backend) (cd backend && make test) ;;
    coverage)
      step "Running Frontend Coverage"
      npm --prefix apps/admin test -- --coverage || true
      npm --prefix apps/it test -- --coverage || true
      npm --prefix apps/web test -- --coverage || true
      if [ -d backend ] && have go; then
        step "Running Backend Go Coverage"
        (cd backend && go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out)
      fi
      ;;
    race)
      if [ -d backend ] && have go; then
        step "Running Go Race Detector"
        (cd backend && go test -race ./...)
      fi
      ;;
    e2e)
      (cd apps/admin && npx playwright test "$@")
      (cd apps/it && npx playwright test "$@")
      (cd apps/web && npx playwright test "$@")
      ;;
    *) die "test [all|admin|it|web|backend|coverage|race|e2e]" ;;
  esac
}

cmd_worker() {
  step "Inspecting background worker microservices (notify, workflow, delivery)"
  ./scripts/check-health.sh
}

cmd_cron() {
  load_env
  [ -n "${CRON_SECRET:-}" ] || die "CRON_SECRET is empty. Run: ./run.sh env secrets"
  local base="${1:-${ADMIN_URL:-http://localhost:3001}}"
  step "Triggering Cron: GET ${base%/}/api/cron"
  curl -fsS -H "Authorization: Bearer $CRON_SECRET" "${base%/}/api/cron"
  echo
}

cmd_deploy() {
  local sub="${1:-check}"; shift || true
  case "$sub" in
    check)
      step "Checking production environment variables"
      node scripts/env-tool.cjs check --production || true
      step "Checking deployment configuration"
      node apps/it/scripts/check-deployment-config.cjs
      ;;
    prepare)
      cmd_deploy check
      load_env
      confirm "Apply pending migrations to production DB and build binaries?" || die "Cancelled."
      cmd_db migrate
      cmd_db generate
      cmd_build
      ok "Production build prepared successfully."
      ;;
    migrate)
      load_env
      confirm "Apply pending migrations to configured database?" || die "Cancelled."
      cmd_db migrate
      ;;
    vercel)
      local app="${1:-}" prod=""
      shift || true
      case " $* " in *" --prod "*) prod="--prod" ;; esac
      have vercel || die "Vercel CLI not installed. Run: npm i -g vercel"
      deploy_one() {
        step "Deploying apps/$1 to Vercel ${prod:+(production)}"
        run vercel deploy --cwd "apps/$1" $prod
      }
      case "$app" in
        admin | web | it | store) deploy_one "$app" ;;
        all) deploy_one web; deploy_one admin; deploy_one it; deploy_one store ;;
        *) die "deploy vercel <admin|web|it|store|all> [--prod]" ;;
      esac
      ;;
    self)
      local app="${1:-all}"
      cmd_deploy prepare
      cmd_start "$app"
      ;;
    *) die "Unknown command: deploy $sub (check, prepare, migrate, vercel, self)" ;;
  esac
}

cmd_company() {
  case "${1:-list}" in
    list) ls -1 seeds/assets 2>/dev/null | grep -v '^\.' | grep -v README ;;
    *) die "company [list]" ;;
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
  Web App           http://localhost:3000   (/en, /ar)
  Admin App         http://localhost:3001
  IT Dashboard      http://localhost:3002
  Store App         http://localhost:3003   (/en, /ar)
  Backend Gateway   http://127.0.0.1:8080   (Health/Metrics: port 9080)
  Postgres DB       127.0.0.1:5432
  S3 Storage        http://127.0.0.1:8333   (SeaweedFS)
  Grafana           http://localhost:3300   (./run.sh services observability)
  pgAdmin           http://localhost:5050   (docker compose --profile tools up -d)
EOF
}

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
    apps) cmd_apps "$@" ;;
    rebuild) cmd_rebuild "$@" ;;
    backend)
      sub="${1:-health}"
      shift || true
      case "$sub" in
        build) (cd backend && make build) ;;
        run) cmd_backend_run "$@" ;;
        health) cmd_backend_health ;;
        test) (cd backend && make test) ;;
        *) die "backend [build|run|health|test]" ;;
      esac
      ;;
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
      for app in apps/admin apps/it apps/web backend/contracts; do
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
