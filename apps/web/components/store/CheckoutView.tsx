"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../hooks/useTranslation";
import { field, label, primaryButton } from "../account/ui";
import { useCart, writeCart } from "./cart";
import { CartTotals } from "./CartTotals";
import { COUPON_KEY, FULFILMENT_KEY } from "./CartView";
import { useQuote } from "./useQuote";
import type { DeliveryOptions } from "@platform/database";

interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  area: string;
  city: string;
  country: string;
  postal_code: string;
  is_default: boolean;
}

interface CheckoutViewProps {
  locale: string;
  settings: { guestCheckout: boolean; delivery: boolean; pickup: boolean; cod: boolean; online: boolean; bankTransfer: boolean; bankInstructions: string };
  customer: { name: string; email: string; phone: string } | null;
  addresses: Address[];
  country: string;
}

const formatDay = (date: string, locale: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** What delivery offers for the area being typed: whether it is served and the delivery times. */
function useDeliveryOptions(place: { area: string; city: string } | undefined) {
  const [options, setOptions] = React.useState<DeliveryOptions | null>(null);
  const key = place ? `${place.area.trim()}|${place.city.trim()}` : "";
  React.useEffect(() => {
    if (!place) return setOptions(null);
    let live = true;
    const timer = setTimeout(() => {
      fetch("/api/store/delivery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: place }) })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: DeliveryOptions | null) => live && setOptions(data))
        .catch(() => live && setOptions(null));
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // The key holds everything the request depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return options;
}

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};

/** Checkout: who it is for, where it goes (or pickup), how it is paid, then the order. */
export function CheckoutView({ locale, settings, customer, addresses, country }: CheckoutViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const lines = useCart();
  const [coupon, setCoupon] = React.useState("");
  const [fulfilment, setFulfilment] = React.useState<"delivery" | "pickup">(settings.delivery ? "delivery" : "pickup");
  React.useEffect(() => {
    setCoupon(read(COUPON_KEY));
    const saved = read(FULFILMENT_KEY);
    if ((saved === "delivery" && settings.delivery) || (saved === "pickup" && settings.pickup)) setFulfilment(saved);
  }, [settings.delivery, settings.pickup]);
  const methods = [settings.online && "online", settings.cod && "cod", settings.bankTransfer && "bank_transfer"].filter(Boolean) as string[];
  const [contact, setContact] = React.useState({ name: customer?.name ?? "", email: customer?.email ?? "", phone: customer?.phone ?? "" });
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const [addressId, setAddressId] = React.useState(defaultAddress?.id ?? "");
  const [address, setAddress] = React.useState({ name: customer?.name ?? "", phone: customer?.phone ?? "", line1: "", line2: "", area: "", city: "", country, postalCode: "" });
  const [paymentMethod, setPaymentMethod] = React.useState(methods[0] ?? "");
  // The delivery area prices the delivery (zones) and decides the delivery times on offer.
  const savedAddress = addresses.find((a) => a.id === addressId);
  const deliveryArea = fulfilment === "delivery" ? (savedAddress ? { area: savedAddress.area, city: savedAddress.city } : { area: address.area, city: address.city }) : undefined;
  const { quote, loading } = useQuote(lines, coupon, fulfilment, deliveryArea);
  const delivery = useDeliveryOptions(deliveryArea);
  const [slot, setSlot] = React.useState("");
  React.useEffect(() => {
    // A slot that is no longer offered (another area, or taken) is dropped.
    if (slot && !delivery?.slots.some((s) => `${s.date}|${s.slotId}` === slot)) setSlot("");
  }, [delivery, slot]);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const known = (path: string, fallback: string) => (t(path) === path ? t(fallback) : t(path));

  if (!customer && !settings.guestCheckout)
    return (
      <div className="relative min-h-screen bg-brand-base text-ink">
        <div className="shell page-heading max-w-xl space-y-4">
          <h1 className="text-3xl font-bold text-white font-display">{t("store.checkoutTitle")}</h1>
          <Link href={`/${locale}/account?next=${encodeURIComponent(`/${locale}/checkout`)}`} className={primaryButton}>{t("account.signIn")}</Link>
        </div>
      </div>
    );

  const place = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const saved = addresses.find((a) => a.id === addressId);
    const shipping = fulfilment === "pickup" ? null : saved ? { name: saved.name, phone: saved.phone, line1: saved.line1, line2: saved.line2, area: saved.area, city: saved.city, country: saved.country, postalCode: saved.postal_code } : address;
    try {
      const response = await fetch("/api/store/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines, couponCode: coupon, fulfilment, address: shipping, ...contact, paymentMethod, note, locale, slot: fulfilment === "delivery" && slot ? { date: slot.split("|")[0], slotId: slot.split("|")[1] } : null }) });
      const data = (await response.json().catch(() => ({ error: "generic" }))) as { number?: string; payToken?: string; error?: string };
      if (!response.ok || !data.number) throw new Error(data.error || "generic");
      writeCart([]);
      try {
        window.localStorage.removeItem(COUPON_KEY);
      } catch { }
      // Paying online continues on the order's payment page, which takes the customer to the gateway.
      router.push(data.payToken ? `/${locale}/pay/${data.payToken}?start=1` : `/${locale}/checkout/done?number=${encodeURIComponent(data.number)}`);
    } catch (err) {
      const key = err instanceof Error ? err.message : "generic";
      setError(known(`account.errors.${key}`, "account.errors.generic"));
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-brand-base text-ink">
      <form onSubmit={place} className="shell page-heading max-w-5xl grid lg:grid-cols-[1fr_340px] gap-8 items-start" data-testid="checkout-form">
        <div className="space-y-8">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">{t("store.checkoutTitle")}</h1>
          {!customer && <p className="text-sm text-ink-muted"><Link href={`/${locale}/account?next=${encodeURIComponent(`/${locale}/checkout`)}`} className="font-semibold text-[var(--web-accent)] hover:underline">{t("store.signInHint")}</Link></p>}

          <fieldset className="space-y-4">
            <legend className="text-lg font-bold text-white">{t("store.contact")}</legend>
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="block space-y-2"><span className={label}>{t("account.name")}</span><input name="name" required autoComplete="name" maxLength={120} readOnly={!!customer} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={field} /></label>
              <label className="block space-y-2"><span className={label}>{t("account.email")}</span><input name="email" type="email" required autoComplete="email" dir="ltr" maxLength={254} readOnly={!!customer} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={field} /></label>
              <label className="block space-y-2"><span className={label}>{t("account.phone")}</span><input name="phone" type="tel" required autoComplete="tel" dir="ltr" maxLength={40} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={field} /></label>
            </div>
          </fieldset>

          {settings.delivery && settings.pickup && (
            <fieldset className="space-y-2">
              <legend className="text-lg font-bold text-white">{t("store.fulfilment")}</legend>
              <div className="flex gap-2">
                {(["delivery", "pickup"] as const).map((f) => (
                  <label key={f} className={`rounded-xl border px-4 py-2 text-sm cursor-pointer ${fulfilment === f ? "border-[var(--web-accent)] text-white" : "border-white/10 text-ink-muted"}`}>
                    <input type="radio" name="fulfilment" value={f} checked={fulfilment === f} onChange={() => setFulfilment(f)} className="sr-only" />
                    {t(`store.fulfilments.${f}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {fulfilment === "delivery" && (
            <fieldset className="space-y-4">
              <legend className="text-lg font-bold text-white">{t("store.deliveryAddress")}</legend>
              {addresses.length > 0 && (
                <select aria-label={t("store.savedAddress")} value={addressId} onChange={(e) => setAddressId(e.target.value)} className={field}>
                  {addresses.map((a) => <option key={a.id} value={a.id}>{[a.label || a.name, a.line1, a.city].filter(Boolean).join(" · ")}</option>)}
                  <option value="">{t("store.newAddress")}</option>
                </select>
              )}
              {!addressId && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {(["name", "phone", "line1", "line2", "area", "city", "country", "postalCode"] as const).map((key) => (
                    <label key={key} className="block space-y-2"><span className={label}>{t(`account.address.${key}`)}</span><input name={`shipping-${key}`} required={["name", "phone", "line1", "city", "country"].includes(key)} maxLength={200} dir={key === "phone" || key === "postalCode" ? "ltr" : undefined} value={address[key]} onChange={(e) => setAddress({ ...address, [key]: e.target.value })} className={field} /></label>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          {fulfilment === "delivery" && delivery && delivery.covered && (delivery.slots.length > 0 || delivery.slaHours) && (
            <fieldset className="space-y-3" data-testid="checkout-slots">
              <legend className="text-lg font-bold text-white">{t("store.deliveryTime")}</legend>
              {delivery.slots.length > 0 ? (
                <select aria-label={t("store.deliveryTime")} name="slot" required={delivery.requireSlot} value={slot} onChange={(e) => setSlot(e.target.value)} className={field}>
                  {delivery.requireSlot ? <option value="" disabled>{t("store.deliveryTime")}</option> : <option value="">{t("store.anyTime")}</option>}
                  {delivery.slots.map((s) => (
                    <option key={`${s.date}|${s.slotId}`} value={`${s.date}|${s.slotId}`}>
                      {`${formatDay(s.date, locale)} · ${s.start}–${s.end}`}{s.left != null && s.left <= 3 ? ` (${t("store.slotLeft", { count: s.left })})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-ink-muted">{t("store.promiseText", { hours: delivery.slaHours ?? 0 })}</p>
              )}
            </fieldset>
          )}

          <fieldset className="space-y-3">
            <legend className="text-lg font-bold text-white">{t("store.payment")}</legend>
            {methods.map((m) => (
              <label key={m} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer ${paymentMethod === m ? "border-[var(--web-accent)] text-white" : "border-white/10 text-ink-muted"}`}>
                <input type="radio" name="paymentMethod" value={m} checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} className="h-4 w-4 accent-[var(--web-accent)]" />
                {t(`store.paymentMethods.${m}`)}
              </label>
            ))}
            {paymentMethod === "bank_transfer" && settings.bankInstructions && (
              <div className="rounded-xl bg-white/5 p-4 text-sm"><p className="font-semibold text-white mb-1">{t("store.bankInstructions")}</p><p className="whitespace-pre-line text-ink-muted">{settings.bankInstructions}</p></div>
            )}
          </fieldset>

          <label className="block space-y-2"><span className={label}>{t("store.note")}</span><textarea name="note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={field} /></label>
        </div>

        <aside className="space-y-5 rounded-2xl border border-white/10 p-5 lg:sticky lg:top-28">
          <ul className="space-y-2 text-sm">
            {quote?.lines.map((l) => (
              <li key={`${l.productId}-${l.variantKey}`} className="flex justify-between gap-3">
                <span className="text-ink">{[locale === "ar" ? l.nameAr || l.nameEn : l.nameEn, locale === "ar" ? l.variantAr : l.variantEn].filter(Boolean).join(" · ")} × {l.quantity}</span>
              </li>
            ))}
          </ul>
          {quote && <CartTotals quote={quote} delivery={fulfilment === "delivery"} />}
          {quote?.problems.filter((p) => !p.problem.startsWith("coupon")).map((p) => <p key={`${p.productId}-${p.problem}`} role="alert" className="text-sm text-amber-300">{t(`store.problems.${p.problem}`)}</p>)}
          {error && <p role="alert" className="text-sm text-rose-400" data-testid="checkout-error">{error}</p>}
          <button type="submit" disabled={busy || loading || !quote?.lines.length || !paymentMethod || (quote?.problems.length ?? 0) > 0} className={`${primaryButton} w-full`} data-testid="checkout-place">
            {busy ? t("store.placing") : t("store.placeOrder")}
          </button>
        </aside>
      </form>
    </div>
  );
}
