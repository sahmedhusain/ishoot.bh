'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Invoice, CompanySettings, Payment } from '@ishoot/database/types';
import { InvoiceTemplate } from './InvoiceTemplate';
import { DeliveryToolbar } from '../shared/DeliveryToolbar';
import { PaymentRecorder } from '../payments/PaymentRecorder';
import { Button, Card, StatusBadge, CurrencyDisplay } from '@ishoot/ui';
import { ArrowLeft, ArrowRight, CreditCard, Receipt } from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';

interface InvoiceDetailViewProps {
  invoice: Invoice;
  company: CompanySettings;
  payments: Payment[];
}

export function InvoiceDetailView({ invoice, company, payments }: InvoiceDetailViewProps) {
  const router = useRouter();
  const { t, locale, isRTL } = useAdminLocale();
  const [recordModalOpen, setRecordModalOpen] = React.useState(false);

  const clientName = invoice.contact?.company || invoice.contact?.full_name || 'Client';
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const handlePaymentSuccess = () => {
    router.refresh();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center gap-2 text-xs text-[#9EADA9] hover:text-[#09937F] transition-colors mb-2 font-medium"
          >
            <BackIcon className="w-4 h-4" />
            <span>{locale === 'ar' ? 'العودة إلى أرشيف الفواتير' : 'Back to Invoices Archive'}</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
              {invoice.invoice_number}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
        </div>

        {/* Record Payment Button */}
        {invoice.amount_due > 0 && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setRecordModalOpen(true)}
            className="gap-2 shadow-lg shadow-[#09937F]/20"
          >
            <CreditCard className="w-4 h-4" />
            <span>{locale === 'ar' ? 'تسجيل دفعة جديدة' : 'Record Payment'}</span>
          </Button>
        )}
      </div>

      {/* Multi-Channel Delivery Toolbar */}
      <div className="no-print">
        <DeliveryToolbar
          documentType="invoice"
          documentNumber={invoice.invoice_number}
          clientName={clientName}
          clientEmail={invoice.contact?.email}
          clientPhone={invoice.contact?.phone}
          amountFormatted={`${invoice.total_amount.toFixed(3)} ${invoice.currency}`}
        />
      </div>

      {/* Printable Brand Letterhead Document */}
      <div className="p-2 sm:p-6 bg-[#070C0A] rounded-3xl border border-white/10 shadow-2xl flex justify-center">
        <InvoiceTemplate invoice={invoice} company={company} />
      </div>

      {/* Payment Ledger / History for this Invoice */}
      {payments.length > 0 && (
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-4 no-print">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <Receipt className="w-4 h-4 text-[#10B981]" />
            <span>{locale === 'ar' ? 'سندات القبض والدفعات المرتبطة' : 'Associated Payment Receipts'}</span>
          </div>

          <div className="divide-y divide-white/5">
            {payments.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono font-bold text-[#10B981]">{p.receipt_number}</div>
                  <div className="text-[#9EADA9] text-[11px]">
                    {p.payment_date} • {p.payment_method.replace('_', ' ')}
                  </div>
                </div>

                <div className="text-end">
                  <div className="font-mono font-bold text-white">
                    <CurrencyDisplay amount={p.amount} currency={p.currency} />
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {locale === 'ar' ? 'تمت التسوية' : 'Reconciled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payment Recorder Modal */}
      <PaymentRecorder
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        invoice={invoice}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
