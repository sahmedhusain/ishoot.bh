import { getCurrencyDecimals } from "@platform/config/currency";
import { roundMoney } from "../finance/money";
import { companyCurrency as getAccountingCurrency } from "../finance/company-currency";
import { getTranslations, formatMessage, isLocale } from "@platform/locales";
import { db } from "../db";
import { companyCurrency } from "../finance/company-currency";
import {
  listInvoices,
  listPayments,
  listExpenses,
  listExpenseCategories,
} from "../../api/finance";
import { listContacts } from "../../api/sales";

export interface FinancialSummaryReport {
  basis: "cash" | "accrual";
  reportingCurrency: string;
  periodStart?: string;
  periodEnd?: string;

  // Accrual / Invoiced sales
  invoicedGross: number;
  invoicedNet: number;
  invoicedOutputVat: number;

  // Cash / Receipts
  cashGrossReceipts: number;
  cashNetReceipts: number;
  cashOutputVat: number;

  // Operating Costs / Expenses
  totalExpensesGross: number;
  expensesNet: number;
  inputVatTotal: number;
  inputVatRecoverable: number;
  inputVatNonRecoverable: number;

  // Other Financial Components
  payrollCostsTotal: number;
  bankFeesTotal: number;
  realizedFxGainLoss: number;

  /** Documents in other currencies are excluded until converted; this counts them. */
  excludedForeignCurrencyDocuments: number;

  // Operating Profit
  operatingProfit: number; // For cash: cashNet - (expensesNet + inputVatNonRecoverable + payroll + bankFees) + FX
  netMarginPercentage: number;
}

