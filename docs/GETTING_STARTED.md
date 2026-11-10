# Getting Started Guide

This guide takes you from a fresh repository clone to a fully operational system across all three frontend applications (`apps/web`, `apps/admin`, `apps/it`) and the 16 backend Go microservices.

---

## 1. Prerequisites & Stack Overview

Before setting up the project, ensure your workstation has the following installed:

* **Node.js**: v22.0.0 or newer
* **Go**: v1.24.0 or newer
* **Docker & Docker Compose**: v2.20+
* **npm**: v10.0+

### Quick Start (Single Command)

The fastest way to initialize dependencies, generate environment secrets, launch local Docker services, apply database migrations, and seed the demo data is:

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

## 3. Setup Profiles & Installation Scenarios

Choose one of three setup modes depending on your objective:

| Objective | Setup Mode | Command | Target URLs |
|---|---|---|---|
| **Explore full fictional demo business** | **Demo Company** | `./run.sh db reset` | Admin: `http://localhost:3001`<br/>Web: `http://localhost:3000`<br/>IT: `http://localhost:3002` |
| **Configure for a specific brand profile** | **Custom Profile** | `./run.sh db reset --profile demo` | Custom profile branding & presets applied. |
| **Clean install with Setup Wizard** | **Blank Install** | `./run.sh db reset --empty` | Admin opens interactive setup wizard at `http://localhost:3001/setup`. |

---

## 4. Initial Sign-In Credentials

When seeding demo data or bootstrapping a new installation, credentials default to:

* **Super Admin Email**: Configured in `.env` (`SUPER_ADMIN_EMAIL`, default: `admin@example.com`)
* **Super Admin Password**: Configured in `.env` (`SUPER_ADMIN_PASSWORD`, default: `Admin12345678!`)

### Fictional Demo Accounts (`seeds/demo-staff.json`)

All demo accounts share `SUPER_ADMIN_PASSWORD`:

| Department / Role | Email Address | Accessible Scope |
|---|---|---|
| **Finance Manager** | `finance@example.com` | Finance, Invoices, Expenses, Payroll |
| **Sales Representative** | `sales@example.com` | CRM Contacts, Deals, Quotations |
| **Operations Manager** | `operations@example.com` | Inventory, Warehouses, Logistics |
| **HR Manager** | `hr@example.com` | Employees, Attendance, Leave, Settlements |
| **IT Engineer** | `it@example.com` | IT Tickets, System Health, Operations |

---

## 5. Day-to-Day Operations & Helpful Commands

| Development Task | Command | Purpose |
|---|---|---|
| **Start all frontend apps** | `./run.sh dev` | Runs Web (3000), Admin (3001), and IT (3002) in parallel. |
| **Start specific app** | `./run.sh dev admin` | Starts only the requested app (`web`, `admin`, `it`). |
| **Run Go microservices** | `./run.sh services up` | Starts all Go services in Compose containers. |
| **Reset database & re-seed** | `./run.sh db reset` | Drops schemas, runs migrations, resets S3 storage, and re-seeds. |
| **Apply pending migrations** | `./run.sh db migrate` | Runs pending Goose migrations across all microservice schemas. |
| **Check code quality & CI** | `./run.sh check` | Executes linting, type-checking, contract validation, and unit tests. |
| **Run full test suite** | `./run.sh test ci` | Executes unit tests, database checks, and Playwright E2E tests. |

---

## 6. Architecture & Codebase Guidelines

1. **Brand Neutrality**: Company logos, colors, fonts, and addresses reside in `seeds/assets/` or the database, never hardcoded in application components.
2. **Localization**: Display strings must be added to locale files (`apps/{admin,web,it}/locales`), never inline in JSX.
3. **Database Rules**: Microservice schema changes require Goose SQL migrations under `backend/services/<service>/migrations/`.
