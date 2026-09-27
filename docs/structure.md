# ishoot Ecosystem — Architecture & Technical Specification

---

## 1. System Architecture Overview

```mermaid
graph TD
    subgraph "Vercel Edge Network"
        WEB["apps/web<br/>Public Frontend<br/>ishoot.bh"]
        ADMIN["apps/admin<br/>Admin Portal<br/>admin.ishoot.bh"]
    end

    subgraph "Shared Packages"
        DB["packages/database<br/>Supabase Client + Queries"]
        UI["packages/ui<br/>Atomic Components"]
        LOC["packages/locales<br/>en.json + ar.json"]
        CFG["packages/config<br/>Tailwind + TS + ESLint"]
        EMAIL["packages/email<br/>Templates + Resend Client"]
    end

    subgraph "Supabase Cloud"
        AUTH["Supabase Auth"]
        PG["PostgreSQL<br/>All Tables + RLS"]
        STORE["Storage Buckets<br/>hero-media, portfolio-media,<br/>client-logos, about-assets,<br/>invoices-pdf, receipts-pdf,<br/>expense-receipts"]
    end

    subgraph "External Services"
        RESEND["Resend<br/>Transactional Email"]
        PDF["@react-pdf/renderer<br/>Invoice + Receipt PDF"]
        WA["WhatsApp wa.me<br/>Share Links"]
    end

    WEB -->|reads| DB
    ADMIN -->|reads/writes| DB
    DB --> PG
    DB --> AUTH
    DB --> STORE

    WEB -->|imports| UI
    WEB -->|imports| LOC
    WEB -->|imports| EMAIL
    ADMIN -->|imports| UI
    ADMIN -->|imports| LOC
    ADMIN -->|imports| EMAIL

    WEB --> CFG
    ADMIN --> CFG

    WEB -->|sends inquiry emails| RESEND
    ADMIN -->|sends invoice/receipt emails| RESEND
    ADMIN -->|generates| PDF
    ADMIN -->|shares via| WA
```

---

## 2. Turborepo Configuration

### 2.1 Monorepo Structure

```
ishoot.bh/           ← Git root & Turborepo root
├── apps/web/         ← Next.js 15 (App Router) — Public site
├── apps/admin/       ← Next.js 15 (App Router) — Admin CMS + CRM + Finance
├── packages/database/ ← Supabase client, typed queries, migrations
├── packages/ui/       ← Shared React components
├── packages/locales/  ← Translation JSON files + loader
├── packages/email/    ← Email templates + Resend client
└── packages/config/   ← Shared Tailwind, TypeScript, ESLint configs
```

### 2.2 turbo.json Pipeline

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "lint": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true },
    "type-check": { "dependsOn": ["^build"] }
  }
}
```

### 2.3 pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## 3. Next.js 15 Configuration

### 3.1 Common Patterns (Both Apps)

- **Runtime**: Node.js (server components by default)
- **App Router**: File-based routing with layouts
- **Tailwind CSS v4**: Via shared `packages/config` preset
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
  - `RESEND_API_KEY` (server-only)

### 3.2 apps/web — Internationalized Routing

```
apps/web/app/
├── layout.tsx              ← Root: fonts, metadata, viewport
├── api/inquiry/route.ts    ← Contact form API (insert + send emails)
└── [locale]/               ← Dynamic locale segment
    ├── layout.tsx           ← Sets dir, lang, font-class
    ├── page.tsx             ← Home
    ├── works/page.tsx       ← Portfolio
    ├── about/page.tsx       ← About
    └── contact/page.tsx     ← Contact form
```

### 3.3 apps/admin — Auth-Protected Routes

```
apps/admin/app/
├── layout.tsx
├── login/page.tsx
└── dashboard/
    ├── layout.tsx          ← Sidebar + topbar shell
    ├── page.tsx            ← Overview
    ├── cms/                ← Content management
    ├── crm/                ← Deal pipeline + contacts
    ├── invoices/           ← Invoice studio
    ├── payments/           ← Payment tracking
    ├── expenses/           ← Expense management
    ├── finance/            ← Financial dashboard
    └── settings/
        └── company/        ← Company settings (VAT, bank, etc.)
