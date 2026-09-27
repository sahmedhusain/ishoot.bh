"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  Button,
  Badge,
  StatusBadge,
  DateDisplay,
  CurrencyDisplay,
} from "@ishoot/ui";
import {
  User,
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  Mail,
  Phone,
  FileText,
  Download,
} from "lucide-react";
import type { CRMDeal, CRMContact, Invoice } from "@ishoot/database/types";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface DealDossierViewProps {
  deal: CRMDeal;
  contact?: CRMContact | null;
  invoices?: Invoice[];
}

export function DealDossierView({
  deal,
  contact,
  invoices = [],
}: DealDossierViewProps) {
  const { t, locale } = useAdminLocale();
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "timeline" | "documents" | "invoices"
  >("overview");

  const clientName = contact?.company || contact?.full_name || "Direct Client";
  const isWon = deal.stage === "closed_won" || deal.stage === "delivered";
  const isLost = deal.stage === "closed_lost";
  const projectedValue =
    deal.value && Number(deal.value) > 0
      ? (Number(deal.value) * (deal.probability || 50)) / 100
      : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/crm/deals">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[#9EADA9]"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>{t.actions?.back || "Back"}</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display flex items-center gap-3">
              <span>{deal.title}</span>
              <Badge
                variant="outline"
                className="text-xs uppercase font-mono border-[#09937F]/40 text-[#09937F]"
              >
                {deal.stage}
              </Badge>
            </h1>
            <p className="text-xs text-[#9EADA9] mt-1 font-mono">
              Deal ID: {deal.id} • Registered{" "}
              <DateDisplay date={deal.created_at} locale={locale} />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/dashboard/crm/deals/${deal.id}/edit`}>
            <Button variant="primary" size="sm" className="gap-1.5">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span>Edit Deal</span>
            </Button>
          </Link>
          {isWon && (
            <Link href="/dashboard/invoices/new">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-[#09937F]/50 text-[#09937F]"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Issue Invoice</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#9EADA9]">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Deal Value</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            <CurrencyDisplay
              amount={Number(deal.value) || 0}
              currency={deal.currency}
            />
          </div>
          <span className="text-[11px] text-[#9EADA9] font-mono">
            {deal.probability
              ? `${deal.probability}% Probability`
              : "No probability set"}
          </span>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#9EADA9]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Projected Revenue</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            <CurrencyDisplay amount={projectedValue} currency={deal.currency} />
          </div>
          <span className="text-[11px] text-[#09937F] font-mono">
            Weighted Value
          </span>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#9EADA9]">
            <Calendar className="w-3.5 h-3.5" />
            <span>Target Close Date</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {deal.target_close_date ? (
              <DateDisplay date={deal.target_close_date} locale={locale} />
            ) : (
              <span className="text-[#9EADA9]">—</span>
            )}
          </div>
          <span className="text-[11px] text-[#9EADA9] font-mono">
            {deal.probability
              ? `(${(deal.probability / 100).toFixed(1)}x Expected)`
              : "No estimate"}
          </span>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#9EADA9]">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Invoices Generated</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {invoices.length}
          </div>
          <span className="text-[11px] text-[#9EADA9] font-mono">
            Billing Records
          </span>
        </Card>
      </div>

      <div className="border-b border-white/10 flex items-center gap-6 text-sm font-semibold overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: User },
          { id: "timeline", label: "Production Timeline", icon: Clock },
          { id: "documents", label: "Deal Vault", icon: FileText },
          {
            id: "invoices",
            label: `Invoices (${invoices.length})`,
            icon: FileText,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
                isActive
                  ? "border-[#09937F] text-[#09937F]"
                  : "border-transparent text-[#9EADA9] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
              Commercial Details
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9EADA9]">Pipeline Stage</span>
                <span className="text-white font-semibold">{deal.stage}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9EADA9]">Associated Client</span>
                <span className="text-white font-semibold">{clientName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9EADA9]">Probability</span>
                <span className="text-white font-semibold">
                  {deal.probability}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9EADA9]">Currency</span>
                <span className="text-white font-semibold">
                  {deal.currency}
                </span>
              </div>
              {deal.shoot_date && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9EADA9]">Scheduled Shoot Date</span>
                  <span className="text-white font-semibold">
                    <DateDisplay date={deal.shoot_date} locale={locale} />
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
              Client & Account Info
            </h2>

            {contact ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#050807] border border-white/10 space-y-3">
                  <div>
                    <div className="text-xs text-[#9EADA9] mb-1">
                      Primary Contact
                    </div>
                    <div className="font-semibold text-white">
                      {contact.full_name}
                    </div>
                    {contact.job_title && (
                      <div className="text-xs text-[#09937F]">
                        {contact.job_title}
                      </div>
                    )}
                  </div>

                  {contact.company && (
                    <div className="flex items-center gap-2 text-xs text-[#9EADA9]">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{contact.company}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1.5 text-[#9EADA9] hover:text-[#09937F]"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{contact.email}</span>
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-1.5 text-[#9EADA9] hover:text-[#09937F] font-mono"
                        dir="ltr"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{contact.phone}</span>
                      </a>
                    )}
                  </div>
                </div>

                {contact.notes && (
                  <div className="p-4 rounded-xl bg-[#050807] border border-white/10">
                    <div className="text-xs text-[#9EADA9] mb-2">
                      Client Requirements & Notes
                    </div>
                    <p className="text-xs text-white leading-relaxed">
                      {contact.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-[#9EADA9]/30 mx-auto mb-3" />
                <p className="text-sm text-[#9EADA9]">
                  No client link associated with this deal.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "timeline" && (
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
            Production Timeline & Log
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                <Briefcase className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Deal Created in Pipeline
                </div>
                <div className="text-xs text-[#9EADA9] mt-0.5">
                  <DateDisplay date={deal.created_at} locale={locale} />
                </div>
              </div>
            </div>

            {deal.target_close_date && (
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-1">
                  <Calendar className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    Target Close Date
                  </div>
                  <div className="text-xs text-[#9EADA9] mt-0.5">
                    <DateDisplay
                      date={deal.target_close_date}
                      locale={locale}
                    />
                  </div>
                </div>
              </div>
            )}

            {deal.shoot_date && (
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    Scheduled Shoot Date
                  </div>
                  <div className="text-xs text-[#9EADA9] mt-0.5">
                    <DateDisplay date={deal.shoot_date} locale={locale} />
                  </div>
                </div>
              </div>
            )}

            {deal.notes && (
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#9EADA9]/20 flex items-center justify-center shrink-0 mt-1">
                  <FileText className="w-4 h-4 text-[#9EADA9]" />
                </div>
                <div className="p-4 rounded-xl bg-[#050807] border border-white/10">
                  <div className="text-xs font-semibold text-[#9EADA9] mb-2">
                    Deal Brief Notes
                  </div>
                  <p className="text-xs text-white leading-relaxed">
                    {deal.notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === "documents" && (
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Deal Document Vault
            </h2>
          </div>

          <div className="text-center py-12 bg-[#050807]/50 rounded-xl border-2 border-dashed border-white/10">
            <FileText className="w-12 h-12 text-[#9EADA9]/40 mx-auto mb-4" />
            <p className="text-sm text-[#9EADA9] mb-4">
              No documents attached to this deal yet
            </p>
            <p className="text-xs text-[#9EADA9]/60">
              Upload proposals, contracts, proofs, and production documents
            </p>
          </div>
        </Card>
      )}

      {activeTab === "invoices" && (
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Related Invoices
            </h2>
            <span className="text-xs text-[#9EADA9]">
              {invoices.length} Invoice(s)
            </span>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-12 bg-[#050807]/50 rounded-xl border-2 border-dashed border-white/10">
              <FileText className="w-12 h-12 text-[#9EADA9]/40 mx-auto mb-4" />
              <p className="text-sm text-[#9EADA9] mb-4">
                No invoices created for this deal yet
              </p>
              <Link href="/dashboard/invoices/new">
                <Button variant="outline" size="sm" className="text-xs">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Issue Invoice</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3 text-start">Invoice #</th>
                    <th className="p-3 text-start">Issue Date</th>
                    <th className="p-3 text-end">Total Amount</th>
                    <th className="p-3 text-end">Balance Due</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-3">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="font-mono font-bold text-[#09937F] hover:underline"
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="p-3 text-[#9EADA9]">
                        <DateDisplay date={inv.issue_date} locale={locale} />
                      </td>
                      <td className="p-3 text-right font-mono text-white">
                        <CurrencyDisplay
                          amount={Number(inv.total_amount)}
                          currency={inv.currency}
                        />
                      </td>
                      <td className="p-3 text-right font-mono">
                        <CurrencyDisplay
                          amount={
                            Number(inv.total_amount) -
                            Number(inv.amount_paid || 0)
                          }
                          currency={inv.currency}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
