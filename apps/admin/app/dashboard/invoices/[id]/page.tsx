'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getInvoiceById,
  getCompanySettings,
  getAllPayments,
  Invoice,
  CompanySettings,
  Payment,
} from '@ishoot/database';
import { InvoiceTemplate } from '../../../../components/invoices/InvoiceTemplate';
import { DeliveryToolbar } from '../../../../components/shared/DeliveryToolbar';
import { PaymentRecorder } from '../../../../components/payments/PaymentRecorder';
import { Button, Card, StatusBadge, CurrencyDisplay } from '@ishoot/ui';
import { ArrowLeft, CreditCard, Receipt, CheckCircle2 } from 'lucide-react';

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [invoice, setInvoice] = React.useState<Invoice | null>(null);
  const [company, setCompany] = React.useState<CompanySettings | null>(null);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [recordModalOpen, setRecordModalOpen] = React.useState(false);

  const loadData = React.useCallback(() => {
    Promise.all([getInvoiceById(id), getCompanySettings(), getAllPayments()]).then(
      ([inv, comp, payList]) => {
        setInvoice(inv);
        setCompany(comp);
        if (inv) {
          setPayments(payList.filter((p) => p.invoice_id === inv.id));
        }
      }
    );
  }, [id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (!invoice || !company) {
    return <div className="p-8 text-sm text-[#9EADA9]">Loading invoice dossier...</div>;
  }

  const clientName = invoice.contact?.company || invoice.contact?.full_name || 'Client';

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center gap-2 text-xs text-[#9EADA9] hover:text-[#09937F] transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Invoices Archive</span>
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
            className="gap-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
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
            <span>Associated Payment Receipts</span>
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
                  <span className="text-[10px] text-emerald-400 font-mono">Reconciled</span>
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
        onSuccess={loadData}
      />
    </div>
  );
}
