"use client";
import { ROUTES } from "../../constants/routes";
import { uploadFileDirectly } from "../../lib/upload-client";

import * as React from "react";
import Link from "next/link";
import type { Payment,CompanySettings } from "@ishoot/database/types";
import { ReceiptTemplate } from "./ReceiptTemplate";
import { DeliveryToolbar } from "../shared/DeliveryToolbar";
import { Button } from "@ishoot/ui";
import {
ArrowLeft,
ArrowRight,
Receipt,
FileText,
User,ExternalLink,
ShieldCheck,
FileCheck,
FolderArchive,
UploadCloud,
Loader2,
Landmark
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface PaymentDetailViewProps {
  payment: Payment;
  company: CompanySettings;
}

export function PaymentDetailView({
  payment: initialPayment,
  company,
}: PaymentDetailViewProps) {
  const { t, isRTL, locale } = useAdminLocale();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const [payment, setPayment] = React.useState<Payment>(initialPayment);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const attachments = payment.proof_attachments || [];

  const handleInstantUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await uploadFileDirectly(file, { entityType: "payment", entityId: payment.id });
        const res = { ok: true }; // polyfill for following code
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      const newAtt = {
        id: data.attachment?.id || `att-${Date.now()}`,
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
      console.error("Instant upload error:", err);
      alert(err.message || "Failed to upload document");
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
    "Client";

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print"
        data-topbar="true"
      >
        <div>
          <Link
            href={ROUTES.payments.list}
            className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-[#09937F] dark:text-slate-400 dark:hover:text-[#09937F] transition-colors mb-2 font-medium"
          >
            <BackIcon className="w-4 h-4" />
            <span>{t.paymentDetailView.back}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-2">
              <Receipt className="w-6 h-6 text-[#09937F]" />
              <span>{payment.receipt_number}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {t.paymentDetailView.verifiedPayment}
            </span>

            {invoice && (
              <Link
                href={ROUTES.invoices.detail(invoice.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#09937F] border border-slate-200 dark:border-slate-700 transition-colors"
                title="View Linked Invoice"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {t.paymentDetailView.invoice}: {invoice.invoice_number}
                </span>
                <span className="text-[10px] opacity-70">↗</span>
              </Link>
            )}

            {invoice?.contact_id && (
              <Link
                href={ROUTES.crm.customer(invoice.contact_id)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F5F2] text-[#014842] dark:bg-[#152B27] dark:text-[#7DE0D1] border border-[#09937F]/30 hover:underline transition-colors"
                title="View Client Dossier in CRM"
              >
                <User className="w-3.5 h-3.5" />
                <span>
                  {t.paymentDetailView.client}: {clientName}
                </span>
                <span className="text-[10px] opacity-70">↗</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2 text-xs font-semibold"
          >
            <span>{t.paymentDetailView.printReceipt}</span>
          </Button>
        </div>
      </div>

      {/* Delivery & Share Toolbar */}
      <div className="no-print" data-delivery-toolbar="true">
        <DeliveryToolbar
          companyName={company?.company_name_en || ""}
          documentType="receipt"
          documentNumber={payment.receipt_number}
          clientName={clientName}
          clientEmail={invoice?.contact?.email}
          clientPhone={invoice?.contact?.phone}
          amountFormatted={`${payment.amount.toFixed(3)} ${payment.currency}`}
        />
      </div>

      {/* Attached Documents & Archive Integration (Screen Only) */}
      <div className="no-print bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#014842]/10 text-[#014842] dark:text-[#7de0d1]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t.paymentDetailView.settlementVaultTitle}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                {payment.payment_method === "cheque"
                  ? t.paymentDetailView.settlementVaultDescCheque
                  : t.paymentDetailView.settlementVaultDescGeneral}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`${ROUTES.archive}?search=${encodeURIComponent(payment.receipt_number)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#014842] dark:text-[#7de0d1] bg-[#e6f5f2] dark:bg-[#004d40]/40 border border-[#014842]/30 dark:border-[#004d40] hover:underline transition-colors"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#014842] hover:bg-[#014842]/90 text-white transition-colors shadow-xs"
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
          </div>
        </div>

        {attachments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
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
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-800/40 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-[#014842] dark:text-[#7de0d1] flex items-center justify-center shrink-0">
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
                        className="text-xs font-bold text-slate-900 dark:text-white truncate"
                        title={att.file_name}
                      >
                        {att.file_name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-neutral-400 ">
                        {att.file_size
                          ? `${(att.file_size / 1024).toFixed(0)} KB`
                          : t.paymentDetailView.document}{" "}
                        • {att.created_at?.split("T")[0]}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={att.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-700 transition-colors"
                      title="View / Download"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/20 text-center">
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              {t.paymentDetailView.noAttachmentsYet}
            </p>
          </div>
        )}
      </div>

      {/* Official Receipt Template with Multi-Page Engine */}
      <div className="p-2 sm:p-6 bg-slate-100/70 dark:bg-[#070C0A] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm flex justify-center">
        <ReceiptTemplate
          payment={payment}
          company={company}
          locale={locale as "en" | "ar"}
        />
      </div>
    </div>
  );
}
