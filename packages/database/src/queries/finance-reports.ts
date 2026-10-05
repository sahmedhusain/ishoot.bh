import { db } from "../db";
import { FUNCTIONAL_CURRENCY } from "../constants/finance";

export interface FinancialSummaryReport {
  basis: "cash" | "accrual";
  reportingCurrency: "BHD";
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
  const basis = filters.basis || "cash";
  const dateFilter: any = {};
  if (filters.dateFrom) dateFilter.gte = filters.dateFrom;
  if (filters.dateTo) dateFilter.lte = filters.dateTo;

  // 1. Invoices (Accrual basis)
  // Only the functional currency is summed; mixing currencies under a BHD label is wrong.
  const invoiceWhere: any = {
    status: { notIn: ["void", "draft"] },
    currency: FUNCTIONAL_CURRENCY,
  };
  if (filters.dateFrom || filters.dateTo) {
    invoiceWhere.issueDate = dateFilter;
  }

  const invoices = await db.invoice.findMany({
    where: invoiceWhere,
    select: {
      totalAmount: true,
      subtotal: true,
      discountAmount: true,
      vatAmount: true,
      vatEnabled: true,
      currency: true,
    },
  });

  let invoicedGross = 0;
  let invoicedNet = 0;
  let invoicedOutputVat = 0;

  for (const inv of invoices) {
    const total = Number(inv.totalAmount);
    // Net sales are after discount and before VAT.
    const net = Number(inv.subtotal) - Number(inv.discountAmount);
    const vat = Number(inv.vatAmount);
    invoicedGross += total;
    invoicedNet += net;
    invoicedOutputVat += vat;
  }

  // 2. Payments (Cash basis)
  const paymentWhere: any = { currency: FUNCTIONAL_CURRENCY, invoice: { status: { not: "void" } } };
  if (filters.dateFrom || filters.dateTo) {
    paymentWhere.paymentDate = dateFilter;
  }

  const payments = await db.payment.findMany({
    where: paymentWhere,
    include: {
      invoice: {
        select: {
          subtotal: true,
          totalAmount: true,
          vatAmount: true,
          vatEnabled: true,
        },
      },
    },
  });

  let cashGrossReceipts = 0;
  let cashNetReceipts = 0;
  let cashOutputVat = 0;

  for (const p of payments) {
    const amount = Number(p.amount);
    cashGrossReceipts += amount;

    if (p.invoice && Number(p.invoice.totalAmount) > 0) {
      const invTotal = Number(p.invoice.totalAmount);
      const invVat = Number(p.invoice.vatAmount);
      const ratio = amount / invTotal;
      const allocatedVat = Math.round(invVat * ratio * 1000) / 1000;
      cashOutputVat += allocatedVat;
      cashNetReceipts += Math.round((amount - allocatedVat) * 1000) / 1000;
    } else {
      cashNetReceipts += amount;
    }
  }

  // 3. Expenses & VAT Recoverability
  const expenseWhere: any = { currency: FUNCTIONAL_CURRENCY, status: "approved" };
  if (filters.dateFrom || filters.dateTo) {
    expenseWhere.expenseDate = dateFilter;
  }

  const expenses = await db.expense.findMany({
    where: expenseWhere,
    select: {
      amount: true,
      netAmount: true,
      inputVatAmount: true,
      isVatRecoverable: true,
    },
  });

  let totalExpensesGross = 0;
  let expensesNet = 0;
  let inputVatTotal = 0;
  let inputVatRecoverable = 0;
  let inputVatNonRecoverable = 0;

  for (const exp of expenses) {
    const amt = Number(exp.amount);
    const inputVat = Number(exp.inputVatAmount);
    // Prisma Decimals are always truthy, and older rows stored 0 here, so derive net when it was never set.
    const storedNet = Number(exp.netAmount);
    const net = storedNet > 0 ? storedNet : amt - inputVat;

    totalExpensesGross += amt;
    expensesNet += net;
    inputVatTotal += inputVat;

    if (exp.isVatRecoverable) {
      inputVatRecoverable += inputVat;
    } else {
      inputVatNonRecoverable += inputVat;
    }
  }

  // 4. Payroll Costs (Paid runs in period)
  const payrollWhere: any = { status: "paid" };
  if (filters.dateFrom || filters.dateTo) {
    payrollWhere.paidAt = dateFilter;
  }

  const payrollRuns = await db.payrollRun.findMany({
    where: payrollWhere,
    select: { totalEmployerCost: true },
  });

  let payrollCostsTotal = 0;
  for (const pr of payrollRuns) {
    payrollCostsTotal += Number(pr.totalEmployerCost);
  }

