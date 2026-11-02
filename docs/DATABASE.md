# Database guide: start, seed, reset and manage

The apps use PostgreSQL through Prisma. The schema of record is `packages/database/prisma/schema.prisma`, and every change ships as a migration in `packages/database/prisma/migrations/`. Demo data and company profiles live in [`company/`](../company/README.md).

Run every command from the repository root. Each step below has a `./run.sh` shortcut (`./run.sh help` lists them).

## 1. Start a local database

The local Compose stack supplies PostgreSQL 17 on port **5432**, plus Valkey, NATS JetStream, SeaweedFS S3, and the Go backend services. Initialize `.env` before starting it:

```bash
./run.sh env init
./run.sh services up
./run.sh services status
```

The env tool generates matching database credentials and service signing keys. Set your first administrator credentials and company profile in `.env`. Go microservices own their dedicated schemas (`identity`, `system`, `files`, `notify`, `realtime`, `audit`, `itsm`, `cms`, `sales`, `finance`, `workflow`, `hr`, `inventory`, `commerce`, `delivery`) via goose migrations. Data handoff migrations transfer historical data. See [the migration runbook](backend/DATA-MIGRATION.md) for existing installations.

## 2. First run

```bash
./run.sh install
```

```bash
./run.sh db reset
```

`db:reset` applies every migration to an empty database, creates the storage buckets, seeds the demo company from `COMPANY_PROFILE` and checks the integrity rules. Then start the apps:

```bash
./run.sh dev
```

Admin: http://localhost:3001, sign in with `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`. IT: http://localhost:3002. Website: http://localhost:3000.

## 3. Reset to a fresh database

`db reset` refuses to run unless `DATABASE_URL` points at this machine (`localhost`, `127.0.0.1` or `::1`). It also refuses when `NODE_ENV=production`, and it asks you to type `reset` before deleting anything. Add `--yes` to skip the prompt.

| Command                          | Result                                                                                                                        | Time   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ |
| `./run.sh db reset`              | Full demo company: about 200 invoices, 150 deals, 27 employees, payroll, assets, approvals, website content                   | ~2 min |
| `./run.sh db reset --light`      | Same demo company without the large generated volume                                                                          | ~20 s  |
| `./run.sh db reset --empty`      | Roles, permissions and your super admin only. The admin opens the **first-run setup wizard**, as a new customer would see it. | ~10 s  |
| `./run.sh db reset --profile <name>` | Demo data branded with another profile from `company/profiles/`                                                           |        |

Each reset:

1. drops every table and re-applies all migrations (`prisma migrate reset` and goose service migrations);
2. empties uploaded files: the local upload folder, or the `public-assets` and `private-assets` buckets, which it creates if they are missing;
3. seeds (`./run.sh db seed`) or bootstraps (`./run.sh db bootstrap`);
4. runs `./run.sh db integrity` after a seed.

Every demo account uses `SUPER_ADMIN_PASSWORD`. The demo staff emails are listed in `company/seed/demo-staff.json` (for example `finance@example.com`).

## 4. Seeding

