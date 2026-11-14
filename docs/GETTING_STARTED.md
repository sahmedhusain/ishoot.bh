# Getting Started Guide

This guide takes you from a fresh repository clone to a fully operational system across all four frontend applications (`apps/web`, `apps/admin`, `apps/it`, `apps/store`) and the 16 backend Go microservices.

---

## 1. Prerequisites & Stack Overview

Before setting up the project, ensure your workstation has the following installed:

* **Node.js**: v22.0.0 or newer
* **Go**: v1.24.0 or newer
* **Docker & Docker Compose**: v2.20+
* **npm**: v10.0+

### Quick Start (Single Command)

The fastest way to initialize dependencies, generate environment secrets, launch local Docker services, apply database migrations, and initialize a clean database is:

```bash
./run.sh setup
```

To verify your system readiness at any time:
```bash
./run.sh doctor
```

---

## 2. Step-by-Step Installation

If you prefer to run setup steps individually:

### Step 1: Install Dependencies
```bash
./run.sh install
```

### Step 2: Initialize Environment & Generate Secrets
```bash
./run.sh env init
./run.sh env secrets
```
This generates `.env` from `.env.example`, generating secure database passwords, service signing keys, and encryption secrets.

### Step 3: Start Docker Infrastructure Stack
```bash
./run.sh services up
./run.sh services status
```
This launches PostgreSQL 17 (port 5432), Valkey (port 6379), NATS JetStream (port 4222), SeaweedFS S3 (port 8333), Mailpit (port 8025), API Gateway (port 8080), and Go backend services.

---

## 3. Setup Scenarios & Domain Configuration

All frontend domains default to `localhost` in `.env` (`WEB_DOMAIN`, `ADMIN_DOMAIN`, `IT_DOMAIN`, `STORE_DOMAIN`) until custom domains are configured.

| Objective | Setup Mode | Command | Target URLs |
|---|---|---|---|
| **Clean install with Setup Wizard (Default)** | **Empty Bootstrap** | `./run.sh db reset` | Admin: `http://localhost:3001/setup`<br/>IT: `http://localhost:3002`<br/>Web: `http://localhost:3000`<br/>Store: `http://localhost:3003` |
| **Load a standalone company seed** | **Seeded Company** | `./run.sh db seed <company>` | Loads `seeds/<company>/seed.sql` and uploads `seeds/<company>/assets/` to SeaweedFS (e.g., `zayed-group`, `al-manar-films`, `ishoot`). |

---

## 4. Initial Sign-In Credentials

When bootstrapping a fresh installation, the initial Super Admin and IT Admin accounts are configured in `.env`:

* **Super Admin Email**: Configured in `.env` (`SUPER_ADMIN_EMAIL`, default: `admin@platform.local`)
* **Super Admin Password**: Configured in `.env` (`SUPER_ADMIN_PASSWORD`)

When a standalone company seed (`seeds/<company>/seed.sql`) is loaded, department staff accounts are created using the seeded company's domain (for example `layla-nasser@<company-domain>`).

---

## 5. Day-to-Day Operations & Helpful Commands

| Development Task | Command | Purpose |
|---|---|---|
| **Start all frontend apps** | `./run.sh dev` | Runs Web (3000), Admin (3001), IT (3002), and Store (3003) in parallel. |
| **Start specific app** | `./run.sh dev admin` | Starts only the requested app (`web`, `admin`, `it`, `store`). |
| **Run Go microservices** | `./run.sh services up` | Starts all Go services in Compose containers. |
| **Reset database (empty)** | `./run.sh db reset` | Drops schemas, runs migrations, resets S3 storage, and runs clean bootstrap. |
| **Apply pending migrations** | `./run.sh db migrate` | Runs pending Goose migrations across all microservice schemas. |
| **Check code quality & CI** | `./run.sh check` | Executes linting, type-checking, contract validation, and unit tests. |
| **Run full test suite** | `./run.sh test ci` | Executes unit tests, database checks, and Playwright E2E tests. |

---

## 6. Architecture & Codebase Guidelines

1. **Brand Neutrality**: Company logos, colors, fonts, and addresses reside in `seeds/assets/` or the database, never hardcoded in application components.
2. **Localization**: Display strings must be added to locale files (`apps/{admin,web,it,store}/locales`), never inline in JSX.
3. **Database Rules**: Microservice schema changes require Goose SQL migrations under `backend/services/<service>/migrations/`.
