"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, FileSignature, ArrowRight, ArrowLeft, CheckCircle2, Clock, Receipt, Filter } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import type { Quotation } from "@ishoot/database/types";

export interface QuotationListItem extends Quotation {
  client?: {
    id?: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
  } | null;
}

interface QuotationsListViewProps {
  initialQuotations: QuotationListItem[];
  total: number;
}

export function QuotationsListView({ initialQuotations, total }: QuotationsListViewProps) {
  const { t, isRTL } = useAdminLocale();
  const qListT = t.quotationsList;

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const filteredQuotations = React.useMemo(() => {
    return initialQuotations.filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (!search.trim()) return true;

      const qTerm = search.toLowerCase();
      const qNum = q.quotationNumber?.toLowerCase() || "";
      const clientName = (
        (q.client?.companyName || "") +
        " " +
        (q.client?.firstName || "") +
        " " +
        (q.client?.lastName || "")
      ).toLowerCase();
      const currency = q.currency?.toLowerCase() || "";

      return qNum.includes(qTerm) || clientName.includes(qTerm) || currency.includes(qTerm);
    });
  }, [initialQuotations, search, statusFilter]);

  // Metrics
  const totalValueBhd = React.useMemo(() => {
    return initialQuotations.reduce((acc, q) => acc + (Number(q.totalAmount) || 0), 0);
  }, [initialQuotations]);

  const pendingApprovalCount = React.useMemo(() => {
    return initialQuotations.filter((q) => q.status === "submitted").length;
  }, [initialQuotations]);

  const acceptedCount = React.useMemo(() => {
    return initialQuotations.filter((q) => q.status === "accepted" || q.status === "converted").length;
  }, [initialQuotations]);

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300",
    submitted: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
    approved: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    issued: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
    accepted: "bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300",
    converted: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
    rejected: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300",
    expired: "bg-stone-100 text-stone-600 dark:bg-neutral-800 dark:text-neutral-400",
  };

  const getStatusLabel = (status: string) => {
    return qListT.statuses[status as keyof typeof qListT.statuses] || status;
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAEAEA] dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#09937F] bg-[#EDF3EC] dark:bg-[#004d40]/40 dark:text-[#7de0d1] px-2.5 py-0.5 rounded-full font-medium">
              {qListT.commercialBadge}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mt-1">
            {qListT.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1 max-w-2xl">
            {qListT.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/quotations/new"
            className="inline-flex items-center gap-2 bg-[#014842] hover:bg-[#013833] text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-xs active:scale-[0.98] transition-all duration-150 ease-out"
          >
            <Plus className="w-4 h-4" />
            <span>{qListT.newQuotation}</span>
          </Link>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-xl shadow-xs">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {qListT.totalQuotations}
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {total}
          </div>
          <div className="text-xs text-slate-400 mt-1">{qListT.allTimeCreated}</div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-xl shadow-xs">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {qListT.pipelineVolume}
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {totalValueBhd.toFixed(3)}{" "}
            <span className="text-xs font-normal text-slate-500">BHD</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">{qListT.activeQuoteAmounts}</div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-xl shadow-xs">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {qListT.pendingApproval}
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-2">
            {pendingApprovalCount}
            {pendingApprovalCount > 0 && <Clock className="w-4 h-4 animate-pulse" />}
          </div>
          <div className="text-xs text-slate-400 mt-1">{qListT.requiresSuperAdmin}</div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-xl shadow-xs">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {qListT.acceptedConverted}
          </div>
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-2 flex items-center gap-2">
            {acceptedCount}
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-400 mt-1">{qListT.readyOrInvoiced}</div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-[#EAEAEA] dark:border-white/10 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={qListT.searchPlaceholder}
            className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 text-sm bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#09937F]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1.5">
            {[
              { id: "all", label: qListT.allStatuses },
              { id: "draft", label: qListT.statuses.draft },
              { id: "submitted", label: qListT.statuses.submitted },
              { id: "approved", label: qListT.statuses.approved },
              { id: "issued", label: qListT.statuses.issued },
              { id: "accepted", label: qListT.statuses.accepted },
              { id: "converted", label: qListT.statuses.converted },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  statusFilter === st.id
                    ? "bg-[#014842] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-sm">
            <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-[#EAEAEA] dark:border-white/10 text-xs font-mono uppercase text-slate-500 dark:text-neutral-400">
              <tr>
                <th className="py-3 px-4">{qListT.quoteNumber}</th>
                <th className="py-3 px-4">{qListT.client}</th>
                <th className="py-3 px-4">{qListT.issueDate}</th>
                <th className="py-3 px-4">{qListT.validUntil}</th>
                <th className="py-3 px-4 text-right rtl:text-left">{qListT.amount}</th>
                <th className="py-3 px-4 text-center">{qListT.status}</th>
                <th className="py-3 px-4 text-right rtl:text-left">{qListT.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA] dark:divide-white/5">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-neutral-400">
                    <FileSignature className="w-10 h-10 mx-auto text-slate-300 dark:text-neutral-600 mb-3" />
                    <p className="text-sm font-medium">{qListT.noQuotationsFound}</p>
                    <Link
                      href="/dashboard/quotations/new"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#09937F] font-semibold hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{qListT.newQuotation}</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => {
                  const clientDisplay =
                    q.client?.companyName ||
                    [q.client?.firstName, q.client?.lastName].filter(Boolean).join(" ") ||
                    "-";

                  return (
                    <tr
                      key={q.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-white">
                        <Link
                          href={`/dashboard/quotations/${q.id}`}
                          className="hover:text-[#09937F] transition-colors underline-offset-4 hover:underline"
                        >
                          {q.quotationNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-neutral-300 font-medium">
                        {clientDisplay}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                        {new Date(q.issueDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                        {new Date(q.validUntilDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="py-3.5 px-4 text-right rtl:text-left font-mono font-semibold text-slate-900 dark:text-white">
                        {Number(q.totalAmount).toFixed(3)}{" "}
                        <span className="text-xs text-slate-400 font-normal">{q.currency}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${
                            statusColors[q.status] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {getStatusLabel(q.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right rtl:text-left">
                        <div className="flex items-center justify-end rtl:justify-start gap-2">
                          {q.status === "accepted" && !q.invoiceId && (
                            <Link
                              href={`/dashboard/invoices/new?quotationId=${q.id}`}
                              className="inline-flex items-center gap-1 bg-[#014842] hover:bg-[#013833] text-white px-2.5 py-1 rounded-md text-xs font-semibold active:scale-[0.98] transition-all"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>{qListT.convertToInvoice}</span>
                            </Link>
                          )}
                          {q.invoiceId && (
                            <Link
                              href={`/dashboard/invoices/${q.invoiceId}`}
                              className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 px-2 py-1 rounded-md text-xs font-mono font-medium hover:bg-purple-100 transition-colors"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>{qListT.viewInvoice}</span>
                            </Link>
                          )}
                          <Link
                            href={`/dashboard/quotations/${q.id}`}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-medium p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded transition-colors"
                          >
                            <span>{qListT.viewDetails}</span>
                            {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
