import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import type { CompanySettings, CRMContact, ExpenseCategory, Invoice, Payment } from "@platform/database";
import { ClaimsView } from "../../components/claims/ClaimsView";
import { NewClaimFormView } from "../../components/claims/NewClaimFormView";
import { DocumentBilingualText, DocumentCard } from "../../components/documents/DocumentCard";
import { DocumentDetailHeader, DocumentHeaderChip } from "../../components/documents/DocumentDetailHeader";
import { DocumentInfoCard, DocumentPartyDetails } from "../../components/documents/DocumentInfoCard";
import { DocumentLinesCard } from "../../components/documents/DocumentLinesCard";
import { DocumentShareMenu } from "../../components/documents/DocumentShareMenu";
import { DocumentStatusBanner } from "../../components/documents/DocumentStatusBanner";
import { DocumentTotals } from "../../components/documents/DocumentTotals";
import { paymentMethodLabel } from "../../components/documents/payment-method";
import { ExpenseCategoriesView } from "../../components/expenses/ExpenseCategoriesView";
import { ExpensesManagementView } from "../../components/expenses/ExpensesManagementView";
import { NewExpenseFormView } from "../../components/expenses/NewExpenseFormView";
import { RecurringExpensesView } from "../../components/expenses/RecurringExpensesView";
import { RelatedExpensesPanel } from "../../components/expenses/RelatedExpensesPanel";
import { FinancialAnalyticsView } from "../../components/finance/FinancialAnalyticsView";
import { FinancialReportDetailView } from "../../components/finance/FinancialReportDetailView";
import { FinancialReportsView } from "../../components/finance/FinancialReportsView";
import { InvoiceDetailView } from "../../components/invoices/InvoiceDetailView";
import { InvoiceEditFormView } from "../../components/invoices/InvoiceEditFormView";
import { InvoiceTemplate } from "../../components/invoices/InvoiceTemplate";
import { InvoicesListView } from "../../components/invoices/InvoicesListView";
import { NewInvoiceFormView } from "../../components/invoices/NewInvoiceFormView";
import { NewPaymentFormView } from "../../components/payments/NewPaymentFormView";
import { PaymentDetailView } from "../../components/payments/PaymentDetailView";
import { PaymentRecorder } from "../../components/payments/PaymentRecorder";
import { PaymentsManagementView } from "../../components/payments/PaymentsManagementView";
import { ReceiptTemplate } from "../../components/payments/ReceiptTemplate";
import { NewSettlementForm } from "../../components/settlements/NewSettlementForm";
import { SettlementDetailView } from "../../components/settlements/SettlementDetailView";
import { SETTLEMENT_STATUS_STYLE, SettlementsListView } from "../../components/settlements/SettlementsListView";
import { adminActionMocks } from "./setup";
import { AdminTestProviders, adminEn as en } from "./fixtures";

