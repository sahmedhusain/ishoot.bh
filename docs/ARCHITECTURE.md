# 🏗️ System Architecture & Platform Principles

This document provides a comprehensive, advanced overview of the platform's system architecture, domain-scoped microservices, data isolation strategies, event-driven communications, and frontend ecosystems.

---

## 1. System Architecture & High-Level Data Flow

The platform combines three independent Next.js 16 frontend applications with a decoupled, event-driven Go microservices backend. An **API Gateway** acts as the single public entry point, routing requests to **16 Domain-Scoped Go Microservices**. Microservices do not share databases; instead, each service owns its dedicated PostgreSQL schema and communicates asynchronously via **NATS JetStream** using the **Transactional Outbox Pattern**.

```mermaid
flowchart TB
    %% Frontend Layer
    subgraph Clients["Frontend Clients (Next.js 16)"]
        direction LR
        Web["Web App\n(Public Store / Customer)"]:::app
        Admin["Admin App\n(Enterprise Business OS)"]:::app
        IT["IT Dashboard\n(Operations & Infrastructure)"]:::app
    end

    %% Gateway Layer
    Gateway["API Gateway (:8080)\n(Routing, JWKS Validation, Rate Limiting)"]:::gateway

    %% Core Microservices
    subgraph Services["Go Microservices"]
        direction TB
        Identity["Identity Service"]:::svc
        System["System Service"]:::svc
        Files["Files Service"]:::svc
        Notify["Notify Service"]:::svc
        Realtime["Realtime Service"]:::svc
        Audit["Audit Service"]:::svc
        ITSM["ITSM Service"]:::svc
        CMS["CMS Service"]:::svc
        Sales["Sales (CRM) Service"]:::svc
        Finance["Finance Service"]:::svc
        Workflow["Workflow Service"]:::svc
        HR["HR & Payroll Service"]:::svc
        Inventory["Inventory Service"]:::svc
        Commerce["Commerce Service"]:::svc
        Delivery["Delivery Service"]:::svc
    end

    %% Infrastructure & Data Stores
    subgraph Storage["Infrastructure Layer"]
        direction LR
        NATS["NATS JetStream\n(Event Bus)"]:::infra
        PG["PostgreSQL 17\n(Schema per Service)"]:::db
        Valkey["Valkey / Redis\n(Cache & Rate Limiting)"]:::infra
        S3["SeaweedFS / S3\n(Object Storage)"]:::infra
    end

    Clients -- REST / HTTP --> Gateway
    Gateway -- Proxies --> Services
    Services -- SQL / Outbox --> PG
    Services -- Pub/Sub Events --> NATS
    Services -- Storage API --> S3
    Gateway -- Session & Limits --> Valkey

    classDef app fill:#F9F9F9,stroke:#0070F3,stroke-width:2px;
    classDef gateway fill:#FFF8E1,stroke:#E91E63,stroke-width:2px;
    classDef svc fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px;
    classDef infra fill:#F3E5F5,stroke:#9C27B0,stroke-width:2px;
    classDef db fill:#E3F2FD,stroke:#2196F3,stroke-width:2px;
```

---

## 2. Microservices Domain & Storage Matrix

Each backend microservice is entirely isolated, operating under its own PostgreSQL database role (`svc_<service>`) and schema.

| Microservice | Database Schema | Primary Domain Responsibilities | Outbox Events Emitted |
|---|---|---|---|
| **gateway** | *(None)* | Reverse proxy routing, JWKS token verification, rate limiting, and session status checks. | — |
| **identity** | `identity` | Staff, Customer, and IT account realms, Argon2id passwords, TOTP MFA, and Ed25519 JWKS issuing. | `identity.user.created.v1`, `identity.session.revoked.v1` |
| **system** | `system` | Company profiles, feature toggles, encrypted integration keys, site settings, and document sequences. | `system.settings.updated.v1`, `system.module.toggled.v1` |
| **files** | `files` | S3-compatible file metadata, upload authorization, checksum verification, and background cleanup. | `files.object.uploaded.v1`, `files.object.deleted.v1` |
| **notify** | `notify` | E-mail (Resend/SMTP), WhatsApp Cloud API dispatch, retry queues, and in-app user notification inboxes. | `notify.message.sent.v1`, `notify.message.failed.v1` |
| **realtime** | `realtime` | Server-Sent Events (SSE) streaming, user connection tracking, presence states, and calendar/leave windows. | `realtime.presence.changed.v1` |
| **audit** | `audit` | Append-only security audit trail for all published system events across all domain microservices. | — |
| **itsm** | `itsm` | IT support tickets, categories, SLA breach tracking, comments, and attachments. | `itsm.ticket.created.v1`, `itsm.ticket.breached.v1` |
| **cms** | `cms` | Dynamic block-based pages, localized articles, customer reviews, FAQs, statistics, and published snapshots. | `cms.page.published.v1`, `cms.article.published.v1` |
| **sales** | `sales` | CRM contacts, lead inquiries, pipeline deal stages, commercial quotations, and marketing campaigns. | `sales.deal.won.v1`, `sales.quotation.issued.v1` |
| **finance** | `finance` | Invoices, payments, expense claims, tax calculation, and bank settlements. | `finance.invoice.issued.v1`, `finance.payment.recorded.v1` |
| **workflow** | `workflow` | Multi-step approval requests, digital client signatures, official letters, tasks, and shared calendar events. | `workflow.approval.decided.v1`, `workflow.document.signed.v1` |
| **hr** | `hr` | Organizational departments, employee directory, GOSI social insurance, leave requests, attendance, and payroll. | `hr.payroll.processed.v1`, `hr.leave.approved.v1` |
| **inventory** | `inventory` | Warehouses, stock locations, products, variants, append-only stock ledger, batches, and physical stock counts. | `inventory.stock.adjusted.v1`, `inventory.transfer.completed.v1` |
| **commerce** | `commerce` | Store customers, delivery addresses, store settings, discount coupons, sales orders, POS registers, and shifts. | `commerce.order.placed.v1`, `commerce.order.paid.v1` |
| **delivery** | `delivery` | Delivery zones, time slots, vehicle fleet, route sheets, shipment milestones, driver COD, and courier APIs. | `delivery.shipment.dispatched.v1`, `delivery.shipment.delivered.v1` |

