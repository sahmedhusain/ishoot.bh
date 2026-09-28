"use client";

import * as React from "react";
import Link from "next/link";
import type { Payment, CompanySettings } from "@ishoot/database/types";
import { ReceiptTemplate } from "./ReceiptTemplate";
import { DeliveryToolbar } from "../shared/DeliveryToolbar";
import { Button, StatusBadge } from "@ishoot/ui";
import { ArrowLeft, ArrowRight, Receipt, FileText, User } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface PaymentDetailViewProps {
  payment: Payment;
  company: CompanySettings;
}

export function PaymentDetailView({ payment, company }: PaymentDetailViewProps) {
  const { t, isRTL, locale } = useAdminLocale();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

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
            href="/dashboard/payments"
            className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-[#09937F] dark:text-slate-400 dark:hover:text-[#09937F] transition-colors mb-2 font-medium"
          >
            <BackIcon className="w-4 h-4" />
            <span>Back to Payments</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-2">
              <Receipt className="w-6 h-6 text-[#09937F]" />
              <span>{payment.receipt_number}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Verified Payment
            </span>

            {invoice && (
              <Link
                href={`/dashboard/invoices/${invoice.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#09937F] border border-slate-200 dark:border-slate-700 transition-colors"
                title="View Linked Invoice"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Invoice: {invoice.invoice_number}</span>
                <span className="text-[10px] opacity-70">↗</span>
              </Link>
            )}

            {invoice?.contact_id && (
              <Link
                href={`/dashboard/crm/customers/${invoice.contact_id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F5F2] text-[#014842] dark:bg-[#152B27] dark:text-[#7DE0D1] border border-[#09937F]/30 hover:underline transition-colors"
                title="View Client Dossier in CRM"
              >
                <User className="w-3.5 h-3.5" />
                <span>Client: {clientName}</span>
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
            <span>Print Receipt</span>
          </Button>
        </div>
      </div>

      {/* Delivery & Share Toolbar */}
      <div className="no-print" data-delivery-toolbar="true">
        <DeliveryToolbar
          documentType="receipt"
          documentNumber={payment.receipt_number}
          clientName={clientName}
          clientEmail={invoice?.contact?.email}
          clientPhone={invoice?.contact?.phone}
          amountFormatted={`${payment.amount.toFixed(3)} ${payment.currency}`}
        />
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
