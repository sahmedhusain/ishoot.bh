"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  Button,
  Badge,
  CurrencyDisplay,
  DateDisplay,
  StatusBadge,
} from "@ishoot/ui";
import {
  User,
  Building2,
  Mail,
  Phone,
  Briefcase,
  FileText,
  CreditCard,
  FolderLock,
  ArrowLeft,
  Edit,
  ExternalLink,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileCode,
} from "lucide-react";
import type { CustomerDossier } from "@ishoot/database";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface Customer360DossierViewProps {
  dossier: CustomerDossier;
}

export function Customer360DossierView({
  dossier,
}: Customer360DossierViewProps) {
  const { t, locale } = useAdminLocale();
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "interactions" | "deals" | "finance" | "vault"
  >("overview");

  const {
    contact,
    inquiries,
    deals,
    invoices,
    payments,
    contracts,
    attachments,
    activities,
    metrics,
  } = dossier;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/crm/contacts">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[#9EADA9]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.actions.back}</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display flex items-center gap-3">
              <span>{contact.full_name}</span>
              <Badge
                variant="outline"
                className="text-xs uppercase font-mono border-[#09937F]/40 text-[#09937F]"
              >
                {contact.contact_type || "Client"}
              </Badge>
            </h1>
            <p className="text-xs text-[#9EADA9] mt-1 font-mono">
              ID: {contact.id} • Registered{" "}
              <DateDisplay date={contact.created_at} locale={locale} />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/dashboard/crm/customers/${contact.id}/edit`}>
            <Button variant="primary" size="sm" className="gap-1.5">
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl space-y-1">
          <span className="text-xs text-[#9EADA9]">Lifetime Value (LTV)</span>
          <div className="text-2xl font-bold text-white font-mono">
            <CurrencyDisplay amount={metrics.totalLtv} currency="BHD" />
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">
            Total Billed
          </span>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl space-y-1">
          <span className="text-xs text-[#9EADA9]">Total Settled</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            <CurrencyDisplay amount={metrics.totalPaid} currency="BHD" />
          </div>
          <span className="text-[11px] text-[#09937F] font-mono">
            Reconciled Payments
          </span>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl space-y-1">
          <span className="text-xs text-[#9EADA9]">Outstanding Balance</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            <CurrencyDisplay amount={metrics.totalOutstanding} currency="BHD" />
          </div>
          <span className="text-[11px] text-amber-400 font-mono">
            Pending Collection
          </span>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl space-y-1">
          <span className="text-xs text-[#9EADA9]">Active Pipelines</span>
          <div className="text-2xl font-bold text-white font-mono">
            {metrics.activeDealsCount} Deals
          </div>
          <span className="text-[11px] text-[#9EADA9] font-mono">
            Commercial Projects
          </span>
        </Card>
      </div>

      <div className="border-b border-white/10 flex items-center gap-6 text-sm font-semibold overflow-x-auto">
        {[
          { id: "overview", label: "Customer Overview", icon: User },
          {
            id: "interactions",
            label: `Interactions & Inquiries (${inquiries.length})`,
            icon: Mail,
          },
          {
            id: "deals",
            label: `Commercial History (${deals.length})`,
            icon: Briefcase,
          },
          {
            id: "finance",
            label: `Financial Ledger (${invoices.length})`,
            icon: CreditCard,
          },
          {
            id: "vault",
            label: `Client Vault (${attachments.length})`,
            icon: FolderLock,
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4 md:col-span-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-[#09937F]" />
              <span>Primary Contact Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#9EADA9] block mb-1">Company Name</span>
                <span className="text-white font-bold text-sm">
                  {contact.company || "Direct Client"}
                </span>
              </div>
              <div>
                <span className="text-[#9EADA9] block mb-1">Job Title</span>
                <span className="text-white font-medium">
                  {contact.job_title || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[#9EADA9] block mb-1">Primary Email</span>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-[#09937F] hover:underline font-mono"
                >
                  {contact.email || "No email registered"}
                </a>
              </div>
              <div>
                <span className="text-[#9EADA9] block mb-1">
                  Normalized E.164 Phone
                </span>
                <a
                  href={`tel:${contact.phone}`}
                  className="text-[#09937F] hover:underline font-mono"
                >
                  {contact.phone || "No phone registered"}
                </a>
              </div>
            </div>

            {contact.notes && (
              <div className="pt-4 border-t border-white/10">
                <span className="text-[#9EADA9] text-xs block mb-1">
                  Client Notes & Requirements
                </span>
                <p className="text-xs text-white bg-[#050807] p-3 rounded-xl border border-white/5 whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#09937F]" />
              <span>Account Status</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">Classification</span>
                <Badge variant="outline">
                  {contact.contact_type || "Client"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">Contracts Issued</span>
                <span className="font-mono font-bold text-white">
                  {contracts.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">Total Invoices</span>
                <span className="font-mono font-bold text-white">
                  {invoices.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">Settled Receipts</span>
                <span className="font-mono font-bold text-emerald-400">
                  {payments.length}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "interactions" && (
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#09937F]" />
            <span>Inbound Inquiries & Form Submissions</span>
          </h3>

          {inquiries.length === 0 ? (
            <p className="text-xs text-[#9EADA9]">
              No inbound contact form submissions logged yet.
            </p>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="p-4 rounded-2xl bg-[#050807] border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">
                      {inq.full_name}
                    </span>
                    <span className="text-[11px] font-mono text-[#9EADA9]">
                      <DateDisplay date={inq.created_at} locale={locale} />
                    </span>
                  </div>
                  <p className="text-xs text-[#9EADA9]">{inq.message}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "deals" && (
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#09937F]" />
              <span>Commercial Deals & Production History</span>
            </h3>
            <Link href="/dashboard/crm/deals/new">
              <Button variant="primary" size="sm" className="gap-1">
                <span>+ Create Deal</span>
              </Button>
            </Link>
          </div>

          <div className="divide-y divide-white/5">
            {deals.map((deal) => (
              <div
                key={deal.id}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white">{deal.title}</p>
                  <p className="text-[11px] text-[#9EADA9] font-mono">
                    Stage: {deal.stage}
                  </p>
                </div>
                <div className="font-mono text-end">
                  <CurrencyDisplay
                    amount={deal.value}
                    currency={deal.currency}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "finance" && (
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#09937F]" />
              <span>Financial Ledger & Invoice History</span>
            </h3>
            <Link href="/dashboard/invoices/new">
              <Button variant="primary" size="sm" className="gap-1">
                <span>+ New Invoice</span>
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-[#050807] text-[#9EADA9] uppercase font-mono">
                <tr>
                  <th className="p-3 text-start">Invoice #</th>
                  <th className="p-3 text-start">Issue Date</th>
                  <th className="p-3 text-start">Status</th>
                  <th className="p-3 text-end">Total Amount</th>
                  <th className="p-3 text-end">Amount Paid</th>
                  <th className="p-3 text-end">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="p-3 font-mono font-bold text-[#09937F]">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="p-3 font-mono text-[#9EADA9]">
                      <DateDisplay date={inv.issue_date} locale={locale} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="p-3 text-end font-mono text-white">
                      <CurrencyDisplay
                        amount={inv.total_amount}
                        currency={inv.currency}
                      />
                    </td>
                    <td className="p-3 text-end font-mono text-emerald-400">
                      <CurrencyDisplay
                        amount={inv.amount_paid}
                        currency={inv.currency}
                      />
                    </td>
                    <td className="p-3 text-end font-mono text-amber-400">
                      <CurrencyDisplay
                        amount={inv.amount_due}
                        currency={inv.currency}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "vault" && (
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FolderLock className="w-4 h-4 text-[#09937F]" />
            <span>Client Legal Repository & Vault Documents</span>
          </h3>

          {attachments.length === 0 ? (
            <p className="text-xs text-[#9EADA9]">
              No legal documents or attachments uploaded yet for this customer.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-4 rounded-2xl bg-[#050807] border border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{att.file_name}</p>
                    <p className="text-[10px] text-[#9EADA9] font-mono">
                      Uploaded{" "}
                      <DateDisplay date={att.created_at} locale={locale} />
                    </p>
                  </div>
                  <a
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
