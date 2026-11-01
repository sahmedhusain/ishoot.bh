"use client";
import { useCompanyCurrency } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { RelatedListControls } from "../shared/RelatedListControls";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  Button,
  Badge,
  CurrencyDisplay,
  DateDisplay,
  StatusBadge,
} from "@platform/ui";
import {
  User, Mail, Briefcase, CreditCard,
  FolderLock,
  ArrowLeft,
  Edit,
  ExternalLink,
  Download, DollarSign,
  TrendingUp, ShieldCheck,
  CheckCircle2,
  Plus, AlertCircle,
  FileSignature,
} from "lucide-react";
import type { CustomerDossier } from "@platform/database";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import type { DossierActions } from "../../types/crm";
import { ClientProfilePanel, ClientTierBadge, type ClientStanding } from "./ClientProfilePanel";
import { PageHeader } from "../layout/PageHeader";

interface Customer360DossierViewProps {
  dossier: CustomerDossier;
  actions: DossierActions;
  standing: ClientStanding | null;
}

export function Customer360DossierView({
  dossier,
  actions,
  standing,
}: Customer360DossierViewProps) {
  const companyCurrency = useCompanyCurrency();
  const { t, locale } = useAdminLocale();
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "interactions" | "deals" | "finance" | "vault"
  >("overview");

  const { contact, inquiries, deals, invoices, payments, contracts, attachments, metrics } = dossier;

  const collectionRate =
    metrics.totalLtv > 0
      ? Math.min(100, Math.round((metrics.totalPaid / metrics.totalLtv) * 100))
      : 100;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {dossier.pagination ? <RelatedListControls pagination={dossier.pagination} /> : null}
      {Object.entries(metrics.balancesByCurrency)
        .filter(([currency]) => currency !== companyCurrency)
        .map(([currency, amounts]) => (
          <div
            key={currency}
            className="rounded-xl border border-outline-variant p-3 text-sm"
          >
            {currency}: {t.customer360Dossier.invoiced}{" "}
            {amounts.totalLtv.toFixed(3)} · {t.customer360Dossier.paid}{" "}
            {amounts.totalPaid.toFixed(3)} · {t.customer360Dossier.outstanding}{" "}
            {amounts.totalOutstanding.toFixed(3)}
          </div>
        ))}

      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={ROUTES.crm.contacts}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" />
              <span>{t.actions.back}</span>
            </Button>
          </Link>
          <div>
            <PageHeader
              title={<><span>{(locale === "ar" && contact.company_name_ar) || contact.company || contact.full_name}</span>{contact.company && contact.company_name_ar && (
                  <span className="text-base font-normal text-ink-muted" dir={locale === "ar" ? "ltr" : "rtl"}>
                    {locale === "ar" ? contact.company : contact.company_name_ar}
                  </span>
                )}</>}
              actions={
                <>
                  <Badge
                    variant="outline"
                    className="text-xs uppercase  border-accent/40 text-accent bg-tone-95 dark:bg-accent/10"
                  >
                    {t.clients.kinds[contact.client_kind ?? "individual"]}
                  </Badge>
                  {standing ? <ClientTierBadge standing={standing} /> : null}
                </>
              }
            />
            <p className="text-xs text-ink-muted mt-1">
              {t.customer360Dossier.registered}{" "}
              <DateDisplay date={contact.created_at} locale={locale} />
              {metrics.lastActivityDate && (
                <span>
                  {" "}
                  {t.customer360Dossier.lastActive}{" "}
                  <DateDisplay
                    date={metrics.lastActivityDate}
                    locale={locale}
                  />
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {actions.createQuotation && (
            <Link href={ROUTES.quotations.create({ clientId: contact.id })}>
              <Button variant="primary" size="sm" className="gap-1.5">
                <FileSignature className="w-3.5 h-3.5" />
                <span>{t.customer360.createQuotation}</span>
              </Button>
            </Link>
          )}

          {actions.createInvoice && (
            <Link href={ROUTES.invoices.create({ clientId: contact.id })}>
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>{t.customer360.issueInvoice}</span>
              </Button>
            </Link>
          )}

          {actions.recordPayment && (
            <Link href={ROUTES.payments.create({ clientId: contact.id })}>
              <Button variant="secondary" size="sm" className="gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>{t.customer360.recordPayment}</span>
              </Button>
            </Link>
          )}

          {actions.createDeal && (
            <Link href={ROUTES.crm.newDeal({ clientId: contact.id })}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>{t.customer360.newDeal}</span>
              </Button>
            </Link>
          )}

          {actions.editRecord && (
            <Link href={ROUTES.crm.customerEdit(contact.id)}>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Edit className="w-3.5 h-3.5" />
                <span>{t.customer360.edit}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* M3 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* LTV */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>{t.customer360.ltv}</span>
            <DollarSign className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold text-ink">
            <CurrencyDisplay amount={metrics.totalLtv} currency={companyCurrency} />
          </div>
          <div className="text-[11px] text-accent  flex items-center justify-between">
            <span>
              {metrics.invoicesCount} {t.customer360.invoicesBilled}
            </span>
            <span>
              {collectionRate}% {t.customer360.collected}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-surface-sunken dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </Card>

        {/* Total Settled */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>{t.customer360.totalSettled}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold  text-emerald-600 dark:text-emerald-400">
            <CurrencyDisplay amount={metrics.totalPaid} currency={companyCurrency} />
          </div>
          <div className="text-[11px] text-ink-muted">
            {metrics.settledReceiptsCount || payments.length}{" "}
            {t.customer360.reconciledReceipts}
          </div>
        </Card>

        {/* Outstanding Balance */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>{t.customer360.outstandingBalance}</span>
            <AlertCircle
              className={`w-4 h-4 ${metrics.totalOutstanding > 0 ? "text-amber-500" : "text-emerald-500"}`}
            />
          </div>
          <div
            className={`text-2xl font-bold  ${metrics.totalOutstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}
          >
            <CurrencyDisplay amount={metrics.totalOutstanding} currency={companyCurrency} />
          </div>
          <div className="text-[11px] text-ink-muted">
            {metrics.totalOutstanding > 0
              ? t.customer360.pendingCollection
              : t.customer360.fullySettled}
          </div>
        </Card>

        {/* Pipeline & Win Rate */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>{t.customer360.winRate}</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-ink flex items-baseline gap-2">
            <span>{metrics.winRate}%</span>
            <span className="text-xs font-normal text-ink-muted">
              ({formatMessage(t.customer360.dealsCount, { n: String(dossier.pagination?.deals.total ?? deals.length) })})
            </span>
          </div>
          <div className="text-[11px] text-ink-muted flex items-center justify-between">
            <span>
              {t.customer360.activeDeals}: {metrics.activeDealsCount}
            </span>
            <span>
              {t.customer360.avgDeal}:{" "}
              <CurrencyDisplay amount={metrics.avgDealSize || 0} currency={companyCurrency} />
            </span>
          </div>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-outline-variant dark:border-white/10 flex items-center gap-6 text-sm font-semibold overflow-x-auto" role="tablist">
        {[
          { id: "overview", label: t.customer360.tabOverview, icon: User },
          {
            id: "interactions",
            label: `${t.customer360.tabInteractions} (${dossier.pagination?.inquiries.total ?? inquiries.length})`,
            icon: Mail,
          },
          {
            id: "deals",
            label: `${t.customer360.tabDeals} (${dossier.pagination?.deals.total ?? deals.length})`,
            icon: Briefcase,
          },
          {
            id: "finance",
            label: `${t.customer360.tabFinance} (${dossier.pagination?.invoices.total ?? invoices.length})`,
            icon: CreditCard,
          },
          {
            id: "vault",
            label: `${t.customer360.tabVault} (${dossier.pagination?.attachments.total ?? attachments.length})`,
            icon: FolderLock,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${isActive
                ? "border-accent text-accent"
                : "border-transparent text-ink-muted hover:text-ink dark:text-ink-muted dark:hover:text-white"
                }`}
             tabIndex={activeTab === tab.id ? 0 : -1} role="tab" aria-selected={activeTab === tab.id} type="button">
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-tab-panel>
          <ClientProfilePanel contact={contact} standing={standing} className="md:col-span-2" />

          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span>{t.customer360.accountSummary}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">
                  {t.customer360.totalDeals}
                </span>
                <span className="font-bold text-ink">
                  {dossier.pagination?.deals.total ?? deals.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">
                  {t.customer360.totalInvoices}
                </span>
                <span className="font-bold text-ink">
                  {dossier.pagination?.invoices.total ?? invoices.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">
                  {t.customer360.settledReceipts}
                </span>
                <span className=" font-bold text-emerald-600 dark:text-emerald-400">
                  {dossier.pagination?.payments.total ?? payments.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">
                  {t.customer360.contractsIssued}
                </span>
                <span className="font-bold text-ink">
                  {dossier.pagination?.contracts.total ?? contracts.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">
                  {t.customer360.vaultDocuments}
                </span>
                <span className="font-bold text-ink">
                  {dossier.pagination?.attachments.total ?? attachments.length}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: INQUIRIES & INTERACTIONS */}
      {activeTab === "interactions" && (
        <Card className="p-6 space-y-6" data-tab-panel>
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent" />
            <span>{t.customer360.inboundInquiries}</span>
          </h3>

          {inquiries.length === 0 ? (
            <p className="text-xs text-ink-muted">
              {t.customer360.noInquiries}
            </p>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="p-4 rounded-2xl bg-surface-raised dark:bg-white/5 border border-outline-variant dark:border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink text-xs">
                      <bdi dir="auto">{inq.full_name}</bdi>
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      <DateDisplay date={inq.created_at} locale={locale} />
                    </span>
                  </div>
                  <p className="text-xs text-ink">
                    {inq.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: DEALS */}
      {activeTab === "deals" && (
        <Card className="p-6 space-y-6" data-tab-panel>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-accent" />
              <span>{t.customer360.commercialDeals}</span>
            </h3>
            {actions.createDeal && (
              <Link href={ROUTES.crm.newDeal({ clientId: contact.id })}>
                <Button variant="primary" size="sm" className="gap-1">
                  <span>+ {t.customer360.createDeal}</span>
                </Button>
              </Link>
            )}
          </div>

          {deals.length === 0 ? (
            <p className="text-xs text-ink-muted">
              {t.customer360.noDeals}
            </p>
          ) : (
            <div className="divide-y divide-outline-variant dark:divide-white/5">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="py-3.5 flex items-center justify-between text-xs hover:bg-surface-raised/50 dark:hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                >
                  <div>
                    <Link
                      href={ROUTES.crm.deal(deal.id)}
                      className="font-bold text-accent hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {formatMessage(t.copy.stageValue, { stage: (t.statusLabels as Record<string, string>)[deal.stage] ?? deal.stage, percent: deal.probability })}
                    </p>
                  </div>
                  <div className="text-end font-bold text-ink">
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
        <Card className="p-6 space-y-6" data-tab-panel>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-accent" />
              <span>{t.customer360.financialLedger}</span>
            </h3>
            <div className="flex items-center gap-2">
              {actions.recordPayment && (
                <Link href={ROUTES.payments.create({ clientId: contact.id })}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <span>+ {t.customer360.recordPayment}</span>
                  </Button>
                </Link>
              )}
              {actions.createInvoice && (
                <Link href={ROUTES.invoices.create({ clientId: contact.id })}>
                  <Button variant="primary" size="sm" className="gap-1">
                    <span>+ {t.customer360.newInvoice}</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-surface-raised dark:bg-white/5 text-ink-muted uppercase">
                <tr>
                  <th className="p-3 text-start">{t.customer360.invoiceNum}</th>
                  <th className="p-3 text-start">{t.customer360.issueDate}</th>
                  <th className="p-3 text-start">{t.customer360.status}</th>
                  <th className="p-3 text-end">{t.customer360.totalAmount}</th>
                  <th className="p-3 text-end">{t.customer360.amountPaid}</th>
                  <th className="p-3 text-end">{t.customer360.balanceDue}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant dark:divide-white/5">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-surface-raised/50 dark:hover:bg-white/[0.02]"
                  >
                    <td className="p-3  font-bold text-accent">
                      <Link
                        href={ROUTES.invoices.detail(inv.id)}
                        className="hover:underline flex items-center gap-1"
                      >
                        <span>{inv.invoice_number}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    </td>
                    <td className="p-3 text-ink-muted">
                      <DateDisplay date={inv.issue_date} locale={locale} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="p-3 text-end text-ink font-semibold">
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
        <Card className="p-6 space-y-6" data-tab-panel>
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <FolderLock className="w-4 h-4 text-accent" />
            <span>{t.customer360.legalRepo}</span>
          </h3>

          {attachments.length === 0 ? (
            <p className="text-xs text-ink-muted">
              {t.customer360.noAttachments}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-4 rounded-2xl bg-surface-raised dark:bg-white/5 border border-outline-variant dark:border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-ink">
                      {att.file_name}
                    </p>
                    <p className="text-[10px] text-ink-muted">
                      {t.customer360Dossier.uploaded}{" "}
                      <DateDisplay date={att.created_at} locale={locale} />
                    </p>
                  </div>
                  <a
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button aria-label={t.actions.downloadPdf} variant="outline" size="sm">
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
