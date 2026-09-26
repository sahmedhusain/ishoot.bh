'use client';

import * as React from 'react';
import type { Invoice, CompanySettings } from '@ishoot/database/types';
import { formatCurrencyValue } from '@ishoot/ui';

interface InvoiceTemplateProps {
  invoice: Invoice;
  company: CompanySettings;
}

export function InvoiceTemplate({ invoice, company }: InvoiceTemplateProps) {
  const isAr = invoice.language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  const currency = invoice.currency || 'BHD';

  return (
    <div
      dir={dir}
      className={`w-full max-w-[800px] mx-auto bg-white text-[#111827] shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none print:w-full ${
        isAr ? 'font-arabic' : 'font-sans'
      }`}
      style={{ minHeight: '1050px' }}
    >
      {/* Print Styles for Multi-page Letterhead Preservation */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background-color: #ffffff !important;
            color: #111827 !important;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>

      {/* 1. BRAND LETTERHEAD HEADER BAR: #014842 */}
      <div className="bg-[#014842] text-white p-8 sm:p-10 border-b-4 border-[#09937F] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#09937F] flex items-center justify-center">
              <span className="w-3.5 h-3.5 rounded-full bg-[#09937F]" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight font-display text-white">
              ishoot<span className="text-[#09937F]">.</span>
            </span>
          </div>
          <div className="text-xs text-white/80 mt-1 uppercase tracking-widest">
            {isAr ? company.company_name_ar : company.company_name_en}
          </div>
          <div className="text-[11px] text-white/60 font-mono mt-0.5">
            CR: {company.cr_number}
            {invoice.vat_enabled && company.vat_id && (
              <span> • VAT: {company.vat_id}</span>
            )}
          </div>
        </div>

        {/* Invoice Title Tag */}
        <div className="text-start sm:text-end">
          <div className="text-2xl sm:text-3xl font-bold tracking-wider uppercase font-display text-white">
            {isAr ? 'فاتورة ضريبية' : 'INVOICE'}
          </div>
          <div className="text-sm font-mono text-[#09937F] font-bold mt-1">
            {invoice.invoice_number}
          </div>
        </div>
      </div>

      {/* 2. INVOICE META & CLIENT INFORMATION */}
      <div className="p-8 sm:p-10 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
        {/* Bill To */}
        <div className="space-y-1.5">
          <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">
            {isAr ? 'فاتورة إلى (العميل):' : 'BILLED TO:'}
          </span>
          <div className="text-base font-bold text-gray-900">
            {invoice.contact?.company || invoice.contact?.full_name || 'Client Name'}
          </div>
          {invoice.contact?.company && invoice.contact?.full_name && (
            <div className="text-gray-600 font-medium">Attn: {invoice.contact.full_name}</div>
          )}
          {invoice.contact?.email && (
            <div className="text-gray-500 font-mono">{invoice.contact.email}</div>
          )}
          {invoice.contact?.phone && (
            <div className="text-gray-500 font-mono">{invoice.contact.phone}</div>
          )}
        </div>

        {/* Dates & Reference */}
        <div className="space-y-2 sm:text-end">
          <div className="flex justify-between sm:justify-end gap-6">
            <span className="text-gray-400 font-bold uppercase text-[10px]">
              {isAr ? 'تاريخ الإصدار:' : 'ISSUE DATE:'}
            </span>
            <span className="font-mono font-medium text-gray-800">{invoice.issue_date}</span>
          </div>
          <div className="flex justify-between sm:justify-end gap-6">
            <span className="text-gray-400 font-bold uppercase text-[10px]">
              {isAr ? 'تاريخ الاستحقاق:' : 'DUE DATE:'}
            </span>
            <span className="font-mono font-bold text-[#014842]">{invoice.due_date}</span>
          </div>
          <div className="flex justify-between sm:justify-end gap-6">
            <span className="text-gray-400 font-bold uppercase text-[10px]">
              {isAr ? 'الحالة المالية:' : 'PAYMENT STATUS:'}
            </span>
            <span className="font-bold uppercase text-[11px] text-[#09937F]">
              {invoice.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. LINE ITEMS TABLE (WITH REPEATABLE LETTERHEAD SUPPORT) */}
      <div className="p-8 sm:p-10">
        <table className="w-full text-start text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900 text-gray-900 uppercase font-mono tracking-wider">
              <th className="py-3 px-2 text-start font-bold">#</th>
              <th className="py-3 px-2 text-start font-bold">
                {isAr ? 'وصف العمل والخدمات' : 'Service Description'}
              </th>
              <th className="py-3 px-2 text-center font-bold">
                {isAr ? 'الكمية' : 'Qty'}
              </th>
              <th className="py-3 px-2 text-end font-bold">
                {isAr ? 'سعر الوحدة' : 'Unit Price'}
              </th>
              <th className="py-3 px-2 text-end font-bold">
                {isAr ? 'المجموع' : 'Total'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.line_items?.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50/50">
                <td className="py-4 px-2 text-gray-400 font-mono">{index + 1}</td>
                <td className="py-4 px-2">
                  <div className="font-bold text-gray-900 text-sm">
                    {isAr && item.description_ar ? item.description_ar : item.description_en}
                  </div>
                  {isAr && item.description_en && (
                    <div className="text-gray-400 text-[11px]">{item.description_en}</div>
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

        {/* 4. TOTALS & SUMMARY BLOCK */}
        <div className="mt-8 pt-6 border-t-2 border-gray-900 flex flex-col sm:flex-row justify-between items-start gap-8">
          {/* Bank Instructions */}
          <div className="max-w-xs space-y-2 text-xs text-gray-600">
            <div className="font-bold text-gray-900 uppercase tracking-wider text-[10px]">
              {isAr ? 'معلومات التحويل البنكي:' : 'BANK TRANSFER COORDINATES:'}
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono text-[11px] space-y-1">
              <div>Bank: {company.bank_name}</div>
              <div>IBAN: {company.bank_iban}</div>
              <div>Account: {company.bank_account_number}</div>
              <div>Swift: {company.bank_swift}</div>
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="w-full sm:w-72 space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
              <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
              <span>{formatCurrencyValue(invoice.subtotal, currency, isAr)}</span>
            </div>

            {invoice.discount_amount > 0 && (
              <div className="flex justify-between py-1 border-b border-gray-100 text-rose-600">
                <span>{isAr ? 'الخصم المعتمد:' : 'Discount:'}</span>
                <span>-{formatCurrencyValue(invoice.discount_amount, currency, isAr)}</span>
              </div>
            )}

            {/* DYNAMIC VAT DISPLAY */}
            <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
              <span>
                {invoice.vat_enabled
                  ? `${isAr ? 'ضريبة القيمة المضافة' : 'VAT'} (${invoice.vat_percentage}%):`
                  : (isAr ? 'ضريبة القيمة المضافة:' : 'VAT:')}
              </span>
              <span>
                {invoice.vat_enabled
                  ? formatCurrencyValue(invoice.vat_amount, currency, isAr)
                  : (isAr ? 'غير مطبقة' : 'Not Applicable')}
              </span>
            </div>

            {/* TOTAL */}
            <div className="flex justify-between py-3 border-t-2 border-gray-900 text-base font-extrabold text-[#014842]">
              <span>{isAr ? 'المجموع النهائي:' : 'TOTAL AMOUNT:'}</span>
              <span>{formatCurrencyValue(invoice.total_amount, currency, isAr)}</span>
            </div>

            {invoice.amount_paid > 0 && (
              <>
                <div className="flex justify-between py-1 text-emerald-600 font-semibold">
                  <span>{isAr ? 'المبلغ المسدد:' : 'Amount Paid:'}</span>
                  <span>{formatCurrencyValue(invoice.amount_paid, currency, isAr)}</span>
                </div>
                <div className="flex justify-between py-1 text-rose-600 font-bold border-t border-gray-200 pt-2">
                  <span>{isAr ? 'المتبقي للسداد:' : 'Balance Due:'}</span>
                  <span>{formatCurrencyValue(invoice.amount_due, currency, isAr)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 5. FOOTER LETTERHEAD */}
      <div className="p-8 sm:p-10 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
        <div>
          {isAr
            ? 'شكراً لتعاملكم مع دار آي شوت للإنتاج السينمائي.'
            : 'Thank you for choosing ishoot Cinema Production.'}
        </div>
        <div className="font-mono text-[11px]">
          {company.website} • {company.email}
        </div>
      </div>
    </div>
  );
}
