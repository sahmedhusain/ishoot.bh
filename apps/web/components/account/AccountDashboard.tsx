"use client";
import { Select, PhoneInput } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MapPin, Package, Trash2, User } from "lucide-react";
import type { CustomerProfile } from "@platform/database";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref, formatPrice } from "../../lib/site-copy";
import { ContentImage } from "../shared/ContentImage";
import { accountPost, field, label, primaryButton, secondaryButton } from "./ui";

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
interface WishItem {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string;
  thumbnail_url: string;
  price: number | null;
}

const blankAddress = { id: "", label: "", name: "", phone: "", line1: "", line2: "", area: "", city: "", country: "", postalCode: "", isDefault: false };

/** The signed-in customer's account page. */
interface OrderSummary {
  id: string;
  number: string;
  status: string;
  fulfilment?: string;
  total: number;
  currency: string;
  placed_at: string;
  tracking_token?: string | null;
  pickup_branch?: import("@platform/database/constants/website-commerce").PublicBranch | null;
  lines: { description: string; quantity: number }[];
}

export function AccountDashboard({ locale, customer, addresses, wishlist, orders }: { locale: string; customer: CustomerProfile; addresses: Address[]; wishlist: WishItem[]; orders: OrderSummary[] }) {
  const { t, site } = useTranslation();
  const router = useRouter();
  const [profile, setProfile] = React.useState({ name: customer.name, phone: customer.phone, preferredLocale: customer.locale, marketingOptIn: customer.marketing_opt_in, password: "" });
  const [address, setAddress] = React.useState<typeof blankAddress | null>(null);
  const [confirmEmail, setConfirmEmail] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ where: string; tone: "ok" | "error"; text: string } | null>(null);
  const known = (path: string, fallback: string) => (t(path) === path ? t(fallback) : t(path));

  const run = async (where: string, task: () => Promise<unknown>, ok?: string) => {
    setBusy(where);
    setMessage(null);
    try {
      await task();
      if (ok) setMessage({ where, tone: "ok", text: ok });
      router.refresh();
    } catch (err) {
      setMessage({ where, tone: "error", text: known(`account.errors.${err instanceof Error ? err.message : "generic"}`, "account.errors.generic") });
    } finally {
      setBusy(null);
    }
  };
  const note = (where: string) => message?.where === where && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-m3-error" : "text-m3-primary"}`}>{message.text}</p>;
  const section = "scroll-mt-32 rounded-brand bg-m3-surface-container-low p-5 sm:p-6 space-y-5";
  const heading = "flex items-center gap-2 text-lg font-bold text-white font-display";
  const catalogue = site ? collectionHref(site, locale) : `/${locale}`;

  return (
    <div className="relative min-h-screen bg-brand-base text-ink">
      <div className="shell page-heading space-y-8 max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-ink-muted">{t("account.title")}</p>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">{t("account.hello", { name: customer.name })}</h1>
            <p className="mt-2 text-sm text-ink-muted" dir="ltr">{customer.email}</p>
          </div>
          <button type="button" className={secondaryButton} disabled={!!busy} onClick={() => run("signout", async () => { await accountPost("sign-out", {}); })} data-testid="account-sign-out">{t("account.signOut")}</button>
        </div>

        <nav aria-label={t("account.title")} className="flex flex-wrap gap-2 border-b border-m3-outline-variant pb-4">{["profile", "addresses", "orders", ...(site?.commerce?.capabilities.wishlist !== false ? ["wishlist"] : [])].map(key => <a key={key} href={`#account-${key}`} className="inline-flex min-h-11 items-center rounded-brand px-4 py-2 text-sm text-m3-primary hover:bg-m3-secondary-container">{t(`account.sections.${key}`)}</a>)}</nav>
        <section className={section} aria-labelledby="account-profile">
          <h2 id="account-profile" className={heading}><User className="w-5 h-5" aria-hidden="true" />{t("account.sections.profile")}</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <label className="block space-y-2"><span className={label}>{t("account.name")}</span><input name="profileName" maxLength={120} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={field} /></label>
            <label className="block space-y-2">
              <span className={label}>{t("account.phone")}</span>
              <PhoneInput
                value={profile.phone}
                onChange={(phone) => setProfile({ ...profile, phone })}
                className="bg-brand-surface border-white/10 text-white rounded-brand min-h-12"
              />
            </label>
            <label className="block space-y-2"><span className={label}>{t("account.language")}</span>
              <Select value={profile.preferredLocale} onChange={(e) => setProfile({ ...profile, preferredLocale: e.target.value })} className={field}>
                <option value="ar">{t("account.languages.ar")}</option>
                <option value="en">{t("account.languages.en")}</option>
              </Select>
            </label>
            <label className="block space-y-2"><span className={label}>{t("account.newPassword")}</span><input name="profilePassword" type="password" autoComplete="new-password" maxLength={200} value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} className={field} /></label>
            <label className="flex items-center gap-3 text-sm text-ink-muted sm:col-span-2"><input type="checkbox" checked={profile.marketingOptIn} onChange={(e) => setProfile({ ...profile, marketingOptIn: e.target.checked })} className="h-4 w-4 accent-[var(--web-accent)]" />{t("account.marketing")}</label>
          </div>
          {note("profile")}
          <button type="button" className={primaryButton} disabled={!!busy} onClick={() => run("profile", async () => { await accountPost("profile", profile); setProfile((p) => ({ ...p, password: "" })); }, t("account.saved"))} data-testid="account-profile-save">{t("account.save")}</button>
        </section>

        <section className={section} aria-labelledby="account-addresses">
          <h2 id="account-addresses" className={heading}><MapPin className="w-5 h-5" aria-hidden="true" />{t("account.sections.addresses")}</h2>
          {addresses.length === 0 && !address && <p className="text-sm text-ink-muted">{t("account.noAddresses")}</p>}
          <ul className="grid sm:grid-cols-2 gap-3">
            {addresses.map((a) => (
              <li key={a.id} className="rounded-xl border border-white/10 p-4 text-sm space-y-1">
                <p className="font-semibold text-white">{a.label || a.name}{a.is_default && <span className="ms-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{t("account.address.default")}</span>}</p>
                <p className="text-ink-muted">{[a.name, a.phone].join(" · ")}</p>
                <p className="text-ink-muted">{[a.line1, a.line2, a.area, a.city, a.country, a.postal_code].filter(Boolean).join(", ")}</p>
                <div className="flex gap-3 pt-1">
                  <button type="button" className="text-xs font-semibold text-[var(--web-accent)] hover:underline" onClick={() => setAddress({ id: a.id, label: a.label, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, area: a.area, city: a.city, country: a.country, postalCode: a.postal_code, isDefault: a.is_default })}>{t("account.editAddress")}</button>
                  <button type="button" className="text-xs font-semibold text-m3-error hover:underline" onClick={() => run("address", () => accountPost("address-delete", { id: a.id }))}>{t("account.removeAddress")}</button>
                </div>
              </li>
            ))}
          </ul>
          {address ? (
            <div className="grid sm:grid-cols-2 gap-4" data-testid="account-address-form">
              {(["label", "name", "phone", "line1", "line2", "area", "city", "country", "postalCode"] as const).map((key) => (
                <label key={key} className="block space-y-2">
                  <span className={label}>{t(`account.address.${key}`)}</span>
                  {key === "phone" ? (
                    <PhoneInput
                      value={address.phone}
                      onChange={(phone) => setAddress({ ...address, phone })}
                      className="bg-brand-surface border-white/10 text-white rounded-brand min-h-12"
                    />
                  ) : (
                    <input name={`address-${key}`} maxLength={200} dir={key === "postalCode" ? "ltr" : undefined} value={address[key]} onChange={(e) => setAddress({ ...address, [key]: e.target.value })} className={field} />
                  )}
                </label>
              ))}
              <label className="flex items-center gap-3 text-sm text-ink-muted"><input type="checkbox" checked={address.isDefault} onChange={(e) => setAddress({ ...address, isDefault: e.target.checked })} className="h-4 w-4 accent-[var(--web-accent)]" />{t("account.address.isDefault")}</label>
              <div className="sm:col-span-2 flex gap-2">
                <button type="button" className={primaryButton} disabled={!!busy} onClick={() => run("address", async () => { await accountPost("address", { ...address, id: address.id || undefined }); setAddress(null); }, t("account.saved"))} data-testid="account-address-save">{t("account.save")}</button>
                <button type="button" className={secondaryButton} aria-label={t("common.cancel")} onClick={() => setAddress(null)}>×</button>
              </div>
            </div>
          ) : (
            <button type="button" className={secondaryButton} onClick={() => setAddress({ ...blankAddress, name: customer.name, phone: customer.phone })}>{t("account.addAddress")}</button>
          )}
          {note("address")}
        </section>

        <section className={section} aria-labelledby="account-orders">
          <h2 id="account-orders" className={heading}><Package className="w-5 h-5" aria-hidden="true" />{t("account.sections.orders")}</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("account.noOrders")}</p>
          ) : (
            <ul className="divide-y divide-white/10" data-testid="account-orders">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm" data-testid={`account-order-${o.number}`}>
                  <Link href={`/${locale}/account/orders/${o.id}`} className="font-mono text-xs font-semibold text-m3-primary underline min-h-11 inline-flex items-center" dir="ltr">{o.number}</Link>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">{o.fulfilment === "pickup" && ["shipped", "delivered"].includes(o.status) ? t(`store.pickupStatuses.${o.status}`) : t(`store.statuses.${o.status}`)}</span>
                  <span className="text-ink-muted">{new Date(o.placed_at).toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-GB")}</span>
                  <span className="text-ink-muted">{t("store.orderItems", { count: o.lines.reduce((sum, l) => sum + l.quantity, 0) })}</span>
                  {o.tracking_token && <Link href={`/${locale}/track/${o.tracking_token}`} className="text-xs font-semibold text-[var(--web-accent)] hover:underline">{t("store.track")}</Link>}
                  <span className="ms-auto font-semibold text-white">{formatPrice(o.total, o.currency, locale)}</span>
                  {o.pickup_branch && <p className="basis-full text-ink-muted text-sm">{locale === "ar" ? o.pickup_branch.nameAr : o.pickup_branch.nameEn} · {locale === "ar" ? o.pickup_branch.addressAr : o.pickup_branch.addressEn}</p>}
                  <OrderHelp orderId={o.id} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {site?.commerce?.capabilities.wishlist !== false && <section className={section} aria-labelledby="account-wishlist">
          <h2 id="account-wishlist" className={heading}><Heart className="w-5 h-5" aria-hidden="true" />{t("account.sections.wishlist")}</h2>
          {wishlist.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("account.noWishlist")}</p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {wishlist.map((item) => (
                <li key={item.id} className="rounded-xl border border-white/10 overflow-hidden">
                  <Link href={`${catalogue}/${item.slug}`} className="block">
                    <span className="block aspect-square bg-white/5"><ContentImage src={item.thumbnail_url} alt="" width={240} height={240} className="h-full w-full object-cover" /></span>
                    <span className="block p-3 text-sm font-semibold text-white">{locale === "ar" ? item.title_ar : item.title_en}</span>
                  </Link>
                  <button type="button" className="mx-3 mb-3 text-xs text-m3-error hover:underline" onClick={() => run("wishlist", () => accountPost("wishlist", { itemId: item.id }))}>{t("account.removeFromWishlist")}</button>
                </li>
              ))}
            </ul>
          )}
          {note("wishlist")}
        </section>}

        <section className={`${section} border-rose-500/20`} aria-labelledby="account-delete">
          <h2 id="account-delete" className={heading}><Trash2 className="w-5 h-5" aria-hidden="true" />{t("account.deleteTitle")}</h2>
          <p className="text-sm text-ink-muted">{t("account.deleteText")}</p>
          <label className="block space-y-2 max-w-sm"><span className={label}>{t("account.deleteConfirm")}</span><input name="confirmEmail" type="email" dir="ltr" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className={field} /></label>
          {note("delete")}
          <button type="button" className={`${secondaryButton} border-rose-500/40 text-m3-error`} disabled={!!busy || !confirmEmail} onClick={() => run("delete", () => accountPost("delete", { confirmEmail }))} data-testid="account-delete">{t("account.delete")}</button>
        </section>
      </div>
    </div>
  );
}

