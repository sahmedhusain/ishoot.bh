import { db } from "../db";

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
  const invoiceWhere: any = {
    status: { notIn: ["void", "draft"] },
  };
  if (filters.dateFrom || filters.dateTo) {
    invoiceWhere.issueDate = dateFilter;
  }

  const invoices = await db.invoice.findMany({
    where: invoiceWhere,
    select: {
      totalAmount: true,
      subtotal: true,
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
    const sub = Number(inv.subtotal);
    const vat = Number(inv.vatAmount);
    invoicedGross += total;
    invoicedNet += sub;
    invoicedOutputVat += vat;
  }

  // 2. Payments (Cash basis)
  const paymentWhere: any = {};
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
  const expenseWhere: any = {};
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
    const net = exp.netAmount ? Number(exp.netAmount) : amt - inputVat;

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