describe("Admin Batch 4: Finance, Invoices, Payments, Expenses, Claims, Settlements & Documents", () => {
  const company: CompanySettings = {
    id: "cmp-1",
    company_name_en: "Zayed Group",
    company_name_ar: "مجموعة زايد",
    default_currency: "BHD",
    default_payment_terms_days: 30,
    vat_enabled: true,
    vat_percentage: 10,
    vat_number: "BH-20001",
    vat_id: "BH-20001",
    cr_number: "CR-10099",
    phone: "+97317000001",
    email: "info@example.test",
    website: "https://example.test",
    address_en: "Manama",
    address_ar: "المنامة",
    logo_url: "/media/logo.svg",
  } as unknown as CompanySettings;

  const contact: CRMContact = {
    id: "cli-1",
    company: "Acme Trading",
    full_name: "Ali Hassan",
    email: "ali@acme.test",
    phone: "+97339000001",
    payment_terms_days: 30,
  } as unknown as CRMContact;

  const invoice: Invoice = {
    id: "inv-1",
    invoice_number: "INV-2026-001",
    status: "sent",
    language: "en",
    currency: "BHD",
    client_id: "cli-1",
    contact_name: "Ali Hassan",
    contact,
    issue_date: "2026-05-01",
    due_date: "2026-05-31",
    subtotal: 100,
    discount_type: "none",
    discount_value: 0,
    discount_amount: 0,
    vat_rate: 10,
    vat_amount: 10,
    total_amount: 110,
    amount_paid: 0,
    amount_due: 110,
    items: [{ id: "ii-1", description: "Shoot Day", quantity: 1, unit_price: 100, total_price: 100 }],
    taxes: [],
    notes_en: null,
    notes_ar: null,
    created_at: "2026-05-01T00:00:00Z",
  } as unknown as Invoice;

  const payment: Payment = {
    id: "pay-1",
    receipt_number: "RCP-2026-001",
    invoice_id: "inv-1",
    invoice,
    amount: 110,
    currency: "BHD",
    payment_method: "bank_transfer",
    payment_date: "2026-05-02",
    reference: "TX-123",
    notes: "Full settlement",
    proof_attachments: [],
    created_at: "2026-05-02T00:00:00Z",
  } as unknown as Payment;

  const categories: ExpenseCategory[] = [
    {
      id: "cat-1",
      name_en: "Equipment Rental",
      name_ar: "إيجار معدات",
      color: "#2563EB",
      kind: "operating",
      is_active: true,
    } as unknown as ExpenseCategory,
  ];

  it("renders Document primitives and Finance analytics/reports cleanly", () => {
    render(
      <AdminTestProviders>
        <DocumentDetailHeader
          backHref="/dashboard/invoices"
          backLabel="Back"
          eyebrow="Invoice"
          number="INV-2026-001"
          pdf={{ type: "invoice", id: "inv-1", number: "INV-2026-001", canDownload: true }}
          chips={<DocumentHeaderChip>BHD</DocumentHeaderChip>}
        />
        <DocumentStatusBanner
          status="sent"
          statusMeta={{ sent: { label: "Sent", color: "bg-sky-100", icon: FileText } }}
          fallback="Draft"
          caption="Issued on May 1"
        />
        <DocumentCard title="Summary" icon={FileText}>
          <DocumentBilingualText
            en={{ label: "EN", text: "Service description", empty: "None" }}
            ar={{ label: "AR", text: "وصف الخدمة", empty: "لا يوجد" }}
          />
        </DocumentCard>
        <DocumentInfoCard title="Client" rows={[{ label: "Ref", value: "INV-2026-001" }]}>
          <DocumentPartyDetails name="Acme Trading" lines={["Manama", "Bahrain"]} />
        </DocumentInfoCard>
        <DocumentLinesCard
          title="Line Items"
          currency="BHD"
          lines={[{ id: "l-1", description: "Shoot Day", quantity: 1, unitPrice: 100, lineTotal: 100 } as unknown as Parameters<typeof DocumentLinesCard>[0]["lines"][number]]}
        />
        <DocumentTotals currency="BHD" subtotal={100} total={110} vat={{ percentage: 10, amount: 10 }} />
        <DocumentShareMenu
          documentType="invoice"
          documentNumber="INV-2026-001"
          companyName="Zayed Group"
          clientName="Acme Trading"
          amountFormatted="BHD 110.000"
          signed={false}
        />
        <FinancialAnalyticsView
          finance={{ revenue: 1000, outstanding: 200, overdue: 50, expenses: 300, profit: 700, discountsGiven: 0 } as unknown as Parameters<typeof FinancialAnalyticsView>[0]["finance"]}
          insight={{ collectionRate: 85, averageDaysToCollect: 14, averageInvoiceValue: 500, invoicesIssued: 2, overdueCount: 1, dueSoonCount: 2, aging: [], topClients: [], topDebtors: [] } as unknown as Parameters<typeof FinancialAnalyticsView>[0]["insight"]}
          categoryTotals={{ "cat-1": 300 }}
          categories={categories}
          monthlyCashflow={[{ monthKey: "2026-05", revenue: 1000, expenses: 300 }]}
        />
        <FinancialReportDetailView
          detail={{
            kind: "revenue",
            title: "Revenue",
            total: 1000,
            vatTotal: 100,
            monthly: [],
            invoices: [],
            invoiceTotals: [],
            expensesByCategory: [],
            expensesByKind: { cost_of_sales: 100, operating: 100, payroll: 100 },
            expensesByScope: { deal: 100, client: 100, internal: 100 },
            claims: { paidCount: 0, paidAmount: 0, outstandingAmount: 0 },
            vat: { output: 100, inputRecoverable: 30, netPayable: 70, inputNonRecoverable: 0 },
            revenueByClient: [],
            dealProfitability: [],
            expenses: [],
            rows: [],
          } as unknown as Parameters<typeof FinancialReportDetailView>[0]["detail"]}
          showVat
        />
        <FinancialReportsView
          report={{
            basis: "accrual",
            revenue: 1000,
            collected: 800,
            outstanding: 200,
            expenses: 300,
            vatCollected: 100,
            vatPaid: 30,
            netProfit: 700,
            operatingProfit: 600,
            netMarginPercentage: 60,
            cashNetReceipts: 800,
            invoicedNet: 1000,
            cashGrossReceipts: 880,
            invoicedGross: 1100,
            cashOutputVat: 80,
            invoicedOutputVat: 100,
            expensesNet: 300,
            inputVatNonRecoverable: 0,
            payrollCostsTotal: 100,
            totalExpensesGross: 330,
            inputVatRecoverable: 30,
            bankFeesTotal: 5,
            expensesByCategory: [],
          } as unknown as Parameters<typeof FinancialReportsView>[0]["report"]}
          currentBasis="accrual"
          showVat
        />
      </AdminTestProviders>,
    );

    expect(paymentMethodLabel("bank_transfer", en)).toBeTruthy();
    expect(adminActionMocks.exportFinancialReportCsvAction).toBeDefined();
  });

  it("renders Invoices & Payments components cleanly", () => {
    render(
      <AdminTestProviders>
        <InvoicesListView
          initialInvoices={[invoice as unknown as Parameters<typeof InvoicesListView>[0]["initialInvoices"][number]]}
          finance={{ outstanding: 110, overdue: 0, discountsGiven: 0 }}
          acceptedQuotations={[]}
        />
        <InvoiceDetailView invoice={invoice} company={company} payments={[payment]} />
        <InvoiceEditFormView invoice={invoice} initialContacts={[contact]} company={company} services={[]} />
        <NewInvoiceFormView initialContacts={[contact]} company={company} services={[]} />
        <InvoiceTemplate invoice={invoice} company={company} />
        <PaymentsManagementView
          initialPayments={[payment as unknown as Parameters<typeof PaymentsManagementView>[0]["initialPayments"][number]]}
          totals={[{ currency: "BHD", amount: 110 }]}
          receiptCount={1}
          invoiceCount={1}
        />
        <PaymentDetailView payment={payment} company={company} />
        <NewPaymentFormView initialContacts={[contact]} initialInvoices={[invoice]} />
        <PaymentRecorder isOpen onClose={vi.fn()} invoice={invoice} onSuccess={vi.fn()} />
        <ReceiptTemplate payment={payment} company={company} locale="en" />
      </AdminTestProviders>,
    );

    expect(screen.getAllByText(/INV-2026-001/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/RCP-2026-001/).length).toBeGreaterThanOrEqual(1);
    expect(adminActionMocks.markInvoiceSentAction).toBeDefined();
    expect(adminActionMocks.updateInvoiceAction).toBeDefined();
    expect(adminActionMocks.voidInvoiceAction).toBeDefined();
    expect(adminActionMocks.convertQuotationToInvoiceAction).toBeDefined();
    expect(adminActionMocks.createInvoiceAction).toBeDefined();
    expect(adminActionMocks.createPaymentAction).toBeDefined();
    expect(adminActionMocks.createAttachmentAction).toBeDefined();
  });

  it("renders Expenses, Retail Closing, Claims & Final Settlements components cleanly", () => {
    render(
      <AdminTestProviders>
        <ExpenseCategoriesView initialCategories={categories} canDelete />
        <ExpensesManagementView
          initialExpenses={[]}
          categories={categories}
          totals={[]}
          count={0}
          scopeCounts={{ all: 0, pending: 0, paid: 0 } as unknown as Parameters<typeof ExpensesManagementView>[0]["scopeCounts"]}
        />
        <NewExpenseFormView categories={categories} defaultCurrency="BHD" canManageCategories />
        <RecurringExpensesView items={[]} categories={categories} canWrite canDelete />
        <RelatedExpensesPanel dealId="deal-1" items={[]} totals={[]} canWrite />
        <ClaimsView
          view="mine"
          status="all"
          data={{
            items: [],
            stats: { submitted: 0, approved: 0, scheduled: 0, paidThisMonth: 0, outstanding: [] },
          } as unknown as Parameters<typeof ClaimsView>[0]["data"]}
          canProcess
          currentUserId="usr-1"
          categories={categories}
        />
        <NewClaimFormView categories={categories} meetings={[]} canLinkDeals canLinkInvoices />
        <SettlementsListView
          items={[]}
          rules={{ gratuity: { serviceUntil: "2026-12-31", probationDays: 90, fullYears: 5 }, leaveEncashmentBase: "basic" } as unknown as Parameters<typeof SettlementsListView>[0]["rules"]}
          status=""
          q=""
          canCreate
          canEdit
        />
        <NewSettlementForm
          employees={[{ id: "emp-1", number: "EMP-1", nameEn: "Bader Ali", nameAr: "بدر علي" }]}
          initial={{ employeeId: "emp-1", handoverId: "", lastWorkingDay: "2026-05-31", notes: "" }}
        />
        <SettlementDetailView
          settlement={{
            id: "set-1",
            reference: "FS-2026-001",
            status: "draft",
            currency: "BHD",
            reason: "resignation",
            lastWorkingDay: "2026-05-31",
            employee: { id: "emp-1", number: "EMP-1", nameEn: "Bader Ali", nameAr: "بدر علي", joinDate: "2024-01-01" },
            lines: [],
            additions: 0,
            deductions: 0,
            netAmount: 500,
            calculation: { warnings: [] },
            payments: [],
            signatureUrl: null,
          } as unknown as Parameters<typeof SettlementDetailView>[0]["settlement"]}
          canEdit
          canPay
          approvalId={null}
          signatureRequired={false}
        />
      </AdminTestProviders>,
    );

    expect(SETTLEMENT_STATUS_STYLE.draft).toBeTruthy();
    expect(adminActionMocks.createExpenseCategoryAction).toBeDefined();
    expect(adminActionMocks.updateExpenseCategoryAction).toBeDefined();
    expect(adminActionMocks.deleteExpenseCategoryAction).toBeDefined();
    expect(adminActionMocks.createExpenseAction).toBeDefined();
    expect(adminActionMocks.updateExpenseAction).toBeDefined();
    expect(adminActionMocks.deleteExpenseAction).toBeDefined();
    expect(adminActionMocks.saveRecurringExpenseAction).toBeDefined();
    expect(adminActionMocks.recordRecurringExpenseAction).toBeDefined();
    expect(adminActionMocks.skipRecurringExpenseAction).toBeDefined();
    expect(adminActionMocks.deleteRecurringExpenseAction).toBeDefined();
    expect(adminActionMocks.cancelExpenseClaimAction).toBeDefined();
    expect(adminActionMocks.scheduleExpenseClaimAction).toBeDefined();
    expect(adminActionMocks.payExpenseClaimAction).toBeDefined();
    expect(adminActionMocks.submitExpenseClaimAction).toBeDefined();
    expect(adminActionMocks.createFinalSettlementAction).toBeDefined();
    expect(adminActionMocks.updateSettlementRulesAction).toBeDefined();
    expect(adminActionMocks.recalculateFinalSettlementAction).toBeDefined();
    expect(adminActionMocks.setFinalSettlementLinesAction).toBeDefined();
    expect(adminActionMocks.cancelFinalSettlementAction).toBeDefined();
    expect(adminActionMocks.submitFinalSettlementAction).toBeDefined();
    expect(adminActionMocks.signFinalSettlementAction).toBeDefined();
    expect(adminActionMocks.payFinalSettlementAction).toBeDefined();
  });
});
