"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, QrCode, Trash2, X } from "lucide-react";
import { Button, Card, Input, formatDate } from "@platform/ui";
import type { TaxRateInput, TaxRateRecord } from "@platform/database";
import {
  deleteTaxRateAction,
  saveTaxRateAction,
} from "../../../app/actions/taxes";
import { useAdminLocale } from "../../../hooks/useAdminLocale";
import { errorMessage } from "../../../lib/error-text";
import { uploadFileDirectly } from "../../../lib/upload-client";
import { LinkOrUploadField } from "../../shared/LinkOrUploadField";

const EMPTY: TaxRateInput = {
  name_en: "",
  name_ar: "",
  rate: 0,
  registration_number: "",
  certificate_url: "",
  certificate_valid_until: "",
  applies_to_invoices: true,
  applies_to_quotations: true,
  is_active: true,
};

/** The editable fields of a stored tax (the action accepts nothing else). */
const toInput = (tax: TaxRateRecord): TaxRateInput => ({
  id: tax.id,
  name_en: tax.name_en,
  name_ar: tax.name_ar,
  rate: tax.rate,
  registration_number: tax.registration_number ?? "",
  certificate_url: tax.certificate_url ?? "",
  certificate_valid_until: tax.certificate_valid_until ?? "",
  applies_to_invoices: tax.applies_to_invoices,
  applies_to_quotations: tax.applies_to_quotations,
  is_active: tax.is_active,
});

/**
 * Taxes besides VAT. Each active tax is added to new invoices and quotations like VAT, frozen on the
 * document, and its certificate is printed as a QR code at the end of invoices, quotations and receipts.
 */
export function CustomTaxesPanel({
  initialTaxes,
  canEdit,
}: {
  initialTaxes: TaxRateRecord[];
  canEdit: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const c = t.taxRegistry;
  const router = useRouter();
  const [editing, setEditing] = React.useState<TaxRateInput | null>(null);
  const [saving, setSaving] = React.useState(false);

  const set = <K extends keyof TaxRateInput>(key: K, value: TaxRateInput[K]) =>
    setEditing((e) => (e ? { ...e, [key]: value } : e));

  const save = async () => {
    if (!editing || saving) return;
    setSaving(true);
    try {
      await saveTaxRateAction({ ...editing, rate: Number(editing.rate) });
      toast.success(c.saved);
      setEditing(null);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, c.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tax: TaxRateRecord) => {
    try {
      await deleteTaxRateAction(tax.id);
      toast.success(c.deleted);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, c.deleteFailed));
    }
  };

  return (
    <Card className="p-6 bg-surface-raised dark:bg-surface-container-low border border-outline-variant shadow-xs rounded-2xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant pb-3">
        <div>
          <h3 className="text-sm font-bold text-ink">{c.title}</h3>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl">{c.subtitle}</p>
        </div>
        {canEdit && !editing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setEditing({ ...EMPTY })}
          >
            <Plus className="w-3.5 h-3.5" />
            {c.add}
          </Button>
        ) : null}
      </div>

      {initialTaxes.length === 0 && !editing ? (
        <p className="text-xs text-ink-muted">{c.empty}</p>
      ) : null}

      {initialTaxes.length ? (
        <ul className="divide-y divide-outline-variant">
          {initialTaxes.map((tax) => (
            <li
              key={tax.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {locale === "ar" ? tax.name_ar : tax.name_en}
                  </span>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent tabular-nums">
                    {tax.rate}%
                  </span>
                  {!tax.is_active ? (
                    <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] text-ink-muted">
                      {c.inactive}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-[11px] text-ink-muted flex flex-wrap gap-x-3">
                  {tax.registration_number ? (
                    <span dir="ltr">
                      {c.registrationShort} {tax.registration_number}
                    </span>
                  ) : null}
                  <span>
                    {[
                      tax.applies_to_invoices && c.invoices,
                      tax.applies_to_quotations && c.quotations,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {tax.certificate_valid_until ? (
                    <span>
                      {c.validUntil}:{" "}
                      {formatDate(tax.certificate_valid_until, locale)}
                    </span>
                  ) : null}
                  <span>
                    {formatMessage(c.documents, { n: String(tax.documents) })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {tax.certificate_url ? (
                  <a
                    href={`/certificates/${tax.code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent/10"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    {c.publicPage}
                  </a>
                ) : (
                  <span className="text-[11px] text-amber-600 dark:text-amber-300">
                    {c.noCertificate}
                  </span>
                )}
                {canEdit ? (
                  <>
                    <button
                      type="button"
                      aria-label={c.edit}
                      title={c.edit}
                      onClick={() => setEditing(toInput(tax))}
                      className="rounded-lg p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {tax.documents === 0 ? (
                      <button
                        type="button"
                        aria-label={c.delete}
                        title={c.delete}
                        onClick={() => remove(tax)}
                        className="rounded-lg p-1.5 text-ink-muted hover:text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {editing ? (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-ink">
              {editing.id ? c.edit : c.add}
            </h4>
            <button
              type="button"
              aria-label={t.actions.cancel}
              onClick={() => setEditing(null)}
              className="rounded-lg p-1 text-ink-muted hover:text-ink"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">
                {c.nameEn}
              </span>
              <Input
                dir="ltr"
                value={editing.name_en}
                onChange={(e) => set("name_en", e.target.value)}
                placeholder={c.nameEnPlaceholder}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">
                {c.nameAr}
              </span>
              <Input
                dir="rtl"
                value={editing.name_ar}
                onChange={(e) => set("name_ar", e.target.value)}
                placeholder={c.nameArPlaceholder}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">
                {c.rate}
              </span>
              <Input
                type="number"
                min={0.01}
                max={100}
                step={0.01}
                value={editing.rate || ""}
                onChange={(e) => set("rate", Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">
                {c.registrationNumber}
              </span>
              <Input
                dir="ltr"
                value={editing.registration_number ?? ""}
                onChange={(e) => set("registration_number", e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">
                {c.validUntil}
              </span>
              <Input
                type="date"
                value={editing.certificate_valid_until ?? ""}
                onChange={(e) => set("certificate_valid_until", e.target.value)}
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-semibold text-ink mb-1 block">
                {c.certificate}
              </span>
              <LinkOrUploadField
                value={editing.certificate_url ?? ""}
                onChange={(url) => set("certificate_url", url)}
                upload={(file) =>
                  uploadFileDirectly(file, {
                    entityType: "company_setting",
                    entityId: "company-settings",
                    documentType: "tax_certificate",
                  })
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-ink">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.applies_to_invoices}
                onChange={(e) => set("applies_to_invoices", e.target.checked)}
              />
              {c.appliesToInvoices}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.applies_to_quotations}
                onChange={(e) => set("applies_to_quotations", e.target.checked)}
              />
              {c.appliesToQuotations}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
              />
              {c.active}
            </label>
          </div>
          <p className="text-[11px] text-ink-muted">{c.note}</p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(null)}
            >
              {t.actions.cancel}
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={save}>
              {saving ? c.saving : c.save}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
