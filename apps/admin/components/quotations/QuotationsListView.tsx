"use client";
import { DataTable } from "@platform/ui";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { Plus, FileSignature, ArrowRight, ArrowLeft, CheckCircle2, Clock, Receipt, Filter } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import type { Quotation } from "@platform/database/types";
import type { QuotationListSummary } from "@platform/database";
import { ListControls } from "../shared/ListControls";
import { PageHeader } from "../layout/PageHeader";

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
  quotations: QuotationListItem[];
  summary: QuotationListSummary;
  pagination: { page: number; total: number; filters: { q: string; status: string } };
}

export function QuotationsListView({ quotations, summary, pagination }: QuotationsListViewProps) {
  const { t, isRTL } = useAdminLocale();
  const qListT = t.quotationsList;
  const statusHref = (status: string) =>
    `${ROUTES.quotations.list}?${new URLSearchParams({ ...(pagination.filters.q ? { q: pagination.filters.q } : {}), status })}`;
  const openValues = Object.entries(summary.openValueByCurrency);

  const statusColors: Record<string, string> = {
    draft: "bg-surface-sunken text-ink dark:bg-surface-raised dark:text-ink",
    submitted: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
    approved: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    issued: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
    accepted: "bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300",
    converted: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
    rejected: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300",
    expired: "bg-stone-100 text-stone-600 dark:bg-surface-raised dark:text-ink-muted",
  };

  const getStatusLabel = (status: string) => {
    return qListT.statuses[status as keyof typeof qListT.statuses] || status;
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Editorial Header */}
      <PageHeader
        eyebrow={qListT.commercialBadge}
        actions={<div className="flex items-center gap-3">
          <Link
            href={ROUTES.quotations.create()}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium shadow-xs active:scale-[0.98] transition-all duration-150 ease-out"
          >
            <Plus className="w-4 h-4" />
            <span>{qListT.newQuotation}</span>
          </Link>
        </div>}
      />

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-raised border border-outline-variant p-5 rounded-xl shadow-xs">
          <div className="text-xs text-ink-muted uppercase tracking-wider font-mono">
            {qListT.totalQuotations}
          </div>
          <div className="text-2xl font-bold text-ink mt-2">
            {summary.total}
          </div>
          <div className="text-xs text-ink-muted mt-1">{qListT.allTimeCreated}</div>
        </div>

        <div className="bg-surface-raised border border-outline-variant p-5 rounded-xl shadow-xs">
          <div className="text-xs text-ink-muted uppercase tracking-wider font-mono">
            {qListT.pipelineVolume}
          </div>
          <div className="text-2xl font-bold text-ink mt-2 space-y-0.5">
            {openValues.length === 0 ? (
              <div>0.000</div>
            ) : (
              openValues.map(([currency, amount]) => (
                <div key={currency}>
                  {amount.toFixed(3)} <span className="text-xs font-normal text-ink-muted">{currency}</span>
                </div>
              ))
            )}
          </div>
          <div className="text-xs text-ink-muted mt-1">{qListT.activeQuoteAmounts}</div>
        </div>

        <div className="bg-surface-raised border border-outline-variant p-5 rounded-xl shadow-xs">
          <div className="text-xs text-ink-muted uppercase tracking-wider font-mono">
            {qListT.pendingApproval}
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-2">
            {summary.pendingApproval}
            {summary.pendingApproval > 0 && <Clock className="w-4 h-4" />}
          </div>
          <div className="text-xs text-ink-muted mt-1">{qListT.requiresSuperAdmin}</div>
        </div>

        <div className="bg-surface-raised border border-outline-variant p-5 rounded-xl shadow-xs">
          <div className="text-xs text-ink-muted uppercase tracking-wider font-mono">
            {qListT.acceptedConverted}
          </div>
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-2 flex items-center gap-2">
            {summary.acceptedOrConverted}
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs text-ink-muted mt-1">{qListT.readyOrInvoiced}</div>
        </div>
      </div>

      {/* Filter, search and paging run on the server across every quotation */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-ink-muted shrink-0" />
          {[
            { id: "all", label: qListT.allStatuses },
            { id: "draft", label: qListT.statuses.draft },
            { id: "submitted", label: qListT.statuses.submitted },
            { id: "approved", label: qListT.statuses.approved },
            { id: "issued", label: qListT.statuses.issued },
            { id: "accepted", label: qListT.statuses.accepted },
            { id: "converted", label: qListT.statuses.converted },
          ].map((st) => (
            <Link
              key={st.id}
              href={statusHref(st.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${pagination.filters.status === st.id
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-surface-sunken hover:bg-surface-sunken text-ink-muted dark:bg-surface-raised dark:text-ink dark:hover:bg-surface-sunken"
                }`}
            >
              {st.label}
            </Link>
          ))}
        </div>
        <ListControls path={ROUTES.quotations.list} {...pagination} />
      </div>

      {/* Quotations Table */}
      <div className="bg-surface-raised border border-outline-variant rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <DataTable className="w-full text-left rtl:text-right text-sm">
            <thead className="bg-surface-raised/70 dark:bg-white/5 border-b border-outline-variant text-xs font-mono uppercase text-ink-muted">
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
            <tbody className="divide-y divide-outline-variant dark:divide-white/5">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    <FileSignature className="w-10 h-10 mx-auto text-ink dark:text-ink-muted mb-3" />
                    <p className="text-sm font-medium">{qListT.noQuotationsFound}</p>
                    <Link
                      href={ROUTES.quotations.create()}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent font-semibold hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{qListT.newQuotation}</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                quotations.map((q, idx) => {
                  const clientDisplay =
                    q.client?.companyName ||
                    [q.client?.firstName, q.client?.lastName].filter(Boolean).join(" ") ||
                    "-";

                  return (
                    <tr
                      key={q.id ? `quotation-${q.id}-${idx}` : `quotation-idx-${idx}`}
                      className="hover:bg-surface-raised/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-ink">
                        <Link
                          href={ROUTES.quotations.detail(q.id)}
                          className="hover:text-accent transition-colors underline-offset-4 hover:underline"
                        >
                          {q.quotationNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-ink font-medium">
                        {clientDisplay}
                      </td>
                      <td className="py-3.5 px-4 text-ink-muted font-mono text-xs">
                        {new Date(q.issueDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="py-3.5 px-4 text-ink-muted font-mono text-xs">
                        {new Date(q.validUntilDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="py-3.5 px-4 text-right rtl:text-left font-mono font-semibold text-ink">
                        {Number(q.totalAmount).toFixed(3)}{" "}
                        <span className="text-xs text-ink-muted font-normal">{q.currency}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[q.status] || "bg-ink/5 text-ink-muted"
                            }`}
                        >
                          {getStatusLabel(q.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right rtl:text-left">
                        <div className="flex items-center justify-end rtl:justify-start gap-2">
                          {q.status === "accepted" && !q.invoiceId && (
                            <Link
                              href={ROUTES.invoices.create({ quotationId: q.id })}
                              className="inline-flex items-center gap-1 bg-primary hover:bg-primary-hover text-primary-foreground px-2.5 py-1 rounded-md text-xs font-semibold active:scale-[0.98] transition-all"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>{qListT.convertToInvoice}</span>
                            </Link>
                          )}
                          {q.invoiceId && (
                            <Link
                              href={ROUTES.invoices.detail(q.invoiceId)}
                              className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 px-2 py-1 rounded-md text-xs font-mono font-medium hover:bg-purple-100 transition-colors"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>{qListT.viewInvoice}</span>
                            </Link>
                          )}
                          <Link
                            href={ROUTES.quotations.detail(q.id)}
                            className="inline-flex items-center gap-1 text-ink-muted hover:text-ink dark:hover:text-white text-xs font-medium p-1 hover:bg-surface-sunken dark:hover:bg-surface-raised rounded transition-colors"
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
          </DataTable>
        </div>
      </div>
    </div>
  );
}
