"use client";

import type { Invoice,CompanySettings } from "@ishoot/database/types";
import { formatCurrencyValue } from "@ishoot/ui";
import { adminTranslations } from "../../lib/translations-bilingual";
import { formatClientAddress } from "../../lib/client-address";
import {
DocumentLetterhead,
DocumentFooter,
} from "../shared/DocumentLetterhead";

interface InvoiceTemplateProps {
  invoice: Invoice;
  company: CompanySettings;
  /** Stamp and signature appear only once the document is approved and signed. */
  signing?: { signatureUrl: string | null; signerName: string } | null;
}

export function InvoiceTemplate({ invoice, company, signing = null }: InvoiceTemplateProps) {
  const isAr = invoice.language === "ar";
  const t = isAr ? adminTranslations.ar : adminTranslations.en;
  const inv = t.invoice;
  const currency = invoice.currency || "BHD";
  // VAT on an invoice is immutable: depends strictly on the invoice's own issued snapshot
  const isVatActive = Boolean(invoice.vat_enabled && Number(invoice.vat_amount) > 0);

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
        titleEn={isVatActive ? adminTranslations.en.pdfInvoice.taxInvoiceTitle.toUpperCase() : adminTranslations.en.pdfInvoice.standardInvoiceTitle.toUpperCase()}
        titleAr={isVatActive ? adminTranslations.ar.pdfInvoice.taxInvoiceTitle : adminTranslations.ar.pdfInvoice.standardInvoiceTitle}
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
          address: formatClientAddress(invoice.contact?.address_details, t.clients.addressParts, isAr ? "ar" : "en") || invoice.contact?.address,
          vatNumber: isVatActive ? invoice.contact?.vat_number : null,
        }}
      />

      <div className="p-8 sm:p-10 space-y-8 print:p-6 print:space-y-6">
        {/* Line Items Table */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-y-2 border-slate-900 bg-slate-50/80 text-slate-900 uppercase  tracking-wider print:bg-slate-100">
                <th className="py-3 px-3 text-start font-bold w-12">#</th>
                <th className="py-3 px-3 text-start font-bold">
                  {inv.serviceDesc}
                </th>
                <th className="py-3 px-3 text-center font-bold w-20">{inv.qty}</th>
                <th className="py-3 px-3 text-end font-bold  w-28">
                  {inv.unitPrice}
                </th>
                <th className="py-3 px-3 text-end font-bold  w-28">
                  {inv.total}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
              {invoice.line_items?.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50 print-avoid-break">
                  <td className="py-4 px-3 text-slate-500  align-top text-xs">
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
                  <td className="py-4 px-3 text-center  text-slate-700 align-top">
                    {item.quantity}
                  </td>
                  <td className="py-4 px-3 text-end  text-slate-700 align-top">
                    {formatCurrencyValue(item.unit_price, currency, isAr)}
                  </td>
                  <td className="py-4 px-3 text-end  font-bold text-slate-900 align-top">
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent mb-1.5">
                {t.documentLetterhead.termsNotes}
              </h3>
              <div className="text-[11px] leading-relaxed text-slate-600 space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-300 print:text-[10px]">
                <p>1. {inv.terms1.replace("{days}", String(company.payment_terms_days || 30)).replace("{date}", invoice.due_date)}</p>
                <p>2. {inv.terms2.replace("{number}", invoice.invoice_number)}</p>
                <p>3. {inv.terms3}</p>
                {invoice.notes_en && (
                  <p className="pt-1.5 border-t border-slate-200/80 font-medium text-slate-800">
                    {invoice.notes_en}
                  </p>
                )}
                {invoice.notes_ar && (
                  <p className="font-arabic text-end text-slate-800 pt-1">
                    {invoice.notes_ar}
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-1">
                {inv.bankCoords}
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200  text-[11px] space-y-1 print:bg-white print:border-slate-300 print:text-[10px]">
                <div><span className="text-slate-500 font-sans">{t.pdfInvoice.bankName}</span> {company.bank_name || "—"}</div>
                <div><span className="text-slate-500 font-sans">{t.pdfInvoice.iban}</span> <bdi dir="ltr">{company.bank_iban || "—"}</bdi></div>
                <div><span className="text-slate-500 font-sans">{t.pdfInvoice.accountNo}</span> <bdi dir="ltr">{company.bank_account_number || "—"}</bdi></div>
                <div><span className="text-slate-500 font-sans">{t.pdfInvoice.swift}</span> <bdi dir="ltr">{company.bank_swift || "—"}</bdi></div>
              </div>
            </div>
          </div>

          {/* Right Column: Financial Calculations */}
          <div className="space-y-2 text-xs ">
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

            {(invoice.other_taxes ?? []).map((tax) => (
              <div key={tax.code} className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                <span className="font-sans text-xs">
                  {isAr ? tax.name_ar : tax.name_en} ({tax.rate}%):
                </span>
                <span>{formatCurrencyValue(tax.amount, currency, isAr)}</span>
              </div>
            ))}

            <div className="flex justify-between py-3 border-t-2 border-slate-900 text-base font-extrabold text-primary">
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

      {(isVatActive || (invoice.other_taxes ?? []).length > 0) && (
        <div className="flex flex-wrap justify-center gap-6 px-8 pb-6 text-center text-[11px]">
          {isVatActive && (
            <a href={`/certificates/vat?lang=${invoice.language}`} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
              {t.taxCertificate.vatCertificate}
            </a>
          )}
          {(invoice.other_taxes ?? []).map((tax) => (
            <a key={tax.code} href={`/certificates/${tax.code}?lang=${invoice.language}`} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
              {t.taxCertificate.certificateOf.replace("{tax}", isAr ? tax.name_ar : tax.name_en)}
            </a>
          ))}
        </div>
      )}

      <DocumentFooter
        company={company}
        thankYouMessage={inv.thankYou}
        showSignature={true}
        stampUrl={signing ? company.stamp_url : null}
        signatureUrl={signing?.signatureUrl ?? null}
        signerName={signing?.signerName ?? null}
        signatureTitle={isAr ? adminTranslations.ar.documentLetterhead.authorizedSignatory : adminTranslations.en.documentLetterhead.authorizedSignatory}
        signatureTitleAr={adminTranslations.ar.documentLetterhead.financeDepartment}
      />
    </div>
  );
}