  // 5. Bank Settlements & Realized FX
  const settlementWhere: any = { status: "settled" };
  if (filters.dateFrom || filters.dateTo) {
    settlementWhere.settlementDate = dateFilter;
  }

  const settlements = await db.bankSettlement.findMany({
    where: settlementWhere,
    select: {
      bankFeeBhd: true,
      fxGainLossBhd: true,
    },
  });

  let bankFeesTotal = 0;
  let realizedFxGainLoss = 0;

  for (const s of settlements) {
    bankFeesTotal += Number(s.bankFeeBhd);
    realizedFxGainLoss += Number(s.fxGainLossBhd);
  }

  const [foreignInvoices, foreignExpenses] = await Promise.all([
    db.invoice.count({ where: { ...invoiceWhere, currency: { not: FUNCTIONAL_CURRENCY } } }),
    db.expense.count({ where: { ...expenseWhere, currency: { not: FUNCTIONAL_CURRENCY } } }),
  ]);

  // 6. Operating Profit
  // P0 finding: profit must NOT be calculated from VAT-inclusive payments and expenses!
  // Operating costs = expensesNet + inputVatNonRecoverable + payrollCostsTotal + bankFeesTotal
  const effectiveRevenue = basis === "cash" ? cashNetReceipts : invoicedNet;
  const effectiveOperatingCosts =
    expensesNet + inputVatNonRecoverable + payrollCostsTotal + bankFeesTotal;

  const operatingProfit =
    Math.round((effectiveRevenue - effectiveOperatingCosts + realizedFxGainLoss) * 1000) / 1000;

  const netMarginPercentage =
    effectiveRevenue > 0 ? Math.round((operatingProfit / effectiveRevenue) * 10000) / 100 : 0;

  return {
    basis,
    reportingCurrency: "BHD",
    excludedForeignCurrencyDocuments: foreignInvoices + foreignExpenses,
    periodStart: filters.dateFrom?.toISOString(),
    periodEnd: filters.dateTo?.toISOString(),
    invoicedGross: Math.round(invoicedGross * 1000) / 1000,
    invoicedNet: Math.round(invoicedNet * 1000) / 1000,
    invoicedOutputVat: Math.round(invoicedOutputVat * 1000) / 1000,
    cashGrossReceipts: Math.round(cashGrossReceipts * 1000) / 1000,
    cashNetReceipts: Math.round(cashNetReceipts * 1000) / 1000,
    cashOutputVat: Math.round(cashOutputVat * 1000) / 1000,
    totalExpensesGross: Math.round(totalExpensesGross * 1000) / 1000,
    expensesNet: Math.round(expensesNet * 1000) / 1000,
    inputVatTotal: Math.round(inputVatTotal * 1000) / 1000,
    inputVatRecoverable: Math.round(inputVatRecoverable * 1000) / 1000,
    inputVatNonRecoverable: Math.round(inputVatNonRecoverable * 1000) / 1000,
    payrollCostsTotal: Math.round(payrollCostsTotal * 1000) / 1000,
    bankFeesTotal: Math.round(bankFeesTotal * 1000) / 1000,
    realizedFxGainLoss: Math.round(realizedFxGainLoss * 1000) / 1000,
    operatingProfit,
    netMarginPercentage,
  };
}

export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val);
  // Formula injection defense: disallow leading =, +, -, @
  if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateFinancialSummaryCsv(report: FinancialSummaryReport): string {
  const lines: string[] = [
    `"ishoot Media - Financial Summary Report"`,
    `"Basis",${escapeCsvField(report.basis)}`,
    `"Currency",${escapeCsvField(report.reportingCurrency)}`,
    `"Period Start",${escapeCsvField(report.periodStart || "All time")}`,
    `"Period End",${escapeCsvField(report.periodEnd || "Present")}`,
    "",
    `"Metric","Amount (BHD)"`,
    `"Invoiced Sales (Gross)",${report.invoicedGross.toFixed(3)}`,
    `"Invoiced Sales (Net of VAT)",${report.invoicedNet.toFixed(3)}`,
    `"Output VAT Invoiced",${report.invoicedOutputVat.toFixed(3)}`,
    `"Cash Receipts (Gross)",${report.cashGrossReceipts.toFixed(3)}`,
    `"Cash Receipts (Net of VAT)",${report.cashNetReceipts.toFixed(3)}`,
    `"Cash Output VAT Collected",${report.cashOutputVat.toFixed(3)}`,
    `"Operating Expenses (Gross)",${report.totalExpensesGross.toFixed(3)}`,
    `"Operating Expenses (Net of VAT)",${report.expensesNet.toFixed(3)}`,
    `"Input VAT (Total Paid)",${report.inputVatTotal.toFixed(3)}`,
    `"Input VAT (Recoverable)",${report.inputVatRecoverable.toFixed(3)}`,
    `"Input VAT (Non-Recoverable Cost)",${report.inputVatNonRecoverable.toFixed(3)}`,
    `"Payroll & Benefits Costs",${report.payrollCostsTotal.toFixed(3)}`,
    `"Bank Fees",${report.bankFeesTotal.toFixed(3)}`,
    `"Realized FX Gain/Loss",${report.realizedFxGainLoss.toFixed(3)}`,
    `"Operating Net Profit",${report.operatingProfit.toFixed(3)}`,
    `"Net Profit Margin (%)",${report.netMarginPercentage.toFixed(2)}%`,
  ];

  return lines.join("\n");
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

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
  gross: number;
  paid: number;
  due: number;
}

