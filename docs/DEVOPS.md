# Local Development & DevOps Guide

## 1. Environment Setup
1. Copy `.env.example` to `.env`.
2. Fill in your Supabase connection strings:
   - `DATABASE_URL`: Use the local direct database at port `54322`, or the provider-recommended connection URL for a hosted database.
   - `DIRECT_URL`: Use the local direct database at port `54322`, or the direct Postgres endpoint for hosted migrations.
3. Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` (at least 12 characters) before bootstrap or demo seeding.
4. Fill in the cryptographic secrets (`JWT_SECRET`, `REVALIDATION_SECRET`, `MFA_ENCRYPTION_KEY`). Use at least 32 UTF-8 bytes for JWT_SECRET, a strong independent REVALIDATION_SECRET, exactly 32 random bytes encoded as base64 for MFA_ENCRYPTION_KEY, and a separate 32 UTF-8 byte ENCRYPTION_KEY for integrations.

## 2. Database initialization

Run from the repository root. The commands below contain no shell comments, so they can be pasted into default interactive zsh. To enable pasted `#` comments for your current shell, run `setopt interactivecomments`.

For local Supabase, initialize configuration once with `pnpm dlx supabase init` (already initialized in this repository), then start Docker and run:

```sh
pnpm dlx supabase start -x studio,postgres-meta,logflare,vector,supavisor,edge-runtime,realtime,imgproxy,mailpit
pnpm install
pnpm --filter @ishoot/database db:generate
pnpm exec prisma migrate deploy --schema packages/database/prisma/schema.prisma
pnpm db:bootstrap
```

The app uses PostgreSQL at port 54322 and Supabase API/storage at port 54321. A P1001 error means the configured database is unreachable; client generation alone does not start a database. Configure `.env` using the local stack's values, including both database URLs, `SUPABASE_URL`, the public URL/key and server service-role key. The generic Compose PostgreSQL service uses port 5432 by default and does not provide Supabase storage.

`db:bootstrap` creates initial accounts/settings without replacing existing records. To populate a **new, empty local development database with demo CMS and business records**, run:

```sh
pnpm db:seed
```

On a local database, the demo seed also creates and publishes the initial website snapshot so the public site can render immediately. On a hosted development database it creates only a draft for review and publication in the admin app.

The demo seed now refuses existing business records. It contains demonstration invoices, payments, attachments and contacts, not just an administrator and CMS content. It is disabled in production. The seed uses its own CommonJS TypeScript configuration while application packages retain their bundler/ES module configuration.

`pnpm --filter @ishoot/database db:push` remains available for disposable development databases, but migration deploy preserves the checked-in migration history and is the preferred initialization command. Review drift before applying migrations to a database previously created with schema push.

## 3. Running the Servers
```bash
pnpm run dev
```
- Web: `http://localhost:3000`
- Admin: `http://localhost:3001`

## 4. Local Development without Cloud Accounts
If you are actively developing and testing but have **not yet registered or configured Supabase or Resend**, you can mock the cloud environment locally:

### 1. Local Supabase (Database & Storage)
Instead of a cloud database, you can run the entire Supabase stack (including the Storage API required for file uploads) locally using Docker:
Use the startup command in section 2. Run `pnpm dlx supabase status` to retrieve local connection values and keys. Keep the service-role key in server-only environment variables. Create the `private-assets` (private) and `public-assets` (public) storage buckets with a 10 MiB object limit and PDF, JPEG, PNG and WebP MIME types.

### 2. Testing Emails (Resend)
You don't need a verified domain to test emails. 
1. Create a free Resend account.
2. Generate an API Key.
3. Resend allows you to send test emails *only* to the email address you signed up with. Set `NOTIFICATION_EMAIL` to your own email, and the system will successfully dispatch invoices and OTPs to you during testing.
