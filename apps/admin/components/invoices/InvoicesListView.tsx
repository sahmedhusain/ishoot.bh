"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import type { FinancialSummary, Quotation } from "@platform/database/types";
import { Button,StatusBadge,CurrencyDisplay } from "@platform/ui";
import { Plus, Eye, ExternalLink, FileCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

import type { InvoiceListRow } from "@platform/database";

interface InvoicesListViewProps {
  initialInvoices: InvoiceListRow[];
  finance: Pick<FinancialSummary, "outstanding" | "overdue" | "discountsGiven">;
  acceptedQuotations?: Quotation[];
}

export function InvoicesListView({
  initialInvoices,
  finance,
  acceptedQuotations = [],
}: InvoicesListViewProps) {
  const { t, isRTL } = useAdminLocale();
  const [invoices] = React.useState<InvoiceListRow[]>(initialInvoices);
  const filteredInvoices = invoices;
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.nav.invoices}
          </h1>
        </div>

        <Link href={ROUTES.invoices.create()}>
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 bg-primary hover:bg-primary/90 text-white rounded-full px-4 h-8 text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.actions.newInvoice}</span>
          </Button>
        </Link>
      </div>

      {/* Accepted Quotations Banner (Ready for Invoicing) */}
      {acceptedQuotations.length > 0 && (
        <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200/80 dark:bg-teal-950/20 dark:border-teal-900/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary text-white">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{t.invoicesList.acceptedQuotesBanner || (t.invoicesList.acceptedQuotationsReadyForInvoicing)}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-tone-95 dark:bg-tone-15 text-primary dark:text-mint">
                    {acceptedQuotations.length}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {t.invoicesList.acceptedQuotesSubtitle || (t.invoicesList.clientsAcceptedTheseQuotesYou)}
                </p>
              </div>
            </div>
            <Link href={`${ROUTES.quotations.list}?status=accepted`}>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary dark:text-mint hover:underline"
              >
                <span>{t.invoicesList.viewAll}</span>
                <ArrowIcon className="w-3.5 h-3.5 ml-1 rtl:mr-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {acceptedQuotations.slice(0, 3).map((q) => (
              <div
                key={q.id}
                className="p-3 bg-white dark:bg-surface-raised rounded-xl border border-teal-100 dark:border-teal-900/30 flex items-center justify-between gap-3 shadow-xs hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {q.quotationNumber}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {q.client?.companyName || q.client?.firstName || t.invoicesList.directClient}
                  </div>
                  <div className="text-xs font-mono font-semibold text-primary dark:text-mint mt-1">
                    {Number(q.totalAmount).toFixed(3)} {q.currency}
                  </div>
                </div>

                <Link href={ROUTES.invoices.create({ quotationId: q.id })}>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold gap-1 px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all shrink-0"
                  >
                    <span>{t.invoicesList.createInvoiceFromQuote || (t.invoicesList.createInvoice)}</span>
                    <ArrowIcon className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl shadow-xs space-y-1">
          <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            {t.kpi.receivables}
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white ">
            <CurrencyDisplay amount={finance.outstanding} currency="BHD" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl shadow-xs space-y-1">
          <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            {t.kpi.overdueAlert}
          </div>
          <div
            className={`text-xl font-bold  ${
              finance.overdue > 0
                ? "text-rose-500 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            <CurrencyDisplay amount={finance.overdue} currency="BHD" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl shadow-xs space-y-1">
          <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            {t.charts.discountsGiven}
          </div>
          <div className="text-xl font-bold text-primary dark:text-mint ">
            <CurrencyDisplay amount={finance.discountsGiven} currency="BHD" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar + Table */}
      <div className="bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-[#f8fafd] dark:bg-[#202124] border-b border-ink/15 dark:border-ink/15 text-slate-600 dark:text-neutral-400 uppercase  tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5 text-start font-semibold">{t.finance.invoiceNumber}</th>
                <th className="p-3.5 text-start font-semibold">{t.finance.client}</th>
                <th className="p-3.5 text-start font-semibold">{t.finance.issueDate}</th>
                <th className="p-3.5 text-end font-semibold">{t.finance.totalAmount}</th>
                <th className="p-3.5 text-end font-semibold">{t.finance.balanceDue}</th>
                <th className="p-3.5 text-center font-semibold">{t.finance.status}</th>
                <th className="p-3.5 text-end font-semibold">{t.nav.overview}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]/70 dark:divide-[#3c4043]/70">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <td className="p-3.5  font-bold text-slate-900 dark:text-white">
                    <Link
                      href={ROUTES.invoices.detail(inv.id)}
                      className="hover:text-primary dark:hover:text-mint transition-colors"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="p-3.5">
                    {inv.contact_id ? (
                      <Link
                        href={ROUTES.crm.customer(inv.contact_id)}
                        className="font-medium text-slate-900 dark:text-white hover:text-primary dark:hover:text-mint hover:underline transition-colors inline-flex items-center gap-1"
                      >
                        <span>
                          {inv.contact?.company ||
                            inv.contact?.full_name ||
                            t.invoicesList.clientFallback}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      </Link>
                    ) : (
                      <div className="font-medium text-slate-900 dark:text-white">
                        {inv.contact?.company ||
                          inv.contact?.full_name ||
                          t.invoicesList.clientFallback}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                      {inv.contact?.email}
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-500 dark:text-neutral-400  text-[11px]">
                    <div>{inv.issue_date}</div>
                    <div className="opacity-60">
                      {t.invoicesList.duePrefix} {inv.due_date}
                    </div>
                  </td>
                  <td className="p-3.5 text-end  font-bold text-slate-900 dark:text-white">
                    <CurrencyDisplay
                      amount={inv.total_amount}
                      currency={inv.currency}
                    />
                  </td>
                  <td className="p-3.5 text-end  font-bold">
                    {inv.amount_due > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        <CurrencyDisplay
                          amount={inv.amount_due}
                          currency={inv.currency}
                        />
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 ">
                        0.000 {inv.currency}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="p-3.5 text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={ROUTES.invoices.detail(inv.id)}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                          title={t.actions.view}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