export interface FinancialReportDetail {
  invoices: InvoiceRegisterRow[];
  invoiceTotals: Array<{ currency: string; withVat: { count: number; net: number; vat: number; gross: number }; withoutVat: { count: number; net: number; gross: number } }>;
  expensesByCategory: Array<{ id: string | null; nameEn: string; nameAr: string; kind: string; color: string; count: number; net: number; inputVat: number; gross: number }>;
  expensesByKind: Record<"cost_of_sales" | "operating" | "payroll", number>;
  expensesByScope: Record<"deal" | "client" | "internal", number>;
  monthly: Array<{ month: string; revenueNet: number; costOfSales: number; operating: number; payroll: number; profit: number }>;
  revenueByClient: Array<{ clientId: string; name: string; net: number; invoices: number }>;
  dealProfitability: Array<{ dealId: string; title: string; revenueNet: number; costsNet: number; margin: number; marginPercent: number }>;
  claims: { paidCount: number; paidAmount: number; outstandingAmount: number };
  vat: { output: number; inputRecoverable: number; inputNonRecoverable: number; netPayable: number; hasVatDocuments: boolean };
}

const monthKey = (d: Date) => d.toISOString().slice(0, 7);
const clientName = (c: { firstName?: string; lastName?: string | null; companyName?: string | null } | null | undefined) =>
  c ? c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ") : "";

/**
 * Line-level detail behind the summary: every invoice in the period (any currency, with and without
 * VAT), and BHD breakdowns of costs, monthly results, clients, deals and the VAT position. Amounts
 * in the breakdowns are net of VAT; payroll comes from paid payroll runs plus payroll-type expenses.
 */
