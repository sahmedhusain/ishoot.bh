"use client";
import { errorMessage } from "../../lib/error-text";
import { useCompanyVat } from "../../hooks/useCompanyVat";

import { ROUTES } from "../../constants/routes";
import { uploadFileDirectly } from "../../lib/upload-client";
import * as React from "react";
import { businessDateString } from "../../lib/dates";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Input } from "@ishoot/ui";
import { LinkOrUploadField } from "../shared/LinkOrUploadField";
import {
  ArrowLeft,
  CheckCircle2,
  Receipt,
  Settings2,
  Briefcase,
  UserRound,
  Building2,
} from "lucide-react";
import type {
  ExpenseCategory,
  SupportedCurrency,
} from "@ishoot/database/types";
import {
  EXPENSE_CATEGORY_KINDS,
  EXPENSE_PAYMENT_METHODS,
  SUPPORTED_CURRENCIES,
  type ExpenseScope,
} from "@ishoot/database/constants/finance";
import { createExpenseAction } from "../../app/actions/finance";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { EntityLookup } from "../shared/EntityLookup";

interface NewExpenseFormViewProps {
  categories: ExpenseCategory[];
  defaultCurrency: SupportedCurrency;
  /** Pre-fill from a deal or client page link. */
  dealId?: string;
  clientId?: string;
  canManageCategories?: boolean;
}

const SCOPE_ICONS: Record<ExpenseScope, React.ReactNode> = {
  deal: <Briefcase className="w-4 h-4" />,
  client: <UserRound className="w-4 h-4" />,
  internal: <Building2 className="w-4 h-4" />,
};

