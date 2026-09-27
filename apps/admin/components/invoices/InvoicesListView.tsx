"use client";

import * as React from "react";
import Link from "next/link";
import type { Invoice, FinancialSummary } from "@ishoot/database/types";
import { Card, Button, StatusBadge, CurrencyDisplay } from "@ishoot/ui";
import { Plus, Eye, Search } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface InvoicesListViewProps {
  initialInvoices: Invoice[];
  finance: FinancialSummary;
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
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.nav.invoices}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.invoicesList.subtitle}
          </p>
        </div>

        <Link href="/dashboard/invoices/new">
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 shadow-lg shadow-[#09937F]/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.actions.newInvoice}</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-5 bg-[#0B1210] border border-white/10 space-y-1 rounded-2xl">
          <div className="text-xs text-[#9EADA9]">{t.kpi.receivables}</div>
          <div className="text-2xl font-bold text-white font-mono">
            <CurrencyDisplay amount={finance.outstanding} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#9EADA9]/60">
            {t.invoicesList.pendingPartial}
          </div>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 space-y-1 rounded-2xl">
          <div className="text-xs text-[#9EADA9]">{t.kpi.overdueAlert}</div>
          <div
            className={`text-2xl font-bold font-mono ${finance.overdue > 0 ? "text-rose-400" : "text-[#10B981]"}`}
          >
            <CurrencyDisplay amount={finance.overdue} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#9EADA9]/60">
            {finance.overdue > 0
              ? t.invoicesList.immediateAction
              : t.kpi.allOnTrack}
          </div>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 space-y-1 rounded-2xl">
          <div className="text-xs text-[#9EADA9]">
            {t.charts.discountsGiven}
          </div>
          <div className="text-2xl font-bold text-[#09937F] font-mono">
            <CurrencyDisplay amount={finance.discountsGiven} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#9EADA9]/60">
            {t.invoicesList.commercialDiscountsDesc}
          </div>
        </Card>
      </div>

      <div className="bg-[#0B1210] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-[#9EADA9] absolute start-3 top-2.5" />
            <input
              type="text"
              placeholder={t.actions.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-9 pe-4 py-1.5 text-xs rounded-xl bg-[#050807] border border-white/10 text-white placeholder:text-[#9EADA9]/60 focus:outline-none focus:border-[#09937F]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            {["all", "draft", "sent", "partially_paid", "paid", "overdue"].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterStatus === st
                      ? "bg-[#09937F] text-white font-bold"
                      : "text-[#9EADA9] hover:bg-white/5"
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
            <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider text-[11px]">
              <tr>
                <th className="p-4 text-start">{t.finance.invoiceNumber}</th>
                <th className="p-4 text-start">{t.finance.client}</th>
                <th className="p-4 text-start">{t.finance.issueDate}</th>
                <th className="p-4 text-end">{t.finance.totalAmount}</th>
                <th className="p-4 text-end">{t.finance.balanceDue}</th>
                <th className="p-4 text-center">{t.finance.status}</th>
                <th className="p-4 text-end">{t.nav.overview}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="p-4 font-mono font-bold text-white">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="hover:text-[#09937F] transition-colors"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-white">
                      {inv.contact?.company ||
                        inv.contact?.full_name ||
                        t.invoicesList.clientFallback}
                    </div>
                    <div className="text-[11px] text-[#9EADA9]">
                      {inv.contact?.email}
                    </div>
                  </td>
                  <td className="p-4 text-[#9EADA9] font-mono text-[11px]">
                    <div>{inv.issue_date}</div>
                    <div className="text-white/40">
                      {t.invoicesList.duePrefix} {inv.due_date}
                    </div>
                  </td>
                  <td className="p-4 text-end font-mono font-bold text-white">
                    <CurrencyDisplay
                      amount={inv.total_amount}
                      currency={inv.currency}
                    />
                  </td>
                  <td className="p-4 text-end font-mono font-bold">
                    {inv.amount_due > 0 ? (
                      <span className="text-amber-400">
                        <CurrencyDisplay
                          amount={inv.amount_due}
                          currency={inv.currency}
                        />
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-mono">
                        0.000 {inv.currency}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="p-4 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/invoices/${inv.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title={t.actions.view}
                        >
                          <Eye className="w-4 h-4 text-[#9EADA9] hover:text-[#09937F]" />
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