export async function getFinancialReportDetail(filters: { dateFrom?: Date; dateTo?: Date; basis?: "cash" | "accrual" }): Promise<FinancialReportDetail> {
  const basis = filters.basis || "cash";
  const range = filters.dateFrom || filters.dateTo ? { ...(filters.dateFrom && { gte: filters.dateFrom }), ...(filters.dateTo && { lte: filters.dateTo }) } : undefined;

  const [invoiceRows, expenseRows, payrollRuns, payments, claimsPaid, claimsOutstanding] = await Promise.all([
    db.invoice.findMany({
      where: { status: { notIn: ["void", "draft"] }, ...(range && { issueDate: range }) },
      select: {
        id: true, invoiceNumber: true, issueDate: true, status: true, currency: true, subtotal: true, discountAmount: true,
        vatAmount: true, vatEnabled: true, totalAmount: true, clientId: true, dealId: true,
        client: { select: { firstName: true, lastName: true, companyName: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { issueDate: "desc" },
    }),
    db.expense.findMany({
      where: { status: "approved", currency: FUNCTIONAL_CURRENCY, ...(range && { expenseDate: range }) },
      select: { amount: true, netAmount: true, inputVatAmount: true, isVatRecoverable: true, expenseDate: true, scope: true, dealId: true, categoryId: true, category: { select: { nameEn: true, nameAr: true, kind: true, color: true } } },
    }),
    db.payrollRun.findMany({ where: { status: "paid", ...(range && { paidAt: range }) }, select: { totalEmployerCost: true, paidAt: true } }),
    db.payment.findMany({
      where: { currency: FUNCTIONAL_CURRENCY, invoice: { status: { not: "void" } }, ...(range && { paymentDate: range }) },
      select: { amount: true, paymentDate: true, invoice: { select: { totalAmount: true, vatAmount: true } } },
    }),
    db.expenseClaim.aggregate({ where: { status: "paid", currency: FUNCTIONAL_CURRENCY, ...(range && { paidAt: range }) }, _sum: { amount: true }, _count: { _all: true } }),
    db.expenseClaim.aggregate({ where: { status: { in: ["approved", "scheduled"] }, currency: FUNCTIONAL_CURRENCY }, _sum: { amount: true } }),
  ]);

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
      net: r3(Number(inv.subtotal) - Number(inv.discountAmount)),
      vat: r3(vat),
      gross: r3(gross),
      paid: r3(paid),
      due: r3(Math.max(0, gross - paid)),
    };
  });
  const totalsByCurrency = new Map<string, FinancialReportDetail["invoiceTotals"][number]>();
  for (const inv of invoices) {
    const t = totalsByCurrency.get(inv.currency) ?? { currency: inv.currency, withVat: { count: 0, net: 0, vat: 0, gross: 0 }, withoutVat: { count: 0, net: 0, gross: 0 } };
    if (inv.vatApplied) {
      t.withVat.count++; t.withVat.net = r3(t.withVat.net + inv.net); t.withVat.vat = r3(t.withVat.vat + inv.vat); t.withVat.gross = r3(t.withVat.gross + inv.gross);
    } else {
      t.withoutVat.count++; t.withoutVat.net = r3(t.withoutVat.net + inv.net); t.withoutVat.gross = r3(t.withoutVat.gross + inv.gross);
    }
    totalsByCurrency.set(inv.currency, t);
  }

  // Costs by category, type and scope (BHD, net of VAT).
  const byCategory = new Map<string, FinancialReportDetail["expensesByCategory"][number]>();
  const expensesByKind = { cost_of_sales: 0, operating: 0, payroll: 0 };
  const expensesByScope = { deal: 0, client: 0, internal: 0 };
  const months = new Map<string, { revenueNet: number; costOfSales: number; operating: number; payroll: number }>();
  const month = (key: string) => {
    const m = months.get(key) ?? { revenueNet: 0, costOfSales: 0, operating: 0, payroll: 0 };
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
    const net = (stored > 0 ? stored : gross - inputVat) + (e.isVatRecoverable ? 0 : inputVat);
    if (e.isVatRecoverable) inputRecoverable += inputVat;
    else inputNonRecoverable += inputVat;
    const kind = (e.category?.kind ?? "operating") as keyof typeof expensesByKind;
    const key = e.categoryId ?? "none";
    const row = byCategory.get(key) ?? { id: e.categoryId, nameEn: e.category?.nameEn ?? "Uncategorised", nameAr: e.category?.nameAr ?? "غير مصنف", kind, color: e.category?.color ?? "#9EADA9", count: 0, net: 0, inputVat: 0, gross: 0 };
    row.count++; row.net = r3(row.net + net); row.inputVat = r3(row.inputVat + inputVat); row.gross = r3(row.gross + gross);
    byCategory.set(key, row);
    expensesByKind[kind] = r3(expensesByKind[kind] + net);
    const scope = (e.scope ?? "internal") as keyof typeof expensesByScope;
    expensesByScope[scope] = r3(expensesByScope[scope] + net);
    const m = month(monthKey(e.expenseDate));
    if (kind === "cost_of_sales") m.costOfSales += net;
    else if (kind === "payroll") m.payroll += net;
    else m.operating += net;
    if (e.dealId) dealCosts.set(e.dealId, (dealCosts.get(e.dealId) ?? 0) + net);
  }
  for (const run of payrollRuns) if (run.paidAt) month(monthKey(run.paidAt)).payroll += Number(run.totalEmployerCost);

  // Revenue per month on the selected basis, net of VAT.
  let outputVat = 0;
  if (basis === "cash") {
    for (const p of payments) {
      const amount = Number(p.amount);
      const total = Number(p.invoice?.totalAmount ?? 0);
      const vat = total > 0 ? (Number(p.invoice!.vatAmount) * amount) / total : 0;
      outputVat += vat;
      month(monthKey(p.paymentDate)).revenueNet += amount - vat;
    }
  } else {
    for (const inv of invoices) if (inv.currency === FUNCTIONAL_CURRENCY) {
      outputVat += inv.vat;
      month(inv.issueDate.slice(0, 7)).revenueNet += inv.net;
    }
  }

  // Clients and deals (accrual, BHD invoices in the period).
  const clients = new Map<string, { clientId: string; name: string; net: number; invoices: number }>();
  const dealRevenue = new Map<string, number>();
  invoiceRows.forEach((inv, i) => {
    if (inv.currency !== FUNCTIONAL_CURRENCY) return;
    const net = invoices[i].net;
    if (inv.clientId) {
      const c = clients.get(inv.clientId) ?? { clientId: inv.clientId, name: invoices[i].client, net: 0, invoices: 0 };
      c.net = r3(c.net + net); c.invoices++;
      clients.set(inv.clientId, c);
    }
    if (inv.dealId) dealRevenue.set(inv.dealId, (dealRevenue.get(inv.dealId) ?? 0) + net);
  });
  const dealIds = Array.from(new Set(Array.from(dealRevenue.keys()).concat(Array.from(dealCosts.keys()))));
  const dealTitles = new Map((await db.crmDeal.findMany({ where: { id: { in: dealIds } }, select: { id: true, title: true } })).map((d) => [d.id, d.title]));
  const dealProfitability = dealIds
    .map((dealId) => {
      const revenueNet = r3(dealRevenue.get(dealId) ?? 0);
      const costsNet = r3(dealCosts.get(dealId) ?? 0);
      const margin = r3(revenueNet - costsNet);
      return { dealId, title: dealTitles.get(dealId) ?? dealId, revenueNet, costsNet, margin, marginPercent: revenueNet > 0 ? Math.round((margin / revenueNet) * 1000) / 10 : 0 };
    })
    .sort((a, b) => b.revenueNet - a.revenueNet)
    .slice(0, 15);

  return {
    invoices,
    invoiceTotals: Array.from(totalsByCurrency.values()),
    expensesByCategory: Array.from(byCategory.values()).sort((a, b) => b.net - a.net),
    expensesByKind,
    expensesByScope,
    monthly: Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, m]) => ({
        month: key,
        revenueNet: r3(m.revenueNet),
        costOfSales: r3(m.costOfSales),
        operating: r3(m.operating),
        payroll: r3(m.payroll),
        profit: r3(m.revenueNet - m.costOfSales - m.operating - m.payroll),
      })),
    revenueByClient: Array.from(clients.values()).sort((a, b) => b.net - a.net).slice(0, 10),
    dealProfitability,
    claims: { paidCount: claimsPaid._count._all, paidAmount: r3(Number(claimsPaid._sum.amount ?? 0)), outstandingAmount: r3(Number(claimsOutstanding._sum.amount ?? 0)) },
    vat: {
      output: r3(outputVat),
      inputRecoverable: r3(inputRecoverable),
      inputNonRecoverable: r3(inputNonRecoverable),
      netPayable: r3(outputVat - inputRecoverable),
      hasVatDocuments: invoices.some((i) => i.vatApplied) || inputRecoverable + inputNonRecoverable > 0,
    },
  };
}