| Command                                                                | Use it for                                                                                                                                                                                         |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./run.sh db seed`                                                     | Fill an **empty** database with demo data (it refuses if business records exist, so it never mixes with real data). `SEED_VOLUME=off` skips the large generated volume.                            |
| `./run.sh db bootstrap`                                                | A real installation: roles, permissions, default modules and the first admin. Never deletes or overwrites anything. Without `COMPANY_PROFILE`, the company starts blank and the setup wizard runs. |
| `COMPANY_PROFILE=<name> ./run.sh db bootstrap`                         | Same, plus the profile's identity, brand files and theme                                                                                                                                           |
| `COMPANY_PROFILE=<name> COMPANY_PROFILE_OVERWRITE=1 ./run.sh db bootstrap` | Re-apply a profile to an existing installation. This also moves stored `/brand/...` paths left over from older versions to uploaded files.                                                         |
| `./run.sh db integrity`                                                | Audit any database (seeded or real) against the business rules: totals, statuses, numbering, approvals, HR and more                                                                                |

Where the seed data lives:

| File                             | Contents                                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `company/seed/seed.ts`           | Company setup, users and roles, website content, clients, deals, quotations, invoices, payments, HR, payroll, calendar, documents |
| `company/seed/seed-volume.ts`    | The large generated volume, created through the app's own domain functions and then reconciled with its rules                     |
| `company/seed/demo-staff.json`   | Fictional staff, their roles and emails                                                                                           |
| `company/seed/demo-clients.json` | Fictional client companies (their logos are generated into the demo profile)                                                      |
| `company/profiles/<name>/`       | Company identity, theme and brand files (see [company/README.md](../company/README.md))                                           |

All demo people and companies are fictional and use `example.com` or `.example` addresses. Keep it that way: `./run.sh test brand` and the unit tests fail if a profile's name, domain, colours or fonts appear in the apps.

## 5. Changing the schema

1. For Go microservices: add or edit goose SQL migrations under `backend/services/<name>/migrations/` and run `sqlc generate`.
2. For legacy handoff schema: edit `packages/database/prisma/schema.prisma` and create a migration:
   ```bash
   ./run.sh db new describe_the_change
   ```
3. Apply migrations:
   ```bash
   ./run.sh db migrate
   ```
4. If server action inputs changed, regenerate their contracts:
   ```bash
   node scripts/generate-action-schemas.cjs
   ```

Never edit a migration that has already been applied anywhere; add a new one.

| Command                  | What it does                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `./run.sh db migrate`    | Apply pending migrations (safe for every environment)                                               |
| `./run.sh db status`     | Show applied and pending migrations                                                                 |
| `./run.sh db studio`     | Browse and edit data at http://localhost:5555                                                       |
| `./run.sh db new <name>` | Generate a new migration skeleton                                                                   |
| `./run.sh db psql`       | A `psql` session on `DIRECT_URL` (uses the Compose Postgres container when `psql` is not installed) |

## 6. Production

- Run `./run.sh db migrate`, then `./run.sh db bootstrap` once with `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`. Leave `COMPANY_PROFILE` empty and finish the setup wizard in the admin, or set it to a reviewed profile.
- `db seed` and `db reset` refuse to run in production.
- Create the storage buckets `public-assets` (public: logos, icons, fonts, website media) and `private-assets` (private: everything else), with a 10 MiB limit. Allowed types: PDF, PNG, JPEG, WebP, plus WOFF2 for `public-assets`.
- Back up the database and both buckets together; uploaded file URLs are stored in the database.

### Backups and restores

```bash
./run.sh db backup
```

writes a `pg_dump` custom-format file to `backups/<database>-<time>.dump` (ignored by git), or to the path given. `./run.sh db restore <file>` restores one into the configured database after a confirmation; it refuses a remote database unless `--force` is added. Both use the installed `pg_dump`/`pg_restore`, the local Compose Postgres container, or a throwaway `postgres:17-alpine` container, in that order.

## 7. Test databases

Automated tests never use your development database. They create their own databases whose names end in `_test`, on the same server:

| Command                                                              | Database                                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `./run.sh test e2e`                                                  | Runs Playwright against isolated `_test` databases                               |
| `node apps/admin/tests/e2e/helpers/prepare-db.cjs <seeded\|blank\|bare> <name_test>` | Any disposable database                                          |
| `./run.sh db test-list` / `./run.sh db test-drop <name_test\|--all>` | List or drop disposable databases (only names ending in `_test`)                 |

See [TESTING.md](TESTING.md).

## Troubleshooting

| Symptom                                         | Fix                                                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `P1001: Can't reach database server`            | Start the stack (`./run.sh services up`) and check the port in `DATABASE_URL`                               |
| Pages fail after pulling new work               | Apply the new migrations: `./run.sh db migrate` (`./run.sh doctor` shows how many are pending)              |
| `Demo seed requires an empty business database` | Use `./run.sh db reset` instead of `./run.sh db seed`                                                       |
| `Too many database connections`                 | Stop extra dev or test servers, or add `?connection_limit=5` to `DATABASE_URL`                              |
| Logos or images missing after a reset           | Files and database must be reset together. Use `db reset`, which does both, rather than resetting only one. |
| The admin opens `/setup`                        | The company has not finished setup. Complete the wizard, or reset with a profile.                           |
