# Getting started

This guide takes you from a fresh clone to a running system in one of three ways:

| You want…                                                                          | Use                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------ |
| A fully populated example to explore or develop against                            | **A. Demo company**                        |
| The system branded and configured for a real company you already have files for    | **B. Load a company profile**              |
| To see exactly what a new customer sees, or set up a company through the interface | **C. Blank install with the setup wizard** |

All three use the same code. They differ only in what goes into the database and file storage.

## 1. One-time setup

Prerequisites: Node 22 or newer, Go 1.24+, Docker, and npm.

The quickest way is one command, which installs dependencies, creates `.env` with generated secrets, starts the local Compose stack and builds the demo database (add `--light` for less data or `--empty` for the setup wizard):

```bash
./run.sh setup
```

Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in `.env` first if you want the database built in the same run; otherwise set them afterwards and run `./run.sh db reset`. `./run.sh doctor` checks tools, `.env`, the database and ports at any time, and `./run.sh help` lists every command.

Step by step instead:

```bash
./run.sh install
```

```bash
./run.sh env init
```

```bash
./run.sh services up
```

`env init` generates local database credentials, S3 credentials and app signing keys. Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` (12 or more characters), and choose `COMPANY_PROFILE` (`demo` by default). `DATABASE_URL` and `DIRECT_URL` must point to the Compose Postgres; `API_URL` points to the gateway (default `http://127.0.0.1:8080`). For an existing installation, follow [the migration runbook](backend/DATA-MIGRATION.md).

## A. Demo company

```bash
./run.sh db reset
```

```bash
./run.sh dev
```

This loads **Northwind Studio**, a fictional company with its own logo, colours and fonts, plus about two minutes' worth of generated business data: clients, deals, quotations, invoices, payments, employees, payroll, assets, approvals and website content.

- Admin: http://localhost:3001. Sign in with `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`.
- Website: http://localhost:3000 (English at `/en`, Arabic at `/ar`).
- Other demo accounts are listed in `seeds/demo-staff.json` (for example `finance@example.com`, `sales@example.com`). They all use `SUPER_ADMIN_PASSWORD`.
- `./run.sh db seed` seeds iShoot Cinema demo data; `./run.sh db seed demo` seeds Northwind Studio.

## B. Load a company profile and assets

Company profiles and assets are organized in pure SQL seeds and asset directories under `seeds/`:

```
seeds/
  sql/
    seed_ishoot.sql     Full pure SQL seed for iShoot Cinema
    seed_northwind.sql  Full pure SQL seed for Northwind Studio
    seed_bootstrap.sql  Clean bootstrap seed for wizard setup
    presets/            Preset overrides (commerce, services, all, etc.)
  assets/
    ishoot/             Brand artwork, logos, icons, fonts, media, and raw design assets
    demo/               Neutral Northwind brand artwork and assets
```

The seed workflow is documented in [DATABASE.md](DATABASE.md).

### Applying seeds and presets

1. Seed the default company (iShoot Cinema):
   ```bash
   ./run.sh db seed
   ```
2. Seed the neutral demo company (Northwind Studio):
   ```bash
   ./run.sh db seed demo
   ```
3. Apply an activity preset (e.g. commerce, services, food, agency):
   ```bash
   ./run.sh db preset commerce
   ```
4. Reset and verify:
   ```bash
   node scripts/verify-seed-dates.js
   ```
   ./run.sh test unit
   ```

### Use it for development (demo data with your brand)

```bash
./run.sh db reset --profile acme
```

Or set `COMPANY_PROFILE=acme` in `.env` and run `./run.sh db reset`.

### Use it for a real installation (no demo data)

On an empty database:

```bash
./run.sh db migrate
```

```bash
COMPANY_PROFILE=acme ./run.sh db bootstrap
```

`db:bootstrap` creates the roles, permissions, default modules and your super admin. It installs the profile's identity, uploads its brand files to storage, saves its theme and marks the company as set up. It never deletes or overwrites existing records, and it is safe to run again.

### Re-apply a profile to an existing installation

After changing a profile's files, or when upgrading an installation from before profiles existed:

```bash
COMPANY_PROFILE=acme COMPANY_PROFILE_OVERWRITE=1 ./run.sh db bootstrap
```

This updates the company's identity, brand files and theme. It also moves any stored `/brand/...` paths left over from older versions to uploaded files, and lists anything it could not find in the profile.

## C. Blank install with the setup wizard

```bash
./run.sh db reset --empty
```

```bash
./run.sh dev
```

Sign in at http://localhost:3001 and the admin opens **/setup**. It walks through six steps:

1. **Company**: content languages, what the company does (23 activities, each with an example website), names in English and Arabic, CR and VAT numbers, address and contacts.
2. **Colours & fonts**: one of 22 styles or your own colours, Arabic and Latin fonts from the library or your own files, corner style and default appearance, with a live preview of the real website and a contrast warning.
3. **Logos & files**: text logos and icons for light and dark backgrounds, the stamp and the signature. At least one logo is required.
4. **Website**: website type, pages and homepage sections, sample content to start from, contact form, domains, with the live preview beside it.
5. **Configuration**: main currency (decimals are set automatically), VAT, invoice and receipt prefixes and starting numbers, payment terms, modules (products, purchasing, online store, delivery, tasks, marketing, PR, legal…) and departments.
6. **Review**: check everything, then finish to open the dashboard.

Until setup is finished, every dashboard page redirects to `/setup`. People without settings permission see a "being set up" page. All of these choices can be changed later in **Settings → Company**; colours and fonts are under **Colours & fonts**.

For a production installation, run `./run.sh db migrate` and then `./run.sh db bootstrap` without `COMPANY_PROFILE`, and complete the wizard in the browser.

## 2. Day-to-day commands

| Task                                                                | Command                                                           |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Start all apps / specific app                                       | `./run.sh dev` · `./run.sh dev admin` · `./run.sh dev it` · `./run.sh dev web` |
| Start over with fresh data                                          | `./run.sh db reset` (or `--light`, `--empty`, `--profile <name>`) |
| After pulling new work                                              | `./run.sh upgrade` (install, new `.env` variables, migrations)    |
| Apply new migrations                                                | `./run.sh db migrate`                                             |
| Browse the data                                                     | `./run.sh db studio`                                              |
| Check data against the business rules                               | `./run.sh db integrity`                                           |
| Run the scheduled job once (reminders, payments, tracking, reports) | `./run.sh cron`                                                   |
| Run the quick tests                                                 | `./run.sh test`                                                   |
| Run every static check CI runs                                      | `./run.sh check`                                                  |
| Run everything CI runs                                              | `./run.sh test ci`                                                |

Each frontend application is an independent npm project (`apps/admin`, `apps/it`, `apps/web`) with its own npm scripts.

More detail: [DATABASE.md](DATABASE.md) (database and seeds), [TESTING.md](TESTING.md) (tests), [OPERATIONS.md](OPERATIONS.md) (environment, services, deployment).

## Rules that keep the system company-neutral

- Company names, colours, fonts, logos, addresses and registration numbers go in `seeds/assets/<name>/` or in the database, never in `apps/` or `packages/`.
- Interface text goes in the owning app's locale files under `apps/{admin,web,it}/locales`, never inline (see [LOCALIZATION.md](LOCALIZATION.md)).
- Demo people and companies are fictional and use `example.com` or `.example` addresses.
