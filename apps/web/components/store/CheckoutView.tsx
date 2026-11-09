"use client";
import { Select, PhoneInput } from "@platform/ui";
import { isValidPhone } from "@platform/config/phone";
import { getUiTranslations } from "@platform/locales";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../hooks/useTranslation";
import { field, label, primaryButton } from "../account/ui";
import { useCart, writeCart } from "./cart";
import { CartTotals } from "./CartTotals";
import { COUPON_KEY, FULFILMENT_KEY } from "./CartView";
import { useQuote } from "./useQuote";
import type { PublicBranch } from "@platform/database/constants/website-commerce";
import { branchDirections } from "../contact/BranchLocations";
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
  branches: PublicBranch[];
  accountsEnabled: boolean;
  collectCoordinates: boolean;
}

const formatDay = (date: string, locale: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

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

export function CheckoutView({ locale, settings, customer, addresses, country, branches, accountsEnabled, collectCoordinates }: CheckoutViewProps) {
  const { t, site } = useTranslation();
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
  const eligible = branches.filter(branch => branch.active && branch.pickup);
  const [pickupBranchId, setPickupBranchId] = React.useState(eligible.length === 1 ? eligible[0].id : "");
  const pickupBranch = eligible.find(branch => branch.id === pickupBranchId);
  const [pin, setPin] = React.useState({ latitude: "", longitude: "" });
  const [locating, setLocating] = React.useState(false);
  const [locationError, setLocationError] = React.useState("");
  React.useEffect(() => setPin({ latitude: "", longitude: "" }), [addressId]);
  const [paymentMethod, setPaymentMethod] = React.useState(methods[0] ?? "");
  const savedAddress = addresses.find((a) => a.id === addressId);
  const deliveryArea = fulfilment === "delivery" ? (savedAddress ? { area: savedAddress.area, city: savedAddress.city } : { area: address.area, city: address.city }) : undefined;
  const { quote, loading, failed, retry } = useQuote(lines, coupon, fulfilment, deliveryArea);
  const delivery = useDeliveryOptions(deliveryArea);
  const [slot, setSlot] = React.useState("");
  React.useEffect(() => {
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
    setError("");
    const uiCopy = getUiTranslations(locale);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email.trim())) {
      setError(known("account.errors.customerEmailInvalid", "account.errors.generic"));
      return;
    }
    if (!isValidPhone(contact.phone)) {
      setError(uiCopy.invalidPhone);
      return;
    }
    const saved = addresses.find((a) => a.id === addressId);
    const destination = fulfilment === "pickup" ? null : saved ? { name: saved.name, phone: saved.phone, line1: saved.line1, line2: saved.line2, area: saved.area, city: saved.city, country: saved.country, postalCode: saved.postal_code } : address;
    if (destination && !isValidPhone(destination.phone)) {
      setError(uiCopy.invalidPhone);
      return;
    }
    setBusy(true);
    const shipping = destination && collectCoordinates ? { ...destination, latitude: pin.latitude === "" ? null : Number(pin.latitude), longitude: pin.longitude === "" ? null : Number(pin.longitude) } : destination;
    try {
      const response = await fetch("/api/store/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines, couponCode: coupon, fulfilment, pickupBranchId: fulfilment === "pickup" ? pickupBranchId : null, address: shipping, ...contact, paymentMethod, note, locale, slot: fulfilment === "delivery" && slot ? { date: slot.split("|")[0], slotId: slot.split("|")[1] } : null }) });
      const data = (await response.json().catch(() => ({ error: "generic" }))) as { number?: string; payToken?: string; error?: string };
      if (!response.ok || !data.number) throw new Error(data.error || "generic");
      writeCart([]);
      try {
        window.localStorage.removeItem(COUPON_KEY);
      } catch { }
      router.push(data.payToken ? `/${locale}/pay/${data.payToken}?start=1` : `/${locale}/checkout/done?number=${encodeURIComponent(data.number)}`);
    } catch (err) {
      const key = err instanceof Error ? err.message : "generic";
      setError(known(`account.errors.${key}`, "account.errors.generic"));
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-brand-base text-ink">
      <form onSubmit={place} className={`shell page-heading max-w-5xl grid ${site?.commerce?.orderLayout === "stacked" ? "" : "lg:grid-cols-[1fr_340px]"} gap-8 items-start`} data-testid="checkout-form">
        <div className="space-y-8">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">{t("store.checkoutTitle")}</h1>
          {!customer && accountsEnabled && <p className="text-sm text-ink-muted"><Link href={`/${locale}/account?next=${encodeURIComponent(`/${locale}/checkout`)}`} className="font-semibold text-[var(--web-accent)] hover:underline">{t("store.signInHint")}</Link></p>}

          <fieldset className="space-y-4">
            <legend className="text-lg font-bold text-white">{t("store.contact")}</legend>
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="block space-y-2"><span className={label}>{t("account.name")}</span><input name="name" required autoComplete="name" maxLength={120} readOnly={!!customer} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={field} /></label>
              <label className="block space-y-2"><span className={label}>{t("account.email")}</span><input name="email" type="email" required autoComplete="email" dir="ltr" maxLength={254} readOnly={!!customer} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={field} /></label>
              <label className="block space-y-2">
                <span className={label}>{t("account.phone")}</span>
                <PhoneInput
                  name="phone"
                  required
                  autoComplete="tel"
                  value={contact.phone}
                  onChange={(phone) => setContact({ ...contact, phone })}
                />
              </label>
            </div>
          </fieldset>

          {settings.delivery && settings.pickup && (
            <fieldset className="space-y-2">
              <legend className="text-lg font-bold text-white">{t("store.fulfilment")}</legend>
              <div className="flex gap-2">
                {(["delivery", "pickup"] as const).map((f) => (
                  <label key={f} className={`rounded-xl border px-4 py-2 text-sm cursor-pointer ${fulfilment === f ? "border-m3-primary text-white" : "border-white/10 text-ink-muted"}`}>
                    <input type="radio" name="fulfilment" value={f} checked={fulfilment === f} onChange={() => setFulfilment(f)} className="sr-only" />
                    {t(`store.fulfilments.${f}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {fulfilment === "pickup" && branches.length > 0 && <fieldset className="space-y-3" data-testid="pickup-branch">
            <legend className="text-lg font-bold">{t("store.pickupBranch")}</legend>
            <Select required aria-label={t("store.pickupBranch")} value={pickupBranchId} onChange={e => setPickupBranchId(e.target.value)} className={field}>
              <option value="">{t("store.chooseBranch")}</option>
              {eligible.map(branch => <option key={branch.id} value={branch.id}>{locale === "ar" ? branch.nameAr : branch.nameEn}</option>)}
            </Select>
            {!eligible.length && <p role="alert" className="text-m3-error">{t("store.noPickupBranch")}</p>}
            {pickupBranch && <div className="rounded-xl bg-m3-surface-container p-4 space-y-2 text-sm">
              <p>{locale === "ar" ? pickupBranch.addressAr : pickupBranch.addressEn}</p>
              <p className="text-ink-muted whitespace-pre-line">{locale === "ar" ? pickupBranch.hoursAr : pickupBranch.hoursEn}</p>
              {branchDirections(pickupBranch) && <a className="text-m3-primary underline" href={branchDirections(pickupBranch)} target="_blank" rel="noreferrer">{t("store.directions")}</a>}
            </div>}
          </fieldset>}

          {fulfilment === "delivery" && (
            <fieldset className="space-y-4">
              <legend className="text-lg font-bold text-white">{t("store.deliveryAddress")}</legend>
              {addresses.length > 0 && (
                <Select aria-label={t("store.savedAddress")} value={addressId} onChange={(e) => setAddressId(e.target.value)} className={field}>
                  {addresses.map((a) => <option key={a.id} value={a.id}>{[a.label || a.name, a.line1, a.city].filter(Boolean).join(" · ")}</option>)}
                  <option value="">{t("store.newAddress")}</option>
                </Select>
              )}
              {!addressId && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {(["name", "phone", "line1", "line2", "area", "city", "country", "postalCode"] as const).map((key) => (
                    <label key={key} className="block space-y-2">
                      <span className={label}>{t(`account.address.${key}`)}</span>
                      {key === "phone" ? (
                        <PhoneInput
                          name="shipping-phone"
                          required
                          value={address.phone}
                          onChange={(phone) => setAddress({ ...address, phone })}
                        />
                      ) : (
                        <input name={`shipping-${key}`} required={["name", "line1", "city", "country"].includes(key)} maxLength={200} dir={key === "postalCode" ? "ltr" : undefined} value={address[key]} onChange={(e) => setAddress({ ...address, [key]: e.target.value })} className={field} />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          {fulfilment === "delivery" && collectCoordinates && <fieldset className="space-y-3">
            <legend className="text-lg font-semibold">{t("store.deliveryPin")}</legend>
            <p className="text-sm text-ink-muted">{t("store.deliveryPinHelp")}</p>
            <div className="grid sm:grid-cols-2 gap-3">{(["latitude", "longitude"] as const).map(key => <label key={key} className="space-y-1 text-sm"><span>{key === "latitude" ? t("store.latitude") : t("store.longitude")}</span><input type="number" step="any" min={key === "latitude" ? -90 : -180} max={key === "latitude" ? 90 : 180} required={pin[key === "latitude" ? "longitude" : "latitude"] !== ""} value={pin[key]} onChange={e => setPin({ ...pin, [key]: e.target.value })} className={field} dir="ltr" /></label>)}</div>
            <button type="button" disabled={locating} className="min-h-11 text-m3-primary underline" onClick={() => {
              setLocationError("");
              if (!navigator.geolocation) { setLocationError(t("store.locationUnavailable")); return; }
              setLocating(true);
              navigator.geolocation.getCurrentPosition(position => { setPin({ latitude: String(position.coords.latitude), longitude: String(position.coords.longitude) }); setLocating(false); }, () => { setLocationError(t("store.locationFailed")); setLocating(false); }, { timeout: 10_000, maximumAge: 60_000 });
            }}>{locating ? t("store.locating") : t("store.useDeviceLocation")}</button>
            {locationError && <p role="status" className="text-sm text-ink-muted">{locationError}</p>}
          </fieldset>}

          {fulfilment === "delivery" && delivery && delivery.covered && (delivery.slots.length > 0 || delivery.slaHours) && (
            <fieldset className="space-y-3" data-testid="checkout-slots">
              <legend className="text-lg font-bold text-white">{t("store.deliveryTime")}</legend>
              {delivery.slots.length > 0 ? (
                <Select aria-label={t("store.deliveryTime")} name="slot" required={delivery.requireSlot} value={slot} onChange={(e) => setSlot(e.target.value)} className={field}>
                  {delivery.requireSlot ? <option value="" disabled>{t("store.deliveryTime")}</option> : <option value="">{t("store.anyTime")}</option>}
                  {delivery.slots.map((s) => (
                    <option key={`${s.date}|${s.slotId}`} value={`${s.date}|${s.slotId}`}>
                      {`${formatDay(s.date, locale)} · ${s.start}–${s.end}`}{s.left != null && s.left <= 3 ? ` (${t("store.slotLeft", { count: s.left })})` : ""}
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="text-sm text-ink-muted">{t("store.promiseText", { hours: delivery.slaHours ?? 0 })}</p>
              )}
            </fieldset>
          )}

          <fieldset className="space-y-3">
            <legend className="text-lg font-bold text-white">{t("store.payment")}</legend>
            {methods.map((m) => (
              <label key={m} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer ${paymentMethod === m ? "border-m3-primary text-white" : "border-white/10 text-ink-muted"}`}>
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

        <aside aria-busy={loading} className="space-y-5 rounded-brand bg-m3-surface-container-low p-5 lg:sticky lg:top-28">
          <h2 className="font-semibold text-lg">{t("store.orderReview")}</h2>
          <Link href={`/${locale}/cart`} className="inline-flex min-h-11 items-center text-sm text-m3-primary underline">{t("store.editCart")}</Link>
          {failed && <div role="alert" className="space-y-2 text-sm"><p>{t("account.errors.generic")}</p><button type="button" className={primaryButton} onClick={retry}>{t("store.tryAgain")}</button></div>}
          <ul className="space-y-2 text-sm">
            {quote?.lines.map((l) => (
              <li key={`${l.productId}-${l.variantKey}`} className="flex justify-between gap-3">
                <span className="text-ink">{[locale === "ar" ? l.nameAr || l.nameEn : l.nameEn, locale === "ar" ? l.variantAr : l.variantEn].filter(Boolean).join(" · ")} × {l.quantity}</span>
              </li>
            ))}
          </ul>
          {quote && <CartTotals quote={quote} delivery={fulfilment === "delivery"} />}
          {quote?.problems.filter((p) => !p.problem.startsWith("coupon")).map((p) => <p key={`${p.productId}-${p.problem}`} role="alert" className="text-sm text-m3-error">{t(`store.problems.${p.problem}`)}</p>)}
          {error && <p role="alert" className="text-sm text-m3-error" data-testid="checkout-error">{error}</p>}
          <button type="submit" disabled={busy || loading || (fulfilment === "pickup" && branches.length > 0 && !pickupBranch) || !quote?.lines.length || !paymentMethod || (quote?.problems.length ?? 0) > 0} className={`${primaryButton} w-full`} data-testid="checkout-place">
            {busy ? t("store.placing") : t("store.placeOrder")}
          </button>
        </aside>
      </form>
    </div>
  );
}
