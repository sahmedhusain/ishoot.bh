---
name: ishoot-ecosystem
description: >
  Skill for building and maintaining the ishoot dual-frontend web ecosystem.
  Load this before any implementation work on the ishoot.bh Turborepo monorepo.
  Covers brand identity, design system, architecture, localization, database schema,
  financials (invoices, payments, expenses, P&L), email notification flows, and quality standards.
---

# ishoot Dual-Frontend Web Ecosystem — Agent Skill

> **MANDATORY**: Read this file completely before writing ANY code for the ishoot project.

---

## Quick Reference

| Property        | Value                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| **Project**     | ishoot — Cinema Production House & Creative Media Studio (Bahrain)                                     |
| **Repo Root**   | `/Users/sayed/Desktop/GitHub/ishoot.bh`                                                                |
| **Monorepo**    | Turborepo with pnpm workspaces                                                                         |
| **Apps**        | `apps/web` (public site) + `apps/admin` (admin CMS, CRM & Finance portal)                              |
| **Framework**   | Next.js 15 (App Router)                                                                                |
| **Styling**     | Tailwind CSS v4                                                                                        |
| **Database**    | Supabase (PostgreSQL + Auth + Storage + RLS)                                                           |
| **Deployments** | Vercel: `ishoot.bh` + `admin.ishoot.bh`                                                                |
| **Languages**   | English + Arabic (full dynamic RTL/LTR support)                                                        |
| **Currency**    | BHD (Bahraini Dinar — strictly 3 decimal places, e.g., `1,500.000 BHD`)                                |
| **VAT Status**  | **Default: OFF (`vat_enabled = false`)** — Fully architected for 10% VAT toggle via `company_settings` |

---

## 1. Brand Identity — NEVER DEVIATE

### Colors (from official Brand Guideline)

```
PRIMARY:   #014842  (Deep Emerald / Forest Pine)  — RGB(1, 72, 66)
ACCENT:    #09937F  (Radiant Jade / Persian Teal) — RGB(9, 147, 127)
```

### Extended Dark Palette

```
bg-base:       #050807    (deepest cinematic background)
bg-surface:    #0B1210    (card and modal surfaces)
bg-elevated:   #111C19    (dropdowns, popovers, active rows)
text-primary:  #F2F6F5    (soft silver-white)
text-secondary:#9EADA9    (muted caption grey)
text-accent:   #09937F    (interactive/links)
```

### Fonts

- **English Display**: `Virtual` (custom .otf located in `ishoot/ishoot brand english and arabic fonts/virtual engilsh font.otf`)
- **English Body/UI**: `Inter`
- **Arabic (all)**: `IBM Plex Sans Arabic` (7 weights: Thin through Bold in `ibm-plex-sans-arabic/`)
- **Backup English**: `Nexa Bold` / `Nexa Light`

### Logo

- SVG source: `ishoot/ishoot logo svg file.svg` (full wordmark)
- Icon SVG: `ishoot/ishoot icon svg file.svg` (aperture mark only)
- Colors in SVG: `.st0=#014842`, `.st1=#09937F`, `.st2=#FFFFFF`
- The "oo" in "ishoot" features concentric lens-circle aperture motifs

---

## 2. ABSOLUTE RULES — ZERO EXCEPTIONS

### Rule 1: Zero Hardcoded Strings

```
❌ NEVER: <h1>Welcome to ishoot</h1>
✅ ALWAYS: <h1>{t('hero.headline')}</h1>
```

Every string, button label, placeholder, aria-label, alt text, meta description, and email template
MUST come from `packages/locales/en.json` or `ar.json` via the type-safe `useTranslation()` hook.

### Rule 2: RTL/LTR Dynamic

```
locale === 'ar' → <html dir="rtl" class="font-arabic">
locale === 'en' → <html dir="ltr" class="font-english">
```

Use Tailwind's `rtl:` and `ltr:` variants. Never use static `text-left` / `text-right` without considering direction. Use `text-start` / `text-end` instead.

### Rule 3: Dark Mode Is Default

The entire site uses dark obsidian surfaces. There is no light mode toggle.
Background is `#050807`, not white. Text is `#F2F6F5`, not black.

### Rule 4: BHD Currency Format

```
❌ NEVER: $1,500.00  or  1500 BHD  or  1,500.00 BHD
✅ ALWAYS: 1,500.000 BHD  (three decimal places)
```

### Rule 5: VAT Configuration & Non-VAT Default

```
Currently: ishoot has NO VAT registration.
DEFAULT SETTING: company_settings.vat_enabled = false; vat_percentage = 10.00;
- When vat_enabled is false:
    - Invoices display "VAT: Not Applicable" ("ض.ق.م: غير مطبقة")
    - vat_amount = 0.000 BHD
    - total_amount = subtotal - discount_amount
- When vat_enabled is true (activated via Company Settings):
    - All newly generated invoices calculate: vat_amount = (subtotal - discount_amount) * (vat_percentage / 100)
    - total_amount = (subtotal - discount_amount) + vat_amount
    - CR and VAT ID are rendered prominently on the invoice header
```

