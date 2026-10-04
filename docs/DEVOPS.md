# Local Development & DevOps Guide

## 1. Environment Setup
1. Copy `.env.example` to `.env`.
2. Fill in your Supabase connection strings:
   - `DATABASE_URL`: Must point to the connection pooler (e.g. `6543`).
   - `DIRECT_URL`: Must point to the direct Postgres port (e.g. `5432`).
3. Fill in the cryptographic secrets (`JWT_SECRET`, `REVALIDATION_SECRET`, `MFA_ENCRYPTION_KEY`). These must be 32+ character secure random strings.

## 2. Database Initialization & Seeding
The monorepo uses `pnpm` workspace commands for database management.

```bash
# Install dependencies across all workspaces
pnpm install

# Push the Prisma schema to the database (Uses DIRECT_URL)
cd packages/database
pnpm run db:push

# Generate the Prisma Client types
pnpm run db:generate

# Seed the database with the Super Admin and CMS content
pnpm run db:seed
```

### Seeding Details (`packages/database/prisma/seed.ts`)
The seed script guarantees a reproducible baseline:
1. Creates the `Super Admin` user using credentials defined in `.env` (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`). The password is automatically hashed via `bcryptjs`.
2. Provisions default RBAC roles and permissions.
3. Seeds the website CMS tables (`Faq`, `Review`, `Statistic`) with initial bilingual (Arabic/English) content.

## 3. Running the Servers
```bash
# Run both the Web and Admin applications concurrently
pnpm run dev
```
- Web: `http://localhost:3000`
- Admin: `http://localhost:3001`

## 4. Local Development without Cloud Accounts
If you are actively developing and testing but have **not yet registered or configured Supabase or Resend**, you can mock the cloud environment locally:

### 1. Local Supabase (Database & Storage)
Instead of a cloud database, you can run the entire Supabase stack (including the Storage API required for file uploads) locally using Docker:
```bash
# Initialize local supabase config (run once)
npx supabase init

# Start the local stack (requires Docker to be running)
npx supabase start
```
This will output local credentials for `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` that you can paste directly into your `.env` file. File uploads will now work perfectly using local Docker storage rather than a cloud bucket!

### 2. Testing Emails (Resend)
You don't need a verified domain to test emails. 
1. Create a free Resend account.
2. Generate an API Key.
3. Resend allows you to send test emails *only* to the email address you signed up with. Set `NOTIFICATION_EMAIL` to your own email, and the system will successfully dispatch invoices and OTPs to you during testing.
