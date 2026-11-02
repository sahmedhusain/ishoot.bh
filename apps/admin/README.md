# Admin application (`apps/admin`)

The internal enterprise business system for staff and management. Built with Next.js 16 (App Router) and Material Design 3 styling.

## Overview

`apps/admin` provides operational and management interfaces across all business domains:
- **CRM & Sales**: Contacts, deals, inquiries, quotations, and marketing outreach.
- **Finance**: Invoices, payments, expense claims, bank settlements, and financial reporting.
- **Human Resources**: Employees, leave requests, attendance tracking, and payroll runs.
- **Workflow & Approvals**: Multi-step approvals, digital signatures, letter templates, tasks, and company calendar.
- **Inventory & Warehouses**: Products, variants, barcodes, stock movements, and counts.
- **Store & Delivery**: Sales orders, fulfillment, vehicles, route sheets, and dispatch tracking.
- **IT Support & Desk**: Employee ticket submission, status tracking, and equipment requests.

## Data Access & Security

- Communicates with Go backend microservices via `@platform/api-client` through the unified API gateway (`API_URL`).
- Staff authentication is managed via the `identity` service using JWT session cookies and optional TOTP MFA.
- Authorization is enforced by `requirePermission(resource, action)` before every privileged server action.

## Development & Testing

```bash
# Start standalone dev server (port 3001)
npm run dev

# Type check
npm run types

# Run unit tests
npm run test:unit

# Run Playwright end-to-end tests
npm run test:e2e
```