### Rule 6: Supabase RLS Is Mandatory

Never expose the service role key to browser code. Public site uses the anon key.
Admin uses anon key + authenticated session. All tables have RLS enabled.

---

## 3. Architecture Summary

### Monorepo Structure

```
apps/web/           → Public site (ishoot.bh)
apps/admin/         → Admin portal (admin.ishoot.bh) — CMS, CRM & Finance
packages/database/  → Supabase client + typed queries + migrations
packages/ui/        → Shared atomic components
packages/locales/   → Translation JSON files (en.json, ar.json)
packages/email/     → Transactional email templates (Resend + React Email)
packages/config/    → Tailwind v4 + TS + ESLint configs
```

### Key Dependencies

- `next@^15` — Framework (App Router)
- `@supabase/supabase-js@^2` & `@supabase/ssr@^0.5` — Database & Auth
- `framer-motion@^11` & `lenis@^1` — Motion & smooth scroll
- `@react-pdf/renderer@^4` — Invoice & Payment Receipt PDF generation
- `resend@^4` & `@react-email/components` — Transactional email delivery
- `@dnd-kit/core@^6` & `@dnd-kit/sortable@^8` — Kanban board & list reordering
- `recharts@^2` — Financial dashboard analytics & trends
- `lucide-react` — Iconography

### Database Schema Core

1. `profiles` — User accounts with roles (`super_admin`, `producer`, `editor`)
2. `company_settings` — Single-row company profile, VAT toggle, bank details, numbering sequences
3. `hero_banners` — Homepage video/image hero slides
4. `portfolio_categories` & `portfolio_items` — Works portfolio with aspect ratios & credits
5. `client_logos` — Monochrome client marquee logos
6. `studio_equipment` — Categorized production gear inventory
7. `inquiries` — Public inquiries with email delivery tracking
8. `crm_contacts` & `crm_deals` — Twenty CRM-inspired pipeline & client directory
9. `invoices` & `invoice_line_items` — Invoices with discounts, VAT toggle, amount paid/due
10. `payments` — Payment ledger against invoices with receipt numbers & PDF storage
11. `expense_categories` & `expenses` — Operating & production expenses linked to deals/projects

### Storage Buckets

- `hero-media` (public) — Hero videos & posters
- `portfolio-media` (public) — Portfolio thumbnails, preview loops & 4K media
- `client-logos` (public) — Client SVGs/PNGs
- `about-assets` (public) — Studio & CEO imagery
- `invoices-pdf` (private) — Generated invoice PDFs (signed URLs)
- `receipts-pdf` (private) — Generated payment receipt PDFs (signed URLs)
- `expense-receipts` (private) — Uploaded vendor receipts & bills

---

## 4. Email Notification Workflows

The ecosystem implements an automated email system powered by `packages/email` via Resend:

### 1. Contact Inquiries (Dual-Dispatch)

- **To Client**: Branded confirmation in their selected locale (`en`/`ar`): "Thank you for contacting ishoot. We've received your request for [services] and our team will get back to you within 24 hours."
- **To ishoot Team**: Notification email with client details, budget range, services requested, and deep-link to `/dashboard/crm/leads`.

### 2. Invoice Delivery

- **Action Toolbar**:
  - `📧 Send via Email`: Generates PDF → uploads to storage → sends branded email with attached PDF to client contact.
  - `📱 Send via WhatsApp`: Generates signed PDF URL (24h) → opens `wa.me/{phone}?text=...` with pre-composed bilingual message & secure link.
  - `🖨️ Print`: Print-optimized layout with print CSS.
  - `📥 Download`: Direct client-ready PDF download.

### 3. Payment Receipts

- When a payment is recorded against an invoice:
  - System generates unique sequential receipt number: `RCT-YYYY-NNN`.
  - System updates invoice: `amount_paid`, `amount_due`, and updates status (`partially_paid` or `paid`).
  - Generates branded Payment Receipt PDF (with `#10B981` emerald accent and "PAID IN FULL" or "PARTIAL PAYMENT" watermark).
  - Offers immediate dispatch via **Email**, **WhatsApp**, **Print**, or **Download**.

---

## 5. Financial Dashboard & Analytics

The Admin Portal includes a complete financial intelligence suite (`/dashboard/finance`):

- **Core Metrics (KPIs)**:
  - Total Revenue (actual paid cash received)
  - Operating & Production Expenses
  - Net Profit (`Revenue - Expenses`)
  - Profit Margin (`(Profit / Revenue) * 100`)
- **Revenue vs. Expenses Timeline**: Monthly/quarterly trend chart.
- **Aging & Outstanding Invoices**: Visual breakdown of overdue, due <30 days, due >30 days.
- **Expense Categorization**: Donut chart of costs (Equipment rental, crew/labor, travel, software, studio rent, marketing, etc.).
- **P&L Statement**: Full structured financial breakdown including Discounts Given, VAT Collected, and Project-level margins.

---