export async function getFinancialSummaryReport(filters: {
  dateFrom?: Date;
  dateTo?: Date;
  basis?: "cash" | "accrual";
}): Promise<FinancialSummaryReport> {
  const accountingCurrency = await getAccountingCurrency();
  const FUNCTIONAL_CURRENCY = await companyCurrency();
  const basis = filters.basis || "cash";

  const [invoices, payments, expenses] = await Promise.all([
    listInvoices().catch(() => []),
    listPayments().catch(() => []),
    listExpenses().catch(() => []),
  ]);

  const dateFromStr = filters.dateFrom?.toISOString().slice(0, 10);
  const dateToStr = filters.dateTo?.toISOString().slice(0, 10);

  const inRange = (dStr?: string) => {
    if (!dStr) return true;
    const s = String(dStr).slice(0, 10);
    if (dateFromStr && s < dateFromStr) return false;
    if (dateToStr && s > dateToStr) return false;
    return true;
  };

  const currencyInvoices = (invoices || []).filter(
    (i) => (!i.currency || i.currency === FUNCTIONAL_CURRENCY) &&
           i.status !== "void" &&
           i.status !== "draft" &&
           inRange(i.issueDate)
  );

  const invoicedGross = currencyInvoices.reduce((sum, i) => sum + Number(i.total ?? 0), 0);
  const invoicedNet = currencyInvoices.reduce((sum, i) => sum + (Number(i.subtotal ?? 0) - Number(i.discount ?? 0)), 0);
  const invoicedOutputVat = currencyInvoices.reduce((sum, i) => sum + Number(i.vatAmount ?? 0), 0);

  const invoiceMap = new Map((invoices || []).map((i) => [i.id, i]));
  const currencyPayments = (payments || []).filter(
    (p) => (!p.currency || p.currency === FUNCTIONAL_CURRENCY) &&
           p.status !== "void" &&
           inRange(p.paymentDate)
  );

  let cashGrossReceipts = 0;
  let cashNetReceipts = 0;
  let cashOutputVat = 0;

  for (const p of currencyPayments) {
    const amount = Number((p as any).amount ?? (p as any).amountPaid ?? 0);
    cashGrossReceipts += amount;
    const inv = p.invoiceId ? invoiceMap.get(p.invoiceId) : undefined;
    const invTotal = Number(inv?.total ?? 0);
    const invVat = Number(inv?.vatAmount ?? 0);
    if (invTotal > 0 && invVat > 0) {
      const ratio = amount / invTotal;
      const allocatedVat = roundMoney(invVat * ratio, FUNCTIONAL_CURRENCY);
      cashOutputVat += allocatedVat;
      cashNetReceipts += roundMoney(amount - allocatedVat, FUNCTIONAL_CURRENCY);
    } else {
      cashNetReceipts += amount;
    }
  }

  const currencyExpenses = (expenses || []).filter(
    (e) => (!e.currency || e.currency === FUNCTIONAL_CURRENCY) &&
           e.status !== "rejected" &&
           inRange(e.expenseDate)
  );

  const totalExpensesGross = currencyExpenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const inputVatTotal = 0;
  const inputVatRecoverable = 0;
  const inputVatNonRecoverable = 0;
  const expensesNet = totalExpensesGross;

  const payrollCostsTotal = 0;
  const bankFeesTotal = 0;
  const realizedFxGainLoss = 0;
  const excludedForeignCurrencyDocuments = 0;

  const revenueForProfit = basis === "cash" ? cashNetReceipts : invoicedNet;
  const costsForProfit = expensesNet + inputVatNonRecoverable + payrollCostsTotal + bankFeesTotal;
  const operatingProfit = roundMoney(revenueForProfit - costsForProfit + realizedFxGainLoss, FUNCTIONAL_CURRENCY);
  const netMarginPercentage =
    revenueForProfit > 0
      ? Math.round((operatingProfit / revenueForProfit) * 10000) / 100
      : 0;

  return {
    basis,
    reportingCurrency: accountingCurrency,
    excludedForeignCurrencyDocuments,
    periodStart: filters.dateFrom?.toISOString(),
    periodEnd: filters.dateTo?.toISOString(),
    invoicedGross: roundMoney(invoicedGross, FUNCTIONAL_CURRENCY),
    invoicedNet: roundMoney(invoicedNet, FUNCTIONAL_CURRENCY),
    invoicedOutputVat: roundMoney(invoicedOutputVat, FUNCTIONAL_CURRENCY),
    cashGrossReceipts: roundMoney(cashGrossReceipts, FUNCTIONAL_CURRENCY),
    cashNetReceipts: roundMoney(cashNetReceipts, FUNCTIONAL_CURRENCY),
    cashOutputVat: roundMoney(cashOutputVat, FUNCTIONAL_CURRENCY),
    totalExpensesGross: roundMoney(totalExpensesGross, FUNCTIONAL_CURRENCY),
    expensesNet: roundMoney(expensesNet, FUNCTIONAL_CURRENCY),
    inputVatTotal: roundMoney(inputVatTotal, FUNCTIONAL_CURRENCY),
    inputVatRecoverable: roundMoney(inputVatRecoverable, FUNCTIONAL_CURRENCY),
    inputVatNonRecoverable: roundMoney(inputVatNonRecoverable, FUNCTIONAL_CURRENCY),
    payrollCostsTotal: roundMoney(payrollCostsTotal, FUNCTIONAL_CURRENCY),
    bankFeesTotal: roundMoney(bankFeesTotal, FUNCTIONAL_CURRENCY),
    realizedFxGainLoss: roundMoney(realizedFxGainLoss, FUNCTIONAL_CURRENCY),
    operatingProfit,
    netMarginPercentage,
  };
}

