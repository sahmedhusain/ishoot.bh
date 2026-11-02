"use client";
import { formatMessage } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { ListControls } from "../shared/ListControls";
import type { InvoiceListRow } from "@platform/database";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  Button,
  Badge,
  StatusBadge,
  DateDisplay,
  CurrencyDisplay,
} from "@platform/ui";
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
  FileText, ExternalLink,
  Edit,
  FileSignature,
} from "lucide-react";
import type { CRMDeal, CRMContact } from "@platform/database/types";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { isActiveDealStage } from "@platform/database/constants/crm";
import type { DossierActions } from "../../types/crm";
import { PageHeader } from "../layout/PageHeader";

interface DealDossierViewProps {
  deal: CRMDeal;
  contact?: CRMContact | null;
  invoices?: InvoiceListRow[];
  invoicePage?: {
    page: number;
    total: number;
    filters: { q: string; status: string; dealId?: string };
  };
  actions: DossierActions;
}

export function DealDossierView({
  deal,
  contact,
  invoices = [],
  invoicePage,
  actions,
}: DealDossierViewProps) {
  const { t, locale } = useAdminLocale();
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "timeline" | "documents" | "invoices"
  >(
    invoicePage?.filters.q ||
      (invoicePage?.page || 1) > 1 ||
      (invoicePage?.filters.status && invoicePage.filters.status !== "all")
      ? "invoices"
      : "overview",
  );

  const clientName = contact?.company || contact?.full_name || t.dealDossier.directClient;
  const isWon = ["delivered", "invoiced", "closed_won"].includes(deal.stage);
  const projectedValue =
    deal.value && Number(deal.value) > 0
      ? (Number(deal.value) * (deal.probability ?? 50)) / 100
      : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <PageHeader
        title={<><span><bdi dir="auto">{deal.title}</bdi></span><Badge
              variant="outline"
              className="text-xs uppercase  border-accent/40 text-accent"
            >
              {deal.stage}
            </Badge></>}
        description={<>{t.copy.idLabel}{deal.id} •{" "}
            <DateDisplay date={deal.created_at} locale={locale} /></>}
        back={{ href: ROUTES.crm.deals }}
        actions={<div className="flex flex-wrap items-center gap-3">
          {actions.editRecord && (
            <Link href={ROUTES.crm.dealEdit(deal.id)}>
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>{t.dealDossier.editDeal}</span>
              </Button>
            </Link>
          )}
          {actions.createQuotation && isActiveDealStage(deal.stage) && (
            <Link href={ROUTES.quotations.create({ clientId: contact?.id, dealId: deal.id })}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-accent/50 text-primary dark:text-accent"
              >
                <FileSignature className="w-3.5 h-3.5" />
                <span>{t.dealDossier.createQuotation}</span>
              </Button>
            </Link>
          )}
          {actions.createInvoice && isWon && (
            <Link
              href={ROUTES.invoices.create({ clientId: contact?.id, dealId: deal.id })}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-accent/50 text-primary dark:text-accent"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t.dealDossier.issueInvoice}</span>
              </Button>
            </Link>
          )}
        </div>}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5 bg-surface-raised border border-outline-variant/80 dark:border-white/10 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <DollarSign className="w-3.5 h-3.5 text-accent" />
            <span>{t.dealDossier.dealValue}</span>
          </div>
          <div className="text-2xl font-bold text-ink">
            <CurrencyDisplay
              amount={Number(deal.value) || 0}
              currency={deal.currency}
            />
          </div>
          <span className="text-[11px] text-ink-muted">
            {deal.probability != null
              ? formatMessage(t.dealDossier.probabilityValue, { value: String(deal.probability) })
              : t.dealDossier.noProbabilitySet}
          </span>
        </Card>

        <Card className="p-5 bg-surface-raised border border-outline-variant/80 dark:border-white/10 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t.dealDossier.projectedRevenue}</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 ">
            <span data-testid="deal-forecast"><CurrencyDisplay amount={projectedValue} currency={deal.currency} /></span>
          </div>
          <span className="text-[11px] text-accent ">
            {t.dealDossier.weightedValue}
          </span>
        </Card>

        <Card className="p-5 bg-surface-raised border border-outline-variant/80 dark:border-white/10 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.dealDossier.targetClose}</span>
          </div>
          <div className="text-2xl font-bold text-ink">
            {deal.target_close_date ? (
              <DateDisplay date={deal.target_close_date} locale={locale} />
            ) : (
              <span className="text-ink-muted">—</span>
            )}
          </div>
          <span className="text-[11px] text-ink-muted">
            {deal.probability != null
              ? formatMessage(t.dealDossier.expectedMultiplier, { value: (deal.probability / 100).toFixed(1) })
              : t.dealDossier.noEstimate}
          </span>
        </Card>

        <Card className="p-5 bg-surface-raised border border-outline-variant/80 dark:border-white/10 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Briefcase className="w-3.5 h-3.5 text-primary dark:text-accent" />
            <span>{t.dealDossier.invoicesGenerated}</span>
          </div>
          <div className="text-2xl font-bold text-ink">
            {invoicePage?.total ?? invoices.length}
          </div>
          <span className="text-[11px] text-ink-muted">
            {t.dealDossier.billingRecords}
          </span>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant dark:border-white/10 flex items-center gap-6 text-sm font-semibold overflow-x-auto" role="tablist">
        {[
          { id: "overview", label: t.dealDossier.tabOverview, icon: User },
          { id: "timeline", label: t.dealDossier.tabTimeline, icon: Clock },
          {
            id: "documents",
            label: t.dealDossier.tabDocuments,
            icon: FileText,
          },
          {
            id: "invoices",
            label: `${t.dealDossier.tabInvoices} (${invoicePage?.total ?? invoices.length})`,
            icon: FileText,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${isActive
                ? "border-accent text-primary dark:text-accent"
                : "border-transparent text-ink-muted dark:text-ink-muted hover:text-ink dark:hover:text-white"
                }`}
             tabIndex={activeTab === tab.id ? 0 : -1} role="tab" aria-selected={activeTab === tab.id} type="button">
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-tab-panel>
          <Card className="p-6 bg-surface-raised border border-outline-variant/80 dark:border-white/10 rounded-2xl shadow-sm space-y-4" data-page-section>
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-outline-variant dark:border-white/10 pb-3">
              {t.dealDossier.dealInfo}
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">
                  {t.dealEdit.stageLabel}
                </span>
                <span className="text-ink font-semibold">
                  {deal.stage}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">
                  {t.dealDossier.associatedClient}
                </span>
                {contact ? (
                  <Link
                    href={ROUTES.crm.customer(contact.id)}
                    className="text-primary dark:text-accent hover:underline font-semibold flex items-center gap-1"
                    title={t.dealDossier.viewCustomerDossier}
                  >
                    <span>{clientName}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="text-ink font-semibold">
                    {clientName}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">
                  {t.dealEdit.probabilityLabel}
                </span>
                <span className="text-ink font-semibold">
                  {deal.probability}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">
                  {t.invoiceEdit.currency}
                </span>
                <span className="text-ink font-semibold">
                  {deal.currency}
                </span>
              </div>
              {deal.shoot_date && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">
                    {t.dealDossier.scheduledDate || t.dealDossier.shootDate}
                  </span>
                  <span className="text-ink font-semibold">
                    <DateDisplay date={deal.shoot_date} locale={locale} />
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-surface-raised border border-outline-variant/80 dark:border-white/10 rounded-2xl shadow-sm space-y-4" data-page-section>
            <div className="flex items-center justify-between border-b border-outline-variant dark:border-white/10 pb-3">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                {t.dealDossier.clientAndAccountInfo}
              </h2>
              {contact && (
                <Link
                  href={ROUTES.crm.customer(contact.id)}
                  className="text-xs text-primary dark:text-accent hover:underline font-semibold flex items-center gap-1"
                >
                  <span>{t.dealDossier.n360Dossier}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {contact ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface-raised dark:bg-white/[0.02] border border-outline-variant/80 dark:border-white/10 space-y-3">
                  <div>
                    <div className="text-xs text-ink-muted mb-1">
                      {t.dealDossier.primaryContact}
                    </div>
                    <Link
                      href={ROUTES.crm.customer(contact.id)}
                      className="font-bold text-ink hover:text-primary dark:hover:text-accent hover:underline inline-flex items-center gap-1.5"
                    >
                      <span><bdi dir="auto">{contact.full_name}</bdi></span>
                      <ExternalLink className="w-3.5 h-3.5 text-ink-muted" />
                    </Link>
                    {contact.job_title && (
                      <div className="text-xs text-accent font-medium">
                        {contact.job_title}
                      </div>
                    )}
                  </div>

                  {contact.company && (
                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      <Building2 className="w-3.5 h-3.5 text-accent" />
                      <span className="font-semibold text-ink">
                        {contact.company}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1.5 text-ink-muted hover:text-ink dark:hover:text-white"
                      >
                        <Mail className="w-3.5 h-3.5 text-accent" />
                        <span><bdi dir="ltr">{contact.email}</bdi></span>
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-1.5 text-ink-muted hover:text-ink dark:hover:text-white"
                        dir="ltr"
                      >
                        <Phone className="w-3.5 h-3.5 text-accent" />
                        <bdi dir="ltr">{contact.phone}</bdi>
                      </a>
                    )}
                  </div>
                </div>

                {contact.notes && (
                  <div className="p-4 rounded-xl bg-surface-raised dark:bg-white/[0.02] border border-outline-variant/80 dark:border-white/10">
                    <div className="text-xs font-semibold text-ink-muted mb-2">
                      {t.dealDossier.clientRequirementsAndNotes}
                    </div>
                    <p className="text-xs text-ink leading-relaxed">
                      {contact.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-ink dark:text-ink-muted mx-auto mb-3" />
                <p className="text-sm text-ink-muted">
                  {t.dealDossier.noClientLinkAssociatedWith}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "timeline" && (
        <Card className="p-6 bg-surface-raised border border-outline-variant/80 dark:border-white/10 rounded-2xl shadow-sm space-y-4" data-page-section data-tab-panel>
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-outline-variant dark:border-white/10 pb-3">
            {t.dealDossier.productionTimelineAndLog}
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-1 text-accent">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-ink">
                  {t.dealDossier.dealCreatedInPipeline}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  <DateDisplay date={deal.created_at} locale={locale} />
                </div>
              </div>
            </div>

            {deal.target_close_date && (
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-1 text-amber-500">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {t.dealDossier.targetCloseDate}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
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
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-1 text-blue-500">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {t.dealDossier.scheduledDate || t.dealDossier.scheduledShootDate}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    <DateDisplay date={deal.shoot_date} locale={locale} />
                  </div>
                </div>
              </div>
            )}

            {deal.notes && (
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-surface-sunken dark:bg-white/10 flex items-center justify-center shrink-0 mt-1 text-ink-muted">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-xl bg-surface-raised dark:bg-white/[0.02] border border-outline-variant/80 dark:border-white/10 flex-1">
                  <div className="text-xs font-semibold text-ink-muted mb-2">
                    {t.dealDossier.dealBriefNotes}
                  </div>
                  <p className="text-xs text-ink leading-relaxed">
                    {deal.notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === "documents" && (
        <Card className="p-6 bg-surface-raised border border-outline-variant/80 dark:border-white/10 rounded-2xl shadow-sm space-y-6" data-page-section data-tab-panel>
          <div className="flex items-center justify-between border-b border-outline-variant dark:border-white/10 pb-4">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              {t.dealDossier.contractsBriefs}
            </h2>
          </div>

          <div className="text-center py-12 bg-surface-raised dark:bg-white/[0.02] rounded-xl border-2 border-dashed border-outline-variant dark:border-white/10">
            <FileText className="w-12 h-12 text-ink dark:text-ink-muted mx-auto mb-4" />
            <p className="text-sm font-medium text-ink-muted dark:text-ink mb-1">
              {t.dealDossier.noContracts}
            </p>
          </div>
        </Card>
      )}

      {activeTab === "invoices" && (
        <Card className="p-6 bg-surface-raised border border-outline-variant/80 dark:border-white/10 rounded-2xl shadow-sm space-y-4" data-page-section data-tab-panel>
          <div className="flex items-center justify-between border-b border-outline-variant dark:border-white/10 pb-4">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              {t.dealDossier.linkedInvoices}
            </h2>
            <span className="text-xs text-ink-muted font-semibold">
              {invoicePage?.total ?? invoices.length} {t.copy.invoiceCountLabel}</span>
          </div>

          {invoicePage ? (
            <ListControls
              path={ROUTES.crm.deal(deal.id)}
              {...invoicePage}
              exportDomain="invoices"
              statuses={[
                "draft",
                "sent",
                "partially_paid",
                "paid",
                "overdue",
                "void",
              ]}
            />
          ) : null}
          {invoices.length === 0 ? (
            <div className="text-center py-12 bg-surface-raised dark:bg-white/[0.02] rounded-xl border-2 border-dashed border-outline-variant dark:border-white/10">
              <FileText className="w-12 h-12 text-ink dark:text-ink-muted mx-auto mb-4" />
              <p className="text-sm font-medium text-ink-muted dark:text-ink mb-3">
                {t.dealDossier.noInvoices}
              </p>
              {actions.createInvoice && (
                <Link
                  href={ROUTES.invoices.create({ clientId: contact?.id, dealId: deal.id })}
                >
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t.dealDossier.issueInvoice}</span>
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-surface-raised dark:bg-white/[0.03] border-b border-outline-variant dark:border-white/10 text-ink-muted uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3 text-start">
                      {t.dealDossier.invoiceNum}
                    </th>
                    <th className="p-3 text-start">
                      {t.dealDossier.issueDate}
                    </th>
                    <th className="p-3 text-end">
                      {t.dealDossier.totalAmount}
                    </th>
                    <th className="p-3 text-end">{t.dealDossier.balanceDue}</th>
                    <th className="p-3 text-center">{t.dealDossier.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant dark:divide-white/5">
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-surface-raised/70 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-3">
                        <Link
                          href={ROUTES.invoices.detail(inv.id)}
                          className=" font-bold text-accent hover:underline"
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="p-3 text-ink-muted">
                        <DateDisplay date={inv.issue_date} locale={locale} />
                      </td>
                      <td className="p-3 text-end text-ink font-bold">
                        <CurrencyDisplay
                          amount={Number(inv.total_amount)}
                          currency={inv.currency}
                        />
                      </td>
                      <td className="p-3 text-end  text-rose-600 dark:text-rose-400 font-bold">
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
