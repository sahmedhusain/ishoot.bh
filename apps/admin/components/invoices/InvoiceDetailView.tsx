"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Invoice, CompanySettings, Payment } from "@ishoot/database/types";
import { InvoiceTemplate } from "./InvoiceTemplate";
import { DeliveryToolbar } from "../shared/DeliveryToolbar";
import { PaymentRecorder } from "../payments/PaymentRecorder";
import { Button, Card, StatusBadge, CurrencyDisplay } from "@ishoot/ui";
import { ArrowLeft, ArrowRight, CreditCard, Pencil, Receipt, Send } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "../../hooks/usePermissions";
import { markInvoiceSentAction } from "../../app/actions/finance";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface InvoiceDetailViewProps {
  invoice: Invoice;
  company: CompanySettings;
  payments: Payment[];
  signing?: { signatureUrl: string | null; signerName: string } | null;
}

export function InvoiceDetailView({
  invoice,
  company,
  payments,
  signing = null,
}: InvoiceDetailViewProps) {
  const router = useRouter();
  const { t, isRTL } = useAdminLocale();
  const { can } = usePermissions();
  const canWrite = can("invoices", "write");
  const canRecordPayment = can("payments", "create");
  const [busy, setBusy] = React.useState(false);

  const handleMarkSent = async () => {
    setBusy(true);
    try {
      await markInvoiceSentAction(invoice.id);
      toast.success(t.invoiceLifecycle.marked);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.invoiceLifecycle.failed);
    } finally {
      setBusy(false);
    }
  };
  const [recordModalOpen, setRecordModalOpen] = React.useState(false);

  const clientName =
    invoice.contact?.company ||
    invoice.contact?.full_name ||
    t.invoice.clientFallback;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const handlePaymentSuccess = () => {
    router.refresh();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print"
        data-topbar="true"
      >
        <div>
          <Link
            href={ROUTES.invoices.list}
            className="inline-flex items-center gap-2 text-xs text-ink-muted hover:text-accent transition-colors mb-2 font-medium"
          >
            <BackIcon className="w-4 h-4" />
            <span>{t.actions.backToInvoices}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              {invoice.invoice_number}
            </h1>
            <StatusBadge status={invoice.status} />
            {invoice.contact_id && (
              <Link
                href={ROUTES.crm.customer(invoice.contact_id)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F5F2] text-primary dark:bg-[#152B27] dark:text-mint border border-accent/30 hover:underline transition-colors"
                title={t.invoiceDetail.viewClient360Dossier}
              >
                <span>Client: {clientName}</span>
                <span className="text-[10px] opacity-70">↗</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {invoice.status === "draft" && canWrite && (
            <Button variant="primary" size="sm" onClick={handleMarkSent} disabled={busy} title={t.invoiceLifecycle.markSentHint} className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              <span>{t.invoiceLifecycle.markSent}</span>
            </Button>
          )}
          {/* Invoices with payments are locked; corrections go through a credit adjustment. */}
          {invoice.status !== "void" && invoice.amount_paid === 0 && canWrite && (
            <Link href={ROUTES.invoices.edit(invoice.id)}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                <span>{t.actions.edit}</span>
              </Button>
            </Link>
          )}
          {invoice.amount_due > 0 && invoice.status !== "draft" && invoice.status !== "void" && canRecordPayment && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setRecordModalOpen(true)}
              className="gap-2 shadow-lg shadow-accent/20"
            >
              <CreditCard className="w-4 h-4" />
              <span>{t.finance.recordPayment}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="no-print" data-delivery-toolbar="true">
        <DeliveryToolbar
          signed={!!signing}
          companyName={company?.company_name_en || ""}
          documentType="invoice"
          documentNumber={invoice.invoice_number}
          clientName={clientName}
          clientEmail={invoice.contact?.email}
          clientPhone={invoice.contact?.phone}
          amountFormatted={`${invoice.total_amount.toFixed(3)} ${invoice.currency}`}
        />
      </div>

      <div className="p-2 sm:p-6 bg-slate-100/70 dark:bg-surface-sunken rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm flex justify-center">
        <InvoiceTemplate invoice={invoice} company={company} signing={signing} />
      </div>

      {payments.length > 0 && (
        <Card className="p-6 bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 rounded-2xl space-y-4 no-print shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            <Receipt className="w-4 h-4 text-accent" />
            <span>{t.actions.associatedReceipts}</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {payments.map((p) => (
              <div
                key={p.id}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div>
                  <Link
                    href={ROUTES.payments.detail(p.id)}
                    className=" font-bold text-accent hover:underline inline-flex items-center gap-1 group"
                    title={t.invoiceDetail.viewOfficialReceipt}
                  >
                    <span>{p.receipt_number}</span>
                    <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                      ↗
                    </span>
                  </Link>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    {p.payment_date} • {p.payment_method.replace("_", " ")}
                  </div>
                </div>

                <div className="text-end">
                  <div className=" font-bold text-slate-900 dark:text-white">
                    <CurrencyDisplay amount={p.amount} currency={p.currency} />
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ">
                    {t.finance.reconciled}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <PaymentRecorder
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        invoice={invoice}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
