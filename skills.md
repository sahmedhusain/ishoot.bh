# iShoot Platform UI/UX, Architecture & Financial Standards (`skills.md`)

This document outlines the authoritative design system, architectural patterns, layout guidelines, financial calculation formulas, and engineering standards for the **iShoot Admin Dashboard & CRM platform**.

---

## 1. Design System & UX Architecture

### A. "Meta / Tech-Forward" Aesthetics

- **Dark Mode Surface Hierarchy**:
  - Base Background: `#0d1117`
  - Container / Card Surface: `#161b22`
  - Elevated Popovers / Sub-panels: `#21262d`
  - Subtle Borders: `rgba(240, 246, 252, 0.1)`
  - Primary Glow Accent: `#09937F` (Emerald glow with `rgba(9, 147, 127, 0.35)`)
- **Light Mode Parity**:
  - Base Background: `#F8FAFC`
  - Container / Card Surface: `#FFFFFF`
  - Elevated Surface: `#F1F5F9`
  - Text Primary: `#0F172A`
  - Text Secondary: `#475569`
  - Border: `#E2E8F0`
- **Glassmorphism Panels**:
  - Apply `.glass-panel` for floating cards using `backdrop-filter: blur(20px)` and subtle border styling.
- **Typography & Fonts**:
  - UI Text: `'IBM Plex Sans Arabic'` for clean multilingual Arabic/English rendering.
  - Display Headers: `'Virtual'` and `'NexaBold'` for stylized brand headers.
  - Numbers & Monetary Amounts: Always rendered in monospace (`font-mono`).

---

## 2. Layout & Routing Architecture

### A. Full-Page Workflows (Strict Anti-Modal Policy)

- **No Creation or Edit Popups**: Absolutely NO modals, drawers, or floating popups may be used for data entry or record creation.
- **Dedicated URL Routes**:
  - Customer Creation: `/dashboard/crm/customers/new`
  - Customer 360 Dossier: `/dashboard/crm/customers/[id]`
  - Customer Editing: `/dashboard/crm/customers/[id]/edit` ✅
  - Commercial Deal Detail: `/dashboard/crm/deals/[id]` ✅
  - Commercial Deal Editing: `/dashboard/crm/deals/[id]/edit` ✅
  - Lead Logging: `/dashboard/crm/leads/new`
  - Payment Recording: `/dashboard/payments/new`
  - Receipt View: `/dashboard/payments/[id]`
  - Invoice Creation: `/dashboard/invoices/new` ✅
  - Invoice Detail: `/dashboard/invoices/[id]` ✅
  - Invoice Full Editing: `/dashboard/invoices/[id]/edit` ✅
  - Expense Creation: `/dashboard/expenses/new`
  - Expense Editing: `/dashboard/expenses/[id]/edit`
  - Legal Document Vault: `/dashboard/company/documents`
  - Legal Asset Upload: `/dashboard/company/documents/new`
  - User Provisioning: `/dashboard/users/new`

### B. Confirmation Modals ONLY

- Modals are strictly restricted to **critical checkpoints** and **destructive safeguards** (e.g., `<ConfirmDestructiveModal />`).
- Acceptable Use-Cases: Deleting a record, voiding an invoice, revoking user role privileges, issuing a refund.
- Mandatory Requirements: Contextual warning message, impact breakdown summary, affirmative confirmation button.
- **Implementation**: Use `<ConfirmDestructiveModal />` component from `@ishoot/ui` with:
  - `title`: Clear action description
  - `description`: Impact explanation and irreversibility warning
  - `confirmText`: Explicit confirmation button label
  - `isLoading`: Loading state during async operation

---

## 3. Customer 360 Dossier Anatomy

Every customer/client record must be accessible via `/dashboard/crm/customers/[id]` and feature 5 unified tabs:

1. **Overview**: Primary contact channels (E.164 normalized phone, email), job title, company name, account classification.
2. **Interaction & Inquiries**: Timeline of inbound website brief submissions, contact form inquiries, and ticket history.
3. **Commercial History**: Associated production deals, Kanban pipeline stages, contracts, proposals, and shoot dates.
4. **Financial Ledger**: Invoices issued, reconciled payments, total Lifetime Value (LTV), and remaining balance due.
5. **Client Document Vault**: Attached client legal records (CR copies, tax IDs, signed agreements, guarantees, bank cheque scans).

---

## 4. Financial Subsystem Standards

### A. Full CRUD & Mutability

- Invoices and Receipts are fully mutable (editable, updatable, voidable) from the UI governed by RBAC permissions (`invoices:write`, `payments:write`).
- Audit logging (`ActivityLog`) records all invoice modifications, stage changes, and void operations.

### B. Ledger Math & Multi-Payment Tranches

- **Total Line Items**: `SUM(quantity * unit_price)`
- **Discount Math**:
  - `percentage`: `(subtotal * discount_value) / 100`
  - `fixed`: `MIN(subtotal, discount_value)`
- **After Discount**: `MAX(0, subtotal - discount_amount)`
- **VAT (Value Added Tax)**: `(after_discount * vat_percentage) / 100` (when `vat_enabled = true`)
- **Total Invoice Amount**: `after_discount + vat_amount`
- **Cumulative Amount Paid**: `SUM(payments.amount)` where `payment.invoice_id = invoice.id`
- **Remaining Balance Due**: `MAX(0, total_amount - cumulative_amount_paid)`
- **Invoice Status Auto-Reconciliation**:
  - `paid`: `cumulative_amount_paid >= total_amount`
  - `partially_paid`: `cumulative_amount_paid > 0 && cumulative_amount_paid < total_amount`
  - `draft` / `sent` / `void`: Manually updated or default states.

### C. Proof of Payment Upload Engine

- All payment creation flows (`/dashboard/payments/new`) must integrate the `<ProofUploader />` component.
- Supported File Formats: PNG, JPG, WEBP, PDF (up to 10MB).
- Accepted Proof Assets: BenefitPay transfer slips, bank wire confirmations, cheque images, deposit receipts.

### D. Server-Side Data Operations

- All finance list views must preserve URL query state (`?q=keyword&status=paid&from=2026-01-01&to=2026-12-31&method=bank_transfer`) for server-side filtering, bookmarking, and pagination.

---

## 5. Corporate Document Vault

- Location: `/dashboard/company/documents`
- Purpose: Centralized legal repository for Commercial Registrations (CR), VAT Certificates, Corporate Bylaws, Pitch Decks, and Standard Agreements.
- Access Control: Managed via `settings:read`, `settings:write`, `settings:delete` RBAC permissions.

---

## 6. Omnichannel Communications & PDF Isolation

- **Email Layout**: Built using `renderBrandEmailLayout` with brand header `#014842`, emerald accents `#09937F`, and dynamic variables for itemized invoice breakdowns and payment receipt confirmations.
- **WhatsApp Integration**: Structured templates containing deep links for direct customer communication.
- **PDF Print Isolation**: `window.print()` isolates `[data-print-target]` elements while concealing sidebar, topbar, and chrome elements for clean A4 printing.