```

---

## 4. Supabase Architecture

### 4.1 Database Schema Relationships

```mermaid
erDiagram
    profiles ||--|| auth_users : "references"
    company_settings {
        uuid id PK
        text company_name_en
        text company_name_ar
        boolean vat_enabled
        numeric vat_percentage
        text default_currency
        text bank_iban
        text invoice_prefix
        text receipt_prefix
    }
    hero_banners {
        uuid id PK
        text title_en
        text title_ar
        text media_url
        boolean is_active
        int display_order
    }
    portfolio_categories ||--o{ portfolio_items : "has many"
    portfolio_categories {
        uuid id PK
        text slug
        text name_en
        text name_ar
    }
    portfolio_items {
        uuid id PK
        uuid category_id FK
        text title_en
        text title_ar
        text thumbnail_url
        boolean is_featured
    }
    client_logos {
        uuid id PK
        text client_name
        text logo_svg_url
        boolean is_active
    }
    studio_equipment {
        uuid id PK
        text category
        text model_name
        text specification
    }
    inquiries {
        uuid id PK
        text full_name
        text email
        text status
        boolean confirmation_sent
        boolean notification_sent
    }
    crm_contacts ||--o{ crm_deals : "has many"
    crm_contacts ||--o{ invoices : "billed to"
    crm_contacts {
        uuid id PK
        text full_name
        text email
        text company
        text phone
    }
    crm_deals ||--o{ invoices : "generates"
    crm_deals ||--o{ expenses : "costs"
    crm_deals {
        uuid id PK
        uuid contact_id FK
        text title
        numeric value
        text stage
    }
    invoices ||--o{ invoice_line_items : "has many"
    invoices ||--o{ payments : "receives"
    invoices {
        uuid id PK
        text invoice_number
        uuid contact_id FK
        uuid deal_id FK
        numeric subtotal
        text discount_type
        numeric discount_amount
        boolean vat_enabled
        numeric vat_amount
        numeric total_amount
        numeric amount_paid
        numeric amount_due
        text status
        text delivery_channel
    }
    invoice_line_items {
        uuid id PK
        uuid invoice_id FK
        text description_en
        text description_ar
        int quantity
        numeric unit_price
        numeric line_total
    }
    payments {
        uuid id PK
        uuid invoice_id FK
        text receipt_number
        numeric amount
        text payment_method
        text receipt_pdf_path
        boolean notification_sent
    }
    expense_categories ||--o{ expenses : "categorizes"
    expense_categories {
        uuid id PK
        text slug
        text name_en
        text name_ar
        text color
    }
    expenses {
        uuid id PK
        uuid category_id FK
        uuid deal_id FK
        text description_en
        numeric amount
        date expense_date
        text vendor_name
        text receipt_url
    }
```

### 4.2 Row Level Security Strategy

| Table                  | Public (anon)                | Authenticated (editor) | Authenticated (producer+) |
| ---------------------- | ---------------------------- | ---------------------- | ------------------------- |
| `company_settings`     | SELECT (for invoice display) | SELECT                 | super_admin: ALL          |
| `hero_banners`         | SELECT where `is_active`     | ALL                    | ALL                       |
| `portfolio_items`      | SELECT all                   | ALL                    | ALL                       |
| `portfolio_categories` | SELECT all                   | ALL                    | ALL                       |
| `client_logos`         | SELECT where `is_active`     | ALL                    | ALL                       |
| `studio_equipment`     | SELECT all                   | ALL                    | ALL                       |
| `inquiries`            | INSERT only                  | None                   | ALL                       |
| `crm_contacts`         | None                         | None                   | ALL                       |
| `crm_deals`            | None                         | None                   | ALL                       |
| `invoices`             | None                         | None                   | ALL                       |
| `invoice_line_items`   | None                         | None                   | ALL                       |
| `payments`             | None                         | None                   | ALL                       |
| `expense_categories`   | None                         | None                   | ALL                       |
| `expenses`             | None                         | None                   | ALL                       |

### 4.3 Storage Buckets

| Bucket             | Public | Purpose                                      |
| ------------------ | ------ | -------------------------------------------- |
| `hero-media`       | ✅     | Hero banner videos + poster images           |
| `portfolio-media`  | ✅     | Portfolio thumbnails, videos, galleries      |
| `client-logos`     | ✅     | Client logo SVGs/PNGs                        |
| `about-assets`     | ✅     | CEO portrait, studio photos                  |
| `invoices-pdf`     | ❌     | Generated invoice PDFs (signed URLs)         |
| `receipts-pdf`     | ❌     | Generated payment receipt PDFs (signed URLs) |
| `expense-receipts` | ❌     | Uploaded expense receipt images/PDFs         |

---

## 5. Email Architecture

### 5.1 Email Service (Resend)

```typescript
// packages/email/src/index.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  react,
  attachments,
}: EmailOptions) {
  return resend.emails.send({
    from: "ishoot <hello@ishoot.bh>",
    to,
    subject,
    react,
    attachments,
  });
}
```

### 5.2 Email Templates (React Email)

```
packages/email/src/
├── index.ts                           ← Resend client + sendEmail()
├── templates/
│   ├── layout.tsx                     ← Shared brand layout (header, footer)
│   ├── inquiry-confirmation.tsx       ← "Thank you for contacting ishoot"
│   ├── inquiry-notification.tsx       ← "[Name] is requesting to contact you"
│   ├── invoice-delivery.tsx           ← Invoice email with PDF attachment
│   ├── payment-receipt.tsx            ← Payment received + receipt PDF
│   └── invoice-reminder.tsx           ← Payment reminder (future)
```

### 5.3 Contact Form Email Flow

```mermaid
sequenceDiagram
    participant V as Visitor
    participant W as apps/web
    participant S as Supabase
    participant R as Resend

    V->>W: POST /api/inquiry (form data)
    W->>S: INSERT INTO inquiries
    S-->>W: inquiry record

    par Send confirmation to client
        W->>R: Send "Thank you" email (client's locale)
        R-->>W: sent
        W->>S: UPDATE inquiries SET confirmation_sent = true
    and Send notification to team
        W->>R: Send "New inquiry" email (English)
        R-->>W: sent
        W->>S: UPDATE inquiries SET notification_sent = true
    end

    W-->>V: Success response
```

### 5.4 Invoice/Payment Delivery Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant AD as apps/admin
    participant PDF as PDF Generator
    participant S as Supabase Storage
    participant R as Resend
    participant WA as WhatsApp

    A->>AD: Click "Send via Email"
    AD->>PDF: Render invoice PDF
    PDF-->>AD: PDF buffer
    AD->>S: Upload PDF to invoices-pdf bucket
    S-->>AD: Storage path
    AD->>R: Send email with PDF attachment
    R-->>AD: sent
    AD->>S: UPDATE invoice SET delivery_channel='email', delivered_at=now()

    Note over A,WA: OR

    A->>AD: Click "Send via WhatsApp"
    AD->>PDF: Render invoice PDF
    PDF-->>AD: PDF buffer
    AD->>S: Upload PDF + get signed URL (24h expiry)
    S-->>AD: Signed URL
    AD-->>A: Open wa.me/{phone}?text={message+URL}
```

---

## 6. Financial Data Flows

### 6.1 Invoice Lifecycle

```mermaid
flowchart TD
    C["Create Invoice<br/>(draft)"] --> LI["Add Line Items<br/>(qty × price)"]
    LI --> DISC["Apply Discount?<br/>(none / % / fixed)"]
    DISC --> VAT{"VAT Enabled?<br/>(from company_settings)"}
    VAT -->|Yes| CALC_VAT["Calculate: subtotal - discount + VAT"]
    VAT -->|No| CALC_NO["Calculate: subtotal - discount"]
    CALC_VAT --> PREVIEW["Preview PDF"]
    CALC_NO --> PREVIEW
    PREVIEW --> SEND["Send to Client<br/>(email / whatsapp / print)"]
    SEND --> WAIT["status = 'sent'<br/>Waiting for payment"]
    WAIT --> PAY["Record Payment(s)"]
    PAY --> CHECK{"amount_due == 0?"}
    CHECK -->|Yes| PAID["status = 'paid'<br/>Send receipt"]
    CHECK -->|No| PARTIAL["status = 'partially_paid'<br/>Send receipt"]
    PARTIAL --> PAY
```

### 6.2 Financial Dashboard Aggregation

```sql
-- Revenue (paid) for a period
SELECT SUM(p.amount) as paid_revenue
FROM payments p
WHERE p.payment_date BETWEEN :start AND :end;

-- Revenue (outstanding)
SELECT SUM(i.amount_due) as outstanding
FROM invoices i
WHERE i.status IN ('sent', 'partially_paid', 'overdue');

-- Expenses by category for a period
SELECT ec.name_en, ec.color, SUM(e.amount) as total
FROM expenses e
JOIN expense_categories ec ON e.category_id = ec.id
WHERE e.expense_date BETWEEN :start AND :end
GROUP BY ec.id ORDER BY total DESC;

-- Profit
SELECT
  (SELECT SUM(amount) FROM payments WHERE payment_date BETWEEN :start AND :end) as revenue,
  (SELECT SUM(amount) FROM expenses WHERE expense_date BETWEEN :start AND :end) as expenses,
  revenue - expenses as profit;

-- Discounts given
SELECT SUM(discount_amount) FROM invoices
WHERE created_at BETWEEN :start AND :end AND discount_amount > 0;

-- VAT collected
SELECT SUM(vat_amount) FROM invoices
WHERE vat_enabled = true AND created_at BETWEEN :start AND :end;
```

---

## 7. Internationalization (i18n) Architecture

### 7.1 Translation Loading

```typescript
// packages/locales/src/index.ts
import en from "./en.json";
import ar from "./ar.json";

export type Locale = "en" | "ar";
export type TranslationKeys = typeof en;

const translations: Record<Locale, TranslationKeys> = { en, ar };

export function getTranslations(locale: Locale): TranslationKeys {
  return translations[locale];
}
```

### 7.2 Locale Layout

```typescript
// apps/web/app/[locale]/layout.tsx
export default function LocaleLayout({ children, params: { locale } }) {
  const isArabic = locale === 'ar';
  return (
    <html dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
      <body className={isArabic ? 'font-arabic' : 'font-english'}>
        {children}
      </body>
    </html>
  );
}
```

---

## 8. Deployment Strategy

### 8.1 Vercel Configuration

| App          | Domain            | Build Command                |
| ------------ | ----------------- | ---------------------------- |
| `apps/web`   | `ishoot.bh`       | `turbo build --filter=web`   |
| `apps/admin` | `admin.ishoot.bh` | `turbo build --filter=admin` |

### 8.2 Environment Variables

```
# Shared
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Server-only
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
RESEND_API_KEY=re_xxxx

# Web only
NEXT_PUBLIC_SITE_URL=https://ishoot.bh

# Admin only
NEXT_PUBLIC_ADMIN_URL=https://admin.ishoot.bh
```

---

## 9. Key Technical Dependencies

| Package                   | Version   | Purpose                          |
| ------------------------- | --------- | -------------------------------- |
| `next`                    | `^15.0`   | Framework (App Router)           |
| `react`                   | `^19.0`   | UI library                       |
| `tailwindcss`             | `^4.0`    | Utility CSS                      |
| `@supabase/supabase-js`   | `^2.45`   | Database client                  |
| `@supabase/ssr`           | `^0.5`    | Server-side auth                 |
| `framer-motion`           | `^11.0`   | Scroll animations                |
| `lenis`                   | `^1.1`    | Smooth scroll                    |
| `@react-pdf/renderer`     | `^4.0`    | Invoice + Receipt PDF generation |
| `lucide-react`            | `^0.400`  | Icons                            |
| `resend`                  | `^4.0`    | Transactional email              |
| `@react-email/components` | `^0.0.25` | Email templates                  |
| `@dnd-kit/core`           | `^6.0`    | Drag-and-drop (Kanban)           |
| `@dnd-kit/sortable`       | `^8.0`    | Sortable lists                   |
| `recharts`                | `^2.12`   | Financial dashboard charts       |
| `date-fns`                | `^3.0`    | Date formatting & manipulation   |
| `turbo`                   | `^2.0`    | Build orchestration              |
