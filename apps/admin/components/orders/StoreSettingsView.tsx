"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Ticket } from "lucide-react";
import { Button, Card, Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { ContentLanguage } from "@platform/database/constants/languages";
import type { CouponInput, StoreSettingsRecord } from "@platform/database";
import { saveCouponAction, saveStoreSettingsAction } from "../../app/actions/orders";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field, LanguageFields } from "../setup/LanguageFields";

interface CouponRow {
  id: string;
  code: string;
  kind: string;
  value: number;
  min_order: number | null;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
}

/** Store settings: checkout, delivery, pickup and payment methods; and the coupons. */
export function StoreSettingsView({ settings, coupons, gateways, currency, languages, canEdit, canCoupons }: { settings: StoreSettingsRecord; coupons: CouponRow[]; gateways: { id: string; test_mode: boolean }[]; currency: string; languages: readonly ContentLanguage[]; canEdit: boolean; canCoupons: boolean }) {
  const { t } = useAdminLocale();
  const copy = t.orders.settings;
  const router = useRouter();
  const [form, setForm] = React.useState({
    guestCheckout: settings.guest_checkout,
    deliveryEnabled: settings.delivery_enabled,
    deliveryFee: String(settings.delivery_fee),
    freeDeliveryOver: settings.free_delivery_over == null ? "" : String(settings.free_delivery_over),
    pickupEnabled: settings.pickup_enabled,
    codEnabled: settings.cod_enabled,
    bankTransferEnabled: settings.bank_transfer_enabled,
    bankInstructionsEn: settings.bank_instructions_en,
    bankInstructionsAr: settings.bank_instructions_ar,
    orderNotifyEmail: settings.order_notify_email,
    paymentGateway: settings.payment_gateway,
  });
  const [coupon, setCoupon] = React.useState<CouponInput | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = async (task: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "ok", text: done });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };
  const toggle = (key: "guestCheckout" | "deliveryEnabled" | "pickupEnabled" | "codEnabled" | "bankTransferEnabled") => (
    <label className="flex items-center gap-2.5 text-sm text-ink">
      <input type="checkbox" className="h-4 w-4 accent-accent" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
      {copy[key]}
    </label>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div data-page-header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink">{copy.title}</h1>
        <p className="text-xs text-ink-muted dark:text-ink-muted mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}
      <Card className="p-5 space-y-4">
        <fieldset disabled={!canEdit} className="grid sm:grid-cols-2 gap-4">
          {toggle("guestCheckout")}
          {toggle("pickupEnabled")}
          {toggle("deliveryEnabled")}
          <span />
          <Field label={formatMessage(copy.deliveryFee, { currency })}>{(id) => <Input id={id} name="deliveryFee" type="number" min={0} step="0.001" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={formatMessage(copy.freeDeliveryOver, { currency })}>{(id) => <Input id={id} type="number" min={0} step="0.001" value={form.freeDeliveryOver} onChange={(e) => setForm({ ...form, freeDeliveryOver: e.target.value })} className="rounded-lg" />}</Field>
          {toggle("codEnabled")}
          {toggle("bankTransferEnabled")}
          {form.bankTransferEnabled && <LanguageFields label={copy.bankInstructions} languages={languages} multiline wide maxLength={2000} en={form.bankInstructionsEn} ar={form.bankInstructionsAr} onChange={({ en, ar }) => setForm({ ...form, bankInstructionsEn: en, bankInstructionsAr: ar })} />}
          <Field label={copy.paymentGateway} hint={copy.gatewayHint}>
            {(id) => (
              <Select id={id} name="paymentGateway" value={form.paymentGateway} onChange={(e) => setForm({ ...form, paymentGateway: e.target.value })} className="rounded-lg">
                <option value="">{copy.noGateway}</option>
                {gateways.map((g) => (
                  <option key={g.id} value={g.id}>{`${(t.integrations.providers as Record<string, { name: string }>)[g.id]?.name ?? g.id}${g.test_mode ? ` (${copy.gatewayTest})` : ""}`}</option>
                ))}
                {form.paymentGateway && !gateways.some((g) => g.id === form.paymentGateway) && <option value={form.paymentGateway}>{(t.integrations.providers as Record<string, { name: string }>)[form.paymentGateway]?.name ?? form.paymentGateway}</option>}
              </Select>
            )}
          </Field>
          <Field label={copy.orderNotifyEmail}>{(id) => <Input id={id} type="email" dir="ltr" value={form.orderNotifyEmail} onChange={(e) => setForm({ ...form, orderNotifyEmail: e.target.value })} className="rounded-lg" />}</Field>
        </fieldset>
        {canEdit && (
          <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={() => run(() => saveStoreSettingsAction(form), copy.saved)} data-testid="store-settings-save">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {copy.save}
          </Button>
        )}
      </Card>

      <Card className="p-5 space-y-4" data-page-section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink flex items-center gap-2"><Ticket className="w-4 h-4 text-accent" aria-hidden="true" />{copy.coupons}</h2>
          {canCoupons && !coupon && (
            <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => setCoupon({ code: "", kind: "percent", value: "", minOrder: "", startsAt: "", endsAt: "", maxUses: "", isActive: true })}>
              <Plus className="w-3.5 h-3.5" />
              {copy.addCoupon}
            </Button>
          )}
        </div>
        {coupon && (
          <div className="grid sm:grid-cols-4 gap-3 rounded-xl border border-outline-variant p-3" data-testid="coupon-editor">
            <Field label={copy.code}>{(id) => <Input id={id} name="couponCode" dir="ltr" maxLength={30} value={coupon.code} onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })} className="rounded-lg font-mono" />}</Field>
            <Field label={copy.kind}>
              {(id) => (
                <Select id={id} value={coupon.kind} onChange={(e) => setCoupon({ ...coupon, kind: e.target.value })} className="rounded-lg">
                  <option value="percent">{copy.kinds.percent}</option>
                  <option value="fixed">{copy.kinds.fixed}</option>
                </Select>
              )}
            </Field>
            <Field label={copy.value}>{(id) => <Input id={id} name="couponValue" type="number" min={0} step="0.001" value={coupon.value} onChange={(e) => setCoupon({ ...coupon, value: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={copy.minOrder}>{(id) => <Input id={id} type="number" min={0} step="0.001" value={coupon.minOrder} onChange={(e) => setCoupon({ ...coupon, minOrder: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={copy.startsAt}>{(id) => <Input id={id} type="date" value={coupon.startsAt} onChange={(e) => setCoupon({ ...coupon, startsAt: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={copy.endsAt}>{(id) => <Input id={id} type="date" value={coupon.endsAt} onChange={(e) => setCoupon({ ...coupon, endsAt: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={copy.maxUses}>{(id) => <Input id={id} type="number" min={1} value={coupon.maxUses} onChange={(e) => setCoupon({ ...coupon, maxUses: e.target.value })} className="rounded-lg" />}</Field>
            <label className="flex items-center gap-2.5 text-sm text-ink pt-6"><input type="checkbox" className="h-4 w-4 accent-accent" checked={coupon.isActive} onChange={(e) => setCoupon({ ...coupon, isActive: e.target.checked })} />{copy.active}</label>
            <div className="sm:col-span-4 flex gap-2">
              <Button type="button" variant="primary" size="sm" className="rounded-full" disabled={busy} onClick={() => run(async () => { await saveCouponAction(coupon); setCoupon(null); }, copy.saved)} data-testid="coupon-save">{copy.save}</Button>
              <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setCoupon(null)}>{t.procurement.common.cancel}</Button>
            </div>
          </div>
        )}
        {coupons.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noCoupons}</p>
        ) : (
          <ul className="divide-y divide-outline-variant text-sm">
            {coupons.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <button type="button" disabled={!canCoupons} onClick={() => setCoupon({ id: c.id, code: c.code, kind: c.kind, value: String(c.value), minOrder: c.min_order?.toString() ?? "", startsAt: c.starts_at ?? "", endsAt: c.ends_at ?? "", maxUses: c.max_uses?.toString() ?? "", isActive: c.is_active })} className="font-mono font-semibold text-ink enabled:hover:text-accent" dir="ltr">{c.code}</button>
                <span>{c.kind === "percent" ? `${c.value}%` : `${c.value} ${currency}`}</span>
                <span className="text-xs text-ink-muted">{formatMessage(copy.used, { count: c.used_count })}{c.max_uses != null ? ` / ${c.max_uses}` : ""}</span>
                {!c.is_active && <span className="text-xs text-ink-muted">—</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