---

## 3. Transactional Outbox Pattern & Event Architecture

To achieve strong eventual consistency across decoupled microservice schemas without distributed transactions (2PC), services write events to a local `outbox` table within the same PostgreSQL transaction that modifies business entities. A background worker picks up outbox entries and publishes them to NATS JetStream.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Frontend Client
    participant Sales as Sales Service
    participant DB as Postgres (sales schema)
    participant NATS as NATS JetStream
    participant Audit as Audit Service

    Client->>Sales: HTTP POST /v1/sales/deals (Create Deal)
    activate Sales
    Sales->>DB: BEGIN Transaction
    Sales->>DB: INSERT INTO sales.deal (...)
    Sales->>DB: INSERT INTO sales.outbox (event_id, subject, payload)
    Sales->>DB: COMMIT Transaction
    Sales-->>Client: 201 Created (Deal DTO)
    deactivate Sales

    Sales->>NATS: Outbox Relay publishes event to JetStream
    NATS->>Audit: JetStream Consumer receives event
    activate Audit
    Audit->>Audit: Write Event into audit.event (Append-Only)
    Audit->>NATS: ACK Message
    deactivate Audit
```

---

## 4. Microservices Domain Models (ERDs)

Below is the Entity Relationship Diagram (ERD) representation of key domain models across the core microservices.

### 4.1. Identity Service Schema
```mermaid
erDiagram
    account ||--o{ mfa_recovery_code : "secures"
    account ||--o{ session_family : "owns"
    account {
        text realm PK
        text subject_id PK
        text email
        text password_hash
        boolean active
        boolean mfa_enabled
    }
    mfa_recovery_code {
        text realm PK
        text subject_id PK
        text code_hash PK
    }
    session_family {
        uuid id PK
        text realm
        text subject_id
        boolean revoked
    }
```

### 4.2. Finance Service Schema
```mermaid
erDiagram
    invoice ||--o{ invoice_item : "contains"
    invoice ||--o{ payment : "receives"
    expense_category ||--o{ expense : "categorizes"
    
    invoice {
        text id PK
        text invoice_number
        text status
        numeric total_amount
    }
    invoice_item {
        text id PK
        text invoice_id FK
        text description
        numeric amount
    }
    payment {
        text id PK
        text invoice_id FK
        numeric amount
        text payment_method
    }
    expense {
        text id PK
        text category_id FK
        numeric amount
    }
```

### 4.3. HR & Payroll Service Schema
```mermaid
erDiagram
    department ||--o{ employee : "employs"
    department ||--o{ department : "parent"
    employee ||--o{ leave_request : "requests"
    employee ||--o{ attendance_entry : "logs"
    payroll_run ||--o{ payroll_item : "contains"
    employee ||--o{ payroll_item : "earns"
    
    employee {
        text id PK
        text department_id FK
        text status
        numeric basic_salary
    }
    payroll_run {
        text id PK
        text period
        text status
    }
    payroll_item {
        text id PK
        text run_id FK
        text employee_id FK
        numeric net_salary
    }
```

### 4.4. Inventory & Warehouse Service Schema
```mermaid
erDiagram
    warehouse ||--o{ stock_location : "contains"
    product_category ||--o{ product : "categorizes"
    product ||--o{ product_variant : "has"
    stock_location ||--o{ stock_level : "holds"
    product_variant ||--o{ stock_level : "tracked in"
    stock_location ||--o{ stock_movement : "logs"
    
    warehouse {
        text id PK
        text name
    }
    product {
        text id PK
        text sku
        numeric price
    }
    stock_level {
        text location_id PK
        text variant_id PK
        integer quantity
    }
```

---

## 5. Frontend BFF & Token Realm Security

The platform supports three isolated authentication realms enforced across both frontends and backend services:

```mermaid
flowchart LR
    subgraph Realms["Authentication Realms"]
        StaffRealm["Staff Realm\n(Admin App)"]
        CustomerRealm["Customer Realm\n(Web Store)"]
        ITRealm["IT Realm\n(IT Dashboard)"]
    end

    subgraph AuthTokens["Ed25519 JWT Tokens"]
        AudStaff["Audience: platform:staff"]
        AudCustomer["Audience: platform:customer"]
        AudIT["Audience: platform:it"]
    end

    StaffRealm --> AudStaff
    CustomerRealm --> AudCustomer
    ITRealm --> AudIT

    AudStaff --> GatewayCheck["Gateway & Service Verification"]
    AudCustomer --> GatewayCheck
    AudIT --> GatewayCheck
```

* **Frontend Isolation:** Frontends (`apps/web`, `apps/admin`, `apps/it`) communicate exclusively with the Go backend through the API Gateway via `@platform/api-client`. Frontends never share code or perform direct database access.
* **Token Verification:** Gateway and Go microservices verify Ed25519 JWT signatures in-memory using public JWKS keys without external network calls.
* **Database Isolation:** PostgreSQL connection pools utilize service-specific roles (`svc_<service>`) ensuring strong schema boundaries.
