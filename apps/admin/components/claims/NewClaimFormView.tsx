"use client";

import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Input } from "@ishoot/ui";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  HandCoins,
  Loader2,
  X,
} from "lucide-react";
import type { ExpenseCategory } from "@ishoot/database/types";
import {
  EXPENSE_CATEGORY_KINDS,
  SUPPORTED_CURRENCIES,
} from "@ishoot/database/constants/finance";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { businessDateString } from "../../lib/dates";
import { uploadFileDirectly } from "../../lib/upload-client";
import { isHttpsLink } from "../shared/LinkOrUploadField";
import { submitExpenseClaimAction } from "../../app/actions/claims";
import { EntityLookup } from "../shared/EntityLookup";

interface NewClaimFormViewProps {
  categories: ExpenseCategory[];
  meetings: { id: string; title: string; startDate: string }[];
  canLinkDeals: boolean;
  canLinkInvoices: boolean;
}

export function NewClaimFormView({
  categories,
  meetings,
  canLinkDeals,
  canLinkInvoices,
}: NewClaimFormViewProps) {
  const router = useRouter();
  const { t, locale } = useAdminLocale();
  const c = t.claims;
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [amount, setAmount] = React.useState<number>(0);
  const [currency, setCurrency] = React.useState("BHD");
  const [expenseDate, setExpenseDate] = React.useState(() =>
    businessDateString(),
  );
  const [reason, setReason] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [dealId, setDealId] = React.useState("");
  const [invoiceId, setInvoiceId] = React.useState("");
  const [meetingId, setMeetingId] = React.useState("");
  const [receipt, setReceipt] = React.useState<{
    url: string;
    name: string;
    preview?: string;
  } | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const data = await uploadFileDirectly(file, {
        entityType: "expense_claim",
        entityId: "pending",
      });
      setReceipt({
        url: data.fileUrl,
        name: file.name,
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      });
    } catch (err) {
      setError(errorMessage(err, t, c.uploadFailed));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt) return setError(c.receiptRequired);
    setSaving(true);
    setError("");
    try {
      const res = await submitExpenseClaimAction({
        amount: Number(amount),
        currency,
        expenseDate,
        reason,
        categoryId: categoryId || null,
        dealId: dealId || null,
        invoiceId: invoiceId || null,
        calendarEventId: meetingId || null,
        receiptUrl: receipt.url,
      });
      router.push(ROUTES.claims.list({ highlight: res.claim.id }));
    } catch (err) {
      setError(errorMessage(err, t, c.submitFailed));
      setSaving(false);
    }
  };

  const label = "text-xs font-semibold text-ink mb-1.5 block";
  const select =
    "w-full rounded-xl border border-ink/15 bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.claims.list()}>
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
            <HandCoins className="w-6 h-6 text-accent" />
            {c.newTitle}
          </h1>
          <p className="text-xs text-ink-muted mt-1">{c.newSubtitle}</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {error && (
          <p
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-sm"
          >
            {error}
          </p>
        )}

        <Card className="p-6 sm:p-8 bg-surface border border-ink/10 rounded-3xl space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="claim-amount">
                {c.amount}
              </label>
              <Input
                id="claim-amount"
                type="number"
                min={0}
                step="0.001"
                required
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={label} htmlFor="claim-currency">
                {t.expensesNew.currencyLabel}
              </label>
              <select
                id="claim-currency"
                className={select}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={label} htmlFor="claim-date">
                {c.datePaid}
              </label>
              <Input
                id="claim-date"
                type="date"
                required
                max={businessDateString()}
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="claim-category">
                {c.category}
              </label>
              <select
                id="claim-category"
                className={select}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">{c.categoryFinance}</option>
                {EXPENSE_CATEGORY_KINDS.map((kind) => {
                  const items = categories.filter((cat) => cat.kind === kind);
                  return items.length ? (
                    <optgroup key={kind} label={t.expenseMeta.kinds[kind]}>
                      {items.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {locale === "ar" ? cat.name_ar : cat.name_en}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })}
              </select>
            </div>
          </div>
          <div>
            <label className={label} htmlFor="claim-reason">
              {c.reason}
            </label>
            <textarea
              id="claim-reason"
              required
              maxLength={1000}
              rows={3}
              placeholder={c.reasonPlaceholder}
              className="w-full rounded-xl border border-ink/15 bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-6 sm:p-8 bg-surface border border-ink/10 rounded-3xl space-y-5">
          <div>
            <h2 className="text-sm font-bold text-ink">{c.relatedTitle}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">{c.relatedHint}</p>
          </div>
          {canLinkDeals && (
            <div>
              <span className={label}>{c.relatedDeal}</span>
              <EntityLookup
                domain="deals"
                value={dealId}
                onChange={setDealId}
              />
            </div>
          )}
          {canLinkInvoices && (
            <div>
              <span className={label}>{c.relatedInvoice}</span>
              <EntityLookup
                domain="invoices"
                value={invoiceId}
                onChange={setInvoiceId}
              />
            </div>
          )}
          <div>
            <label className={label} htmlFor="claim-meeting">
              {c.relatedMeeting}
            </label>
            <select
              id="claim-meeting"
              className={select}
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
            >
              <option value="">{c.noMeeting}</option>
              {meetings.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                >{`${m.startDate.slice(0, 10)} · ${m.title}`}</option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="p-6 sm:p-8 bg-surface border border-ink/10 rounded-3xl space-y-3">
          <span className={label}>{c.receipt}</span>
          {receipt ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-ink/10">
              {receipt.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={receipt.preview}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-ink/5 flex items-center justify-center text-[10px] text-ink-muted">
                  {t.copy.pdf}</div>
              )}
              <span className="text-sm text-ink truncate flex-1">
                {receipt.name}
              </span>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="p-2 rounded-lg text-ink-muted hover:text-rose-500"
                aria-label={c.removeReceipt}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center gap-2 p-8 rounded-2xl border-2 border-dashed border-ink/15 text-ink-muted hover:border-accent hover:text-accent"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Camera className="w-6 h-6" />
              )}
              <span className="text-sm font-semibold">
                {uploading ? c.uploading : c.addReceipt}
              </span>
              <span className="text-[11px]">{c.receiptHint}</span>
            </button>
          )}
          {!receipt && (
            <label className="block text-xs text-ink-muted">
              {t.linkOrUpload.orLink}
              <input
                type="url"
                inputMode="url"
                dir="ltr"
                placeholder={t.copy.urlExample}
                className="mt-1 h-10 w-full rounded-xl border border-ink/15 bg-surface px-3 text-sm text-ink"
                onBlur={(e) => {
                  const link = e.target.value.trim();
                  if (!link) return;
                  if (!isHttpsLink(link))
                    return setError(t.linkOrUpload.invalidLink);
                  setError("");
                  setReceipt({ url: link, name: new URL(link).hostname });
                }}
              />
            </label>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={ROUTES.claims.list()}>
            <Button type="button" variant="outline" size="sm">
              {t.actions.cancel}
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving || uploading}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? c.submitting : c.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
