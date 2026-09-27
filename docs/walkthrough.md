# ishoot Dual-Frontend Web Ecosystem — Implementation Walkthrough

> **Turnkey Execution Complete**  
> Complete, production-grade codebase for **ishoot** media production web ecosystem built with Next.js 15, Turborepo, Tailwind CSS, TypeScript, and bilingual EN/AR architecture.

---

## 1. Executive Summary of What Was Delivered

The entire requested dual-frontend ecosystem has been implemented from scratch at `/Users/sayed/Desktop/GitHub/ishoot.bh`:

| Scope                            | Workspace          | Port   | Purpose / Stack                                                                                       |
| :------------------------------- | :----------------- | :----- | :---------------------------------------------------------------------------------------------------- |
| **Monorepo Architecture**        | Root + Turborepo   | —      | pnpm workspaces, Turbo pipeline, shared configs                                                       |
| **Design System & Theme**        | `@ishoot/config`   | —      | Official brand palette (`#014842`, `#09937F`), `Virtual.otf`, IBM Plex Sans Arabic                    |
| **Bilingual Localization**       | `@ishoot/locales`  | —      | Dynamic EN/AR dictionary with dot notation and parameter interpolation                                |
| **Database & Schema**            | `@ishoot/database` | —      | Complete PostgreSQL schema (15 tables, RLS, storage buckets, triggers), typed queries, rich mock data |
| **Email Infrastructure**         | `@ishoot/email`    | —      | Dual-dispatch engine (client + internal), HTML brand templates, local console fallback                |
| **Shared UI Library**            | `@ishoot/ui`       | —      | Accessible glassmorphic primitives (Button, Badge, Card, Modal, CurrencyDisplay, etc.)                |
| **Public Showcase Frontend**     | `apps/web`         | `3000` | High-end cinematic showcase (`ishoot.bh`) inspired by Noqta.tv & Apple                                |
| **Twenty-Inspired Admin Portal** | `apps/admin`       | `3001` | Executive operations suite (`admin.ishoot.bh`) with CRM, CMS, Invoice Studio, Receipts, P&L           |

---

## 2. Key Architecture & Business Rules Enforced

### A. Non-VAT Mode Default & Future-Proof VAT

- **Current State**: Company has **no VAT registration**.
- **Implementation**:
  - In `company_settings`, `vat_enabled = false` (VAT rate 0%).
  - Invoices and Financial reports display:
    - **English**: `VAT: Not Applicable (Non-VAT Registered Entity)`
    - **Arabic**: `ضريبة القيمة المضافة: غير مطبقة (منشأة غير مسجلة)`
  - Subtotal equals the Grand Total without adding tax.
  - **Future-Proof**: When toggled on in **Company Settings (`/dashboard/settings/company`)**, VAT rate defaults to 10% (Bahrain standard), calculating `vat_amount = subtotal * 0.10` with bilingual tax invoices and CR/VAT number display.

### B. Multi-Currency Support (GCC & USD)

- **BHD (Bahraini Dinar)**: Strictly formatted to **3 decimal places** (e.g., `BD 1,250.000` / `1,250.000 د.ب`).
- **SAR, AED, KWD, OMR, QAR, USD**: Formatted to standard precision (2 or 3 decimals according to regional currency standards).
- Currency can be selected per invoice in Invoice Studio (`/dashboard/invoices/new`).

### C. Multi-Channel Dispatch (Invoice & Payment Receipt)

Every invoice and receipt can be dispatched via 4 channels:

1. **Email**: Sends high-end HTML email with itemized breakdown and branded action links directly to the client's email address. In local mode, logs full payload to the console safely without throwing errors.
2. **WhatsApp**: Generates direct `https://wa.me/{phone}?text={encoded_message}` links with pre-formatted bilingual messages containing invoice/receipt numbers, amounts, due dates, and secure review links.
3. **Print A4**: Clean browser print stylesheet (`@media print`) engineered specifically to preserve the official AI-generated letterhead without clipping across multiple pages.
4. **Download**: Client-side trigger to generate offline PDF view or save snapshot.

### D. Dual-Email Inquiries

Submitting a project inquiry on the public contact form (`/contact`) triggers two emails:

1. **Client Acknowledgment**: Sent to the prospect thanking them for reaching out, confirming receipt, and outlining the next steps.
2. **Team Notification**: Sent to `hello@ishoot.bh` containing the complete inquiry details (services requested, budget range, timeline, company name, phone, message).

