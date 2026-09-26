'use client';

import * as React from 'react';
import type { Invoice, PaymentMethod } from '@ishoot/database/types';
import { Modal, Input, Select, Button, CurrencyDisplay } from '@ishoot/ui';
import { CheckCircle2 } from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { createPaymentAction } from '../../app/actions/finance';

interface PaymentRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSuccess: () => void;
}

export function PaymentRecorder({ isOpen, onClose, invoice, onSuccess }: PaymentRecorderProps) {
  const { t, locale } = useAdminLocale();
  const [amount, setAmount] = React.useState<number>(invoice.amount_due);
  const [method, setMethod] = React.useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = React.useState('');
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Sync amount when invoice changes
  React.useEffect(() => {
    setAmount(invoice.amount_due);
  }, [invoice.amount_due]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createPaymentAction({
        invoice_id: invoice.id,
        payment_date: paymentDate,
        amount: Number(amount),
        payment_method: method,
        reference_number: reference,
        notes,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = locale === 'ar'
    ? `تسجيل دفعة للفاتورة: ${invoice.invoice_number}`
    : `Record Payment: ${invoice.invoice_number}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      {success ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-white">
            {locale === 'ar' ? 'تم تسجيل الدفعة بنجاح' : 'Payment Recorded Successfully'}
          </h4>
          <p className="text-xs text-[#9EADA9]">
            {locale === 'ar'
              ? 'تم إصدار سند القبض وتسوية رصيد الفاتورة في السجل المالي.'
              : 'Receipt generated and invoice balance reconciled.'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Invoice Summary Card */}
          <div className="p-4 rounded-xl bg-[#050807] border border-white/10 flex justify-between items-center text-xs">
            <div>
              <span className="text-[#9EADA9] block">
                {locale === 'ar' ? 'المبلغ المستحق:' : 'Total Invoice Due:'}
              </span>
              <span className="text-base font-bold text-white font-mono">
                <CurrencyDisplay amount={invoice.amount_due} currency={invoice.currency} />
              </span>
            </div>
            <div className="text-end">
              <span className="text-[#9EADA9] block">
                {locale === 'ar' ? 'العميل:' : 'Client:'}
              </span>
              <span className="font-semibold text-[#09937F]">
                {invoice.contact?.company || invoice.contact?.full_name}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9EADA9]">
              {locale === 'ar' ? 'مبلغ الدفعة' : 'Payment Amount'}
            </label>
            <Input
              type="number"
              step="0.001"
              max={invoice.amount_due}
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="font-mono text-base font-bold text-[#09937F]"
            />
            <span className="text-[11px] text-[#9EADA9]">
              {locale === 'ar'
                ? 'أدخل كامل المبلغ أو قيمة الدفعة المرحلية الجزئية.'
                : 'Enter full amount or lesser amount for partial milestone payment.'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">
                {locale === 'ar' ? 'طريقة السداد' : 'Payment Method'}
              </label>
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                <option value="bank_transfer">{locale === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                <option value="cheque">{locale === 'ar' ? 'شيك مصرفي' : 'Cheque'}</option>
                <option value="cash">{locale === 'ar' ? 'نقداً' : 'Cash'}</option>
                <option value="card">{locale === 'ar' ? 'بطاقة ائتمانية' : 'Card Payment'}</option>
                <option value="online">{locale === 'ar' ? 'دفع إلكتروني (بنفت بي)' : 'Online / BenefitPay'}</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">
                {locale === 'ar' ? 'تاريخ الدفعة' : 'Payment Date'}
              </label>
              <Input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9EADA9]">
              {locale === 'ar' ? 'رقم الحوالة أو الشيك المرجعي' : 'Reference / Cheque Number'}
            </label>
            <Input
              placeholder={locale === 'ar' ? 'مثال: TRF-98214' : 'e.g. TRF-98214'}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9EADA9]">
              {locale === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <Input
              placeholder={locale === 'ar' ? 'مثال: دفعة مقدمة لتصوير الإعلان' : 'e.g. Advance deposit for aerial shoot'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {t.actions.cancel}
            </Button>
            <Button type="submit" disabled={loading} variant="primary" size="sm">
              {loading
                ? locale === 'ar' ? 'جارٍ التسجيل...' : 'Recording...'
                : locale === 'ar' ? 'تأكيد السداد وإصدار السند' : 'Confirm Payment & Issue Receipt'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