## 6. Page Map

### Public Site (`apps/web`)

| Route               | Content                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| `/[locale]`         | Home: Hero video banners + showreel scale reveal + services bento + client logos     |
| `/[locale]/works`   | Portfolio: Category filter tabs + dynamic aspect ratio grid + cinema lightbox        |
| `/[locale]/about`   | About: CEO hero + studio narrative + equipment technical specs + counters            |
| `/[locale]/contact` | Contact: Service picker + budget selector + inquiry submission + dual-email dispatch |

### Admin Portal (`apps/admin`)

| Route                         | Content                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `/login`                      | Supabase Auth login                                                             |
| `/dashboard`                  | Executive overview: stats, active deals, recent inquiries, cashflow quick-stats |
| `/dashboard/cms/banners`      | Hero banner manager with drag-and-drop reordering                               |
| `/dashboard/cms/portfolio`    | Portfolio items CRUD & credits metadata editor                                  |
| `/dashboard/cms/clients`      | Client logo manager                                                             |
| `/dashboard/cms/equipment`    | Studio equipment technical specs inventory                                      |
| `/dashboard/crm/leads`        | Incoming inquiries with conversion to deal/contact                              |
| `/dashboard/crm/deals`        | Twenty CRM-style Kanban pipeline (9 stages) with BHD column sums                |
| `/dashboard/crm/contacts`     | Searchable contact directory with linked deal dossiers                          |
| `/dashboard/invoices`         | Invoice studio: create, discounts, VAT toggle, multi-channel dispatch           |
| `/dashboard/payments`         | Payment ledger: record payments, auto-reconciliation, receipt generation        |
| `/dashboard/expenses`         | Expense manager: categorised costs linked to projects/deals                     |
| `/dashboard/finance`          | Financial dashboard: P&L, revenue trends, expense charts, margins               |
| `/dashboard/settings/company` | Company settings: VAT toggle, CR number, bank IBAN, numbering prefixes          |

---

## 7. Quality Checklist (Verify Before Completion)

- [ ] `pnpm build` succeeds with zero TypeScript errors across all workspaces
- [ ] Every rendered string uses `useTranslation()` — zero hardcoded English or Arabic strings in JSX
- [ ] Language switch dynamically switches `dir="rtl"` / `dir="ltr"` and fonts (`font-arabic` / `font-english`)
- [ ] Non-VAT mode is active by default; invoices show "VAT: Not Applicable"
- [ ] Toggling VAT in Company Settings seamlessly updates VAT calculation for new invoices without breaking past records
- [ ] Contact form submission successfully triggers both client confirmation email and internal notification email
- [ ] Invoice creation supports Discounts (Percentage / Fixed) and computes correct subtotal and amount due
- [ ] Recording full or partial payments automatically updates invoice balance and status (`partially_paid` vs `paid`)
- [ ] Payment receipt PDF is generated and dispatchable via Email, WhatsApp, and Print
- [ ] Financial dashboard accurately aggregates revenue, expenses, profit, and discounts
- [ ] Currency values are formatted strictly with 3 decimal places (`1,500.000 BHD`)
- [ ] Storage buckets have appropriate permissions (public for media, signed URLs for financial documents)
- [ ] Lenis smooth scroll and Framer Motion animations operate at 60fps without layout shifts

---

## 8. Reference Documents

All master documentation is maintained in the project repository at `docs/`:

| Document                | Path                          | Purpose                                                                    |
| ----------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| **Design System**       | `docs/design.md`              | Brand colors, typography, motion, glassmorphism, UI components             |
| **Architecture**        | `docs/structure.md`           | Monorepo layout, Supabase schema, email flows, financial data architecture |
| **File Tree**           | `docs/tree.md`                | Complete file and directory map (~198 files across 71 directories)         |
| **Admin Rules**         | `docs/admin-rules.md`         | RBAC matrix, CMS rules, Kanban pipeline, invoice/payment/expense rules     |
| **Implementation Plan** | `docs/implementation_plan.md` | 7-phase step-by-step build roadmap                                         |
| **Agent Skill**         | `docs/SKILL.md`               | This context-preservation skill                                            |

---

## 9. Brand Assets Location

```
/Users/sayed/Desktop/GitHub/ishoot.bh/ishoot/
├── ishoot logo svg file.svg        ← Full logo SVG
├── ishoot icon svg file.svg        ← Icon-only SVG
├── ishoot logo files (1)/          ← AI, EPS, JPG, PDF, PNG
├── ishoot brand guideline fies/    ← Brand guideline pages (JPG + PDF)
├── ishoot brand english and arabic fonts/
│   ├── virtual engilsh font.otf    ← English display font
│   ├── NexaBold.otf / NexaLight.otf
│   └── ibm-plex-sans-arabic/      ← 7 weight TTF files
├── 2 invoice files/                ← Invoice template AI/PDF
├── web banners and youtube covers/ ← Marketing banner PNGs
├── des_6.png                       ← 3D logo render
└── des_6ffh.png                    ← 3D logo badge render
```
