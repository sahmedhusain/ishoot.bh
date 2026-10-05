"use client";
import { useCompanyVat } from "../../hooks/useCompanyVat";

import { ROUTES } from "../../constants/routes";
import { uploadFileDirectly } from "../../lib/upload-client";
import * as React from "react";
import { businessDateString } from "../../lib/dates";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
Card,
Button,
Input,
ProofUploader,
ProofFile,
} from "@ishoot/ui";
import { ArrowLeft,CheckCircle2,Receipt } from "lucide-react";
import { createExpenseAction } from "../../app/actions/finance";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function NewExpenseFormView() {
  const router = useRouter();
  const { t } = useAdminLocale();
  const vat = useCompanyVat();

  const [descriptionEn, setDescriptionEn] = React.useState("");
  const [amount, setAmount] = React.useState<number>(0);
  const [inputVat, setInputVat] = React.useState<number>(0);
  const [vatRecoverable, setVatRecoverable] = React.useState(true);
  const [vendorName, setVendorName] = React.useState("");
  const [expenseDate, setExpenseDate] = React.useState(() => businessDateString());
  const [proofFiles, setProofFiles] = React.useState<ProofFile[]>([]);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descriptionEn || amount <= 0) return;
    setError("");
    setSaving(true);

    try {
      let receipt_url: string | undefined;
      if (proofFiles[0]?.file) {
        const uploaded = await uploadFileDirectly(proofFiles[0].file, { entityType: "expense", entityId: "pending" });
        receipt_url = uploaded.fileUrl;
      }
      await createExpenseAction({
        receipt_url,
        description_en: descriptionEn,
        amount: Number(amount),
        input_vat_amount: vat.enabled ? Number(inputVat) || 0 : 0,
        is_vat_recoverable: vat.enabled && vatRecoverable,
        vendor_name: vendorName || undefined,
        expense_date: expenseDate || undefined,
      });

      router.push(ROUTES.expenses.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.expensesNew.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.expenses.list()}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-ink-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink font-display flex items-center gap-2">
            <Receipt className="w-6 h-6 text-accent" />
            <span>{t.expensesNew.title}</span>
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            {t.expensesNew.subtitle}
          </p>
        </div>
      </div>

      <Card className="p-8 bg-surface border border-ink/10 rounded-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error ? <p role="alert">{error}</p> : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 block">
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
              <label className="text-xs font-semibold text-ink mb-1.5 block">
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

          {vat.enabled && <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                {t.expensesNew.inputVatLabel}
              </label>
              <Input
                type="number"
                min={0}
                step="0.001"
                value={inputVat || ""}
                onChange={(e) => setInputVat(parseFloat(e.target.value) || 0)}
              />
              <p className="text-[11px] text-slate-400 mt-1">{t.expensesNew.inputVatHint}</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-ink self-center">
              <input type="checkbox" className="accent-accent" checked={vatRecoverable} onChange={(e) => setVatRecoverable(e.target.checked)} />
              {t.expensesNew.vatRecoverable}
            </label>
          </div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                {t.expensesNew.vendorLabel}
              </label>
              <Input
                placeholder={t.expensesNew.vendorPlaceholder}
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink mb-1.5 block">
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

          <div className="pt-6 border-t border-ink/10 flex items-center justify-end gap-4">
            <Link href={ROUTES.expenses.list()}>
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
