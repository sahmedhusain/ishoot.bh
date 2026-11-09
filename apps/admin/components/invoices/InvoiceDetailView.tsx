"use client";

import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Invoice, CompanySettings, Payment } from "@platform/database/types";
import { formatMessage } from "@platform/locales";
import { InvoiceTemplate } from "./InvoiceTemplate";
import { PaymentRecorder } from "../payments/PaymentRecorder";
import { Button, formatDate } from "@platform/ui";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  FileText,
  Pencil,
  Receipt,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "../../hooks/usePermissions";
import { markInvoiceSentAction } from "../../app/actions/finance";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { DocumentDetailHeader, DocumentHeaderChip } from "../documents/DocumentDetailHeader";
import { DocumentStatusBanner, type DocumentStatusMeta } from "../documents/DocumentStatusBanner";
import { DocumentLinesCard } from "../documents/DocumentLinesCard";
import { DocumentTotals } from "../documents/DocumentTotals";
import { DocumentCard, DocumentBilingualText } from "../documents/DocumentCard";
import { DocumentInfoCard, DocumentPartyDetails } from "../documents/DocumentInfoCard";
import { DocumentShareMenu } from "../documents/DocumentShareMenu";
import { paymentMethodLabel } from "../documents/payment-method";

interface InvoiceDetailViewProps {
  invoice: Invoice;
  company: CompanySettings;
  payments: Payment[];
  signing?: { signatureUrl: string | null; signerName: string } | null;
  quotation?: { id: string; quotationNumber: string } | null;
  deal?: { id: string; title: string } | null;
}

