# Architecture

The platform combines three independent Next.js App Router frontend applications with a decoupled Go microservices backend.

```
Browser ──▶ apps/web · apps/admin · apps/it   (Next.js: UI, cookies, Server Components, Server Actions)
                 │ server-side only: Bearer token + X-Request-ID, typed @platform/api-client
                 ▼
             gateway ── routing · token check (JWKS) · rate limits (Valkey) · OpenTelemetry
                 ▼
   16 Go microservices:
   identity · system · files · notify · realtime · audit · itsm
   cms · sales · finance · workflow · hr · inventory · commerce · delivery
         │ pgx + sqlc                    │ outbox → NATS JetStream          │ River jobs
         ▼                               ▼                                   ▼
   PostgreSQL 17 (schema per service)    Valkey    S3-compatible storage    OpenTelemetry
```

## Frontend Applications

- **`apps/admin`**: The internal business operating system (CRM, sales, finance, HR and payroll, assets, approvals, documents, website and CMS, products, stock, purchasing, online store, delivery, tasks, reports). Server actions validate input via action schemas and dispatch commands to Go services through the API gateway.
- **`apps/it`**: The IT operational dashboard. Operates against its own `identity` realm with mandatory TOTP MFA. Manages ticket queues, SLA configuration, system health probes, module switches, company branding, database maintenance, staff access, and audit trail inspection.
- **`apps/web`**: The public-facing website and customer storefront in Arabic (`/ar`) and English (`/en`). Renders published CMS blocks, product catalog, customer accounts, shopping cart, checkout, payment webhooks, and shipment tracking.

The frontends are standalone npm applications referencing shared packages (`@platform/ui`, `@platform/config`, `@platform/locales`, `@platform/api-client`, `@platform/email`) via local file dependencies without requiring a monorepo workspace tool.

## Go Microservices Backend

The backend is composed of 16 domain-scoped Go services:
- **`gateway`**: Reverse proxy, path routing, rate limiting, and JWT validation via JWKS.
- **`identity`**: Manages staff, customer, and IT accounts, sessions, passwords, MFA, and OAuth.
- **`system`**: Company profile settings, setup wizard, module toggles, encrypted integration credentials, and site settings.
- **`files`**: S3-compatible file storage, metadata records, upload validation, and River garbage collection.
- **`notify`**: Email and WhatsApp delivery, delivery webhook processing, and in-app notifications.
- **`realtime`**: Server-Sent Events (SSE) for real-time presence, notifications, and dashboard updates.
- **`audit`**: Immutable, append-only audit trail capturing published domain events.
- **`itsm`**: IT ticket lifecycles, SLA policy tracking, breach detection, and ticket comments.
- **`cms`**: Content management, pages, articles, reviews, FAQs, statistics, and published content snapshots.
- **`sales`**: CRM contacts, pipeline deals, inquiries, quotations, and outreach campaigns.
- **`finance`**: Invoicing, payment records, expense claims, and bank settlements.
- **`workflow`**: Multi-step approvals, digital signatures, official letters, tasks, and company calendar.
- **`hr`**: Organizational departments, employee profiles, leave requests, attendance, and payroll.
- **`inventory`**: Product catalogue, variants, stock movements, batches, counts, and warehouses.
- **`commerce`**: Customers, addresses, store configuration, discount coupons, sales orders, and retail POS.
- **`delivery`**: Shipping zones, time slots, delivery fleet, route sheets, shipments, courier adapters, and COD.

## Company Identity and Theming

```
company/profiles/<name>  ──db:bootstrap / db:seed──▶  CompanySetting (identity, theme JSON, file URLs)
setup wizard / Settings ─────────────────────────────▶          │        + files in storage (public-assets)
                                                                ▼
              each root layout: themeStylesheet(theme) → <style> CSS variables + Google/uploaded fonts
                                                                ▼
                       Tailwind classes (bg-primary, text-accent, bg-tone-90, font-sans…)
              PDFs: colours and font from the theme · emails: colours inlined · <meta theme-color>
```

- `normalizeTheme` turns any stored value into a complete, safe theme: hex colours only, plain font names, and approved font files only.
- `themeVariables` derives tonal shades and contrast-compliant surfaces for light and dark modes.
- The admin's default light or dark mode comes from the theme; individual users can toggle their preference.
- `CompanySetting.setupCompletedAt` gates the dashboard: until it is set, dashboard pages redirect to `/setup`.

## Infrastructure

- **Database:** PostgreSQL 17 with schema-per-service isolation (`identity`, `system`, `files`, `notify`, `realtime`, `audit`, `itsm`, `cms`, `sales`, `finance`, `workflow`, `hr`, `inventory`, `commerce`, `delivery`).
- **Storage:** Go `files` service backed by S3-compatible storage (SeaweedFS locally). Buckets remain private; applications proxy authorized access.
- **Messaging:** NATS JetStream for event outbox publishing and durable subscriber consumption.
- **Background Jobs:** PostgreSQL-backed River workers within Go services.
