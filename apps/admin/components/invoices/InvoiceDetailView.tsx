"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Invoice, CompanySettings, Payment } from "@ishoot/database/types";
import { InvoiceTemplate } from "./InvoiceTemplate";
import { DeliveryToolbar } from "../shared/DeliveryToolbar";
import { PaymentRecorder } from "../payments/PaymentRecorder";
import { Button, Card, StatusBadge, CurrencyDisplay } from "@ishoot/ui";
import { ArrowLeft, ArrowRight, CreditCard, Receipt } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface InvoiceDetailViewProps {
  invoice: Invoice;
  company: CompanySettings;
  payments: Payment[];
}

export function InvoiceDetailView({
  invoice,
  company,
  payments,
}: InvoiceDetailViewProps) {
  const router = useRouter();
  const { t, isRTL } = useAdminLocale();
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
            href="/dashboard/invoices"
            className="inline-flex items-center gap-2 text-xs text-[#9EADA9] hover:text-[#09937F] transition-colors mb-2 font-medium"
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
                href={`/dashboard/crm/customers/${invoice.contact_id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F5F2] text-[#014842] dark:bg-[#152B27] dark:text-[#7DE0D1] border border-[#09937F]/30 hover:underline transition-colors"
                title="View Client 360 Dossier"
              >
                <span>Client: {clientName}</span>
                <span className="text-[10px] opacity-70">↗</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {invoice.status !== "paid" && invoice.status !== "void" && (
            <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
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
                <span>{t.actions.edit || "Edit"}</span>
              </Button>
            </Link>
          )}
          {invoice.amount_due > 0 && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setRecordModalOpen(true)}
              className="gap-2 shadow-lg shadow-[#09937F]/20"
            >
              <CreditCard className="w-4 h-4" />
              <span>{t.finance.recordPayment}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="no-print" data-delivery-toolbar="true">
        <DeliveryToolbar
          documentType="invoice"
          documentNumber={invoice.invoice_number}
          clientName={clientName}
          clientEmail={invoice.contact?.email}
          clientPhone={invoice.contact?.phone}
          amountFormatted={`${invoice.total_amount.toFixed(3)} ${invoice.currency}`}
        />
      </div>

      <div className="p-2 sm:p-6 bg-[#070C0A] rounded-3xl border border-white/10 shadow-2xl flex justify-center">
        <InvoiceTemplate invoice={invoice} company={company} />
      </div>

      {payments.length > 0 && (
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-4 no-print">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <Receipt className="w-4 h-4 text-[#10B981]" />
            <span>{t.actions.associatedReceipts}</span>
          </div>

          <div className="divide-y divide-white/5">
            {payments.map((p) => (
              <div
                key={p.id}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-mono font-bold text-[#10B981]">
                    {p.receipt_number}
                  </div>
                  <div className="text-[#9EADA9] text-[11px]">
                    {p.payment_date} • {p.payment_method.replace("_", " ")}
                  </div>
                </div>

                <div className="text-end">
                  <div className="font-mono font-bold text-white">
                    <CurrencyDisplay amount={p.amount} currency={p.currency} />
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">
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