export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val);
  // Formula injection defense: disallow leading =, +, -, @
  if (
    str.startsWith("=") ||
    str.startsWith("+") ||
    str.startsWith("-") ||
    str.startsWith("@")
  ) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface FinancialCsvOptions {
  locale?: string;
  companyName?: string;
  currency?: string;
}
export function generateFinancialSummaryCsv(
  report: FinancialSummaryReport,
  options: FinancialCsvOptions = {},
): string {
  const t = getTranslations(isLocale(options.locale) ? options.locale : "en").admin;
  const c = t.financialCsv;
  const row = (...cells: unknown[]) => cells.map(escapeCsvField).join(",");
  const keys = [
    "invoicedGross",
    "invoicedNet",
    "invoicedOutputVat",
    "cashGrossReceipts",
    "cashNetReceipts",
    "cashOutputVat",
    "totalExpensesGross",
    "expensesNet",
    "inputVatTotal",
    "inputVatRecoverable",
    "inputVatNonRecoverable",
    "payrollCostsTotal",
    "bankFeesTotal",
    "realizedFxGainLoss",
    "operatingProfit",
  ] as const;
  return [
    row(
      formatMessage(c.title, {
        companyName: options.companyName ?? t.copy.genericCompany,
      }),
    ),
    row(c.basis, report.basis === "cash" ? c.cash : c.accrual),
    row(c.currency, report.reportingCurrency),
    row(c.periodStart, report.periodStart || c.allTime),
    row(c.periodEnd, report.periodEnd || c.present),
    "",
    row(
      c.metric,
      formatMessage(c.amountHeader, { currency: report.reportingCurrency }),
    ),
    ...keys.map((key) => row(c[key], report[key].toFixed(getCurrencyDecimals(report.reportingCurrency)))),
    row(c.netMarginPercentage, report.netMarginPercentage.toFixed(2) + "%"),
  ].join("\n");
}

// Preserve precision when historical currencies coexist; each document is displayed in its own minor units.
const roundReportValue = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

export interface InvoiceRegisterRow {
  id: string;
  number: string;
  issueDate: string;
  client: string;
  status: string;
  currency: string;
  vatApplied: boolean;
  net: number;
  vat: number;
  /** Taxes besides VAT. */
  otherTaxes: number;
  gross: number;
  paid: number;
  due: number;
}

export interface FinancialReportDetail {
  reportingCurrency: string;
  invoices: InvoiceRegisterRow[];
  invoiceTotals: Array<{
    currency: string;
    withVat: { count: number; net: number; vat: number; gross: number };
    withoutVat: { count: number; net: number; gross: number };
  }>;
  expensesByCategory: Array<{
    id: string | null;
    nameEn: string;
    nameAr: string;
    kind: string;
    color: string;
    count: number;
    net: number;
    inputVat: number;
    gross: number;
  }>;
  expensesByKind: Record<"cost_of_sales" | "operating" | "payroll", number>;
  expensesByScope: Record<"deal" | "client" | "internal", number>;
  monthly: Array<{
    month: string;
    revenueNet: number;
    costOfSales: number;
    operating: number;
    payroll: number;
    profit: number;
  }>;
  revenueByClient: Array<{
    clientId: string;
    name: string;
    net: number;
    invoices: number;
  }>;
  dealProfitability: Array<{
    dealId: string;
    title: string;
    revenueNet: number;
    costsNet: number;
    margin: number;
    marginPercent: number;
  }>;
  claims: { paidCount: number; paidAmount: number; outstandingAmount: number };
  vat: {
    output: number;
    inputRecoverable: number;
    inputNonRecoverable: number;
    netPayable: number;
    hasVatDocuments: boolean;
    otherTaxes: number;
  };
}

const monthKey = (d: Date) => d.toISOString().slice(0, 7);
const clientName = (
  c:
    | {
        firstName?: string;
        lastName?: string | null;
        companyName?: string | null;
      }
    | null
    | undefined,
) =>
  c ? c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ") : "";

/**
 * Line-level detail behind the summary: every invoice in the period (any currency, with and without
 * VAT), and company-currency breakdowns of costs, monthly results, clients, deals and the VAT position. Amounts
 * in the breakdowns are net of VAT; payroll comes from paid payroll runs plus payroll-type expenses.
 */
