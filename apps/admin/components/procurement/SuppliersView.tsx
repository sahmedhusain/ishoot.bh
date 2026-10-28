"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Search, Truck } from "lucide-react";
import { Button, Card, Input, PhoneInput, formatCurrencyValue } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { SupplierInput, SupplierRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { saveSupplierAction } from "../../app/actions/procurement";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";

const blank = (): SupplierInput => ({ companyName: "", contactName: "", email: "", phone: "", vatNumber: "", leadTimeDays: "", paymentTermsDays: "" });

/** Purchasing → suppliers: the vendor contacts with their delivery and payment days. */
type Performance = Record<string, { orders: number; average_lead_days: number | null; on_time_percent: number | null; rejected_percent: number | null; billed: number; outstanding: number }>;

export function SuppliersView({ suppliers, performance, currency, search, canEdit }: { suppliers: SupplierRecord[]; performance: Performance; currency: string; search: string; canEdit: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.procurement.suppliers;
  const perf = t.procurement.performance;
  const router = useRouter();
  const [query, setQuery] = React.useState(search);
  const [draft, setDraft] = React.useState<SupplierInput | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      await saveSupplierAction(draft);
      setDraft(null);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };
  const field = (key: keyof SupplierInput, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label}>
      {(id) => <Input id={id} name={`supplier-${key}`} value={draft?.[key] ?? ""} onChange={(e) => draft && setDraft({ ...draft, [key]: e.target.value })} className="rounded-lg" {...props} />}
    </Field>
  );
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4" data-page-header>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink">{copy.title}</h1>
          <p className="text-xs text-ink-muted dark:text-ink-muted mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
        </div>
        {canEdit && !draft && (
          <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" onClick={() => setDraft(blank())}>
            <Plus className="w-3.5 h-3.5" />
            {copy.add}
          </Button>
        )}
      </div>
      <form role="search" onSubmit={(e) => { e.preventDefault(); router.push(query.trim() ? `${ROUTES.procurement.suppliers}?q=${encodeURIComponent(query.trim())}` : ROUTES.procurement.suppliers); }} className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
        <Input type="search" aria-label={copy.search} placeholder={copy.search} value={query} onChange={(e) => setQuery(e.target.value)} className="ps-9 rounded-xl" />
      </form>
      {draft && (
        <Card className="p-5 space-y-4" data-testid="supplier-editor">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {field("companyName", copy.companyName, { maxLength: 200 })}
            {field("contactName", copy.contactName, { maxLength: 200 })}
            {field("email", copy.email, { type: "email", dir: "ltr", maxLength: 254 })}
            <Field label={copy.phone}>{(id) => <PhoneInput id={id} value={draft.phone} onChange={(phone) => setDraft({ ...draft, phone })} />}</Field>
            {field("vatNumber", copy.vatNumber, { dir: "ltr", maxLength: 40 })}
            <div className="grid grid-cols-2 gap-3">
              {field("leadTimeDays", copy.leadTime, { type: "number", min: 0, max: 365 })}
              {field("paymentTermsDays", copy.paymentTerms, { type: "number", min: 0, max: 365 })}
            </div>
          </div>
          {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={save} data-testid="supplier-save">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t.procurement.common.save}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setDraft(null)}>{t.procurement.common.cancel}</Button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden">
        {suppliers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Truck className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {suppliers.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{s.name}</p>
                  <p className="text-xs text-ink-muted truncate">{[s.contact_name !== s.name ? s.contact_name : "", s.email, s.phone].filter(Boolean).join(" · ")}</p>
                  {performance[s.id] && (
                    <p className="text-xs text-ink-muted mt-0.5" data-testid="supplier-performance">
                      {[
                        formatMessage(perf.orders, { count: performance[s.id].orders }),
                        performance[s.id].average_lead_days != null && formatMessage(perf.leadTime, { days: performance[s.id].average_lead_days! }),
                        performance[s.id].on_time_percent != null && formatMessage(perf.onTime, { percent: performance[s.id].on_time_percent! }),
                        performance[s.id].rejected_percent != null && formatMessage(perf.rejected, { percent: performance[s.id].rejected_percent! }),
                        `${perf.billed}: ${formatCurrencyValue(performance[s.id].billed, currency, locale === "ar")}`,
                        performance[s.id].outstanding > 0 && `${perf.outstanding}: ${formatCurrencyValue(performance[s.id].outstanding, currency, locale === "ar")}`,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="hidden sm:block text-xs text-ink-muted text-end">
                  {s.lead_time_days != null && <span className="block">{`${copy.leadTime}: ${s.lead_time_days}`}</span>}
                  {s.open_orders > 0 && <span className="block">{formatMessage(copy.openOrders, { count: s.open_orders })}</span>}
                </div>
                {canEdit && (
                  <button type="button" aria-label={formatMessage(copy.edit, { name: s.name })} onClick={() => setDraft({ id: s.id, companyName: s.name === s.contact_name ? "" : s.name, contactName: s.contact_name, email: s.email, phone: s.phone, vatNumber: s.vat_number, leadTimeDays: s.lead_time_days?.toString() ?? "", paymentTermsDays: s.payment_terms_days?.toString() ?? "" })} className="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:bg-ink/5">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