/** Detail sections appended to the summary CSV: monthly results, invoice register and costs by category. */
export function generateFinancialDetailCsv(detail: FinancialReportDetail, showVat: boolean): string {
  const row = (...cells: unknown[]) => cells.map(escapeCsvField).join(",");
  const lines = ["", row("Monthly results (BHD, net of VAT)"), row("Month", "Revenue", "Project costs", "Operating", "Payroll", "Profit")];
  for (const m of detail.monthly) lines.push(row(m.month, m.revenueNet.toFixed(3), m.costOfSales.toFixed(3), m.operating.toFixed(3), m.payroll.toFixed(3), m.profit.toFixed(3)));
  lines.push("", row("Invoice register"));
  lines.push(showVat ? row("Invoice", "Date", "Client", "Status", "Currency", "VAT applied", "Net", "VAT", "Gross", "Paid", "Due") : row("Invoice", "Date", "Client", "Status", "Currency", "Amount", "Paid", "Due"));
  for (const i of detail.invoices)
    lines.push(
      showVat
        ? row(i.number, i.issueDate, i.client, i.status, i.currency, i.vatApplied ? "yes" : "no", i.net.toFixed(3), i.vat.toFixed(3), i.gross.toFixed(3), i.paid.toFixed(3), i.due.toFixed(3))
        : row(i.number, i.issueDate, i.client, i.status, i.currency, i.gross.toFixed(3), i.paid.toFixed(3), i.due.toFixed(3)),
    );
  lines.push("", row("Costs by category (BHD)"), row("Category", "Type", "Expenses", "Net", ...(showVat ? ["Input VAT", "Gross"] : [])));
  for (const c of detail.expensesByCategory) lines.push(row(c.nameEn, c.kind, c.count, c.net.toFixed(3), ...(showVat ? [c.inputVat.toFixed(3), c.gross.toFixed(3)] : [])));
  if (showVat) {
    lines.push("", row("VAT position (BHD)"));
    lines.push(row("Output VAT", detail.vat.output.toFixed(3)), row("Recoverable input VAT", detail.vat.inputRecoverable.toFixed(3)), row("Net VAT payable", detail.vat.netPayable.toFixed(3)));
  }
  return lines.join("\n");
}
