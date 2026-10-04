"use client";

import type { Payment,CompanySettings } from "@ishoot/database/types";
import { formatCurrencyValue } from "@ishoot/ui";
import { adminTranslations } from "../../lib/translations-bilingual";
import {
DocumentLetterhead,
DocumentFooter,
} from "../shared/DocumentLetterhead";

interface ReceiptTemplateProps {
  payment: Payment;
  company: CompanySettings;
  locale?: "en" | "ar";
}

export function ReceiptTemplate({
  payment,
  company,
  locale = "en",
}: ReceiptTemplateProps) {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const t = isAr ? adminTranslations.ar : adminTranslations.en;
  const rcpt = t.receipt;
  const currency = payment.currency || "BHD";

  const invoice = payment.invoice;
  const isPaidInFull = invoice ? invoice.amount_due <= 0 : true;

  return (
    <div
      dir={dir}
      data-print-target
      className={`w-full max-w-[850px] mx-auto bg-white text-slate-900 shadow-2xl rounded-2xl overflow-hidden min-h-[850px] print:min-h-0 print:shadow-none print:rounded-none print:max-w-none print:w-full print:overflow-visible relative ${
        isAr ? "font-arabic" : "font-sans"
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] print:opacity-[0.02] rotate-[-25deg] select-none z-0">
        <span className="text-7xl font-black uppercase text-gray-900 border-4 border-gray-900 px-10 py-5 rounded-2xl">
          {isPaidInFull ? rcpt.paidInFull : rcpt.partial}
        </span>
      </div>

      {/* Unified Brand Letterhead */}
      <DocumentLetterhead
        documentType="receipt"
        documentNumber={payment.receipt_number}
        titleEn={adminTranslations.en.pdfReceipt.title.toUpperCase()}
        titleAr={adminTranslations.ar.pdfReceipt.title}
        company={company}
        language={locale}
        issueDateLabel={rcpt.paymentDate}
        issueDate={payment.payment_date}
        statusLabel={t.paymentsView.tableStatus}
        statusValue={isPaidInFull ? rcpt.paidInFull : rcpt.partial}
        clientSectionTitle={rcpt.receivedFrom}
        client={{
          id: invoice?.contact?.id || invoice?.client_id,
          name:
            invoice?.contact?.full_name ||
            invoice?.contact_name ||
            rcpt.clientFallback,
          company: invoice?.contact?.company,
          email: invoice?.contact?.email,
          phone: invoice?.contact?.phone,
          address: invoice?.contact?.address,
        }}
        extraMeta={
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between sm:justify-end gap-6">
              <span className="text-gray-400 font-bold uppercase text-[10px]">
                {rcpt.paymentMethod}
              </span>
              <span className="font-bold text-gray-900 uppercase">
                {payment.payment_method.replace("_", " ")}
              </span>
            </div>
            {payment.reference_number && (
              <div className="flex justify-between sm:justify-end gap-6">
                <span className="text-gray-400 font-bold uppercase text-[10px]">
                  {rcpt.referenceNo}
                </span>
                <span className=" text-gray-700">
                  {payment.reference_number}
                </span>
              </div>
            )}
          </div>
        }
      />

      <div className="p-8 sm:p-10 space-y-6">
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              {rcpt.linkedInvoice}
            </span>
            <span className=" font-bold text-[#014842]">
              {invoice?.invoice_number || rcpt.directPayment}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs ">
            <div>
              <span className="text-gray-500 block">{rcpt.totalInvoice}</span>
              <span className="text-sm font-bold text-gray-900">
                {invoice
                  ? formatCurrencyValue(invoice.total_amount, currency, isAr)
                  : "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">{rcpt.previouslyPaid}</span>
              <span className="text-sm font-bold text-gray-900">
                {invoice
                  ? formatCurrencyValue(
                      invoice.amount_paid - payment.amount,
                      currency,
                      isAr,
                    )
                  : "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">{rcpt.balanceDue}</span>
              <span className="text-sm font-bold text-rose-600">
                {invoice
                  ? formatCurrencyValue(invoice.amount_due, currency, isAr)
                  : "0.000"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#10B981]/10 border-2 border-[#10B981] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#014842]">
              {rcpt.netReceived}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {rcpt.fundsVerified}
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black  text-[#014842]">
            {formatCurrencyValue(payment.amount, currency, isAr)}
          </div>
        </div>

        {payment.notes && (
          <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="font-bold text-gray-900 block mb-1">
              {rcpt.transactionNotes}
            </span>
            {payment.notes}
          </div>
        )}
      </div>

      <DocumentFooter
        company={company}
        thankYouMessage={adminTranslations[isAr ? "ar" : "en"].pdfReceipt.verifiedNotice}
        showSignature={true}
        signatureTitle={isAr ? adminTranslations.ar.pdfReceipt.cashier : adminTranslations.en.pdfReceipt.cashier}
        signatureTitleAr={adminTranslations.ar.pdfReceipt.title}
      />
    </div>
  );
}
