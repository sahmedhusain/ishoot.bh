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
  const isVatActive = Boolean(invoice.vat_enabled && (invoice.vat_amount > 0 || company.vat_enabled));

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      data-print-target
      className={`w-full max-w-[850px] mx-auto bg-white text-slate-900 shadow-2xl rounded-2xl overflow-hidden min-h-[1050px] print:min-h-0 print:shadow-none print:rounded-none print:max-w-none print:w-full print:overflow-visible ${
        isAr ? "font-arabic" : "font-sans"
      }`}
    >
      {/* Unified Brand Letterhead */}
      <DocumentLetterhead
        documentType="invoice"
        documentNumber={invoice.invoice_number}
        titleEn={isVatActive ? "TAX INVOICE" : "INVOICE"}
        titleAr={isVatActive ? "فاتورة ضريبية" : "فاتورة"}
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

      <div className="p-8 sm:p-10 space-y-8 print:p-6 print:space-y-6">
        {/* Line Items Table */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-y-2 border-slate-900 bg-slate-50/80 text-slate-900 uppercase font-mono tracking-wider print:bg-slate-100">
                <th className="py-3 px-3 text-start font-bold w-12">#</th>
                <th className="py-3 px-3 text-start font-bold">
                  {inv.serviceDesc}
                </th>
                <th className="py-3 px-3 text-center font-bold w-20">{inv.qty}</th>
                <th className="py-3 px-3 text-end font-bold font-mono w-28">
                  {inv.unitPrice}
                </th>
                <th className="py-3 px-3 text-end font-bold font-mono w-28">
                  {inv.total}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
              {invoice.line_items?.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50 print-avoid-break">
                  <td className="py-4 px-3 text-slate-400 font-mono align-top text-xs">
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td className="py-4 px-3 align-top">
                    <div className="font-bold text-slate-900 text-sm">
                      {isAr && item.description_ar
                        ? item.description_ar
                        : item.description_en}
                    </div>
                    {isAr && item.description_en && (
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {item.description_en}
                      </div>
                    )}
                    {!isAr && item.description_ar && (
                      <div className="text-slate-500 text-[11px] mt-0.5 font-arabic">
                        {item.description_ar}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-3 text-center font-mono text-slate-700 align-top">
                    {item.quantity}
                  </td>
                  <td className="py-4 px-3 text-end font-mono text-slate-700 align-top">
                    {formatCurrencyValue(item.unit_price, currency, isAr)}
                  </td>
                  <td className="py-4 px-3 text-end font-mono font-bold text-slate-900 align-top">
                    {formatCurrencyValue(item.line_total, currency, isAr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Terms Section */}
        <div
          data-terms-section
          className="pt-6 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-8 print:gap-6 print-avoid-break print:pt-4 print:mt-4 print:border-slate-800"
        >
          {/* Left Column: Terms & Conditions and Bank Coordinates */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#09937F] mb-1.5 flex items-center justify-between">
                <span>Terms & Conditions / Notes</span>
                <span className="text-[10px] text-slate-400 font-arabic">الشروط والأحكام وملاحظات الدفع</span>
              </h3>
              <div className="text-[11px] leading-relaxed text-slate-600 space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-300 print:text-[10px]">
                <p>1. Payment is due within <strong className="text-slate-800 font-semibold">{company.payment_terms_days || 30} days</strong> from invoice date ({invoice.due_date}).</p>
                <p>2. Electronic wire payments must reference invoice number: <strong className="font-mono text-slate-900">{invoice.invoice_number}</strong>.</p>
                <p>3. Raw footage and intellectual property rights transfer upon complete settlement of balance due.</p>
                {invoice.notes_en && (
                  <p className="pt-1.5 border-t border-slate-200/80 font-medium text-slate-800">
                    {invoice.notes_en}
                  </p>
                )}
                {invoice.notes_ar && (
                  <p className="font-arabic text-right text-slate-800 pt-1">
                    {invoice.notes_ar}
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-1">
                {inv.bankCoords}
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1 print:bg-white print:border-slate-300 print:text-[10px]">
                <div><span className="text-slate-400 font-sans">Bank:</span> {company.bank_name || "National Bank of Bahrain (NBB)"}</div>
                <div><span className="text-slate-400 font-sans">IBAN:</span> {company.bank_iban || "BH00NBBB00000000000000"}</div>
                <div><span className="text-slate-400 font-sans">Account:</span> {company.bank_account_number || "0000-000000-001"}</div>
                <div><span className="text-slate-400 font-sans">Swift:</span> {company.bank_swift || "NBBBBHBM"}</div>
              </div>
            </div>
          </div>

          {/* Right Column: Financial Calculations */}
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
              <span className="font-sans text-xs">{inv.subtotal}</span>
              <span className="font-bold">
                {formatCurrencyValue(invoice.subtotal, currency, isAr)}
              </span>
            </div>

            {invoice.discount_amount > 0 && (
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-rose-600">
                <span className="font-sans text-xs">{inv.discount}</span>
                <span>
                  - {formatCurrencyValue(invoice.discount_amount, currency, isAr)}
                </span>
              </div>
            )}

            {isVatActive && (
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                <span className="font-sans text-xs">
                  {inv.vatLabel} ({invoice.vat_percentage || 10}%):
                </span>
                <span>
                  {formatCurrencyValue(invoice.vat_amount, currency, isAr)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-3 border-t-2 border-slate-900 text-base font-extrabold text-[#014842]">
              <span className="font-sans">{inv.totalAmount}</span>
              <span>
                {formatCurrencyValue(invoice.total_amount, currency, isAr)}
              </span>
            </div>

            {invoice.amount_paid > 0 && (
              <div className="flex justify-between py-1 text-emerald-600 font-semibold">
                <span className="font-sans text-xs">{inv.amountPaid}</span>
                <span>
                  {formatCurrencyValue(invoice.amount_paid, currency, isAr)}
                </span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900 print:bg-white print:border-slate-300">
              <span className="font-sans text-xs uppercase tracking-wider text-slate-600">
                {inv.balanceDue}
              </span>
              <span className={invoice.amount_due > 0 ? "text-rose-600 font-black text-base" : "text-emerald-600 font-bold"}>
                {formatCurrencyValue(invoice.amount_due, currency, isAr)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <DocumentFooter
        company={company}
        thankYouMessage={inv.thankYou}
        showSignature={true}
        signatureTitle={isAr ? "المخول بالتوقيع" : "Authorized Signatory"}
        signatureTitleAr={isAr ? "إدارة الشؤون المالية" : "Finance Department"}
      />
    </div>
  );
}
