# Core Data Models (Prisma)

The `schema.prisma` file is the source of truth for the entire business. Key domains include:

## 1. Auth & Security
- **`User` / `Role` / `Permission`**: RBAC system defining granular access (e.g. `invoices:write`).
- **`Session`**: Tracks active login tokens. Crucially, a password reset invalidates all associated sessions.
- **`AuthChallenge`**: Replaces unbounded email-magic links with strictly audited, expiring, single-use OTP codes.

## 2. CRM & Sales
- **`CrmContact` / `CrmDeal` / `Inquiry`**: The sales pipeline. Inquiries represent raw web forms which can be qualified into Contacts and Deals.
- **`CommunicationThread` & `CommunicationMessage`**: The unified inbox. Ties outbound invoices/quotations and inbound replies to a specific `CrmContact` or `Inquiry`. 

## 3. Financials
- **`Quotation` & `QuotationLineItem`**: Drafts of proposed costs. Lifecycle: `draft` -> `review` -> `approved` -> `issued`.
- **`Invoice` & `InvoiceLineItem`**: Legally binding requests for payment.
- **Idempotency Rule**: Quotations are converted to Invoices via a strict `FOR UPDATE` transaction lock (`convertQuotationToInvoice`) preventing race conditions from creating duplicate invoices for a single quote.

## 4. Analytics & Web
- **`SocialMetric`**: Caches data from Facebook, Instagram, YouTube, and WhatsApp to serve the dashboard without hitting rate limits. Handles stale data gracefully.
- **`Review` / `Statistic` / `Faq`**: Headless CMS models powering the Next.js `apps/web` frontend.