---

## 3. Public Cinematic Frontend (`apps/web`)

### Visual Benchmarks & Aesthetics

- **Dark Obsidian Aesthetic**: Background `bg-obsidian` (`#030708`) accented with Deep Emerald (`#014842`) and Radiant Jade (`#09937F`).
- **Typography**: Dual-font typography with `Virtual.otf` for English headings, `IBM Plex Sans Arabic` for Arabic typography, and `Geist Sans` for UI copy.
- **Bi-directional Navigation**: Dynamic `dir="rtl"` / `dir="ltr"` switching with language switcher on navbar and mobile menu.
- **Scroll & Interactions**: Smooth momentum scrolling with Lenis, scroll-driven scaling showreel (0.85 → 1.0 full width), and debounced hover video previews.

### Pages & Routes

- **`/[locale]` (Home)**:
  - Fullscreen Hero Banner with auto-advancing slides, video background, audio mute/unmute toggle, and time-remaining indicators.
  - Scroll Showreel Reveal with cinema ambient glow.
  - 5-Pillar Capabilities Bento: Cinema Production, Aerial Cinematography, Commercial Photography, DaVinci Color Grading, Creative Studio Production.
  - Featured Works grid with category filtering and interactive lightbox.
  - Infinite client logo cloud.
- **`/[locale]/works`**:
  - Full archive with filter tabs (All, Cinema, Commercial, Aerial, Photography, Documentaries).
  - Hover-activated video loops and modal cinema player.
- **`/[locale]/works/[slug]`**:
  - Deep-dive case study page with director statement, deliverables, client details, technical credits, and related works.
- **`/[locale]/about`**:
  - Founder & Executive Producer hero statement with signature.
  - The ishoot Story, company milestones, and animated stat counters.
  - Interactive Gear Locker highlighting RED, ARRI, Sony FX9, DJI Inspire 3, Cooke Anamorphic glass, and DaVinci Advanced Panel.
- **`/[locale]/contact`**:
  - Interactive service pills selector and budget range selector.
  - Validated contact form with immediate feedback and dual-email dispatch.

---

## 4. Twenty-Inspired Admin Portal (`apps/admin`)

### Operations Workspace Layout

- **Sidebar**: Inspired by Twenty CRM with collapsible navigation groups (Core, Commercial CRM, Production CMS, Financial Suite, System Settings), quick command search (`⌘K`), and system health indicator.
- **Topbar**: Dynamic breadcrumbs, live time/status, quick action buttons, and user profile menu.

### Modules Implemented

1. **Dashboard Overview (`/dashboard`)**:
   - Monthly Revenue, Pipeline Value, Active Productions, Outstanding Receivables.
   - 8-stage visual Kanban pipeline mini-overview.
   - Operating entity tax status indicator showing Non-VAT mode active.
2. **CRM Pipeline (`/dashboard/crm/deals`)**:
   - 8-Stage Drag-and-Drop Kanban board powered by `@dnd-kit`:
     1. New Inquiry
     2. Discovery Call
     3. Proposal Sent
     4. Negotiation
     5. Won / Contract Signed
     6. Pre-Production
     7. Production & Post
     8. Delivered & Invoiced
   - Real-time deal card dragging, stage column total values, and deal creator modal.
3. **Leads & Contacts (`/dashboard/crm/leads`, `/dashboard/crm/contacts`)**:
   - Searchable, filterable client and lead directories with direct email/phone links and status tags.
4. **Invoice Studio (`/dashboard/invoices`, `/dashboard/invoices/new`, `/dashboard/invoices/[id]`)**:
   - Create multi-line invoices with dynamic item addition/removal.
   - Multi-currency support (BHD, SAR, AED, USD).
   - Real-time subtotal, discount, VAT (0% for Non-VAT), and total calculation.
   - Full A4 Letterhead preview matching official AI brand assets.
   - Delivery Toolbar (Email, WhatsApp, Print, Download).
5. **Payment Recorder & Receipts (`/dashboard/payments`)**:
   - Track full and partial payments against invoices.
   - Automatic receipt code generation (`RCT-2026-NNN`).
   - Emerald watermark receipt template with one-click dispatch (Email, WhatsApp, Print).
