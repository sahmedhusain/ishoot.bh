"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ScanLine, Trash2 } from "lucide-react";
import { Button, Card, CurrencyDisplay, Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { SaleProductOption } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { createStaffOrderAction } from "../../app/actions/orders";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";

interface Line {
  productId: string;
  variantId: string;
  label: string;
  sku: string;
  price: number;
  quantity: string;
}

/** A sale taken by staff: at the counter (scan or search), by phone or WhatsApp. */
export function NewSaleView({ products, currency, deliveryEnabled }: { products: SaleProductOption[]; currency: string; deliveryEnabled: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.orders.pos;
  const router = useRouter();
  const [channel, setChannel] = React.useState("pos");
  const [customer, setCustomer] = React.useState({ name: "", email: "", phone: "" });
  const [query, setQuery] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([]);
  const [couponCode, setCouponCode] = React.useState("");
  const [fulfilment, setFulfilment] = React.useState("pickup");
  const [address, setAddress] = React.useState({ name: "", phone: "", line1: "", city: "", country: "" });
  const [paidWith, setPaidWith] = React.useState("cash");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const name = (p: { name_en: string; name_ar: string }) => (locale === "ar" ? p.name_ar || p.name_en : p.name_en || p.name_ar);

  // Every sellable item: a product without variants, or each of its variants.
  const items = React.useMemo(
    () =>
      products.flatMap((p) =>
        p.variants.length
          ? p.variants.map((v) => ({ productId: p.id, variantId: v.id, label: `${name(p)} · ${locale === "ar" ? v.label_ar : v.label_en}`, sku: v.sku, barcode: v.barcode, price: v.price }))
          : [{ productId: p.id, variantId: "", label: name(p), sku: p.sku, barcode: p.barcode, price: p.price }],
      ),
    // name depends on the locale only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, locale],
  );
  const text = query.trim().toLowerCase();
  const matches = text ? items.filter((i) => i.label.toLowerCase().includes(text) || i.sku.toLowerCase().includes(text) || (i.barcode && i.barcode === query.trim())).slice(0, 8) : [];

  const add = (item: (typeof items)[number]) => {
    setLines((current) => {
      const same = current.find((l) => l.productId === item.productId && l.variantId === item.variantId);
      if (same) return current.map((l) => (l === same ? { ...l, quantity: String(Number(l.quantity) + 1) } : l));
      return [...current, { productId: item.productId, variantId: item.variantId, label: item.label, sku: item.sku, price: item.price, quantity: "1" }];
    });
    setQuery("");
  };
  const total = Math.round(lines.reduce((sum, l) => sum + l.price * (Number(l.quantity) || 0), 0) * 1000) / 1000;

  const create = async () => {
    if (!lines.length) return setError(copy.noLines);
    setBusy(true);
    setError("");
    try {
      const result = await createStaffOrderAction({
        channel,
        name: customer.name.trim() || copy.walkIn,
        email: customer.email,
        phone: customer.phone,
        lines: lines.map((l) => ({ productId: l.productId, variantId: l.variantId || undefined, quantity: l.quantity })),
        couponCode,
        fulfilment,
        address: fulfilment === "delivery" ? { ...address, line2: "", area: "", postalCode: "" } : null,
        paidWith,
        note,
      });
      router.push(ROUTES.orders.detail(result.id));
    } catch (err) {
      setError(errorMessage(err, t));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
      </div>
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <Card className="p-5 space-y-4">
          <div className="relative">
            <ScanLine className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
            <Input
              aria-label={copy.search}
              placeholder={copy.search}
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // A scanner types the barcode and presses Enter.
                if (e.key === "Enter" && matches[0]) {
                  e.preventDefault();
                  add(matches[0]);
                }
              }}
              className="ps-9 rounded-xl"
              data-testid="sale-search"
            />
            {matches.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-xl border border-ink/10 bg-white dark:bg-surface shadow-lg overflow-hidden">
                {matches.map((item) => (
                  <li key={`${item.productId}-${item.variantId}`}>
                    <button type="button" onClick={() => add(item)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-ink/5 text-start">
                      <span>{item.label} <span className="font-mono text-xs text-ink-muted" dir="ltr">{item.sku}</span></span>
                      <span className="flex items-center gap-2"><CurrencyDisplay amount={item.price} currency={currency} /><Plus className="w-3.5 h-3.5" aria-hidden="true" /></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ul className="divide-y divide-ink/10" data-testid="sale-lines">
            {lines.map((l, index) => (
              <li key={`${l.productId}-${l.variantId}`} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1 min-w-0">{l.label} <span className="font-mono text-xs text-ink-muted" dir="ltr">{l.sku}</span></span>
                <Input aria-label={formatMessage(copy.quantityFor, { name: l.label })} type="number" min={1} value={l.quantity} onChange={(e) => setLines(lines.map((x, i) => (i === index ? { ...x, quantity: e.target.value } : x)))} className="h-9 w-20 rounded-lg" />
                <span className="w-24 text-end"><CurrencyDisplay amount={Math.round(l.price * (Number(l.quantity) || 0) * 1000) / 1000} currency={currency} /></span>
                <button type="button" aria-label={formatMessage(copy.removeLine, { name: l.label })} onClick={() => setLines(lines.filter((_, i) => i !== index))} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
          <p className="text-end text-lg font-bold" data-testid="sale-total"><CurrencyDisplay amount={total} currency={currency} /></p>
        </Card>

        <Card className="p-5 space-y-4">
          <Field label={copy.channel}>
            {(id) => (
              <Select id={id} value={channel} onChange={(e) => { setChannel(e.target.value); if (e.target.value !== "pos") setPaidWith(""); }} className="rounded-lg">
                {(["pos", "phone", "whatsapp"] as const).map((c) => <option key={c} value={c}>{t.orders.channels[c]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={copy.name}>{(id) => <Input id={id} name="saleName" placeholder={copy.walkIn} maxLength={120} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.phone}>{(id) => <Input id={id} type="tel" dir="ltr" maxLength={40} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.email}>{(id) => <Input id={id} type="email" dir="ltr" maxLength={254} value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.coupon}>{(id) => <Input id={id} dir="ltr" maxLength={30} value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="rounded-lg" />}</Field>
          {deliveryEnabled && channel !== "pos" && (
            <Field label={copy.fulfilment}>
              {(id) => (
                <Select id={id} value={fulfilment} onChange={(e) => setFulfilment(e.target.value)} className="rounded-lg">
                  <option value="pickup">{t.orders.fulfilments.pickup}</option>
                  <option value="delivery">{t.orders.fulfilments.delivery}</option>
                </Select>
              )}
            </Field>
          )}
          {fulfilment === "delivery" && (["line1", "city", "country"] as const).map((key) => (
            <Field key={key} label={copy.address[key]}>{(id) => <Input id={id} maxLength={200} value={address[key]} onChange={(e) => setAddress({ ...address, [key]: e.target.value, name: customer.name, phone: customer.phone })} className="rounded-lg" />}</Field>
          ))}
          <Field label={copy.paidWith}>
            {(id) => (
              <Select id={id} value={paidWith} onChange={(e) => setPaidWith(e.target.value)} className="rounded-lg" data-testid="sale-paid-with">
                <option value="cash">{t.orders.paymentMethods.cash}</option>
                <option value="card">{t.orders.paymentMethods.card}</option>
                <option value="">{copy.notPaid}</option>
              </Select>
            )}
          </Field>
          <Field label={t.orders.detail.statusNote}>{(id) => <Input id={id} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg" />}</Field>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <Button type="button" variant="primary" className="w-full rounded-full gap-1.5" disabled={busy} onClick={create} data-testid="sale-create">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {copy.create}
          </Button>
        </Card>
      </div>
    </div>
  );
}
