# Local Development & DevOps Guide

## 1. Environment Setup
1. Copy `.env.example` to `.env`.
2. Fill in your Supabase connection strings:
   - `DATABASE_URL`: Use the local direct database at port `54322`, or the provider-recommended connection URL for a hosted database.
   - `DIRECT_URL`: Use the local direct database at port `54322`, or the direct Postgres endpoint for hosted migrations.
3. Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` (at least 12 characters) before bootstrap or demo seeding, and `COMPANY_PROFILE` (`demo` for development; leave empty in production to use the setup wizard).
4. Fill in the cryptographic secrets (`JWT_SECRET`, `REVALIDATION_SECRET`, `MFA_ENCRYPTION_KEY`). Use at least 32 UTF-8 bytes for JWT_SECRET, a strong independent REVALIDATION_SECRET, exactly 32 random bytes encoded as base64 for MFA_ENCRYPTION_KEY, and a separate 32 UTF-8 byte ENCRYPTION_KEY for integrations.

## 2. Database

Starting, seeding, resetting and migrating the database are covered in [DATABASE.md](DATABASE.md). In short:

```sh
pnpm dlx supabase start -x studio,postgres-meta,logflare,vector,supavisor,edge-runtime,realtime,imgproxy,mailpit
```

```sh
pnpm db:reset
```

The app uses PostgreSQL on port 54322 and Supabase API and storage on port 54321. A P1001 error means the configured database is unreachable. Generating the client alone does not start a database.

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
Use the startup command in section 2. Run `pnpm dlx supabase status` to retrieve local connection values and keys. Keep the service-role key in server-only environment variables. `pnpm db:reset` creates the `private-assets` (private) and `public-assets` (public) storage buckets if they are missing. For other environments, create them with a 10 MiB object limit and PDF, JPEG, PNG and WebP MIME types, plus WOFF2 on `public-assets` for brand fonts.

### 2. Testing Emails (Resend)
You don't need a verified domain to test emails. 
1. Create a free Resend account.
2. Generate an API Key.
3. Resend allows you to send test emails *only* to the email address you signed up with. Set `NOTIFICATION_EMAIL` to your own email, and the system will successfully dispatch invoices and OTPs to you during testing.
