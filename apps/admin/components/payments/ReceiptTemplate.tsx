'use client';

import * as React from 'react';
import type { Payment, CompanySettings } from '@ishoot/database/types';
import { formatCurrencyValue } from '@ishoot/ui';
import { adminTranslations } from '../../lib/translations';

interface ReceiptTemplateProps {
  payment: Payment;
  company: CompanySettings;
  locale?: 'en' | 'ar';
}

export function ReceiptTemplate({ payment, company, locale = 'en' }: ReceiptTemplateProps) {
  const isAr = locale === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const t = isAr ? adminTranslations.ar : adminTranslations.en;
  const rcpt = t.receipt;
  const currency = payment.currency || 'BHD';

  const invoice = payment.invoice;
  const isPaidInFull = invoice ? invoice.amount_due <= 0 : true;

  return (
    <div
      dir={dir}
      data-print-target
      className={`w-full max-w-[800px] mx-auto bg-white text-[#111827] shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none print:w-full relative ${
        isAr ? 'font-arabic' : 'font-sans'
      }`}
      style={{ minHeight: '900px' }}
    >
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] rotate-[-25deg] select-none">
        <span className="text-8xl font-black uppercase text-gray-900 border-8 border-gray-900 px-12 py-6 rounded-3xl">
          {isPaidInFull ? (isAr ? rcpt.paidInFullAr : rcpt.paidInFull) : (isAr ? rcpt.partialAr : rcpt.partial)}
        </span>
      </div>

      {/* 1. BRAND HEADER: Emerald #10B981 Accent */}
      <div className="bg-[#014842] text-white p-8 sm:p-10 border-b-4 border-[#10B981] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#10B981] flex items-center justify-center">
              <span className="w-3.5 h-3.5 rounded-full bg-[#10B981]" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight font-display text-white">
              ishoot<span className="text-[#10B981]">.</span>
            </span>
          </div>
          <div className="text-xs text-white/80 mt-1 uppercase tracking-widest">
            {isAr ? company.company_name_ar : company.company_name_en}
          </div>
          <div className="text-[11px] text-white/60 font-mono mt-0.5">
            CR: {company.cr_number}
          </div>
        </div>

        <div className="text-start sm:text-end">
          <div className="text-2xl sm:text-3xl font-bold tracking-wider uppercase font-display text-white">
            {isAr ? rcpt.titleAr : rcpt.title}
          </div>
          <div className="text-sm font-mono text-[#10B981] font-bold mt-1">
            {payment.receipt_number}
          </div>
        </div>
      </div>

      {/* 2. RECEIPT META */}
      <div className="p-8 sm:p-10 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
        <div className="space-y-1.5">
          <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">
            {isAr ? rcpt.receivedFromAr : rcpt.receivedFrom}
          </span>
          <div className="text-base font-bold text-gray-900">
            {invoice?.contact?.company || invoice?.contact?.full_name || rcpt.clientFallback}
          </div>
          {invoice?.contact?.email && (
            <div className="text-gray-500 font-mono">{invoice.contact.email}</div>
          )}
        </div>

        <div className="space-y-2 sm:text-end">
          <div className="flex justify-between sm:justify-end gap-6">
            <span className="text-gray-400 font-bold uppercase text-[10px]">
              {isAr ? rcpt.paymentDateAr : rcpt.paymentDate}
            </span>
            <span className="font-mono font-medium text-gray-800">{payment.payment_date}</span>
          </div>
          <div className="flex justify-between sm:justify-end gap-6">
            <span className="text-gray-400 font-bold uppercase text-[10px]">
              {isAr ? rcpt.paymentMethodAr : rcpt.paymentMethod}
            </span>
            <span className="font-bold text-gray-900 uppercase">
              {payment.payment_method.replace('_', ' ')}
            </span>
          </div>
          {payment.reference_number && (
            <div className="flex justify-between sm:justify-end gap-6">
              <span className="text-gray-400 font-bold uppercase text-[10px]">
                {isAr ? rcpt.referenceNoAr : rcpt.referenceNo}
              </span>
              <span className="font-mono text-gray-700">{payment.reference_number}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. PAYMENT PARTICULARS & LINKED INVOICE */}
      <div className="p-8 sm:p-10 space-y-6">
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              {isAr ? rcpt.linkedInvoiceAr : rcpt.linkedInvoice}
            </span>
            <span className="font-mono font-bold text-[#014842]">
              {invoice?.invoice_number || (isAr ? rcpt.directPaymentAr : rcpt.directPayment)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <span className="text-gray-500 block">{isAr ? rcpt.totalInvoiceAr : rcpt.totalInvoice}</span>
              <span className="text-sm font-bold text-gray-900">
                {invoice ? formatCurrencyValue(invoice.total_amount, currency, isAr) : '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">{isAr ? rcpt.previouslyPaidAr : rcpt.previouslyPaid}</span>
              <span className="text-sm font-bold text-gray-900">
                {invoice ? formatCurrencyValue(invoice.amount_paid - payment.amount, currency, isAr) : '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">{isAr ? rcpt.balanceDueAr : rcpt.balanceDue}</span>
              <span className="text-sm font-bold text-rose-600">
                {invoice ? formatCurrencyValue(invoice.amount_due, currency, isAr) : '0.000'}
              </span>
            </div>
          </div>
        </div>

        {/* AMOUNT RECEIVED HIGHLIGHT CARD */}
        <div className="bg-[#10B981]/10 border-2 border-[#10B981] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#014842]">
              {isAr ? rcpt.netReceivedAr : rcpt.netReceived}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {isAr ? rcpt.fundsVerifiedAr : rcpt.fundsVerified}
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-[#014842]">
            {formatCurrencyValue(payment.amount, currency, isAr)}
          </div>
        </div>

        {payment.notes && (
          <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="font-bold text-gray-900 block mb-1">
              {isAr ? rcpt.transactionNotesAr : rcpt.transactionNotes}
            </span>
            {payment.notes}
          </div>
        )}
      </div>

      {/* 4. FOOTER */}
      <div className="p-8 sm:p-10 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
        <div>
          {isAr ? rcpt.generatedByAr : rcpt.generatedBy}
        </div>
        <div className="font-mono text-[11px]">
          {company.website} • {company.email}
        </div>
      </div>
    </div>
  );
}
