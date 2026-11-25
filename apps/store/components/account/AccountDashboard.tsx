"use client";
import { Select, PhoneInput } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Gift, Heart, MapPin, Package, RotateCcw, ShoppingBag, Trash2, User, Wallet } from "lucide-react";
import type {
  CustomerProfile,
  OrderReturnRequestRow,
  PointsTransactionRow,
  WalletTransactionRow,
} from "@platform/database";
import { pointsToMoney } from "@platform/database/constants/store";
import { useTranslation } from "../../hooks/useTranslation";
import { formatPrice } from "../../lib/site-copy";
import { ContentImage } from "../shared/ContentImage";
import { addToCart } from "../store/cart";
import { ConfirmDialog } from "../ui/confirm-destructive";
import { showSnackbar } from "../ui/snackbar";
import { accountPost, card, field, label, primaryButton, secondaryButton, statusTone } from "./ui";

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

export type AccountSection =
  | "all"
  | "overview"
  | "orders"
  | "wallet"
  | "rewards"
  | "addresses"
  | "wishlist"
  | "returns"
  | "profile";

export function AccountDashboard({
  locale,
  customer,
  addresses,
  wishlist,
  orders,
  walletTransactions = [],
  pointsTransactions = [],
  returnRequests = [],
  pointsRedemptionRate = 500,
  minRedeemPoints = 1000,
  activeSection = "all",
}: {
  locale: string;
  customer: CustomerProfile;
  addresses: Address[];
  wishlist: WishItem[];
  orders: OrderSummary[];
  walletTransactions?: WalletTransactionRow[];
  pointsTransactions?: PointsTransactionRow[];
  returnRequests?: OrderReturnRequestRow[];
  pointsRedemptionRate?: number;
  minRedeemPoints?: number;
  activeSection?: AccountSection;
}) {
  const { t, site } = useTranslation();
  const router = useRouter();
  const [profile, setProfile] = React.useState({ name: customer.name, phone: customer.phone, preferredLocale: customer.locale, marketingOptIn: customer.marketing_opt_in, password: "" });
  const [address, setAddress] = React.useState<typeof blankAddress | null>(null);
  const [pendingDeleteAddress, setPendingDeleteAddress] = React.useState<Address | null>(null);
  const [confirmEmail, setConfirmEmail] = React.useState("");
  const [pointsToConvert, setPointsToConvert] = React.useState(String(minRedeemPoints));
  const [giftCardCode, setGiftCardCode] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ where: string; tone: "ok" | "error"; text: string } | null>(null);
  const known = (path: string, fallback: string) => (t(path) === path ? t(fallback) : t(path));

  const currency = site?.currency || "BHD";
  const walletBalance = Number(customer.wallet_balance ?? 0);
  const loyaltyPoints = Number(customer.loyalty_points ?? 0);
  const discountPercent = Number(customer.discount_percent ?? 0);
  const pointsValue = pointsToMoney(loyaltyPoints, pointsRedemptionRate);

  const run = async (where: string, task: () => Promise<unknown>, ok?: string) => {
    setBusy(where);
    setMessage(null);
    try {
      await task();
      if (ok) {
        setMessage({ where, tone: "ok", text: ok });
        showSnackbar({ message: ok, tone: "success" });
      }
      router.refresh();
    } catch (err) {
      const errText = known(`account.errors.${err instanceof Error ? err.message : "generic"}`, "account.errors.generic");
      setMessage({ where, tone: "error", text: errText });
      showSnackbar({ message: errText, tone: "error" });
    } finally {
      setBusy(null);
    }
  };
  const note = (where: string) => message?.where === where && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-m3-error" : "text-m3-primary"}`}>{message.text}</p>;
  const section = card;
  const heading = "flex items-center gap-2 text-lg font-bold text-m3-on-surface font-display";
  const catalogue = `/${locale}/products`;

  return (
    <div className="bg-m3-surface text-m3-on-surface pb-20">
      <div className="shell page-heading space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink-muted">{t("account.title")}</p>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-m3-on-surface font-display">{t("account.hello", { name: customer.name })}</h1>
            <p className="mt-2 text-sm text-m3-on-surface-variant text-start"><bdi dir="ltr">{customer.email}</bdi></p>
          </div>
          <button type="button" className={secondaryButton} disabled={!!busy} onClick={() => run("signout", async () => { await accountPost("sign-out", {}); })} data-testid="account-sign-out">{t("account.signOut")}</button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr] items-start">
          <aside
            aria-label={t("account.title")}
            data-testid="account-nav-rail"
            className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-4 lg:sticky lg:top-24 space-y-1.5"
          >
            {[
              {
                key: "overview" as const,
                href: `/${locale}/account`,
                labelText: t("account.sections.overview", { defaultValue: "Account Overview" }),
                icon: User,
                active: activeSection === "all" || activeSection === "overview",
              },
              {
                key: "orders" as const,
                href: `/${locale}/account/orders`,
                labelText: t("account.sections.orders"),
                icon: Package,
                badge: orders.length,
                active: activeSection === "orders",
              },
              {
                key: "wallet" as const,
                href: `/${locale}/account/wallet`,
                labelText: t("account.sections.wallet", { defaultValue: "Store Wallet" }),
                icon: Wallet,
                active: activeSection === "wallet",
              },
              {
                key: "rewards" as const,
                href: `/${locale}/account/rewards`,
                labelText: t("account.sections.points", { defaultValue: "Loyalty Points" }),
                icon: Award,
                active: activeSection === "rewards",
              },
              {
                key: "addresses" as const,
                href: `/${locale}/account/addresses`,
                labelText: t("account.sections.addresses"),
                icon: MapPin,
                badge: addresses.length,
                active: activeSection === "addresses",
              },
              ...(site?.commerce?.capabilities.wishlist !== false
                ? [
                    {
                      key: "wishlist" as const,
                      href: `/${locale}/account/wishlist`,
                      labelText: t("account.sections.wishlist"),
                      icon: Heart,
                      badge: wishlist.length,
                      active: activeSection === "wishlist",
                    },
                  ]
                : []),
              {
                key: "returns" as const,
                href: `/${locale}/account/returns`,
                labelText: t("account.returnRequestsTitle", { defaultValue: "Returns & Refunds" }),
                icon: Gift,
                badge: returnRequests.length,
                active: activeSection === "returns",
              },
              {
                key: "profile" as const,
                href: `/${locale}/account/profile`,
                labelText: t("account.sections.profile"),
                icon: User,
                active: activeSection === "profile",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-m3-secondary-container text-m3-on-secondary-container font-semibold"
                      : "text-m3-on-surface-variant hover:bg-m3-surface-container hover:text-m3-on-surface"
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.labelText}</span>
                  </span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="rounded-full bg-m3-surface px-2 py-0.5 text-[11px] font-mono text-m3-on-surface border border-m3-outline-variant/60">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </aside>

          <div className="min-w-0 space-y-6">
            {/* Account Rewards & Wallet Overview KPI Strip */}
            {(activeSection === "all" || activeSection === "overview") && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="account-rewards-summary">
                  <div className={section}>
                    <p className="text-xs text-ink-muted inline-flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-m3-primary" aria-hidden="true" />
                      {t("account.walletBalance", { defaultValue: "Store Wallet Balance" })}
                    </p>
                    <p className="text-2xl font-bold text-ink mt-1" data-testid="account-wallet-balance">
                      {formatPrice(walletBalance, currency, locale)}
                    </p>
                  </div>
                  <div className={section}>
                    <p className="text-xs text-ink-muted inline-flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-m3-tertiary" aria-hidden="true" />
                      {t("account.loyaltyPoints", { defaultValue: "Loyalty Points" })}
                    </p>
                    <p className="text-2xl font-bold text-ink mt-1" data-testid="account-loyalty-points">
                      {loyaltyPoints} <span className="text-xs font-normal text-ink-muted">({formatPrice(pointsValue, currency, locale)})</span>
                    </p>
                  </div>
                  <div className={section}>
                    <p className="text-xs text-ink-muted">{t("account.membershipTier", { defaultValue: "Member Tier & Discount" })}</p>
                    <p className="text-2xl font-bold text-ink mt-1 capitalize">
                      {customer.tier || "standard"}
                      {discountPercent > 0 && (
                        <span className="ms-2 rounded-full bg-m3-primary-container text-m3-on-primary-container px-2.5 py-0.5 text-xs font-semibold">
                          -{discountPercent}%
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="account-overview-cards">
                  {[
                    {
                      href: `/${locale}/account/orders`,
                      title: t("account.sections.orders"),
                      meta: `${orders.length}`,
                      icon: Package,
                    },
                    {
                      href: `/${locale}/account/wallet`,
                      title: t("account.sections.wallet", { defaultValue: "Store Wallet" }),
                      meta: formatPrice(walletBalance, currency, locale),
                      icon: Wallet,
                    },
                    {
                      href: `/${locale}/account/rewards`,
                      title: t("account.sections.points", { defaultValue: "Loyalty Points" }),
                      meta: `${loyaltyPoints} pts`,
                      icon: Award,
                    },
                    {
                      href: `/${locale}/account/returns`,
                      title: t("account.returnRequestsTitle", { defaultValue: "Returns & Refunds" }),
                      meta: `${returnRequests.length}`,
                      icon: Gift,
                    },
                  ].map((cardItem) => {
                    const CardIcon = cardItem.icon;
                    return (
                      <Link
                        key={cardItem.href}
                        href={cardItem.href}
                        className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-5 flex flex-col justify-between gap-2 hover:border-m3-primary hover:bg-m3-surface-container transition-colors min-h-[104px]"
                      >
                        <div className="flex items-center justify-between text-m3-primary">
                          <CardIcon className="w-4 h-4" aria-hidden="true" />
                          <span className="text-xs font-mono font-bold text-m3-on-surface" dir="ltr">{cardItem.meta}</span>
                        </div>
                        <span className="text-xs font-semibold text-m3-on-surface">{cardItem.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            {(activeSection === "all" || activeSection === "profile") && (
              <form
                className={section}
                aria-labelledby="account-profile"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run("profile", async () => {
                    await accountPost("profile", profile);
                    setProfile((p) => ({ ...p, password: "" }));
                  }, t("account.saved"));
                }}
              >
                <h2 id="account-profile" className={heading}><User className="w-5 h-5" aria-hidden="true" />{t("account.sections.profile")}</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  <label className="block space-y-2"><span className={label}>{t("account.name")}</span><input name="profileName" maxLength={120} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={field} /></label>
                  <label className="block space-y-2">
                    <span className={label}>{t("account.phone")}</span>
                    <PhoneInput
                      name="profilePhone"
                      value={profile.phone}
                      onChange={(phone) => setProfile({ ...profile, phone })}
                    />
                  </label>
                  <label className="block space-y-2"><span className={label}>{t("account.language")}</span>
                    <Select value={profile.preferredLocale} onChange={(e) => setProfile({ ...profile, preferredLocale: e.target.value })} className={field}>
                      <option value="ar">{t("account.languages.ar")}</option>
                      <option value="en">{t("account.languages.en")}</option>
                    </Select>
                  </label>
                  <label className="block space-y-2"><span className={label}>{t("account.newPassword")}</span><input name="profilePassword" type="password" autoComplete="new-password" maxLength={200} value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} className={field} /></label>
                  <label className="flex items-center gap-3 text-sm text-m3-on-surface-variant sm:col-span-2"><input type="checkbox" checked={profile.marketingOptIn} onChange={(e) => setProfile({ ...profile, marketingOptIn: e.target.checked })} className="h-4 w-4 accent-m3-primary" />{t("account.marketing")}</label>
                </div>
                {note("profile")}
                <button type="submit" className={primaryButton} disabled={!!busy} data-testid="account-profile-save">{t("account.save")}</button>
              </form>
            )}

            {(activeSection === "all" || activeSection === "addresses") && (
              <section className={section} aria-labelledby="account-addresses" id="account-addresses-card">
                <h2 id="account-addresses" className={heading}><MapPin className="w-5 h-5" aria-hidden="true" />{t("account.sections.addresses")}</h2>
                {addresses.length === 0 && !address && <p className="text-sm text-ink-muted">{t("account.noAddresses")}</p>}
                <ul className="grid sm:grid-cols-2 gap-3">
                  {addresses.map((a) => (
                    <li key={a.id} className="rounded-2xl border border-m3-outline-variant p-4 text-sm space-y-1">
                      <p className="font-semibold text-m3-on-surface">{a.label || a.name}{a.is_default && <span className="ms-2 rounded-full bg-m3-secondary-container text-m3-on-secondary-container px-2 py-0.5 text-[11px]">{t("account.address.default")}</span>}</p>
                      <p className="text-ink-muted"><span>{a.name}</span>{a.phone ? <> · <bdi dir="ltr">{a.phone}</bdi></> : null}</p>
                      <p className="text-ink-muted">{[a.line1, a.line2, a.area, a.city, a.country, a.postal_code].filter(Boolean).join(", ")}</p>
                      <div className="flex gap-3 pt-1">
                        <button type="button" className="min-h-10 text-xs font-semibold text-m3-primary hover:underline cursor-pointer" onClick={() => setAddress({ id: a.id, label: a.label, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, area: a.area, city: a.city, country: a.country, postalCode: a.postal_code, isDefault: a.is_default })}>{t("account.editAddress")}</button>
                        <button type="button" className="min-h-10 text-xs font-semibold text-m3-error hover:underline cursor-pointer" data-testid={`remove-address-${a.id}`} onClick={() => setPendingDeleteAddress(a)}>{t("account.removeAddress")}</button>
                      </div>
                    </li>
                  ))}
                </ul>
                {address ? (
                  <form
                    className="grid sm:grid-cols-2 gap-4"
                    data-testid="account-address-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run("address", async () => {
                        await accountPost("address", { ...address, id: address.id || undefined });
                        setAddress(null);
                      }, t("account.saved"));
                    }}
                  >
                    {(["label", "name", "phone", "line1", "line2", "area", "city", "country", "postalCode"] as const).map((key) => (
                      <label key={key} className="block space-y-2">
                        <span className={label}>{t(`account.address.${key}`)}</span>
                        {key === "phone" ? (
                          <PhoneInput
                            name="address-phone"
                            value={address.phone}
                            onChange={(phone) => setAddress({ ...address, phone })}
                          />
                        ) : (
                          <input name={`address-${key}`} maxLength={200} dir={key === "postalCode" ? "ltr" : undefined} value={address[key]} onChange={(e) => setAddress({ ...address, [key]: e.target.value })} className={field} />
                        )}
                      </label>
                    ))}
                    <label className="flex items-center gap-3 text-sm text-m3-on-surface-variant"><input type="checkbox" checked={address.isDefault} onChange={(e) => setAddress({ ...address, isDefault: e.target.checked })} className="h-4 w-4 accent-m3-primary" />{t("account.address.isDefault")}</label>
                    <div className="sm:col-span-2 flex gap-2">
                      <button type="submit" className={primaryButton} disabled={!!busy} data-testid="account-address-save">{t("account.save")}</button>
                      <button type="button" className={secondaryButton} onClick={() => setAddress(null)}>{t("common.cancel")}</button>
                    </div>
                  </form>
                ) : (
                  <button type="button" className={secondaryButton} onClick={() => setAddress({ ...blankAddress, name: customer.name, phone: customer.phone })}>{t("account.addAddress")}</button>
                )}
                {note("address")}
              </section>
            )}

            {(activeSection === "all" || activeSection === "wallet") && (
              <section className={section} aria-labelledby="account-wallet" id="account-wallet">
                <h2 id="account-wallet" className={heading}><Wallet className="w-5 h-5" aria-hidden="true" />{t("account.sections.wallet", { defaultValue: "Store Wallet & Gift Cards" })}</h2>
                <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface p-4 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-ink-muted">{t("account.walletBalance", { defaultValue: "Store Wallet Balance" })}</span>
                  <span className="text-xl font-bold text-ink">{formatPrice(walletBalance, currency, locale)}</span>
                </div>
                <p className="text-sm text-ink-muted">
                  {t("account.walletHelp", { defaultValue: "Use your wallet balance toward any order or redeem a gift voucher code directly into your wallet." })}
                </p>
                <form
                  data-testid="redeem-gift-card-form"
                  className="flex flex-wrap items-center gap-2 max-w-md"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!giftCardCode.trim()) return;
                    void run(
                      "wallet",
                      async () => {
                        await accountPost("redeem-gift-card", { code: giftCardCode.trim() });
                        setGiftCardCode("");
                      },
                      t("account.giftCardRedeemed", { defaultValue: "Gift card credited to your wallet." }),
                    );
                  }}
                >
                  <input
                    aria-label={t("account.giftCardCode", { defaultValue: "Gift card code" })}
                    placeholder={t("account.giftCardCode", { defaultValue: "GIFT-XXXX-XXXX" })}
                    value={giftCardCode}
                    onChange={(e) => setGiftCardCode(e.target.value)}
                    dir="ltr"
                    className={`${field} flex-1 min-w-[12rem]`}
                  />
                  <button type="submit" disabled={!!busy || !giftCardCode.trim()} className={primaryButton}>
                    <Gift className="w-4 h-4 me-1.5" aria-hidden="true" />
                    {t("account.redeemGiftCard", { defaultValue: "Redeem Code" })}
                  </button>
                </form>
                {note("wallet")}
                {walletTransactions.length > 0 && (
                  <ul className="divide-y divide-m3-outline-variant text-xs pt-2" data-testid="wallet-ledger">
                    {walletTransactions.slice(0, 15).map((tx) => (
                      <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div>
                          <p className="font-medium text-ink">{tx.note || tx.kind}</p>
                          <p className="text-ink-muted">{new Date(tx.created_at).toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-GB")}</p>
                        </div>
                        <span className={`font-semibold ${tx.amount >= 0 ? "text-m3-primary" : "text-m3-error"}`}>
                          {tx.amount >= 0 ? "+" : ""}{formatPrice(tx.amount, currency, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {(activeSection === "all" || activeSection === "rewards") && (
              <section className={section} aria-labelledby="account-points" id="account-points">
                <h2 id="account-points" className={heading}><Award className="w-5 h-5" aria-hidden="true" />{t("account.sections.points", { defaultValue: "Loyalty Points & Rewards" })}</h2>
                <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface p-4 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-ink-muted">{t("account.loyaltyPoints", { defaultValue: "Loyalty Points" })}</span>
                  <span className="text-xl font-bold text-ink">{loyaltyPoints} ({formatPrice(pointsValue, currency, locale)})</span>
                </div>
                <p className="text-sm text-ink-muted">
                  {t("account.pointsRateNote", {
                    rate: pointsRedemptionRate,
                    min: minRedeemPoints,
                    defaultValue: `${pointsRedemptionRate} points = 1.000 ${currency} (minimum ${minRedeemPoints} points to convert).`,
                  })}
                </p>
                <form
                  data-testid="convert-points-form"
                  className="flex flex-wrap items-center gap-2 max-w-md"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(
                      "points",
                      () => accountPost("convert-points", { points: Number(pointsToConvert) }),
                      t("account.pointsConverted", { defaultValue: "Loyalty points converted into wallet balance." }),
                    );
                  }}
                >
                  <input
                    type="number"
                    min={minRedeemPoints}
                    step={pointsRedemptionRate}
                    max={Math.max(minRedeemPoints, loyaltyPoints)}
                    aria-label={t("account.pointsToConvert", { defaultValue: "Points to convert" })}
                    value={pointsToConvert}
                    onChange={(e) => setPointsToConvert(e.target.value)}
                    className={`${field} w-36`}
                  />
                  <button
                    type="submit"
                    disabled={!!busy || loyaltyPoints < minRedeemPoints}
                    className={primaryButton}
                    data-testid="convert-points-submit"
                  >
                    {t("account.convertPointsToWallet", { defaultValue: "Convert to Wallet Credit" })}
                  </button>
                </form>
                {note("points")}
                {pointsTransactions.length > 0 && (
                  <ul className="divide-y divide-m3-outline-variant text-xs pt-2" data-testid="points-ledger">
                    {pointsTransactions.slice(0, 15).map((tx) => (
                      <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div>
                          <p className="font-medium text-ink">{tx.note || tx.kind}</p>
                          <p className="text-ink-muted">{new Date(tx.created_at).toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-GB")}</p>
                        </div>
                        <span className={`font-semibold ${tx.points >= 0 ? "text-m3-tertiary" : "text-m3-error"}`}>
                          {tx.points >= 0 ? "+" : ""}{tx.points} pts
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {(activeSection === "all" || activeSection === "orders") && (
              <section className={section} aria-labelledby="account-orders" id="account-orders-card">
                <h2 id="account-orders" className={heading}><Package className="w-5 h-5" aria-hidden="true" />{t("account.sections.orders")}</h2>
                {orders.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t("account.noOrders")}</p>
                ) : (
                  <ul className="divide-y divide-m3-outline-variant" data-testid="account-orders">
                    {orders.map((o) => (
                      <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm" data-testid={`account-order-${o.number}`}>
                        <Link href={`/${locale}/account/orders/${o.id}`} className="font-mono text-xs font-semibold text-m3-primary underline min-h-11 inline-flex items-center" dir="ltr">{o.number}</Link>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusTone(o.status)}`}>{o.fulfilment === "pickup" && ["shipped", "delivered"].includes(o.status) ? t(`store.pickupStatuses.${o.status}`) : t(`store.statuses.${o.status}`)}</span>
                        <span className="text-ink-muted">{new Date(o.placed_at).toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-GB")}</span>
                        <span className="text-ink-muted">{t("store.orderItems", { count: o.lines.reduce((sum, l) => sum + l.quantity, 0) })}</span>
                        {o.tracking_token && <Link href={`/${locale}/track/${o.tracking_token}`} className="text-xs font-semibold text-m3-primary hover:underline">{t("store.track")}</Link>}
                        <span className="ms-auto font-semibold text-m3-on-surface">{formatPrice(o.total, o.currency, locale)}</span>
                        {o.pickup_branch && <p className="basis-full text-ink-muted text-sm">{locale === "ar" ? o.pickup_branch.nameAr : o.pickup_branch.nameEn} · {locale === "ar" ? o.pickup_branch.addressAr : o.pickup_branch.addressEn}</p>}
                        <OrderHelp orderId={o.id} locale={locale} />
                        <OrderReturnForm orderId={o.id} maxAmount={o.total} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {(activeSection === "all" || activeSection === "returns") && (
              <section className={section} aria-labelledby="account-returns" id="account-returns" data-testid="account-returns-section">
                <h2 id="account-returns" className={heading}><Gift className="w-5 h-5" aria-hidden="true" />{t("account.returnRequestsTitle", { defaultValue: "Return & Refund Requests" })}</h2>
                {returnRequests.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t("account.noOrders")}</p>
                ) : (
                  <ul className="space-y-2 text-xs" data-testid="account-return-requests">
                    {returnRequests.map((req) => (
                      <li key={req.id} className="flex items-center justify-between gap-3 rounded-2xl border border-m3-outline-variant bg-m3-surface p-3.5">
                        <div>
                          <p className="font-medium text-ink">{req.reason}</p>
                          <p className="text-ink-muted">{req.refund_destination} · {formatPrice(req.amount_requested, currency, locale)}</p>
                        </div>
                        <span className="rounded-full bg-m3-secondary-container text-m3-on-secondary-container px-3 py-1 font-semibold capitalize">
                          {req.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {activeSection === "returns" && orders.length > 0 && (
                  <ul className="divide-y divide-m3-outline-variant pt-3">
                    {orders.slice(0, 5).map((o) => (
                      <li key={o.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3">
                          <Link href={`/${locale}/account/orders/${o.id}`} className="font-mono text-xs font-semibold text-m3-primary underline" dir="ltr">{o.number}</Link>
                          <span className="text-xs text-ink-muted">{formatPrice(o.total, o.currency, locale)}</span>
                        </div>
                        <OrderReturnForm orderId={o.id} maxAmount={o.total} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {(activeSection === "all" || activeSection === "wishlist") && site?.commerce?.capabilities.wishlist !== false && (
              <section className={section} aria-labelledby="account-wishlist" id="account-wishlist-card">
                <h2 id="account-wishlist" className={heading}><Heart className="w-5 h-5" aria-hidden="true" />{t("account.sections.wishlist")}</h2>
                {wishlist.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t("account.noWishlist")}</p>
                ) : (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {wishlist.map((item) => (
                      <li key={item.id} className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low overflow-hidden flex flex-col justify-between">
                        <Link href={`${catalogue}/${item.slug}`} className="block">
                          <span className="block aspect-square bg-m3-surface-container"><ContentImage src={item.thumbnail_url} alt="" width={240} height={240} className="h-full w-full object-cover" /></span>
                          <span className="block p-3 text-sm font-semibold text-m3-on-surface">{locale === "ar" ? item.title_ar : item.title_en}</span>
                        </Link>
                        <div className="px-3 pb-3 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => addToCart({ productId: item.id, quantity: 1 })}
                            className="inline-flex min-h-9 items-center gap-1 rounded-full bg-m3-primary px-3 py-1 text-xs font-semibold text-m3-on-primary"
                          >
                            <ShoppingBag className="w-3 h-3" aria-hidden="true" />
                            {t("store.add")}
                          </button>
                          <button type="button" className="text-xs text-m3-error hover:underline" onClick={() => run("wishlist", () => accountPost("wishlist", { itemId: item.id }))}>{t("account.removeFromWishlist")}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {note("wishlist")}
              </section>
            )}

            {(activeSection === "all" || activeSection === "profile") && (
              <section className={`${section} border-m3-error/35`} aria-labelledby="account-delete">
                <h2 id="account-delete" className={heading}><Trash2 className="w-5 h-5 text-m3-error" aria-hidden="true" />{t("account.deleteTitle")}</h2>
                <p className="text-sm text-m3-on-surface-variant">{t("account.deleteText")}</p>
                <label className="block space-y-2 max-w-sm"><span className={label}>{t("account.deleteConfirm")}</span><input name="confirmEmail" type="email" dir="ltr" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className={field} /></label>
                {note("delete")}
                <button type="button" className={`${secondaryButton} border-m3-error/50 text-m3-error hover:bg-m3-error-container/40`} disabled={!!busy || !confirmEmail} onClick={() => run("delete", () => accountPost("delete", { confirmEmail }))} data-testid="account-delete">{t("account.delete")}</button>
              </section>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingDeleteAddress !== null}
        onClose={() => setPendingDeleteAddress(null)}
        onConfirm={async () => {
          if (!pendingDeleteAddress) return;
          const targetId = pendingDeleteAddress.id;
          await run(
            "address",
            () => accountPost("address-delete", { id: targetId }),
            t("account.saved"),
          );
          setPendingDeleteAddress(null);
        }}
        title={t("account.removeAddress")}
        description={
          pendingDeleteAddress
            ? `${pendingDeleteAddress.label || pendingDeleteAddress.name} — ${[
                pendingDeleteAddress.line1,
                pendingDeleteAddress.area,
                pendingDeleteAddress.city,
              ]
                .filter(Boolean)
                .join(", ")}`
            : ""
        }
        confirmLabel={t("account.removeAddress")}
        cancelLabel={t("common.cancel")}
        variant="danger"
      />
    </div>
  );
}

export function OrderHelp({ orderId, locale }: { orderId: string; locale: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<"question" | "problem">("question");
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState("");
  const [error, setError] = React.useState("");
  if (sent) return <p role="status" className="basis-full text-xs text-m3-primary">{t("account.help.sent", { reference: sent })}</p>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="basis-full text-start text-xs font-semibold text-m3-primary hover:underline cursor-pointer" data-testid="order-help-open">{t("account.help.open")}</button>;
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
    <div className="basis-full space-y-2 rounded-xl border border-m3-outline-variant bg-m3-surface-container-low p-3" data-testid="order-help">
      <div className="flex gap-2">
        {(["question", "problem"] as const).map((k) => (
          <label key={k} className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-xs cursor-pointer ${kind === k ? "border-m3-primary bg-m3-secondary-container text-m3-on-secondary-container font-semibold" : "border-m3-outline-variant text-m3-on-surface-variant"}`}>
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

export function OrderReturnForm({ orderId, maxAmount }: { orderId: string; maxAmount: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [destination, setDestination] = React.useState<"wallet" | "original_payment" | "replacement">("wallet");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState("");

  if (sent) {
    return (
      <p role="status" className="basis-full text-xs text-m3-primary">
        {t("account.returnSubmitted", { defaultValue: "Return request submitted for admin review." })}
      </p>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={`order-return-open-${orderId}`}
        className="basis-full text-start text-xs font-semibold text-ink-muted hover:text-m3-primary inline-flex items-center gap-1"
      >
        <RotateCcw className="w-3 h-3" aria-hidden="true" />
        {t("account.requestReturn", { defaultValue: "Request Return / Refund" })}
      </button>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await accountPost("return-request", {
        orderId,
        reason,
        refundDestination: destination,
        amountRequested: maxAmount,
      });
      setSent(true);
    } catch (err) {
      const key = err instanceof Error ? err.message : "generic";
      setError(t(`account.errors.${key}`) === `account.errors.${key}` ? t("account.errors.generic") : t(`account.errors.${key}`));
      setBusy(false);
    }
  };

  return (
    <div className="basis-full space-y-2 rounded-xl border border-m3-outline-variant p-3" data-testid={`order-return-form-${orderId}`}>
      <div className="flex flex-wrap gap-2">
        {(["wallet", "original_payment", "replacement"] as const).map((opt) => (
          <label
            key={opt}
            className={`rounded-full border px-3 py-1 text-xs cursor-pointer ${
              destination === opt ? "border-m3-primary text-m3-primary font-semibold" : "border-m3-outline-variant text-ink-muted"
            }`}
          >
            <input
              type="radio"
              name={`return-dest-${orderId}`}
              value={opt}
              checked={destination === opt}
              onChange={() => setDestination(opt)}
              className="sr-only"
            />
            {opt === "wallet"
              ? t("account.refundToWallet", { defaultValue: "Store Wallet" })
              : opt === "original_payment"
                ? t("account.refundToOriginal", { defaultValue: "Original Payment" })
                : t("account.refundReplacement", { defaultValue: "Replacement" })}
          </label>
        ))}
      </div>
      <textarea
        aria-label={t("account.returnReason", { defaultValue: "Return reason" })}
        placeholder={t("account.returnReasonPlaceholder", { defaultValue: "Describe why you want to return this order..." })}
        rows={2}
        maxLength={1000}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className={field}
      />
      {error && <p role="alert" className="text-xs text-m3-error">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || reason.trim().length < 5}
          onClick={() => void submit()}
          data-testid={`order-return-submit-${orderId}`}
          className={primaryButton}
        >
          {t("account.submitReturn", { defaultValue: "Submit Request" })}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
