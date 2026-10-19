# Database guide: start, seed, reset and manage

The apps use PostgreSQL through Prisma. The schema of record is `packages/database/prisma/schema.prisma`, and every change ships as a migration in `packages/database/prisma/migrations/`. Demo data and company profiles live in [`company/`](../company/README.md).

Run every command from the repository root.

## 1. Start a local database

The recommended setup is the local Supabase stack, which gives you Postgres on port **54322** plus file storage on **54321**.

```bash
pnpm dlx supabase start -x studio,postgres-meta,logflare,vector,supavisor,edge-runtime,realtime,imgproxy,mailpit
```

```bash
pnpm dlx supabase status
```

Copy the values from `supabase status` into `.env` (start from `.env.example`):

| Variable | Local value |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` |
| `SUPABASE_SERVICE_ROLE_KEY` | The `service_role` key, kept server-only |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | Your first administrator (password ≥ 12 characters) |
| `COMPANY_PROFILE` | `demo`, or another folder in `company/profiles/` |

You can also run without Supabase. If `SUPABASE_URL` is left empty, uploads are stored on disk under `apps/admin/private/uploads` (or `UPLOAD_ROOT`). The plain `docker compose up -d db` Postgres on port 5432 works in that mode.

## 2. First run

```bash
pnpm install
```

```bash
pnpm db:reset
```

`db:reset` applies every migration to an empty database, creates the storage buckets, seeds the demo company from `COMPANY_PROFILE` and checks the 70 integrity rules. Then start the apps:

```bash
pnpm dev
```

Admin: http://localhost:3001, sign in with `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`. Website: http://localhost:3000.

## 3. Reset to a fresh database

`db:reset` refuses to run unless `DATABASE_URL` points at this machine (`localhost`, `127.0.0.1` or `::1`). It also refuses when `NODE_ENV=production`, and it asks you to type `reset` before deleting anything. Add `--yes` to skip the prompt.

| Command | Result | Time |
|---|---|---|
| `pnpm db:reset` | Full demo company: about 200 invoices, 150 deals, 27 employees, payroll, assets, approvals, website content | ~2 min |
| `pnpm db:reset:light` | Same demo company without the large generated volume | ~20 s |
| `pnpm db:reset:empty` | Roles, permissions and your super admin only. The admin opens the **first-run setup wizard**, as a new customer would see it. | ~10 s |
| `pnpm db:reset --profile <name>` | Demo data branded with another profile from `company/profiles/` | |

Each reset:
1. drops every table and re-applies all migrations (`prisma migrate reset`);
2. empties uploaded files: the local upload folder, or the `public-assets` and `private-assets` buckets, which it creates if they are missing;
3. seeds (`pnpm db:seed`) or bootstraps (`pnpm db:bootstrap`);
4. runs `pnpm db:check-integrity` after a seed.

Every demo account uses `SUPER_ADMIN_PASSWORD`. The demo staff emails are listed in `company/seed/demo-staff.json` (for example `finance@example.com`).

## 4. Seeding

| Command | Use it for |
|---|---|
| `pnpm db:seed` | Fill an **empty** database with demo data (it refuses if business records exist, so it never mixes with real data). `SEED_VOLUME=off` skips the large generated volume. |
| `pnpm db:bootstrap` | A real installation: roles, permissions, default modules and the first admin. Never deletes or overwrites anything. Without `COMPANY_PROFILE`, the company starts blank and the setup wizard runs. |
| `COMPANY_PROFILE=<name> pnpm db:bootstrap` | Same, plus the profile's identity, brand files and theme |
| `COMPANY_PROFILE=<name> COMPANY_PROFILE_OVERWRITE=1 pnpm db:bootstrap` | Re-apply a profile to an existing installation. This also moves stored `/brand/...` paths left over from older versions to uploaded files. |
| `pnpm db:check-integrity` | Audit any database (seeded or real) against the business rules: totals, statuses, numbering, approvals, HR and more |

Where the seed data lives:

| File | Contents |
|---|---|
| `company/seed/seed.ts` | Company setup, users and roles, website content, clients, deals, quotations, invoices, payments, HR, payroll, calendar, documents |
| `company/seed/seed-volume.ts` | The large generated volume, created through the app's own domain functions and then reconciled with its rules |
| `company/seed/demo-staff.json` | Fictional staff, their roles and emails |
| `company/seed/demo-clients.json` | Fictional client companies (their logos are generated into the demo profile) |
| `company/profiles/<name>/` | Company identity, theme and brand files (see [company/README.md](../company/README.md)) |

All demo people and companies are fictional and use `example.com` or `.example` addresses. Keep it that way: `pnpm test:brand` and the unit tests fail if a profile's name, domain, colours or fonts appear in the apps.

## 5. Changing the schema

1. Edit `packages/database/prisma/schema.prisma`.
2. Create a migration without applying it:
   ```bash
   pnpm db:migrate:new --name describe_the_change
   ```
3. Review the generated SQL. Add data backfills where needed, for example marking existing companies as set up.
4. Apply it, then regenerate the client:
   ```bash
   pnpm db:migrate
   ```
   ```bash
   pnpm db:generate
   ```
5. If server action inputs changed, regenerate their contracts:
   ```bash
   node scripts/generate-action-schemas.cjs
   ```

Never edit a migration that has already been applied anywhere; add a new one. There is no `db:push`, because it bypasses migrations and lets databases drift.

| Command | What it does |
|---|---|
| `pnpm db:migrate` | Apply pending migrations (safe for every environment) |
| `pnpm db:status` | Show applied and pending migrations |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:studio` | Browse and edit data at http://localhost:5555 |

## 6. Production

- Run `pnpm db:migrate`, then `pnpm db:bootstrap` once with `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`. Leave `COMPANY_PROFILE` empty and finish the setup wizard in the admin, or set it to a reviewed profile.
- `db:seed` and `db:reset` refuse to run in production.
- Create the storage buckets `public-assets` (public: logos, icons, fonts, website media) and `private-assets` (private: everything else), with a 10 MiB limit. Allowed types: PDF, PNG, JPEG, WebP, plus WOFF2 for `public-assets`.
- Back up the database and both buckets together; uploaded file URLs are stored in the database.

## 7. Test databases

Automated tests never use your development database. They create their own databases whose names end in `_test`, on the same server:

| Command | Database |
|---|---|
| `pnpm test:e2e:prepare` | `platform_e2e_test` (seeded) and `platform_e2e_blank_test` (blank, setup wizard) |
| `node tests/e2e/prepare-db.cjs <seeded\|blank\|bare> <name_test>` | Any disposable database |

See [TESTING.md](TESTING.md).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `P1001: Can't reach database server` | Start the stack (`pnpm dlx supabase start …`) and check the port in `DATABASE_URL` |
| `Demo seed requires an empty business database` | Use `pnpm db:reset` instead of `pnpm db:seed` |
| `Too many database connections` | Stop extra dev or test servers, or add `?connection_limit=5` to `DATABASE_URL` |
| Logos or images missing after a reset | Files and database must be reset together. Use `db:reset`, which does both, rather than resetting only one. |
| The admin opens `/setup` | The company has not finished setup. Complete the wizard, or reset with a profile. |