6. **Expense Manager (`/dashboard/expenses`)**:
   - Track production costs across 16 categorized operating expense types (Crew, Equipment Rental, Location, Travel, Post-Production, etc.).
7. **Financial Analytics & P&L (`/dashboard/finance`)**:
   - Net Profit & Margin analysis (Gross Revenue vs Operating Expenses).
   - Aging Receivables breakdown (0-30 days, 31-60 days, 60+ days).
8. **CMS Content Managers (`/dashboard/cms/*`)**:
   - Banners Manager: Control homepage slides, priority order, video URLs, and call-to-actions.
   - Portfolio Manager: Add/edit portfolio projects, categories, video embeds, and awards.
   - Clients Manager: Manage partner and client logo cloud.
   - Equipment Manager: Manage gear locker inventory and specs.
9. **Company Settings (`/dashboard/settings/company`)**:
   - Manage Legal Entity Name, Commercial Registration (CR), Address, Bank Details (IBAN, Swift).
   - Toggle VAT registration status (Non-VAT 0% vs VAT 10%).

---

## 5. Verification & Test Results

### Production Build Results

Both applications passed production builds with zero errors:

```bash
$ pnpm turbo build
   • turbo 2.11.4
   • Packages in scope: @ishoot/admin, @ishoot/config, @ishoot/database, @ishoot/email, @ishoot/locales, @ishoot/ui, @ishoot/web
   • Running build in 7 packages

@ishoot/web:build:   ✓ Compiled successfully
@ishoot/web:build:   ✓ Linting and checking validity of types
@ishoot/web:build:   ✓ Generating static pages (12/12)
@ishoot/web:build:   ✓ Finalizing page optimization

@ishoot/admin:build: ✓ Compiled successfully
@ishoot/admin:build: ✓ Linting and checking validity of types
@ishoot/admin:build: ✓ Generating static pages (18/18)
@ishoot/admin:build: ✓ Finalizing page optimization

Tasks:    2 successful, 2 total
Cached:   0 cached, 2 total
Time:     20.833s
```

### TypeScript Static Analysis

```bash
$ pnpm turbo type-check
@ishoot/admin:type-check: $ tsc --noEmit
@ishoot/web:type-check: $ tsc --noEmit
Tasks:    2 successful, 2 total
Time:     1.964s
```

### Generated Routes

- **`apps/web` (12 pages generated)**:
  - `/[locale]` (`/en`, `/ar`)
  - `/[locale]/about` (`/en/about`, `/ar/about`)
  - `/[locale]/works` (`/en/works`, `/ar/works`)
  - `/[locale]/works/[slug]`
  - `/[locale]/contact` (`/en/contact`, `/ar/contact`)
  - `/api/inquiry`
- **`apps/admin` (18 pages generated)**:
  - `/login`
  - `/dashboard`
  - `/dashboard/crm/deals` (Kanban)
  - `/dashboard/crm/leads`
  - `/dashboard/crm/contacts`
  - `/dashboard/invoices`
  - `/dashboard/invoices/new`
  - `/dashboard/invoices/[id]`
  - `/dashboard/payments`
  - `/dashboard/expenses`
  - `/dashboard/finance`
  - `/dashboard/cms/banners`
  - `/dashboard/cms/portfolio`
  - `/dashboard/cms/clients`
  - `/dashboard/cms/equipment`
  - `/dashboard/settings/company`

---

## 6. How to Run Locally

1. **Start both frontends concurrently**:
   ```bash
   cd /Users/sayed/Desktop/GitHub/ishoot.bh
   pnpm dev
   ```
2. **Access the applications**:
   - **Public Cinema Website**: [http://localhost:3000](http://localhost:3000)
     - English: [http://localhost:3000/en](http://localhost:3000/en)
     - Arabic: [http://localhost:3000/ar](http://localhost:3000/ar)
   - **Operations & CRM Portal**: [http://localhost:3001](http://localhost:3001)
     - Direct Dashboard: [http://localhost:3001/dashboard](http://localhost:3001/dashboard)
     - Kanban Pipeline: [http://localhost:3001/dashboard/crm/deals](http://localhost:3001/dashboard/crm/deals)
     - Invoices & Receipts: [http://localhost:3001/dashboard/invoices](http://localhost:3001/dashboard/invoices)
     - Company Settings: [http://localhost:3001/dashboard/settings/company](http://localhost:3001/dashboard/settings/company)