export function NewExpenseFormView({
  categories,
  defaultCurrency,
  dealId,
  clientId,
  canManageCategories,
}: NewExpenseFormViewProps) {
  const router = useRouter();
  const { t, locale } = useAdminLocale();
  const vat = useCompanyVat();
  const nT = t.expensesNew;

  const [scope, setScope] = React.useState<ExpenseScope>(
    dealId ? "deal" : clientId ? "client" : "internal",
  );
  const [deal, setDeal] = React.useState(dealId ?? "");
  const [client, setClient] = React.useState(clientId ?? "");
  const [categoryId, setCategoryId] = React.useState("");
  const [descriptionEn, setDescriptionEn] = React.useState("");
  const [descriptionAr, setDescriptionAr] = React.useState("");
  const [amount, setAmount] = React.useState<number>(0);
  const [currency, setCurrency] =
    React.useState<SupportedCurrency>(defaultCurrency);
  const [inputVat, setInputVat] = React.useState<number>(0);
  const [vatRecoverable, setVatRecoverable] = React.useState(true);
  const [vendorName, setVendorName] = React.useState("");
  const [paymentMethod, setPaymentMethod] =
    React.useState<string>("bank_transfer");
  const [billable, setBillable] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [expenseDate, setExpenseDate] = React.useState(() =>
    businessDateString(),
  );
  const [receiptUrl, setReceiptUrl] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const grouped = EXPENSE_CATEGORY_KINDS.map((kind) => ({
    kind,
    items: categories.filter((c) => c.kind === kind),
  })).filter((g) => g.items.length);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descriptionEn || amount <= 0 || !categoryId) return;
    if (scope === "deal" && !deal) return setError(nT.dealLabel);
    if (scope === "client" && !client) return setError(nT.clientLabel);
    setError("");
    setSaving(true);

    try {
      const receipt_url = receiptUrl || undefined;
      const res = await createExpenseAction({
        scope,
        deal_id: scope === "deal" ? deal : undefined,
        client_id: scope === "client" ? client : undefined,
        category_id: categoryId,
        receipt_url,
        description_en: descriptionEn,
        description_ar: descriptionAr || undefined,
        amount: Number(amount),
        currency,
        input_vat_amount: vat.enabled ? Number(inputVat) || 0 : 0,
        is_vat_recoverable: vat.enabled && vatRecoverable,
        vendor_name: vendorName || undefined,
        payment_method: paymentMethod,
        is_billable: scope !== "internal" && billable,
        notes: notes || undefined,
        expense_date: expenseDate || undefined,
      });

      router.push(
        scope === "deal" && res.expense.deal_id
          ? ROUTES.crm.deal(res.expense.deal_id)
          : ROUTES.expenses.list({ highlight: res.expense.id }),
      );
    } catch (err) {
      setError(errorMessage(err, t, nT.saveError));
    } finally {
      setSaving(false);
    }
  };

  const label = "text-xs font-semibold text-ink mb-1.5 block";
  const select =
    "w-full rounded-xl border border-ink/15 bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={ROUTES.expenses.list()}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-ink-muted"
            >
              <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" />
              <span>{t.actions.back}</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink font-display flex items-center gap-2">
              <Receipt className="w-6 h-6 text-accent" />
              <span>{nT.title}</span>
            </h1>
            <p className="text-xs text-ink-muted mt-1">{nT.subtitle}</p>
          </div>
        </div>
        {canManageCategories && (
          <Link
            href={ROUTES.expenses.categories}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
          >
            <Settings2 className="w-4 h-4" />
            {nT.manageCategories}
          </Link>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <p
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-sm"
          >
            {error}
          </p>
        ) : null}

        <Card className="p-6 sm:p-8 bg-surface border border-ink/10 rounded-3xl space-y-5">
          <span className={label}>{nT.scopeLabel}</span>
          <div
            role="radiogroup"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {(["deal", "client", "internal"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={scope === s}
                onClick={() => setScope(s)}
                className={`text-start p-4 rounded-2xl border transition-colors ${scope === s ? "border-accent bg-accent/10" : "border-ink/10 hover:border-ink/25"}`}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-ink">
                  {SCOPE_ICONS[s]}
                  {s === "deal"
                    ? nT.scopeDeal
                    : s === "client"
                      ? nT.scopeClient
                      : nT.scopeInternal}
                </span>
                <span className="block text-[11px] text-ink-muted mt-1 leading-relaxed">
                  {s === "deal"
                    ? nT.scopeDealHint
                    : s === "client"
                      ? nT.scopeClientHint
                      : nT.scopeInternalHint}
                </span>
              </button>
            ))}
          </div>
          {scope === "deal" && (
            <div>
              <span className={label}>{nT.dealLabel}</span>
              <EntityLookup domain="deals" value={deal} onChange={setDeal} />
            </div>
          )}
          {scope === "client" && (
            <div>
              <span className={label}>{nT.clientLabel}</span>
              <EntityLookup
                domain="contacts"
                value={client}
                onChange={setClient}
              />
            </div>
          )}
        </Card>

        <Card className="p-6 sm:p-8 bg-surface border border-ink/10 rounded-3xl space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={label} htmlFor="expense-category">
                {nT.categoryLabel}
              </label>
              <select
                id="expense-category"
                required
                className={select}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">{nT.chooseCategory}</option>
                {grouped.map((g) => (
                  <optgroup key={g.kind} label={t.expenseMeta.kinds[g.kind]}>
                    {g.items.map((c) => (
                      <option key={c.id} value={c.id}>
                        {locale === "ar" ? c.name_ar : c.name_en}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="expense-date">
                {nT.dateLabel}
              </label>
              <Input
                id="expense-date"
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="expense-desc-en">
                {nT.descriptionEnLabel}
              </label>
              <Input
                id="expense-desc-en"
                required
                placeholder={nT.descriptionPlaceholder}
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="expense-desc-ar">
                {nT.descriptionArLabel}
              </label>
              <Input
                id="expense-desc-ar"
                dir="rtl"
                placeholder={nT.descriptionArPlaceholder}
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="expense-amount">
                {nT.amountLabel}
              </label>
              <Input
                id="expense-amount"
                type="number"
                required
                min={0}
                step="0.001"
                placeholder={nT.amountPlaceholder}
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={label} htmlFor="expense-currency">
                {nT.currencyLabel}
              </label>
              <select
                id="expense-currency"
                className={select}
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as SupportedCurrency)
                }
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {vat.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={label} htmlFor="expense-vat">
                  {nT.inputVatLabel}
                </label>
                <Input
                  id="expense-vat"
                  type="number"
                  min={0}
                  step="0.001"
                  value={inputVat || ""}
                  onChange={(e) => setInputVat(parseFloat(e.target.value) || 0)}
                />
                <p className="text-[11px] text-ink-muted mt-1">
                  {nT.inputVatHint}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-ink self-center">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={vatRecoverable}
                  onChange={(e) => setVatRecoverable(e.target.checked)}
                />
                {nT.vatRecoverable}
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={label} htmlFor="expense-vendor">
                {nT.vendorLabel}
              </label>
              <Input
                id="expense-vendor"
                placeholder={nT.vendorPlaceholder}
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="expense-method">
                {nT.paymentMethodLabel}
              </label>
              <select
                id="expense-method"
                className={select}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {EXPENSE_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t.expenseMeta.methods[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {scope !== "internal" && (
            <label className="flex items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                className="accent-accent"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
              />
              {nT.billableLabel}
            </label>
          )}

          <div>
            <label className={label} htmlFor="expense-notes">
              {nT.notesLabel}
            </label>
            <textarea
              id="expense-notes"
              rows={3}
              className="w-full rounded-xl border border-ink/15 bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder={nT.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <LinkOrUploadField
            label={nT.proofLabel}
            hint={nT.proofHint}
            value={receiptUrl}
            onChange={(url) => setReceiptUrl(url)}
            upload={(file) =>
              uploadFileDirectly(file, {
                entityType: "expense",
                entityId: "pending",
              })
            }
          />
        </Card>

        <div className="flex items-center justify-end gap-3">
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
            <span>{saving ? nT.saving : nT.submit}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
