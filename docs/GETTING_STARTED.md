# Getting started

This guide takes you from a fresh clone to a running system in one of three ways:

| You want… | Use |
|---|---|
| A fully populated example to explore or develop against | **A. Demo company** |
| The system branded and configured for a real company you already have files for | **B. Load a company profile** |
| To see exactly what a new customer sees, or set up a company through the interface | **C. Blank install with the setup wizard** |

All three use the same code. They differ only in what goes into the database and file storage.

## 1. One-time setup

Prerequisites: Node 22 or newer, pnpm 12, and Docker.

```bash
pnpm install
```

```bash
cp .env.example .env
```

```bash
pnpm dlx supabase start -x studio,postgres-meta,logflare,vector,supavisor,edge-runtime,realtime,imgproxy,mailpit
```

Run `pnpm dlx supabase status` and fill in `.env`:

| Variable | Value |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` |
| `SUPABASE_SERVICE_ROLE_KEY` | The `service_role` key from `supabase status` |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | Your administrator login (password of 12 or more characters) |
| `JWT_SECRET`, `REVALIDATION_SECRET`, `MFA_ENCRYPTION_KEY`, `ENCRYPTION_KEY` | Random secrets (see [OPERATIONS.md](OPERATIONS.md#environment-variables)) |
| `COMPANY_PROFILE` | Which company to load: `demo`, or a folder name under `company/profiles/` |

## A. Demo company

```bash
pnpm db:reset
```

```bash
pnpm dev
```

This loads **Northwind Studio**, a fictional company with its own logo, colours and fonts, plus about two minutes' worth of generated business data: clients, deals, quotations, invoices, payments, employees, payroll, assets, approvals and website content.

- Admin: http://localhost:3001. Sign in with `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`.
- Website: http://localhost:3000 (English at `/en`, Arabic at `/ar`).
- Other demo accounts are listed in `company/seed/demo-staff.json` (for example `finance@example.com`, `sales@example.com`). They all use `SUPER_ADMIN_PASSWORD`.
- `pnpm db:reset:light` gives the same company with less data and takes about 20 seconds.

## B. Load a company profile

A **company profile** is a folder that holds one company's identity, theme and brand files:

```
company/profiles/acme/
  company.json   names, registration and VAT numbers, address, contacts, bank, currency, document prefixes
  theme.json     primary and accent colours, fonts, corner style, default light or dark mode
  assets/        brand/ (text logos, icons, stamp, signature), fonts/ (woff2), media/ (website images)
  raw/           original design files (.ai, .zip…), never committed
```

The format of each file is described in [company/README.md](../company/README.md).

### Create a profile

1. Copy the demo as a starting point:
   ```bash
   cp -R company/profiles/demo company/profiles/acme
   ```
2. Edit `company/profiles/acme/company.json`, setting the `display` names, the `company` fields and the `assets` file names.
3. Edit `theme.json`. Colours are `#RRGGBB`. Fonts are a Google family from the curated list, `"system"`, or uploaded WOFF2 files in `assets/fonts/`.
4. Replace the artwork in `assets/brand/` with PNG, JPEG or WebP files (not SVG):
   - `logo` and `darkLogo`: the **text logo only**, for light and dark backgrounds. The apps place the icon next to it.
   - `icon` and `darkIcon`: the square mark on its own.
   - `stamp` and `signature`: printed on approved documents.
5. Check the profile:
   ```bash
   pnpm test:unit
   ```

### Use it for development (demo data with your brand)

```bash
pnpm db:reset --profile acme
```

Or set `COMPANY_PROFILE=acme` in `.env` and run `pnpm db:reset`.

### Use it for a real installation (no demo data)

On an empty database:

```bash
pnpm db:migrate
```

```bash
COMPANY_PROFILE=acme pnpm db:bootstrap
```

`db:bootstrap` creates the roles, permissions, default modules and your super admin. It installs the profile's identity, uploads its brand files to storage, saves its theme and marks the company as set up. It never deletes or overwrites existing records, and it is safe to run again.

### Re-apply a profile to an existing installation

After changing a profile's files, or when upgrading an installation from before profiles existed:

```bash
COMPANY_PROFILE=acme COMPANY_PROFILE_OVERWRITE=1 pnpm db:bootstrap
```

This updates the company's identity, brand files and theme. It also moves any stored `/brand/...` paths left over from older versions to uploaded files, and lists anything it could not find in the profile.

## C. Blank install with the setup wizard

```bash
pnpm db:reset:empty
```

```bash
pnpm dev
```

Sign in at http://localhost:3001 and the admin opens **/setup**. It walks through five steps:

1. **Company**: names in English and Arabic, CR and VAT numbers, address and contacts.
2. **Colours & fonts**: a starting palette or your own colours, Arabic and Latin fonts from the library or your own WOFF2 files, corner style and default appearance. A live preview shows light and dark mode and warns when text would be hard to read.
3. **Logos & files**: text logos and icons for light and dark backgrounds, the stamp and the signature. At least one logo is required.
4. **Configuration**: main currency (decimals are set automatically), VAT, invoice and receipt prefixes and starting numbers, payment terms, and which modules to switch on.
5. **Review**: check everything, then finish to open the dashboard.

Until setup is finished, every dashboard page redirects to `/setup`. People without settings permission see a "being set up" page. All of these choices can be changed later in **Settings → Company**; colours and fonts are under **Colours & fonts**.

For a production installation, run `pnpm db:migrate` and then `pnpm db:bootstrap` without `COMPANY_PROFILE`, and complete the wizard in the browser.

## 2. Day-to-day commands

| Task | Command |
|---|---|
| Start both apps / only one | `pnpm dev` · `pnpm dev:admin` · `pnpm dev:web` |
| Start over with fresh data | `pnpm db:reset` (or `:light`, `:empty`, `--profile <name>`) |
| Apply new migrations after pulling | `pnpm db:migrate` |
| Browse the data | `pnpm db:studio` |
| Check data against the business rules | `pnpm db:check-integrity` |
| Run the quick tests | `pnpm test` |
| Run everything CI runs | `pnpm lint && pnpm type-check && pnpm test && pnpm test:e2e` |

More detail: [DATABASE.md](DATABASE.md) (database and seeds), [TESTING.md](TESTING.md) (tests), [OPERATIONS.md](OPERATIONS.md) (environment, services, deployment).

## Rules that keep the system company-neutral

- Company names, colours, fonts, logos, addresses and registration numbers go in `company/profiles/<name>/` or in the database, never in `apps/` or `packages/`. `pnpm test:brand` fails otherwise, and it runs in CI.
- Interface text goes in the locale files (`packages/locales/src`), never inline (see [LOCALIZATION.md](LOCALIZATION.md)).
- Demo people and companies are fictional and use `example.com` or `.example` addresses.
