"use client";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import { uploadFileDirectly } from "../../lib/upload-client";
import { AddLinkInline } from "../shared/LinkOrUploadField";
import { createAttachmentAction } from "../../app/actions/attachments";

import * as React from "react";
import Link from "next/link";
import type { Payment, CompanySettings } from "@platform/database/types";
import { formatMessage } from "@platform/locales";
import { formatDate } from "@platform/ui";
import { ReceiptTemplate } from "./ReceiptTemplate";
import {
  Calendar,
  CheckCircle2,
  Coins,
  FileText,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  FolderArchive,
  UploadCloud,
  Loader2,
  Landmark,
  PenLine,
  XCircle,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { usePermissions } from "../../hooks/usePermissions";
import { DocumentDetailHeader, DocumentHeaderChip } from "../documents/DocumentDetailHeader";
import { DocumentStatusBanner, type DocumentStatusMeta } from "../documents/DocumentStatusBanner";
import { DocumentCard } from "../documents/DocumentCard";
import { DocumentInfoCard, DocumentPartyDetails } from "../documents/DocumentInfoCard";
import { DocumentShareMenu } from "../documents/DocumentShareMenu";
import { paymentMethodLabel } from "../documents/payment-method";

interface PaymentDetailViewProps {
  payment: Payment;
  company: CompanySettings;
  signing?: { signatureUrl: string | null; signerName: string } | null;
}

export function PaymentDetailView({
  payment: initialPayment,
  company,
  signing = null,
}: PaymentDetailViewProps) {
  const { t, locale } = useAdminLocale();
  const { can } = usePermissions();
  const canExport = can("payments", "export");
  const [payment, setPayment] = React.useState<Payment>(initialPayment);
  const [uploadError, setUploadError] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dT = t.documentDetail;

  const attachments = payment.proof_attachments || [];

  const handleInstantUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(""); setUploading(true);
    try {
      const data = await uploadFileDirectly(file, {
        entityType: "payment",
        entityId: payment.id,
      });
      if (!data.success || !data.attachment?.id) {
        throw new Error(data.error || t.paymentDetail.uploadFailed);
      }

      const newAtt = {
        id: data.attachment.id,
        file_name: data.fileName,
        file_url: data.fileUrl,
        file_size: data.fileSize,
        mime_type: data.mimeType,
        entity_type: "payment",
        entity_id: payment.id,
        created_at: new Date().toISOString(),
      };

      setPayment((prev) => ({
        ...prev,
        proof_attachments: [newAtt, ...(prev.proof_attachments || [])],
      }));
    } catch (err: any) {
      setUploadError(errorMessage(err, t, t.paymentDetail.failedToUploadDocument));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const invoice = payment.invoice;
  const clientName =
    invoice?.contact?.company ||
    invoice?.contact?.full_name ||
    invoice?.contact_name ||
    t.paymentDetail.clientUnavailable;
  const money = (value: number) => `${value.toFixed(3)} ${payment.currency}`;
  const methodLabel = paymentMethodLabel(payment.payment_method, t);

  const status = invoice?.status === "void" ? "void" : invoice && invoice.amount_due > 0 ? "partial" : "settled";
  const statusMeta: Record<string, DocumentStatusMeta> = {
    settled: { label: dT.settled, color: "bg-m3-primary-container text-m3-on-primary-container", icon: CheckCircle2 },
    partial: { label: dT.partial, color: "bg-m3-tertiary-container text-m3-on-tertiary-container", icon: Coins },
    void: { label: t.invoiceLifecycle.voided, color: "bg-m3-surface-container-highest text-m3-on-surface-variant", icon: XCircle },
  };

  const detailRows = [
    { label: t.finance.paymentMethod, value: methodLabel },
    { label: t.finance.referenceNumber, value: payment.reference_number ? <bdi dir="ltr">{payment.reference_number}</bdi> : dT.noReference, mono: true },
    { label: t.finance.paymentDate, value: formatDate(payment.payment_date, locale, "long"), mono: true },
    { label: dT.amount, value: money(payment.amount), mono: true },
  ];

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8 pb-16 print:hidden">
        <DocumentDetailHeader
          backHref={ROUTES.payments.list}
          backLabel={t.paymentDetailView.back}
          eyebrow={dT.receiptEyebrow}
          chips={
            <>
              <DocumentHeaderChip>{methodLabel}</DocumentHeaderChip>
              {signing && <DocumentHeaderChip>{t.signing.signedStamped}</DocumentHeaderChip>}
            </>
          }
          number={payment.receipt_number}
          pdf={{ type: "receipt", id: payment.id, number: payment.receipt_number, canDownload: canExport }}
          actions={
            <DocumentShareMenu
              documentType="receipt"
              documentNumber={payment.receipt_number}
              companyName={company?.company_name_en || ""}
              clientName={clientName}
              clientEmail={invoice?.contact?.email}
              clientPhone={invoice?.contact?.phone}
              amountFormatted={money(payment.amount)}
              signed={!!signing}
            />
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <DocumentStatusBanner status={status} statusMeta={statusMeta} fallback="settled" caption={dT.receiptStatus}>
              <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-surface-sunken text-ink">
                {money(payment.amount)}
              </span>
            </DocumentStatusBanner>

            <DocumentCard title={dT.allocationTitle} icon={FileText}>
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-xs font-mono uppercase text-ink-muted">
                      <th className="py-2.5 px-3 text-start">{t.paymentDetailView.invoice}</th>
                      <th className="py-2.5 px-3 text-end">{dT.applied} ({payment.currency})</th>
                      <th className="py-2.5 px-3 text-end">{dT.remaining} ({payment.currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    <tr className="hover:bg-surface-raised/50">
                      <td className="py-3 px-3">
                        {invoice ? (
                          <Link
                            href={ROUTES.invoices.detail(invoice.id)}
                            className="font-mono font-semibold text-accent hover:underline"
                            title={t.paymentDetail.viewLinkedInvoice}
                          >
                            <bdi dir="ltr">{invoice.invoice_number}</bdi>
                          </Link>
                        ) : (
                          <span className="text-ink-muted">{dT.notYet}</span>
                        )}
                        {invoice && (
                          <div className="text-xs text-ink-muted font-mono mt-0.5">
                            {t.finance.totalAmount}: {money(invoice.total_amount)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-end font-mono font-semibold text-ink">{payment.amount.toFixed(3)}</td>
                      <td className={`py-3 px-3 text-end font-mono font-semibold ${invoice && invoice.amount_due > 0 ? "text-m3-error" : "text-primary"}`}>
                        {invoice ? invoice.amount_due.toFixed(3) : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </DocumentCard>

            <DocumentCard title={dT.methodTitle} icon={Landmark}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {detailRows.map((row) => (
                  <div key={String(row.label)}>
                    <span className="text-ink-muted block mb-0.5">{row.label}</span>
                    <div className={`${row.mono ? "font-mono" : "font-medium"} text-ink`}>{row.value}</div>
                  </div>
                ))}
              </div>
              {payment.notes && (
                <div>
                  <div className="text-xs font-mono uppercase text-ink-muted mb-1">{dT.notes}</div>
                  <div className="p-3 bg-surface-sunken rounded-md text-xs text-ink whitespace-pre-line">
                    <bdi dir="auto">{payment.notes}</bdi>
                  </div>
                </div>
              )}
            </DocumentCard>

            <DocumentCard
              title={t.paymentDetailView.settlementVaultTitle}
              icon={ShieldCheck}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`${ROUTES.archive}?search=${encodeURIComponent(payment.receipt_number)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-primary bg-m3-primary-container/40 border border-primary/30 hover:underline transition-colors"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>{t.paymentDetailView.viewArchive}</span>
                  </Link>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={handleInstantUpload}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-xs"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t.paymentDetailView.uploading}</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{t.paymentDetailView.uploadProof}</span>
                      </>
                    )}
                  </button>
                  <AddLinkInline
                    disabled={uploading}
                    onLink={async (url) => {
                      const fileName = new URL(url).hostname;
                      const result = await createAttachmentAction({
                        fileName,
                        fileUrl: url,
                        entityType: "payment",
                        entityId: payment.id,
                      });
                      if (!result.success || !result.attachment) throw new Error(errorMessage(result.error, t, t.paymentDetail.failedToUploadDocument));
                      setPayment((prev) => ({
                        ...prev,
                        proof_attachments: [
                          {
                            id: result.attachment.id,
                            file_name: fileName,
                            file_url: url,
                            entity_type: "payment",
                            entity_id: payment.id,
                            created_at: new Date().toISOString(),
                          },
                          ...(prev.proof_attachments || []),
                        ],
                      }));
                    }}
                  />
                </div>
              }
            >
              <p className="text-xs text-ink-muted">
                {payment.payment_method === "cheque"
                  ? t.paymentDetailView.settlementVaultDescCheque
                  : t.paymentDetailView.settlementVaultDescGeneral}
              </p>

              {uploadError && <p role="alert" className="text-sm text-m3-error">{uploadError}</p>}
              {attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((att) => {
                    const isCheque =
                      att.file_name.toLowerCase().includes("cheque") ||
                      payment.payment_method === "cheque";
                    const isBankStatement =
                      att.file_name.toLowerCase().includes("bank") ||
                      att.file_name.toLowerCase().includes("slip") ||
                      att.file_name.toLowerCase().includes("statement");

                    return (
                      <div
                        key={att.id}
                        className="p-3.5 rounded-xl border border-outline-variant bg-surface flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center shrink-0">
                            {isCheque ? (
                              <FileCheck className="w-4 h-4" />
                            ) : isBankStatement ? (
                              <Landmark className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-xs font-bold text-ink truncate"
                              title={att.file_name}
                            >
                              {att.file_name}
                            </p>
                            <p className="text-[10px] text-ink-muted">
                              {att.file_size
                                ? `${(att.file_size / 1024).toFixed(0)} KB`
                                : t.paymentDetailView.document}{" "}
                              • {att.created_at?.split("T")[0]}
                            </p>
                          </div>
                        </div>

                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors shrink-0"
                          title={t.paymentDetail.viewDownload}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-outline-variant text-center">
                  <p className="text-xs text-ink-muted">{t.paymentDetailView.noAttachmentsYet}</p>
                </div>
              )}
            </DocumentCard>
          </div>

          <div className="space-y-6">
            <DocumentInfoCard title={dT.payerTitle}>
              <DocumentPartyDetails
                name={clientName}
                href={invoice?.contact_id ? ROUTES.crm.customer(invoice.contact_id) : undefined}
                lines={[
                  invoice?.contact?.email && <><bdi dir="ltr">{t.quotationDetail.email}</bdi>: <bdi dir="ltr">{invoice.contact.email}</bdi></>,
                  invoice?.contact?.phone && <><bdi dir="ltr">{t.quotationDetail.phone}</bdi>: <bdi dir="ltr">{invoice.contact.phone}</bdi></>,
                ].filter(Boolean)}
              />
            </DocumentInfoCard>

            <DocumentInfoCard
              title={t.quotationDetail.documentLifecycle}
              rows={[
                { label: t.finance.paymentDate, icon: Calendar, value: formatDate(payment.payment_date, locale, "long") },
                { label: dT.recordedOn, icon: Calendar, value: formatDate(payment.created_at, locale, "long") },
                ...(invoice ? [{ label: t.finance.dueDate, icon: Calendar, value: formatDate(invoice.due_date, locale, "long") }] : []),
                {
                  label: t.signing.signedStamped,
                  icon: PenLine,
                  mono: false,
                  value: signing ? formatMessage(t.signing.signedBy, { name: signing.signerName }) : dT.notYet,
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="hidden print:block">
        <ReceiptTemplate
          payment={payment}
          company={company}
          locale={locale as "en" | "ar"}
          signing={signing}
        />
      </div>
    </>
  );
}
