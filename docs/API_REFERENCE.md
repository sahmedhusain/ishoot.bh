# API, server actions and data model reference

Moved from the README. Generated contracts for every server action live in `apps/admin/lib/action-schemas.json` (`pnpm test:action-schemas` keeps them current); the schema of record is `packages/database/prisma/schema.prisma`.

## APIs and server actions

### 1. Consumer Web Application APIs (`apps/web`)

| Endpoint          | Method | Purpose & Description                                                                                                                                     |
| :---------------- | :----- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/inquiry`    | `POST` | Processes web brief submissions via `resolveIncomingLead()`. Deduplicates contacts, records `Inquiry`, and dispatches dual client/team emails via Resend. |
| `/api/revalidate` | `POST` | Triggers on-demand ISR revalidation for dynamic static pages.                                                                                             |

#### Web Inquiry Payload Example (`POST /api/inquiry`):

```json
{
  "fullName": "Sara Ahmed",
  "email": "client@company.com",
  "phone": "+973 3900 0000",
  "company": "Zain Bahrain",
  "services": ["TVC Commercial", "Post-Production"],
  "budget": "5,000 - 10,000 BHD",
  "timeline": "Q4 2026",
  "message": "We require a 30-second cinema commercial shoot.",
  "locale": "ar"
}
```

---

### 2. Admin Dashboard HTTP APIs (`apps/admin`)

| Endpoint                  | Method | Description                                                                      |
| :------------------------ | :----- | :------------------------------------------------------------------------------- |
| `/api/auth/login`         | `POST` | Authenticates admin credentials, sets encrypted JWT cookie.                      |
| `/api/auth/logout`        | `POST` | Revokes session and clears authentication cookies.                               |
| `/api/auth/me`            | `GET`  | Returns currently authenticated user profile & RBAC permissions.                 |
| `/api/documents/[id]/pdf` | `GET`  | Generates and streams isolated A4 printable PDF documents for invoices/receipts. |

---

### 3. Admin Server Actions (`apps/admin/app/actions`)

#### CRM & Lead Management (`actions/crm.ts`)

- `createContactAction(data)` — Provision new client dossier.
- `updateContactAction(id, data)` — Update customer details.
- `deleteContactAction(id)` — Delete customer profile (Safeguarded).
- `createCRMDealAction(data)` — Create commercial deal pipeline.
- `updateDealStageAction(id, stage)` — Advance deal stage in Kanban board.
- `deleteCRMDealAction(id)` — Delete deal record.
- `updateInquiryStatusAction(id, status)` — Qualify or archive lead inquiry.
- `deleteInquiryAction(id)` — Delete lead inquiry.

#### Financial Engine (`actions/finance.ts`)

- `createInvoiceAction(data)` — Generate invoice with line items, VAT, and discounts.
- `updateInvoiceAction(id, data)` — Update mutable invoice details.
- `voidInvoiceAction(id)` — Mark invoice status as `void` with audit log trace.
- `deleteInvoiceAction(id)` — Delete invoice record.
- `createPaymentAction(data)` — Record payment tranche and issue receipt.
- `deletePaymentAction(id)` — Delete payment transaction.
- `createExpenseAction(data)` — Log production expense with vendor receipt attachment.
- `deleteExpenseAction(id)` — Delete expense record.

#### Corporate Legal Repository (`actions/documents.ts`)

- `createCompanyDocumentAction(data)` — Upload company legal asset (CR, VAT, Bylaws).
- `deleteCompanyDocumentAction(id)` — Remove legal document asset.

#### System User Management (`actions/users.ts`)

- `createUserAction(data)` — Provision system user with RBAC role.
- `updateUserAction(id, data)` — Update user profile and permissions.
- `deleteUserAction(id)` — Revoke user account.

#### Company Settings (`actions/settings.ts`)

- `updateCompanySettingsAction(data)` — Update company corporate information, bank details, and VAT percentages.

---

## Database Schema & Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Invoice : "invoicesCreated"
    User ||--o{ Payment : "paymentsCreated"
    User ||--o{ Expense : "expensesCreated"
    User ||--o{ CalendarEvent : "calendarEvents"
    User ||--o{ ActivityLog : "activities"
    User ||--o{ Notification : "notifications"
    User ||--o{ Attachment : "attachments"
    User ||--o{ Session : "sessions"
    User ||--o{ Contract : "contractsCreated"
    User ||--o{ GeneratedDocument : "generatedDocuments"
    User ||--o{ CompanyDocument : "companyDocuments"

    CrmContact ||--o{ CrmDeal : "deals"
    CrmContact ||--o{ Inquiry : "inquiries"
    CrmContact ||--o{ Contract : "contracts"

    CrmDeal ||--o{ Invoice : "invoices"
    CrmDeal ||--o{ Expense : "expenses"
    CrmDeal ||--o{ CalendarEvent : "calendarEvents"
    CrmDeal ||--o{ Contract : "contracts"

    Invoice ||--|{ InvoiceLineItem : "lineItems"
    Invoice ||--o{ Payment : "payments"

    ExpenseCategory ||--o{ Expense : "expenses"
    DocumentTemplate ||--o{ Contract : "contracts"
    PortfolioCategory ||--o{ PortfolioItem : "items"

    User {
        string id PK
        string email UK
        string fullName
        string role
        json permissions
        string department
        boolean isActive
    }

    CompanySetting {
        string id PK
        string companyNameEn
        string companyNameAr
        string crNumber
        string vatId
        boolean vatEnabled
        decimal vatPercentage
        string defaultCurrency
        string bankName
        string bankIban
    }

    Inquiry {
        string id PK
        string name
        string email
        string phone
        string companyName
        string serviceType
        string status
        string customerId FK
    }

    CrmContact {
        string id PK
        string firstName
        string lastName
        string email
        string phone
        string companyName
        string contactType
    }

    CrmDeal {
        string id PK
        string contactId FK
        string title
        decimal dealValue
        string dealStage
        date expectedCloseDate
        date shootDate
    }

    Invoice {
        string id PK
        string invoiceNumber UK
        string dealId FK
        string clientId
        date issueDate
        date dueDate
        decimal subtotal
        decimal vatAmount
        decimal totalAmount
        string status
    }

    InvoiceLineItem {
        string id PK
        string invoiceId FK
        string descriptionEn
        decimal quantity
        decimal unitPrice
        decimal lineTotal
    }

    Payment {
        string id PK
        string invoiceId FK
        string receiptNumber UK
        date paymentDate
        decimal amount
        string paymentMethod
        string referenceNumber
    }

    Expense {
        string id PK
        string categoryId FK
        string dealId FK
        string descriptionEn
        decimal amount
        date expenseDate
        string vendorName
    }

    CompanyDocument {
        string id PK
        string titleEn
        string category
        string documentNumber
        string fileUrl
        date validUntil
        string uploadedById FK
    }

    Contract {
        string id PK
        string contractNumber UK
        string dealId FK
        string contactId FK
        string templateId FK
        string status
    }

    ActivityLog {
        string id PK
        string userId FK
        string action
        string entityType
        string entityId
        json details
    }
```
