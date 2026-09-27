# Admin Dashboard Re-design & Enhancement Plan (Google Material Design 3)

## Objective

Re-design the admin dashboard (`apps/admin`) from scratch with **Google Material Design 3 (M3)** aesthetics (clean cards, surface variants, elevation, floating action buttons, refined indigo/teal/neutral color palette, clean typography, responsive layout), add advanced CRM calculations (LTV, invoice count, paid/outstanding totals, project history), implement client auto-fetch when entering email/phone or selecting a client in invoice creation/editing, add invoice-to-payment dropdown linking, and ensure universal quick access to clients from any page.

---

## Key Features & Architecture

### 1. Google Material Design 3 (M3) UI System

- **Surfaces & Elevation**: `bg-slate-50` / `bg-white` with M3 surface containers (`bg-surface`, `bg-surface-container-low`), subtle borders, rounded-2xl cards, soft shadows.
- **Color Palette**: Material 3 Indigo/Teal accent harmony (`#014842` primary brand dark green, `#09937F` teal accent, crisp neutral slates).
- **Interactive Elements**: Ripple effects, hover states, badges, floating action buttons (FABs), clean data tables with sticky headers, pagination, and multi-filter bars.

### 2. Enhanced CRM & Client Logic

- **Calculations**: Total Invoiced (Lifetime Value), Total Paid, Outstanding Balance, Active Deals Count, Invoice Count, Expense Count, Last Activity Date.
- **Universal Client Access**: Client names and avatars across Invoices, Payments, Expenses, and Dashboard link directly to the Client 360 Dossier (`/dashboard/crm/customers/[id]`).
- **Global Client Quick-Jump**: A search bar / dropdown in the top bar to instantly jump to any client from any page.

### 3. Invoice Creation & Client Auto-Fetch

- When creating or editing an invoice (`/dashboard/invoices/new` or `[id]/edit`), selecting a client from the dropdown or typing an email/phone automatically populates/links client details (company name, email, phone, billing address, currency).

### 4. Payments & Invoices Linking

- When recording a payment (`/dashboard/payments/new`), selecting a client filters their unpaid or existing invoices into a dropdown so the payment is correctly tied to the exact invoice(s).

### 5. Professional Admin Navigation & Links

- Comprehensive sidebar with grouped categories: Overview, CRM (Customers, Contacts, Deals, Leads), Finance (Invoices, Payments, Expenses, Analytics), Production / CMS (Portfolio, Equipment, Banners, Company Documents), System Settings & Audit Logs.
