'use client';

import * as React from 'react';
import type { Payment, CompanySettings, Invoice } from '@ishoot/database/types';
import { Card, Button, Modal, CurrencyDisplay, Input, Select, Badge } from '@ishoot/ui';
import { ReceiptTemplate } from './ReceiptTemplate';
import { DeliveryToolbar } from '../shared/DeliveryToolbar';
import { CreditCard, Eye, Plus, Search, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { createPaymentAction } from '../../app/actions/finance';

interface PaymentsManagementViewProps {
  initialPayments: Payment[];
  invoices: Invoice[];
  company: CompanySettings | null;
}

export function PaymentsManagementView({
  initialPayments,
  invoices,
  company,
}: PaymentsManagementViewProps) {
  const { t, locale } = useAdminLocale();

  const [payments, setPayments] = React.useState<Payment[]>(initialPayments);
  const [activeReceipt, setActiveReceipt] = React.useState<Payment | null>(null);
  const [newPaymentModal, setNewPaymentModal] = React.useState(false);

  // New Payment form states
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState(invoices[0]?.id || '');
  const [amount, setAmount] = React.useState<number>(
    invoices[0]?.amount_due ?? invoices[0]?.total_amount ?? 0
  );
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = React.useState<Payment['payment_method']>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || amount <= 0) return;
    setSaving(true);

    try {
      const res = await createPaymentAction({
        invoice_id: selectedInvoiceId,
        amount: Number(amount),
        payment_date: new Date(paymentDate).toISOString(),
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
      });

      if (res.payment) {
        setPayments((prev) => [res.payment, ...prev]);
        setActiveReceipt(res.payment);
      }
      setNewPaymentModal(false);
      setReferenceNumber('');
      setNotes('');
    } catch (err) {
      console.error('Failed to record payment:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.nav.payments}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {locale === 'ar'
              ? 'سجل سندات القبض والدفعات المحصلة، تسوية أرصدة الفواتير، وإصدار إيصالات الاستلام الرسمية.'
              : 'Payment receipts ledger, automated invoice balance reconciliation, and client receipt generation.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setNewPaymentModal(true)}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.finance.recordPayment}</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{t.kpi.totalRevenue}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            <CurrencyDisplay amount={totalCollected} currency="BHD" />
          </div>
          <div className="text-[11px] text-emerald-400 font-mono">
            {t.kpi.revenueDesc}
          </div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{locale === 'ar' ? 'سندات القبض المسجلة' : 'Issued Receipts'}</span>
            <div className="w-8 h-8 rounded-lg bg-[#09937F]/10 flex items-center justify-center text-[#09937F]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {payments.length}
          </div>
          <div className="text-[11px] text-[#09937F]">
            {locale === 'ar' ? 'جميعها خضعت للتسوية البنكية' : 'All reconciled in ledger'}
          </div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{locale === 'ar' ? 'الفواتير المستحقة' : 'Invoices In Play'}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Search className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {invoices.length}
          </div>
          <div className="text-[11px] text-amber-400">
            {locale === 'ar' ? 'فواتير صادرة للعملاء' : 'Active billing documents'}
          </div>
        </Card>
      </div>

      {/* Payments Table */}
      <div className="bg-[#0B1210] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider">
            <tr>
              <th className="p-4 text-start">{t.finance.receiptNumber}</th>
              <th className="p-4 text-start">{t.finance.invoiceNumber}</th>
              <th className="p-4 text-start">{t.finance.client}</th>
              <th className="p-4 text-start">{t.finance.paymentDate}</th>
              <th className="p-4 text-start">{t.finance.paymentMethod}</th>
              <th className="p-4 text-end">{locale === 'ar' ? 'المبلغ المحصل' : 'Amount Received'}</th>
              <th className="p-4 text-end">{locale === 'ar' ? 'معاينة الإيصال' : 'View Receipt'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-mono font-bold text-[#09937F]">
                  {payment.receipt_number}
                </td>
                <td className="p-4 font-mono">
                  {payment.invoice ? (
                    <Link
                      href={`/dashboard/invoices/${payment.invoice_id}`}
                      className="text-white hover:text-[#09937F] hover:underline"
                    >
                      {payment.invoice.invoice_number}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-4 font-bold text-white">
                  {payment.invoice?.contact?.full_name || 'Direct Settlement'}
                </td>
                <td className="p-4 font-mono text-[#9EADA9]">
                  {new Date(payment.payment_date).toLocaleDateString(locale === 'ar' ? 'ar-BH' : 'en-GB')}
                </td>
                <td className="p-4">
                  <Badge variant="outline">
                    {payment.payment_method.replace('_', ' ').toUpperCase()}
                  </Badge>
                </td>
                <td className="p-4 text-end font-mono font-bold text-emerald-400 text-sm">
                  +<CurrencyDisplay amount={Number(payment.amount)} currency="BHD" />
                </td>
                <td className="p-4 text-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveReceipt(payment)}
                    className="gap-1 text-[#9EADA9] hover:text-white"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.actions.view}</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={newPaymentModal}
        onClose={() => setNewPaymentModal(false)}
        title={t.finance.recordPayment}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="text-xs text-white mb-1.5 block">
              {locale === 'ar' ? 'اختر الفاتورة المراد سدادها' : 'Select Invoice to Settle'}
            </label>
            <Select
              value={selectedInvoiceId}
              onChange={(e) => {
                const invId = e.target.value;
                setSelectedInvoiceId(invId);
                const inv = invoices.find((i) => i.id === invId);
                if (inv) {
                  setAmount(inv.amount_due || inv.total_amount);
                }
              }}
            >
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id} className="bg-[#0B1210] text-white">
                  {inv.invoice_number} — {inv.contact?.full_name || 'Client'} ({locale === 'ar' ? 'المتبقي' : 'Due'}: {Number(inv.amount_due || inv.total_amount).toFixed(3)} BHD)
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {locale === 'ar' ? 'مبلغ السداد (BHD)' : 'Payment Amount (BHD)'}
              </label>
              <Input
                type="number"
                step="0.001"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {t.finance.paymentDate}
              </label>
              <Input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {t.finance.paymentMethod}
              </label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              >
                <option value="bank_transfer" className="bg-[#0B1210] text-white">{t.finance.bankTransfer}</option>
                <option value="cheque" className="bg-[#0B1210] text-white">{t.finance.cheque}</option>
                <option value="cash" className="bg-[#0B1210] text-white">{t.finance.cash}</option>
                <option value="card" className="bg-[#0B1210] text-white">{t.finance.card}</option>
                <option value="online" className="bg-[#0B1210] text-white">{t.finance.online}</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-white mb-1.5 block">
                {t.finance.referenceNumber}
              </label>
              <Input
                placeholder="TRF-NBB-849201"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white mb-1.5 block">
              {locale === 'ar' ? 'ملاحظات السداد' : 'Notes'}
            </label>
            <Input
              placeholder={locale === 'ar' ? 'تم التحقق من الإيداع عبر المدير المالي' : 'Verified by finance director...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewPaymentModal(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.finance.recordPayment}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Official Receipt Modal */}
      {activeReceipt && company && (
        <Modal
          isOpen={true}
          onClose={() => setActiveReceipt(null)}
          title={`${t.finance.paymentReceipt} — ${activeReceipt.receipt_number}`}
          className="max-w-2xl"
        >
          <div className="space-y-6">
            <ReceiptTemplate payment={activeReceipt} company={company} locale={locale} />
            <DeliveryToolbar
              documentType="receipt"
              clientEmail={activeReceipt.invoice?.contact?.email || 'finance@ishoot.bh'}
              clientPhone={activeReceipt.invoice?.contact?.phone || '+97339000000'}
              clientName={activeReceipt.invoice?.contact?.full_name || 'Client'}
              documentNumber={activeReceipt.receipt_number}
              amountFormatted={`${Number(activeReceipt.amount).toFixed(3)} BHD`}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