export function InvoiceDetailView({
  invoice,
  company,
  payments,
  signing = null,
  quotation = null,
  deal = null,
}: InvoiceDetailViewProps) {
  const router = useRouter();
  const { t, locale } = useAdminLocale();
  const { can } = usePermissions();
  const canWrite = can("invoices", "write");
  const canExport = can("invoices", "export");
  const canRecordPayment = can("payments", "create");
  const canReadPayments = can("payments", "read");
  const [busy, setBusy] = React.useState(false);
  const [recordModalOpen, setRecordModalOpen] = React.useState(false);
  const dT = t.documentDetail;

  const handleMarkSent = async () => {
    setBusy(true);
    try {
      await markInvoiceSentAction(invoice.id);
      toast.success(t.invoiceLifecycle.marked);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, t.invoiceLifecycle.failed));
    } finally {
      setBusy(false);
    }
  };

  const clientName =
    invoice.contact?.company ||
    invoice.contact?.full_name ||
    t.invoice.clientFallback;
  const money = (value: number) => `${value.toFixed(3)} ${invoice.currency}`;
  const isOpen = invoice.status !== "draft" && invoice.status !== "void";
  const paidOn = invoice.status === "paid" ? payments[0]?.payment_date : undefined;

  const statusMeta: Record<string, DocumentStatusMeta> = {
    draft: { label: t.statusLabels.draft, color: "bg-m3-surface-container-highest text-m3-on-surface-variant", icon: Clock },
    sent: { label: t.statusLabels.sent, color: "bg-m3-secondary-container text-m3-on-secondary-container", icon: Send },
    partially_paid: { label: t.statusLabels.partially_paid, color: "bg-m3-tertiary-container text-m3-on-tertiary-container", icon: Coins },
    paid: { label: t.statusLabels.paid, color: "bg-m3-primary-container text-m3-on-primary-container", icon: CheckCircle2 },
    overdue: { label: t.statusLabels.overdue, color: "bg-m3-error-container text-m3-on-error-container", icon: AlertCircle },
    void: { label: t.statusLabels.void, color: "bg-m3-surface-container-highest text-m3-on-surface-variant", icon: XCircle },
  };

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8 pb-16 print:hidden">
        <DocumentDetailHeader
          backHref={ROUTES.invoices.list}
          backLabel={t.actions.backToInvoices}
          eyebrow={dT.invoiceEyebrow}
          chips={signing && <DocumentHeaderChip>{t.signing.signedStamped}</DocumentHeaderChip>}
          number={invoice.invoice_number}
          pdf={{ type: "invoice", id: invoice.id, number: invoice.invoice_number, canDownload: canExport }}
          actions={
            <>
              {invoice.status === "draft" && canWrite && (
                <Button variant="primary" size="sm" onClick={handleMarkSent} disabled={busy} title={t.invoiceLifecycle.markSentHint} className="gap-2">
                  <Send className="w-4 h-4" />
                  <span>{t.invoiceLifecycle.markSent}</span>
                </Button>
              )}
              {invoice.status !== "void" && invoice.amount_paid === 0 && canWrite && (
                <Link href={ROUTES.invoices.edit(invoice.id)}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Pencil className="w-4 h-4" />
                    <span>{t.actions.edit}</span>
                  </Button>
                </Link>
              )}
              <DocumentShareMenu
                documentType="invoice"
                documentNumber={invoice.invoice_number}
                companyName={company?.company_name_en || ""}
                clientName={clientName}
                clientEmail={invoice.contact?.email}
                clientPhone={invoice.contact?.phone}
                amountFormatted={money(invoice.total_amount)}
                signed={!!signing}
              />
              {invoice.amount_due > 0 && isOpen && canRecordPayment && (
                <Button variant="primary" size="sm" onClick={() => setRecordModalOpen(true)} className="gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>{t.finance.recordPayment}</span>
                </Button>
              )}
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <DocumentStatusBanner status={invoice.status} statusMeta={statusMeta} fallback="draft" caption={t.finance.status}>
              {invoice.status === "draft" ? (
                <span className="text-xs text-ink-muted max-w-xs">{t.invoiceLifecycle.draftNoPayments}</span>
              ) : (
                isOpen && invoice.amount_due > 0 && (
                  <span
                    className={`text-xs font-mono px-2.5 py-1 rounded-md ${invoice.status === "overdue" ? "bg-m3-error-container text-m3-on-error-container" : "bg-surface-sunken text-ink"}`}
                  >
                    {formatMessage(dT.balanceDueChip, { amount: money(invoice.amount_due) })}
                  </span>
                )
              )}
            </DocumentStatusBanner>

            <DocumentLinesCard
              title={dT.invoiceLines}
              currency={invoice.currency}
              lines={(invoice.line_items ?? []).map((item) => ({
                id: item.id,
                descriptionEn: item.description_en,
                descriptionAr: item.description_ar,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                lineTotal: item.line_total,
              }))}
            >
              <DocumentTotals
                currency={invoice.currency}
                subtotal={invoice.subtotal}
                discount={{
                  amount: invoice.discount_amount,
                  label: invoice.discount_type === "percentage" ? `${t.finance.discount} (${invoice.discount_value}%)` : t.finance.discount,
                }}
                vat={invoice.vat_enabled ? { percentage: invoice.vat_percentage, amount: invoice.vat_amount } : null}
                taxes={invoice.other_taxes ?? []}
                total={invoice.total_amount}
                paid={invoice.amount_paid}
                balance={invoice.amount_due}
              />
            </DocumentLinesCard>

            <DocumentCard title={dT.notesTitle}>
              <DocumentBilingualText
                en={{ label: dT.englishNotes, text: invoice.notes_en, empty: dT.noEnglishNotes }}
                ar={{ label: dT.arabicNotes, text: invoice.notes_ar, empty: dT.noArabicNotes }}
              />
            </DocumentCard>

            {canReadPayments && (
              <DocumentCard title={dT.paymentsReceived} icon={Receipt}>
                {payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-sm">
                      <thead>
                        <tr className="border-b border-outline-variant text-xs font-mono uppercase text-ink-muted">
                          <th className="py-2.5 px-3 text-start">{t.finance.receiptNumber}</th>
                          <th className="py-2.5 px-3 text-start">{t.finance.paymentDate}</th>
                          <th className="py-2.5 px-3 text-start">{t.finance.paymentMethod}</th>
                          <th className="py-2.5 px-3 text-end">{dT.amount} ({invoice.currency})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant">
                        {payments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-surface-raised/50">
                            <td className="py-3 px-3">
                              <Link
                                href={ROUTES.payments.detail(payment.id)}
                                className="font-mono font-semibold text-accent hover:underline"
                                title={t.invoiceDetail.viewOfficialReceipt}
                              >
                                <bdi dir="ltr">{payment.receipt_number}</bdi>
                              </Link>
                            </td>
                            <td className="py-3 px-3 font-mono text-xs text-ink-muted">{formatDate(payment.payment_date, locale, "long")}</td>
                            <td className="py-3 px-3 text-xs text-ink">{paymentMethodLabel(payment.payment_method, t)}</td>
                            <td className="py-3 px-3 text-end font-mono font-semibold text-ink">{payment.amount.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted">{dT.noPayments}</p>
                )}
              </DocumentCard>
            )}
          </div>

          <div className="space-y-6">
            <DocumentInfoCard title={t.finance.client}>
              <DocumentPartyDetails
                name={clientName}
                href={invoice.contact_id ? ROUTES.crm.customer(invoice.contact_id) : undefined}
                lines={[
                  invoice.contact?.email && <><bdi dir="ltr">{t.quotationDetail.email}</bdi>: <bdi dir="ltr">{invoice.contact.email}</bdi></>,
                  invoice.contact?.phone && <><bdi dir="ltr">{t.quotationDetail.phone}</bdi>: <bdi dir="ltr">{invoice.contact.phone}</bdi></>,
                ].filter(Boolean)}
              />
            </DocumentInfoCard>

            <DocumentInfoCard
              title={t.quotationDetail.documentLifecycle}
              rows={[
                { label: t.finance.issueDate, icon: Calendar, value: formatDate(invoice.issue_date, locale, "long") },
                { label: t.finance.dueDate, icon: Calendar, value: formatDate(invoice.due_date, locale, "long") },
                { label: dT.sentOn, icon: Send, value: invoice.delivered_at ? formatDate(invoice.delivered_at, locale, "long") : dT.notYet },
                { label: dT.paidOn, icon: CheckCircle2, value: paidOn ? formatDate(paidOn, locale, "long") : dT.notYet },
              ]}
            />

            <DocumentInfoCard
              title={dT.linksTitle}
              rows={[
                ...(quotation
                  ? [{
                      label: t.invoiceLifecycle.fromQuotation,
                      icon: FileText,
                      value: (
                        <Link href={ROUTES.quotations.detail(quotation.id)} className="text-accent hover:underline">
                          <bdi dir="ltr">{quotation.quotationNumber}</bdi>
                        </Link>
                      ),
                    }]
                  : []),
                ...(deal
                  ? [{
                      label: t.invoiceLifecycle.forDeal,
                      icon: Briefcase,
                      mono: false,
                      value: (
                        <Link href={ROUTES.crm.deal(deal.id)} className="text-accent hover:underline">
                          <bdi dir="auto">{deal.title}</bdi>
                        </Link>
                      ),
                    }]
                  : []),
              ]}
            >
              {!quotation && !deal && <p className="text-xs text-ink-muted">{dT.noLinks}</p>}
            </DocumentInfoCard>
          </div>
        </div>
      </div>

      <div className="hidden print:block">
        <InvoiceTemplate invoice={invoice} company={company} signing={signing} />
      </div>

      <PaymentRecorder
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        invoice={invoice}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