export async function getFinancialReportDetail(filters: {
  dateFrom?: Date;
  dateTo?: Date;
  basis?: "cash" | "accrual";
}): Promise<FinancialReportDetail> {
  const FUNCTIONAL_CURRENCY = await companyCurrency();
  const basis = filters.basis || "cash";

  const dateFromStr = filters.dateFrom?.toISOString().slice(0, 10);
  const dateToStr = filters.dateTo?.toISOString().slice(0, 10);

  const inRange = (dStr?: string) => {
    if (!dStr) return true;
    const s = String(dStr).slice(0, 10);
    if (dateFromStr && s < dateFromStr) return false;
    if (dateToStr && s > dateToStr) return false;
    return true;
  };

  const [
    apiInvoices,
    apiExpenses,
    apiPayments,
    apiContacts,
    apiCategories,
  ] = await Promise.all([
    listInvoices().catch(() => []),
    listExpenses().catch(() => []),
    listPayments().catch(() => []),
    listContacts().catch(() => []),
    listExpenseCategories().catch(() => []),
  ]);

  const contactMap = new Map((apiContacts || []).map((c: any) => [c.id, c]));
  const categoryMap = new Map((apiCategories || []).map((c: any) => [c.id, c]));
  const paymentsByInvoice = new Map<string, Array<{ amount: number }>>();
  for (const p of (apiPayments || [])) {
    if (p.invoiceId) {
      const arr = paymentsByInvoice.get(p.invoiceId) || [];
      arr.push({ amount: Number((p as any).amount ?? (p as any).amountPaid ?? 0) });
      paymentsByInvoice.set(p.invoiceId, arr);
    }
  }

  const invoiceRows = (apiInvoices || [])
    .filter((inv) => inv.status !== "void" && inv.status !== "draft" && inRange(inv.issueDate))
    .map((inv) => {
      const c = inv.contactId ? contactMap.get(inv.contactId) : undefined;
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate ? new Date(inv.issueDate) : new Date(),
        status: inv.status,
        currency: inv.currency || FUNCTIONAL_CURRENCY,
        subtotal: Number(inv.subtotal ?? 0),
        discountAmount: Number(inv.discount ?? 0),
        vatAmount: Number(inv.vatAmount ?? 0),
        otherTaxAmount: 0,
        vatEnabled: Number(inv.vatAmount ?? 0) > 0,
        totalAmount: Number(inv.total ?? 0),
        clientId: inv.contactId || "",
        dealId: inv.dealId || "",
        client: c ? { firstName: c.firstName || "", lastName: c.lastName || "", companyName: c.company || c.companyName || "" } : null,
        payments: paymentsByInvoice.get(inv.id) || [],
      };
    });

  const expenseRows = (apiExpenses || [])
    .filter((e) => (!e.currency || e.currency === FUNCTIONAL_CURRENCY) && e.status !== "rejected" && inRange(e.expenseDate))
    .map((e) => {
      const cat = e.categoryId ? categoryMap.get(e.categoryId) : undefined;
      return {
        amount: Number(e.amount ?? 0),
        netAmount: Number(e.amount ?? 0),
        inputVatAmount: 0,
        isVatRecoverable: false,
        expenseDate: e.expenseDate ? new Date(e.expenseDate) : new Date(),
        scope: "internal",
        dealId: null,
        categoryId: e.categoryId || null,
        category: cat ? { nameEn: cat.nameEn || "", nameAr: cat.nameAr || "", kind: "operating", color: "#09937F" } : null,
      };
    });

  const invoiceMap = new Map((apiInvoices || []).map((i) => [i.id, i]));
  const payments = (apiPayments || [])
    .filter((p) => (!p.currency || p.currency === FUNCTIONAL_CURRENCY) && p.status !== "void" && inRange(p.paymentDate))
    .map((p) => {
      const inv = p.invoiceId ? invoiceMap.get(p.invoiceId) : undefined;
      return {
        amount: Number((p as any).amount ?? (p as any).amountPaid ?? 0),
        paymentDate: p.paymentDate ? new Date(p.paymentDate) : new Date(),
        invoice: inv ? {
          totalAmount: Number(inv.total ?? 0),
          vatAmount: Number(inv.vatAmount ?? 0),
          otherTaxAmount: 0,
        } : null,
      };
    });

  const payrollRuns: any[] = [];
  const claimsPaid = { _sum: { amount: 0 }, _count: { _all: 0 } };
  const claimsOutstanding = { _sum: { amount: 0 } };

  // Invoice register and with/without-VAT totals per currency.
  const invoices: InvoiceRegisterRow[] = invoiceRows.map((inv) => {
    const gross = Number(inv.totalAmount);
    const vat = Number(inv.vatAmount);
    const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      id: inv.id,
      number: inv.invoiceNumber,
      issueDate: inv.issueDate.toISOString().slice(0, 10),
      client: clientName(inv.client),
      status: inv.status,
      currency: inv.currency,
      vatApplied: inv.vatEnabled && vat > 0,
      net: roundReportValue(Number(inv.subtotal) - Number(inv.discountAmount)),
      vat: roundReportValue(vat),
      otherTaxes: roundReportValue(Number(inv.otherTaxAmount ?? 0)),
      gross: roundReportValue(gross),
      paid: roundReportValue(paid),
      due: roundReportValue(Math.max(0, gross - paid)),
    };
  });
  const totalsByCurrency = new Map<
    string,
    FinancialReportDetail["invoiceTotals"][number]
  >();
  for (const inv of invoices) {
    const t = totalsByCurrency.get(inv.currency) ?? {
      currency: inv.currency,
      withVat: { count: 0, net: 0, vat: 0, gross: 0 },
      withoutVat: { count: 0, net: 0, gross: 0 },
    };
    if (inv.vatApplied) {
      t.withVat.count++;
      t.withVat.net = roundReportValue(t.withVat.net + inv.net);
      t.withVat.vat = roundReportValue(t.withVat.vat + inv.vat);
      t.withVat.gross = roundReportValue(t.withVat.gross + inv.gross);
    } else {
      t.withoutVat.count++;
      t.withoutVat.net = roundReportValue(t.withoutVat.net + inv.net);
      t.withoutVat.gross = roundReportValue(t.withoutVat.gross + inv.gross);
    }
    totalsByCurrency.set(inv.currency, t);
  }

  // Costs by category, type and scope (BHD, net of VAT).
  const byCategory = new Map<
    string,
    FinancialReportDetail["expensesByCategory"][number]
  >();
  const expensesByKind = { cost_of_sales: 0, operating: 0, payroll: 0 };
  const expensesByScope = { deal: 0, client: 0, internal: 0 };
  const months = new Map<
    string,
    {
      revenueNet: number;
      costOfSales: number;
      operating: number;
      payroll: number;
    }
  >();
  const month = (key: string) => {
    const m = months.get(key) ?? {
      revenueNet: 0,
      costOfSales: 0,
      operating: 0,
      payroll: 0,
    };
    months.set(key, m);
    return m;
  };
  const dealCosts = new Map<string, number>();
  let inputRecoverable = 0;
  let inputNonRecoverable = 0;
  for (const e of expenseRows) {
    const gross = Number(e.amount);
    const inputVat = Number(e.inputVatAmount);
    const stored = Number(e.netAmount);
    // Non-recoverable VAT is a real cost, so it stays in the expense.
    const net =
      (stored > 0 ? stored : gross - inputVat) +
      (e.isVatRecoverable ? 0 : inputVat);
    if (e.isVatRecoverable) inputRecoverable += inputVat;
    else inputNonRecoverable += inputVat;
    const kind = (e.category?.kind ??
      "operating") as keyof typeof expensesByKind;
    const key = e.categoryId ?? "none";
    const row = byCategory.get(key) ?? {
      id: e.categoryId,
      nameEn: e.category?.nameEn ?? "Uncategorised",
      nameAr: e.category?.nameAr ?? "غير مصنف",
      kind,
      color: e.category?.color ?? "#9EADA9",
      count: 0,
      net: 0,
      inputVat: 0,
      gross: 0,
    };
    row.count++;
    row.net = roundReportValue(row.net + net);
    row.inputVat = roundReportValue(row.inputVat + inputVat);
    row.gross = roundReportValue(row.gross + gross);
    byCategory.set(key, row);
    expensesByKind[kind] = roundReportValue(expensesByKind[kind] + net);
    const scope = (e.scope ?? "internal") as keyof typeof expensesByScope;
    expensesByScope[scope] = roundReportValue(expensesByScope[scope] + net);
    const m = month(monthKey(e.expenseDate));
    if (kind === "cost_of_sales") m.costOfSales += net;
    else if (kind === "payroll") m.payroll += net;
    else m.operating += net;
    if (e.dealId) dealCosts.set(e.dealId, (dealCosts.get(e.dealId) ?? 0) + net);
  }
  for (const run of payrollRuns)
    if (run.paidAt)
      month(monthKey(run.paidAt)).payroll += Number(run.totalEmployerCost);

  // Revenue per month on the selected basis, net of VAT.
  let outputVat = 0;
  let otherTaxes = 0;
  if (basis === "cash") {
    for (const p of payments) {
      const amount = Number(p.amount);
      const total = Number(p.invoice?.totalAmount ?? 0);
      const vat =
        total > 0 ? (Number(p.invoice!.vatAmount) * amount) / total : 0;
      const other =
        total > 0
          ? (Number(p.invoice!.otherTaxAmount ?? 0) * amount) / total
          : 0;
      outputVat += vat;
      otherTaxes += other;
      month(monthKey(p.paymentDate)).revenueNet += amount - vat - other;
    }
  } else {
    for (const inv of invoices)
      if (inv.currency === FUNCTIONAL_CURRENCY) {
        outputVat += inv.vat;
        otherTaxes += inv.otherTaxes;
        month(inv.issueDate.slice(0, 7)).revenueNet += inv.net;
      }
  }

  // Clients and deals (accrual, BHD invoices in the period).
  const clients = new Map<
    string,
    { clientId: string; name: string; net: number; invoices: number }
  >();
  const dealRevenue = new Map<string, number>();
  invoiceRows.forEach((inv, i) => {
    if (inv.currency !== FUNCTIONAL_CURRENCY) return;
    const net = invoices[i].net;
    if (inv.clientId) {
      const c = clients.get(inv.clientId) ?? {
        clientId: inv.clientId,
        name: invoices[i].client,
        net: 0,
        invoices: 0,
      };
      c.net = roundReportValue(c.net + net);
      c.invoices++;
      clients.set(inv.clientId, c);
    }
    if (inv.dealId)
      dealRevenue.set(inv.dealId, (dealRevenue.get(inv.dealId) ?? 0) + net);
  });
  const dealIds = Array.from(
    new Set(
      Array.from(dealRevenue.keys()).concat(Array.from(dealCosts.keys())),
    ),
  );
  const dealTitles = new Map(
    (
      await db.crmDeal.findMany({
        where: { id: { in: dealIds } },
        select: { id: true, title: true },
      })
    ).map((d) => [d.id, d.title]),
  );
  const dealProfitability = dealIds
    .map((dealId) => {
      const revenueNet = roundReportValue(dealRevenue.get(dealId) ?? 0);
      const costsNet = roundReportValue(dealCosts.get(dealId) ?? 0);
      const margin = roundReportValue(revenueNet - costsNet);
      return {
        dealId,
        title: String(dealTitles.get(dealId) ?? dealId),
        revenueNet,
        costsNet,
        margin,
        marginPercent:
          revenueNet > 0 ? Math.round((margin / revenueNet) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.revenueNet - a.revenueNet)
    .slice(0, 15);

  return {
    reportingCurrency: FUNCTIONAL_CURRENCY,
    invoices,
    invoiceTotals: Array.from(totalsByCurrency.values()),
    expensesByCategory: Array.from(byCategory.values()).sort(
      (a, b) => b.net - a.net,
    ),
    expensesByKind,
    expensesByScope,
    monthly: Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, m]) => ({
        month: key,
        revenueNet: roundReportValue(m.revenueNet),
        costOfSales: roundReportValue(m.costOfSales),
        operating: roundReportValue(m.operating),
        payroll: roundReportValue(m.payroll),
        profit: roundReportValue(m.revenueNet - m.costOfSales - m.operating - m.payroll),
      })),
    revenueByClient: Array.from(clients.values())
      .sort((a, b) => b.net - a.net)
      .slice(0, 10),
    dealProfitability,
    claims: {
      paidCount: claimsPaid._count._all,
      paidAmount: roundReportValue(Number(claimsPaid._sum.amount ?? 0)),
      outstandingAmount: roundReportValue(Number(claimsOutstanding._sum.amount ?? 0)),
    },
    vat: {
      output: roundReportValue(outputVat),
      inputRecoverable: roundReportValue(inputRecoverable),
      inputNonRecoverable: roundReportValue(inputNonRecoverable),
      netPayable: roundReportValue(outputVat - inputRecoverable),
      otherTaxes: roundReportValue(otherTaxes),
      hasVatDocuments:
        invoices.some((i) => i.vatApplied) ||
        inputRecoverable + inputNonRecoverable > 0,
    },
  };
}

