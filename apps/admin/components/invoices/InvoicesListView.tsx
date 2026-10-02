"use client";

import * as React from "react";
import Link from "next/link";
import type { Invoice, FinancialSummary } from "@ishoot/database/types";
import { Button, StatusBadge, CurrencyDisplay } from "@ishoot/ui";
import { Plus, Eye, Search, ExternalLink } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface InvoicesListViewProps {
  initialInvoices: Invoice[];
  finance: Pick<FinancialSummary, "outstanding" | "overdue" | "discountsGiven">;
}

export function InvoicesListView({
  initialInvoices,
  finance,
}: InvoicesListViewProps) {
  const { t, locale } = useAdminLocale();
  const [invoices] = React.useState<Invoice[]>(initialInvoices);
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = filterStatus === "all" || inv.status === filterStatus;
    const clientName = inv.contact?.company || inv.contact?.full_name || "";
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusLabels: Record<string, string> = {
    all: t.actions.all,
    draft: t.finance.statusDraft,
    sent: t.finance.statusSent,
    partially_paid: t.finance.statusPartiallyPaid,
    paid: t.finance.statusPaid,
    overdue: t.finance.statusOverdue,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.nav.invoices}
          </h1>
        </div>

        <Link href="/dashboard/invoices/new">
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 bg-[#014842] hover:bg-[#014842]/90 text-white rounded-full px-4 h-8 text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.actions.newInvoice}</span>
          </Button>
        </Link>
      </div>

      {/* KPI Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl shadow-xs space-y-1">
          <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            {t.kpi.receivables}
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white ">
            <CurrencyDisplay amount={finance.outstanding} currency="BHD" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl shadow-xs space-y-1">
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

        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl shadow-xs space-y-1">
          <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            {t.charts.discountsGiven}
          </div>
          <div className="text-xl font-bold text-[#014842] dark:text-[#7de0d1] ">
            <CurrencyDisplay amount={finance.discountsGiven} currency="BHD" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar + Table */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-xl overflow-hidden shadow-xs">
        <div className="p-3 border-b border-[#dadce0] dark:border-[#3c4043] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
            <input
              type="text"
              placeholder={t.actions.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-9 pe-4 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:border-[#09937F]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
            {["all", "draft", "sent", "partially_paid", "paid", "overdue"].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                    filterStatus === st
                      ? "bg-[#e6f5f2] text-[#014842] border border-[#014842]/30 dark:bg-[#004d40]/40 dark:text-[#7de0d1] dark:border-[#004d40] font-semibold"
                      : "text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  {statusLabels[st] || st}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-[#f8fafd] dark:bg-[#202124] border-b border-[#dadce0] dark:border-[#3c4043] text-slate-600 dark:text-neutral-400 uppercase  tracking-wider text-[11px]">
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
                      href={`/dashboard/invoices/${inv.id}`}
                      className="hover:text-[#014842] dark:hover:text-[#7de0d1] transition-colors"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="p-3.5">
                    {inv.contact_id ? (
                      <Link
                        href={`/dashboard/crm/customers/${inv.contact_id}`}
                        className="font-medium text-slate-900 dark:text-white hover:text-[#014842] dark:hover:text-[#7de0d1] hover:underline transition-colors inline-flex items-center gap-1"
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
                      <Link href={`/dashboard/invoices/${inv.id}`}>
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
