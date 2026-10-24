"use client";

import * as React from "react";
import type { Invoice,PaymentMethod } from "@platform/database/types";
import { Modal,Input,Select,Button,CurrencyDisplay } from "@platform/ui";
import { CheckCircle2 } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { createPaymentAction } from "../../app/actions/finance";

interface PaymentRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSuccess: () => void;
}

export function PaymentRecorder({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: PaymentRecorderProps) {
  const { t } = useAdminLocale();
  const [amount, setAmount] = React.useState<number>(invoice.amount_due);
  const [method, setMethod] = React.useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

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

  const modalTitle = `${t.paymentRecorder.modalTitle}: ${invoice.invoice_number}`;

  return (
    <Modal closeLabel={t.actions.close} isOpen={isOpen} onClose={onClose} title={modalTitle}>
      {success ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-ink">
            {t.paymentRecorder.recordedSuccess}
          </h4>
          <p className="text-xs text-ink-muted">
            {t.paymentRecorder.reconciledDesc}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-4 rounded-xl bg-surface-sunken border border-ink/10 flex justify-between items-center text-xs">
            <div>
              <span className="text-ink-muted block">
                {t.paymentRecorder.totalDue}
              </span>
              <span className="text-base font-bold text-ink ">
                <CurrencyDisplay
                  amount={invoice.amount_due}
                  currency={invoice.currency}
                />
              </span>
            </div>
            <div className="text-end">
              <span className="text-ink-muted block">
                {t.paymentRecorder.client}
              </span>
              <span className="font-semibold text-accent">
                {invoice.contact?.company || invoice.contact?.full_name}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted">
              {t.paymentRecorder.paymentAmount}
            </label>
            <Input
              type="number"
              step="0.001"
              max={invoice.amount_due}
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className=" text-base font-bold text-accent"
            />
            <span className="text-[11px] text-ink-muted">
              {t.paymentRecorder.paymentAmountHint}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-muted">
                {t.paymentRecorder.paymentMethod}
              </label>
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              >
                <option value="bank_transfer">
                  {t.paymentRecorder.bankTransfer}
                </option>
                <option value="cheque">{t.paymentRecorder.cheque}</option>
                <option value="cash">{t.paymentRecorder.cash}</option>
                <option value="card">{t.paymentRecorder.card}</option>
                <option value="online">{t.paymentRecorder.online}</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-muted">
                {t.paymentRecorder.paymentDate}
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
            <label className="text-xs font-medium text-ink-muted">
              {t.paymentRecorder.refNumber}
            </label>
            <Input
              placeholder={t.paymentRecorder.refPlaceholder}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-muted">
              {t.paymentRecorder.notes}
            </label>
            <Input
              placeholder={t.paymentRecorder.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {t.actions.cancel}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              size="sm"
            >
              {loading
                ? t.paymentRecorder.recording
                : t.paymentRecorder.confirmAndIssue}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