/** Detail sections appended to the summary CSV: monthly results, invoice register and costs by category. */
export function generateFinancialDetailCsv(
  detail: FinancialReportDetail,
  showVat: boolean,
  options: FinancialCsvOptions = {},
): string {
  const t = getTranslations(isLocale(options.locale) ? options.locale : "en").admin;
  const c = t.financialCsv;
  const currency = options.currency ?? detail.reportingCurrency;
  const row = (...cells: unknown[]) => cells.map(escapeCsvField).join(",");
  const lines = [
    "",
    row(formatMessage(c.monthlyResults, { currency })),
    row(c.month, c.revenue, c.projectCosts, c.operating, c.payroll, c.profit),
  ];
  for (const m of detail.monthly)
    lines.push(
      row(
        m.month,
        m.revenueNet.toFixed(getCurrencyDecimals(currency)),
        m.costOfSales.toFixed(getCurrencyDecimals(currency)),
        m.operating.toFixed(getCurrencyDecimals(currency)),
        m.payroll.toFixed(getCurrencyDecimals(currency)),
        m.profit.toFixed(getCurrencyDecimals(currency)),
      ),
    );
  lines.push("", row(c.invoiceRegister));
  lines.push(
    showVat
      ? row(
          c.invoice,
          c.date,
          c.client,
          c.status,
          c.currency,
          c.vatApplied,
          c.net,
          c.vat,
          c.gross,
          c.paid,
          c.due,
        )
      : row(
          c.invoice,
          c.date,
          c.client,
          c.status,
          c.currency,
          c.amount,
          c.paid,
          c.due,
        ),
  );
  for (const i of detail.invoices)
    lines.push(
      showVat
        ? row(
            i.number,
            i.issueDate,
            i.client,
            (t.statusLabels as Record<string, string>)[i.status] ?? i.status,
            i.currency,
            i.vatApplied ? c.yes : c.no,
            i.net.toFixed(getCurrencyDecimals(i.currency)),
            i.vat.toFixed(getCurrencyDecimals(i.currency)),
            i.gross.toFixed(getCurrencyDecimals(i.currency)),
            i.paid.toFixed(getCurrencyDecimals(i.currency)),
            i.due.toFixed(getCurrencyDecimals(i.currency)),
          )
        : row(
            i.number,
            i.issueDate,
            i.client,
            (t.statusLabels as Record<string, string>)[i.status] ?? i.status,
            i.currency,
            i.gross.toFixed(getCurrencyDecimals(i.currency)),
            i.paid.toFixed(getCurrencyDecimals(i.currency)),
            i.due.toFixed(getCurrencyDecimals(i.currency)),
          ),
    );
  lines.push(
    "",
    row(formatMessage(c.costsByCategory, { currency })),
    row(
      c.category,
      c.type,
      c.expenses,
      c.net,
      ...(showVat ? [c.inputVat, c.gross] : []),
    ),
  );
  for (const c of detail.expensesByCategory)
    lines.push(
      row(
        options.locale === "ar" ? c.nameAr : c.nameEn,
        c.kind,
        c.count,
        c.net.toFixed(getCurrencyDecimals(currency)),
        ...(showVat ? [c.inputVat.toFixed(getCurrencyDecimals(currency)), c.gross.toFixed(getCurrencyDecimals(currency))] : []),
      ),
    );
  if (showVat) {
    lines.push("", row(formatMessage(c.vatPosition, { currency })));
    lines.push(
      row(c.outputVat, detail.vat.output.toFixed(getCurrencyDecimals(currency))),
      row(c.recoverableInput, detail.vat.inputRecoverable.toFixed(getCurrencyDecimals(currency))),
      row(c.netPayable, detail.vat.netPayable.toFixed(getCurrencyDecimals(currency))),
    );
  }
  return lines.join("\n");
}
