"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Input,
  ProofUploader,
  ProofFile,
} from "@ishoot/ui";
import { ArrowLeft, CheckCircle2, Receipt } from "lucide-react";
import { createExpenseAction } from "../../app/actions/finance";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function NewExpenseFormView() {
  const router = useRouter();
  const { t } = useAdminLocale();

  const [descriptionEn, setDescriptionEn] = React.useState("");
  const [amount, setAmount] = React.useState<number>(0);
  const [vendorName, setVendorName] = React.useState("");
  const [expenseDate, setExpenseDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [proofFiles, setProofFiles] = React.useState<ProofFile[]>([]);
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descriptionEn || amount <= 0) return;
    setSaving(true);

    try {
      await createExpenseAction({
        description_en: descriptionEn,
        amount: Number(amount),
        vendor_name: vendorName || undefined,
        expense_date: expenseDate || undefined,
      });

      router.push("/dashboard/expenses");
    } catch (err) {
      console.error("Failed to log expense:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/expenses">
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
            <Receipt className="w-6 h-6 text-[#09937F]" />
            <span>{t.expensesNew.title}</span>
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.expensesNew.subtitle}
          </p>
        </div>
      </div>

      <Card className="p-8 bg-[#0B1210] border border-white/10 rounded-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.expensesNew.descriptionEnLabel}
              </label>
              <Input
                required
                placeholder={t.expensesNew.descriptionPlaceholder}
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.expensesNew.amountLabel}
              </label>
              <Input
                type="number"
                required
                min={0}
                placeholder={t.expensesNew.amountPlaceholder}
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className=""
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.expensesNew.vendorLabel}
              </label>
              <Input
                placeholder={t.expensesNew.vendorPlaceholder}
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white mb-1.5 block">
                {t.expensesNew.dateLabel}
              </label>
              <Input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className=""
              />
            </div>
          </div>

          <ProofUploader
            label={t.expensesNew.proofLabel}
            hint={t.expensesNew.proofHint}
            value={proofFiles}
            onChange={setProofFiles}
            maxFiles={1}
          />

          <div className="pt-6 border-t border-white/10 flex items-center justify-end gap-4">
            <Link href="/dashboard/expenses">
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
                {saving ? t.expensesNew.saving : t.expensesNew.submit}
              </span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
