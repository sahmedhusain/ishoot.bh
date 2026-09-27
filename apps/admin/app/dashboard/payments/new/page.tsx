"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Input,
  Select,
  ProofUploader,
  ProofFile,
} from "@ishoot/ui";
import { ArrowLeft, CheckCircle2, CreditCard } from "lucide-react";
import { createPaymentAction } from "../../../actions/finance";
import { useAdminLocale } from "../../../../hooks/useAdminLocale";

export default function NewPaymentPage() {
  const router = useRouter();
  const { t } = useAdminLocale();

  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState("");
  const [amount, setAmount] = React.useState<number>(0);
  const [paymentDate, setPaymentDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentMethod, setPaymentMethod] = React.useState<
    "bank_transfer" | "cheque" | "cash" | "card" | "online"
  >("bank_transfer");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [proofFiles, setProofFiles] = React.useState<ProofFile[]>([]);
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

      router.push("/dashboard/payments");
    } catch (err) {
      console.error("Failed to record payment:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/payments">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-[#9EADA9]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#09937F]" />
            <span>{t.paymentsNew.title}</span>
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.paymentsNew.subtitle}
          </p>
        </div>
      </div>

      <Card className="p-8 bg-[#0B1210] border border-white/10 rounded-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.paymentsNew.invoiceLabel}
              </label>
              <Input
                placeholder="Enter Invoice ID / Reference"
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.paymentsNew.amountLabel}
              </label>
              <Input
                type="number"
                required
                min={0}
                placeholder="1000.00"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.paymentsNew.methodLabel}
              </label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              >
                <option
                  value="bank_transfer"
                  className="bg-[#0B1210] text-white"
                >
                  Bank Wire Transfer (IBAN)
                </option>
                <option value="cheque" className="bg-[#0B1210] text-white">
                  Corporate Bank Check
                </option>
                <option value="card" className="bg-[#0B1210] text-white">
                  Credit / Debit Card
                </option>
                <option value="online" className="bg-[#0B1210] text-white">
                  BenefitPay / Online Gateway
                </option>
                <option value="cash" className="bg-[#0B1210] text-white">
                  Cash Receipt
                </option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.paymentsNew.refLabel}
              </label>
              <Input
                placeholder="TRF-98214"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.paymentsNew.dateLabel}
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

          <ProofUploader
            label={t.paymentsNew.proofLabel}
            hint={t.paymentsNew.proofHint}
            value={proofFiles}
            onChange={setProofFiles}
            maxFiles={1}
          />

          <div>
            <label className="text-xs font-semibold text-white mb-1.5 block">
              {t.paymentsNew.notesLabel}
            </label>
            <Input
              placeholder="Accounting notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-6 border-t border-white/10 flex items-center justify-end gap-4">
            <Link href="/dashboard/payments">
              <Button type="button" variant="outline" size="sm">
                {t.actions.cancel}
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {saving ? t.paymentsNew.saving : t.paymentsNew.submit}
              </span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
