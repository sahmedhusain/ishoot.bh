# Architecture

## Topology

A pnpm and Turborepo monorepo with two Next.js App Router applications sharing one Prisma data layer:

- **`apps/web`**: the public website (Arabic and English). React Server Components read published website content, company settings and the theme directly from the database.
- **`apps/admin`**: the business system (CRM, sales, finance, HR and payroll, assets, approvals, documents, website content). Server Actions perform every change after a permission check, input validation and a database transaction.
- **`packages/database`**: Prisma schema and migrations, queries, domain services (approval engine, payroll engine, numbering, signing, storage) and the theme engine (`constants/theme.ts`).
- **`packages/config`**: the Tailwind preset. Every brand colour, tone and font is a CSS variable.
- **`packages/locales`, `packages/ui`, `packages/email`**: copy, shared components and email delivery.
- **`company/`**: company profiles, demo seed data and the installer. It is outside the apps, so no app carries a company's files.

## Company identity and theming

```
company/profiles/<name>  ──db:bootstrap / db:seed──▶  CompanySetting (identity, theme JSON, file URLs)
setup wizard / Settings ─────────────────────────────▶          │        + files in storage (public-assets)
                                                                ▼
              each root layout: themeStylesheet(theme) → <style> CSS variables + Google/uploaded fonts
                                                                ▼
                       Tailwind classes (bg-primary, text-accent, bg-tone-90, font-sans…) in both apps
              PDFs: colours and font from the theme · emails: colours inlined · <meta theme-color>
```

- `normalizeTheme` turns any stored value into a complete, safe theme: hex colours only, plain font names, and approved font files only.
- `themeVariables` derives everything else from two colours: hover and pressed shades, tinted surfaces for light and dark, a tonal palette (`--brand-tone-5` … `--brand-tone-95`) and readable text colours.
- The admin's default light or dark mode comes from the theme; each person can override it.
- `CompanySetting.setupCompletedAt` gates the dashboard: until it is set, every dashboard page redirects to `/setup`.

## Infrastructure

- **Hosting:** any Node host or Vercel. With serverless hosting, connect through the database pooler and schedule `/api/cron` for maintenance.
- **Database:** PostgreSQL (Supabase locally and in the cloud). Migrations are the only way the schema changes.
- **Storage:** Supabase Storage, or the local disk in development. Browsers upload directly with short-lived signed URLs; the server verifies type, size, permission and the stored bytes. The `public-assets` bucket holds brand files and website media; `private-assets` holds everything else.
- **Email:** Resend, through a durable outbox, with signature-verified delivery webhooks.

## Security boundaries

- JWT session cookie backed by a revocable stored session, bcrypt passwords and optional TOTP MFA (see [SECURITY.md](SECURITY.md)).
- `requirePermission(resource, action)` runs before every privileged read or write.
- Integration secrets are encrypted at rest with AES-256-GCM.

## Background work

The system needs no always-on daemon to stay correct. Work that must survive failures is written to Postgres first (email outbox, website revalidation outbox) and processed by workers or the cron route, with retries. Provider webhooks update delivery state asynchronously.

## Data model

`packages/database/prisma/schema.prisma` is the source of truth (116 models). The main groups:

| Area | Models |
|---|---|
| Company | `CompanySetting` (identity, numbering, VAT, theme, setup state), `CompanyAsset`, `FeatureToggle`, `CompanyDocument` |
| Access | `User`, `Role`, `Permission`, `Session`, `MfaRecoveryCode`, `ActivityLog` |
| Sales | `CrmContact`, `CrmDeal`, `Inquiry`, `Quotation`, `Invoice`, `Payment`, `Expense`, approval requests and decisions |
| People | `Employee`, employment and compensation history, leave, attendance, payroll runs and items, social insurance, support programmes, settlements, handovers |
| Operations | assets, handovers, calendar events, minutes of meetings, announcements, official letters |
| Website | banners, portfolio, services, equipment, client logos, reviews, FAQs, statistics, published website snapshots |
| Files | `UploadObject` (every stored file: owner, type, size, public or private, claimed), `Attachment` |

Rules the code relies on are listed in `packages/database/prisma/check-integrity.ts`, and `pnpm db:check-integrity` verifies them on any database.

## Testing and CI

Unit tests, check suites on bare and seeded disposable databases, and Playwright end-to-end tests run on every pull request (see [TESTING.md](TESTING.md)).
