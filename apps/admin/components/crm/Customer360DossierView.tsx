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
  Plus,
  Percent,
  Receipt,
  AlertCircle,
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

  const collectionRate =
    metrics.totalLtv > 0
      ? Math.min(100, Math.round((metrics.totalPaid / metrics.totalLtv) * 100))
      : 100;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/crm/contacts">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.actions.back}</span>
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <span>{contact.company || contact.full_name}</span>
                {contact.company && contact.full_name && (
                  <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                    ({contact.full_name})
                  </span>
                )}
              </h1>
              <Badge
                variant="outline"
                className="text-xs uppercase  border-[#09937F]/40 text-[#09937F] bg-[#E6F5F2] dark:bg-[#09937F]/10"
              >
                {contact.contact_type || "Client"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ">
              ID: {contact.id} • Registered{" "}
              <DateDisplay date={contact.created_at} locale={locale} />
              {metrics.lastActivityDate && (
                <span>
                  {" "}• Last Active: <DateDisplay date={metrics.lastActivityDate} locale={locale} />
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/invoices/new?clientId=${contact.id}`}>
            <Button variant="primary" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>{t.customer360.issueInvoice}</span>
            </Button>
          </Link>

          <Link href={`/dashboard/payments/new?clientId=${contact.id}`}>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>{t.customer360.recordPayment}</span>
            </Button>
          </Link>

          <Link href={`/dashboard/crm/deals/new?clientId=${contact.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              <span>{t.customer360.newDeal}</span>
            </Button>
          </Link>

          <Link href={`/dashboard/crm/customers/${contact.id}/edit`}>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Edit className="w-3.5 h-3.5" />
              <span>{t.customer360.edit}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* M3 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* LTV */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t.customer360.ltv}</span>
            <DollarSign className="w-4 h-4 text-[#09937F]" />
          </div>
          <div className="text-2xl font-bold  text-slate-900 dark:text-white">
            <CurrencyDisplay amount={metrics.totalLtv} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#09937F]  flex items-center justify-between">
            <span>{metrics.invoicesCount} {t.customer360.invoicesBilled}</span>
            <span>{collectionRate}% {t.customer360.collected}</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#09937F] rounded-full transition-all duration-500"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </Card>

        {/* Total Settled */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t.customer360.totalSettled}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold  text-emerald-600 dark:text-emerald-400">
            <CurrencyDisplay amount={metrics.totalPaid} currency="BHD" />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 ">
            {metrics.settledReceiptsCount || payments.length} {t.customer360.reconciledReceipts}
          </div>
        </Card>

        {/* Outstanding Balance */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t.customer360.outstandingBalance}</span>
            <AlertCircle className={`w-4 h-4 ${metrics.totalOutstanding > 0 ? "text-amber-500" : "text-emerald-500"}`} />
          </div>
          <div className={`text-2xl font-bold  ${metrics.totalOutstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            <CurrencyDisplay amount={metrics.totalOutstanding} currency="BHD" />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 ">
            {metrics.totalOutstanding > 0 ? t.customer360.pendingCollection : t.customer360.fullySettled}
          </div>
        </Card>

        {/* Pipeline & Win Rate */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t.customer360.winRate}</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold  text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{metrics.winRate}%</span>
            <span className="text-xs font-normal text-slate-500">
              ({deals.length} deals)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400  flex items-center justify-between">
            <span>{t.customer360.activeDeals}: {metrics.activeDealsCount}</span>
            <span>{t.customer360.avgDeal}: {Number(metrics.avgDealSize || 0).toFixed(2)} BHD</span>
          </div>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-200 dark:border-white/10 flex items-center gap-6 text-sm font-semibold overflow-x-auto">
        {[
          { id: "overview", label: t.customer360.tabOverview, icon: User },
          {
            id: "interactions",
            label: `${t.customer360.tabInteractions} (${inquiries.length})`,
            icon: Mail,
          },
          {
            id: "deals",
            label: `${t.customer360.tabDeals} (${deals.length})`,
            icon: Briefcase,
          },
          {
            id: "finance",
            label: `${t.customer360.tabFinance} (${invoices.length})`,
            icon: CreditCard,
          },
          {
            id: "vault",
            label: `${t.customer360.tabVault} (${attachments.length})`,
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
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-4 md:col-span-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-[#09937F]" />
              <span>{t.customer360.primaryContact}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-1">{t.customer360.companyName}</span>
                <span className="text-slate-900 dark:text-white font-bold text-sm">
                  {contact.company || "Direct Client"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-1">{t.customer360.contactPerson}</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium text-sm">
                  {contact.full_name || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-1">{t.customerEdit.jobTitle}</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {contact.job_title || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-1">{t.customer360.clientType}</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium capitalize">
                  {contact.contact_type || "Client"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-1">{t.customer360.email}</span>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-[#09937F] hover:underline "
                >
                  {contact.email || "No email registered"}
                </a>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-1">
                  {t.customer360.phone}
                </span>
                <a
                  href={`tel:${contact.phone}`}
                  className="text-[#09937F] hover:underline "
                  dir="ltr"
                >
                  {contact.phone || "No phone registered"}
                </a>
              </div>
            </div>

            {contact.notes && (
              <div className="pt-4 border-t border-slate-100 dark:border-white/10">
                <span className="text-slate-400 dark:text-slate-500 text-xs block mb-1">
                  {t.customer360.notes}
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5 whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#09937F]" />
              <span>{t.customer360.accountSummary}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t.customer360.totalDeals}</span>
                <span className=" font-bold text-slate-900 dark:text-white">
                  {deals.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t.customer360.totalInvoices}</span>
                <span className=" font-bold text-slate-900 dark:text-white">
                  {invoices.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t.customer360.settledReceipts}</span>
                <span className=" font-bold text-emerald-600 dark:text-emerald-400">
                  {payments.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t.customer360.contractsIssued}</span>
                <span className=" font-bold text-slate-900 dark:text-white">
                  {contracts.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t.customer360.vaultDocuments}</span>
                <span className=" font-bold text-slate-900 dark:text-white">
                  {attachments.length}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: INQUIRIES & INTERACTIONS */}
      {activeTab === "interactions" && (
        <Card className="p-6 space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#09937F]" />
            <span>{t.customer360.inboundInquiries}</span>
          </h3>

          {inquiries.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.customer360.noInquiries}
            </p>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {inq.full_name}
                    </span>
                    <span className="text-[11px]  text-slate-500 dark:text-slate-400">
                      <DateDisplay date={inq.created_at} locale={locale} />
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{inq.message}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: DEALS */}
      {activeTab === "deals" && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#09937F]" />
              <span>{t.customer360.commercialDeals}</span>
            </h3>
            <Link href={`/dashboard/crm/deals/new?clientId=${contact.id}`}>
              <Button variant="primary" size="sm" className="gap-1">
                <span>+ {t.customer360.createDeal}</span>
              </Button>
            </Link>
          </div>

          {deals.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.customer360.noDeals}</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                >
                  <div>
                    <Link
                      href={`/dashboard/crm/deals/${deal.id}`}
                      className="font-bold text-[#09937F] hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400  mt-0.5">
                      Stage: {deal.stage} • Prob: {deal.probability}%
                    </p>
                  </div>
                  <div className=" text-end font-bold text-slate-900 dark:text-white">
                    <CurrencyDisplay
                      amount={deal.value}
                      currency={deal.currency}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: FINANCE & INVOICES */}
      {activeTab === "finance" && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#09937F]" />
              <span>{t.customer360.financialLedger}</span>
            </h3>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/payments/new?clientId=${contact.id}`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <span>+ {t.customer360.recordPayment}</span>
                </Button>
              </Link>
              <Link href={`/dashboard/invoices/new?clientId=${contact.id}`}>
                <Button variant="primary" size="sm" className="gap-1">
                  <span>+ {t.customer360.newInvoice}</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 uppercase ">
                <tr>
                  <th className="p-3 text-start">{t.customer360.invoiceNum}</th>
                  <th className="p-3 text-start">{t.customer360.issueDate}</th>
                  <th className="p-3 text-start">{t.customer360.status}</th>
                  <th className="p-3 text-end">{t.customer360.totalAmount}</th>
                  <th className="p-3 text-end">{t.customer360.amountPaid}</th>
                  <th className="p-3 text-end">{t.customer360.balanceDue}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="p-3  font-bold text-[#09937F]">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="hover:underline flex items-center gap-1"
                      >
                        <span>{inv.invoice_number}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    </td>
                    <td className="p-3  text-slate-500 dark:text-slate-400">
                      <DateDisplay date={inv.issue_date} locale={locale} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="p-3 text-end  text-slate-900 dark:text-white font-semibold">
                      <CurrencyDisplay
                        amount={inv.total_amount}
                        currency={inv.currency}
                      />
                    </td>
                    <td className="p-3 text-end  text-emerald-600 dark:text-emerald-400">
                      <CurrencyDisplay
                        amount={inv.amount_paid}
                        currency={inv.currency}
                      />
                    </td>
                    <td className="p-3 text-end  text-amber-600 dark:text-amber-400 font-bold">
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

      {/* TAB 5: VAULT */}
      {activeTab === "vault" && (
        <Card className="p-6 space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderLock className="w-4 h-4 text-[#09937F]" />
            <span>{t.customer360.legalRepo}</span>
          </h3>

          {attachments.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.customer360.noAttachments}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{att.file_name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 ">
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
