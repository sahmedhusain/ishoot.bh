# Platform Feature Overview & Functional Guide

This document details the functional capabilities, business logic, and operational modules available across the platform.

---

## 1. Company Setup & Dynamic Branding

The platform features a complete white-label design engine driven by company profile settings.

```mermaid
flowchart TB
    subgraph Wizard["First-Run Setup Wizard (/setup)"]
        Step1["1. Company Profile & Languages"]
        Step2["2. Colors, Fonts & Presets"]
        Step3["3. Logos, Stamp & Signature"]
        Step4["4. Website & Homepage Sections"]
        Step5["5. Modules & Initial Configuration"]
        Step6["6. Review & Launch"]
    end

    subgraph ThemeEngine["Theme Engine"]
        M3Colors["Material Design 3 Palette Generator"]
        FontLoader["Google Fonts & Custom WOFF2 Loader"]
        CSSVars["Dynamic CSS Variables (--md-sys-color-*)"]
    end

    subgraph Renderers["Output Interfaces"]
        AdminUI["Admin App UI"]
        WebUI["Web Storefront UI"]
        PDFDocs["Bilingual PDF Documents"]
    end

    Wizard --> ThemeEngine
    ThemeEngine --> M3Colors
    ThemeEngine --> FontLoader
    M3Colors --> CSSVars
    FontLoader --> CSSVars
    CSSVars --> AdminUI
    CSSVars --> WebUI
    CSSVars --> PDFDocs
```

### Branding & Theme Customization Capabilities
* **Style Presets**: 22 curated Material Design 3 style presets (light and dark palettes).
* **Typography**: 61 searchable Google Font families, custom uploaded WOFF2/TTF fonts, and script support for Arabic and Latin.
* **Bilingual Support**: Single-language (Arabic or English) or dual-language operational modes.
* **Document Branding**: Custom text logos, dark/light icons, official stamp, manager signature, and printable letterheads applied instantly to all generated PDFs.

---

## 2. Business Modules Overview

Optional modules can be enabled or disabled under **Settings → Modules**. Toggling a module dynamically updates navigation menus, permission structures, and dashboard widgets.

| Module | Core Functional Capabilities | Associated Backend Service |
|---|---|---|
| **CRM & Deals** | Leads, client directory, deal stages, probability, win/loss reasons, and sales outreach. | `sales` |
| **Invoicing & Billing** | Quotation-to-invoice conversion, line items, VAT calculations, discounts, and payment receipts. | `finance` |
| **Finance & Expenses** | Operational expenses, categories, recurring bills, employee claims, and bank settlements. | `finance` |
| **HR & Payroll** | Employee directory, department trees, attendance, leave requests, GOSI, and payroll runs. | `hr` |
| **Workflow & Approvals** | Multi-step approval policies, digital client signatures, official letters, and tasks. | `workflow` |
| **Inventory & Warehouses** | Multi-warehouse tracking, stock locations, variants, batch expiry, and physical stock counts. | `inventory` |
| **E-Commerce Storefront** | Product catalog, cart, coupons, guest checkout, payment gateways, and order management. | `commerce` |
| **Delivery & Logistics** | Delivery zones, time slots, vehicle fleet, driver route sheets, and courier APIs (Aramex, DHL, SMSA). | `delivery` |
| **IT Desk & Archiving** | Support ticket submission, SLA tracking, equipment tracking, and company document archiving. | `itsm`, `files` |

---

## 3. CRM & Invoicing Workflow Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Web Visitor / Client
    actor Sales as Sales Rep
    actor Manager as Sales Manager
    actor Finance as Accountant

    Customer->>Sales: Web Inquiry submitted
    Sales->>Sales: Convert Inquiry to Contact & Deal
    Sales->>Sales: Generate Quotation DTO
    Sales->>Manager: Submit Quotation for Approval (if discount > limit)
    Manager-->>Sales: Approve Quotation
    Sales->>Customer: Issue & Email Quotation PDF
    Customer-->>Sales: Accept Quotation (Digital Signature / Evidence)
    Sales->>Finance: Convert Quotation to Invoice
    Finance->>Customer: Issue Invoice & Payment Link
    Customer->>Finance: Pay via Online Gateway / Bank Transfer
    Finance->>Finance: Record Payment & Issue Receipt PDF
```

---

## 4. Human Resources, GOSI & Payroll Engine

### GOSI Social Insurance Rules
- **Contribution Schedules**: Supports employer and employee percentage schedules with configurable wage ceilings.
- **GCC Schemes**: National and GCC country-to-scheme mappings for cross-border social insurance compliance.
- **Wage Support Programmes**: Salary support subsidies reduce employer costs without reducing employee net pay.

### Payroll Run Execution Steps
1. **Attendance & Leave Processing**: Aggregates attendance entries, overtime hours, shift allowances, and approved leave.
2. **Deductions & Additions**: Applies recurring pay adjustments, sales commissions, and recoveries.
3. **Approval Flow**: Payroll runs move through multi-step approval before payment disbursement.
4. **Payslip & PDF Issuance**: Generates bilingual PDF payslips sent via retrying email or private WhatsApp attachments.

---

## 5. Inventory & Warehouse Management

* **Stock Ledger**: Append-only stock movements (`StockMovement`) guarantee stock levels never drop below zero or consume reserved units.
* **Multi-Warehouse Bins**: Locations defined per warehouse (e.g. Aisle, Shelf, Bin).
* **Weighted Average Cost (WAC)**: Automatically calculates cost of goods sold (COGS) and inventory valuation.
* **Physical Stock Counts**: Full or cycle counts support barcode scanning and generate single reconciliation movement records upon approval.

---

## 6. E-Commerce, Online Payments & Last-Mile Delivery

```mermaid
flowchart LR
    subgraph Storefront["Customer Storefront (Web App)"]
        Cart["Cart & Coupon Checkout"]
        PayGateway["Payment Gateway Selection"]
    end

    subgraph Operations["Admin Fulfillment"]
        OrderPacking["Pack Order & Assign Stock"]
        Dispatch["Assign Vehicle Route Sheet / Courier"]
        DeliveryProof["Driver App: Signature / Photo Proof"]
    end

    Cart --> PayGateway
    PayGateway -- Verified Webhook --> OrderPacking
    OrderPacking --> Dispatch
    Dispatch --> DeliveryProof
```

* **7 Payment Gateways**: Stripe, Tap, PayPal, Checkout.com, PayTabs, Moyasar, and HyperPay integration.
* **Driver Phone App (`/dashboard/driver`)**: Mobile view for delivery drivers to navigate, call customers, record signatures/photos, and collect cash on delivery (COD).
* **Courier Integrations**: Automated booking, shipping labels, and tracking for Aramex, DHL Express, and SMSA.
