# Architecture Overview

## 1. System Topology
The platform is a modern monorepo (Turborepo) managing two distinct Next.js applications sharing a unified Prisma ORM data layer and internal packages.

- **`apps/web`**: The public-facing studio website. Next.js App Router (React Server Components) rendering portfolio assets, case studies, and headless CMS content (Reviews, FAQs, Statistics). Connects directly to the database for read-only CMS queries.
- **`apps/admin`**: The internal business operating system (ERP/CRM). Next.js App Router with Server Actions handling highly privileged mutations (Quotations, Invoices, Communications, Social Analytics). 

## 2. Infrastructure (Vercel + Supabase)
- **Hosting**: Deployed on Vercel (Serverless Functions and Edge caching).
- **Database**: Supabase PostgreSQL. Crucially, the Next.js apps connect to Supabase via a **Transaction Pooler (PgBouncer/Supavisor)** on port 6543 to prevent Vercel's serverless functions from exhausting database connections. 
- **Storage**: Supabase Object Storage replaces local disk uploads. The `admin` app generates short-lived presigned URLs to allow the browser to upload directly to Supabase buckets, bypassing Vercel's 4.5MB request limit.
- **Email**: Resend API handles transactional dispatch (Quotations, Invoices, OTPs) and inbound email parsing via `svix-signature` verified webhooks.

## 3. Security Boundaries
- **Authentication**: Custom JWT-based authentication wrapped with TOTP (Time-Based One-Time Password) MFA requirements for privileged accounts. Passwords are hashed using `bcryptjs`. Resetting a password strictly revokes all existing sessions.
- **Authorization**: The `@platform/database` package provides `requirePermission(resource, action)`. All Server Actions invoke this boundary before executing database queries.
- **Data Encryption**: Application-level AES-256-GCM encryption is used for storing sensitive API tokens (e.g., WhatsApp, Facebook) at rest in the database.

## 4. Workloads & Background Jobs
- Serverless architectures lack durable background daemons. Therefore, asynchronous workflows (like tracking sent emails or social analytics freshness) are handled via:
  1. **Synchronous Commit/Queuing**: E.g., `sendOutboundMessage` persists a message in Postgres as "queued" *before* calling the Resend API.
  2. **Webhook Fulfillment**: Provider webhooks (Resend) arrive asynchronously and update the persisted job state to "delivered" or "failed".