/** A question or a problem about one order, sent to the service desk with the order attached. */
export function OrderHelp({ orderId, locale }: { orderId: string; locale: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<"question" | "problem">("question");
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState("");
  const [error, setError] = React.useState("");
  if (sent) return <p role="status" className="basis-full text-xs text-m3-primary">{t("account.help.sent", { reference: sent })}</p>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="basis-full text-start text-xs font-semibold text-[var(--web-accent)] hover:underline" data-testid="order-help-open">{t("account.help.open")}</button>;
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await accountPost<{ reference: string }>("order-help", { orderId, kind, message, locale });
      setSent(result.reference);
    } catch (err) {
      const key = err instanceof Error ? err.message : "generic";
      setError(t(`account.errors.${key}`) === `account.errors.${key}` ? t("account.errors.generic") : t(`account.errors.${key}`));
      setBusy(false);
    }
  };
  return (
    <div className="basis-full space-y-2 rounded-xl border border-white/10 p-3" data-testid="order-help">
      <div className="flex gap-2">
        {(["question", "problem"] as const).map((k) => (
          <label key={k} className={`rounded-full border px-3 py-1 text-xs cursor-pointer ${kind === k ? "border-m3-primary text-white" : "border-white/10 text-ink-muted"}`}>
            <input type="radio" name={`help-kind-${orderId}`} value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
            {t(`account.help.${k}`)}
          </label>
        ))}
      </div>
      <textarea aria-label={t("account.help.message")} placeholder={t("account.help.message")} name="helpMessage" rows={3} maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} className={field} />
      {error && <p role="alert" className="text-xs text-m3-error">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy || message.trim().length < 5} onClick={() => void send()} className={primaryButton} data-testid="order-help-send">{t("account.help.send")}</button>
        <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>{t("account.help.cancel")}</button>
      </div>
    </div>
  );
}
