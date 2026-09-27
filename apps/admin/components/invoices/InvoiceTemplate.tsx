"use client";

import * as React from "react";
import type { Invoice, CompanySettings } from "@ishoot/database/types";
import { formatCurrencyValue } from "@ishoot/ui";
import { adminTranslations } from "../../lib/translations";
import {
  DocumentLetterhead,
  DocumentFooter,
} from "../shared/DocumentLetterhead";

interface InvoiceTemplateProps {
  invoice: Invoice;
  company: CompanySettings;
}

export function InvoiceTemplate({ invoice, company }: InvoiceTemplateProps) {
  const isAr = invoice.language === "ar";
  const t = isAr ? adminTranslations.ar : adminTranslations.en;
  const inv = t.invoice;
  const currency = invoice.currency || "BHD";

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      data-print-target
      className={`w-full max-w-[800px] mx-auto bg-white text-[#111827] shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none print:w-full ${
        isAr ? "font-arabic" : "font-sans"
      }`}
      style={{ minHeight: "1050px" }}
    >
      {/* Unified Brand Letterhead */}
      <DocumentLetterhead
        documentType="invoice"
        documentNumber={invoice.invoice_number}
        titleEn="TAX INVOICE"
        titleAr="فاتورة ضريبية"
        company={company}
        language={invoice.language as "en" | "ar"}
        issueDateLabel={inv.issueDate}
        issueDate={invoice.issue_date}
        secondaryDateLabel={inv.dueDate}
        secondaryDate={invoice.due_date}
        statusLabel={inv.paymentStatus}
        statusValue={invoice.status.replace("_", " ")}
        clientSectionTitle={inv.billedTo}
        client={{
          id: invoice.client_id || invoice.contact?.id,
          name:
            invoice.contact?.full_name ||
            invoice.contact_name ||
            inv.clientFallback,
          company: invoice.contact?.company,
          email: invoice.contact?.email,
          phone: invoice.contact?.phone,
          address: invoice.contact?.address,
          vatNumber: invoice.contact?.vat_number,
        }}
      />

      <div className="p-8 sm:p-10">
        <table className="w-full text-start text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900 text-gray-900 uppercase font-mono tracking-wider">
              <th className="py-3 px-2 text-start font-bold">#</th>
              <th className="py-3 px-2 text-start font-bold">
                {inv.serviceDesc}
              </th>
              <th className="py-3 px-2 text-center font-bold">{inv.qty}</th>
              <th className="py-3 px-2 text-end font-bold font-mono">
                {inv.unitPrice}
              </th>
              <th className="py-3 px-2 text-end font-bold font-mono">
                {inv.total}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.line_items?.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50/50">
                <td className="py-4 px-2 text-gray-400 font-mono">
                  {index + 1}
                </td>
                <td className="py-4 px-2">
                  <div className="font-bold text-gray-900 text-sm">
                    {isAr && item.description_ar
                      ? item.description_ar
                      : item.description_en}
                  </div>
                  {isAr && item.description_en && (
                    <div className="text-gray-400 text-[11px]">
                      {item.description_en}
                    </div>
                  )}
                </td>
                <td className="py-4 px-2 text-center font-mono text-gray-700">
                  {item.quantity}
                </td>
                <td className="py-4 px-2 text-end font-mono text-gray-700">
                  {formatCurrencyValue(item.unit_price, currency, isAr)}
                </td>
                <td className="py-4 px-2 text-end font-mono font-bold text-gray-900">
                  {formatCurrencyValue(item.line_total, currency, isAr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 pt-6 border-t-2 border-gray-900 flex flex-col sm:flex-row justify-between items-start gap-8">
          <div className="max-w-xs space-y-2 text-xs text-gray-600">
            <div className="font-bold text-gray-900 uppercase tracking-wider text-[10px]">
              {inv.bankCoords}
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono text-[11px] space-y-1">
              <div>Bank: {company.bank_name}</div>
              <div>IBAN: {company.bank_iban}</div>
              <div>Account: {company.bank_account_number}</div>
              <div>Swift: {company.bank_swift}</div>
            </div>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
              <span>{inv.subtotal}</span>
              <span>
                {formatCurrencyValue(invoice.subtotal, currency, isAr)}
              </span>
            </div>

            {invoice.discount_amount > 0 && (
              <div className="flex justify-between py-1 border-b border-gray-100 text-rose-600">
                <span>{inv.discount}</span>
                <span>
                  -
                  {formatCurrencyValue(invoice.discount_amount, currency, isAr)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
              <span>
                {invoice.vat_enabled
                  ? `${inv.vatLabel} (${invoice.vat_percentage}%):`
                  : inv.vatColon}
              </span>
              <span>
                {invoice.vat_enabled
                  ? formatCurrencyValue(invoice.vat_amount, currency, isAr)
                  : inv.notApplicable}
              </span>
            </div>

            <div className="flex justify-between py-3 border-t-2 border-gray-900 text-base font-extrabold text-[#014842]">
              <span>{inv.totalAmount}</span>
              <span>
                {formatCurrencyValue(invoice.total_amount, currency, isAr)}
              </span>
            </div>

            {invoice.amount_paid > 0 && (
              <>
                <div className="flex justify-between py-1 text-emerald-600 font-semibold">
                  <span>{inv.amountPaid}</span>
                  <span>
                    {formatCurrencyValue(invoice.amount_paid, currency, isAr)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-rose-600 font-bold border-t border-gray-200 pt-2">
                  <span>{inv.balanceDue}</span>
                  <span>
                    {formatCurrencyValue(invoice.amount_due, currency, isAr)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <DocumentFooter
        company={company}
        thankYouMessage={inv.thankYou}
      />
    </div>
  );
}
