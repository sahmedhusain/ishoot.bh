"use client";

import * as React from "react";
import Link from "next/link";
import { Award, ExternalLink, FolderKanban, Gift, Globe, Loader2, Plus, RotateCcw, Ticket, Trash2, Users } from "lucide-react";
import { Button, Card, Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { ContentLanguage } from "@platform/database/constants/languages";
import type { CustomStoreCategorySpec } from "@platform/database/constants/store";
import type {
  AdminOrderReturnRequestRow,
  CouponInput,
  GiftCardInput,
  GiftCardRow,
  StoreCustomerRow,
  StoreSettingsRecord,
} from "@platform/database";
import {
  adjustCustomerPointsAction,
  adjustCustomerWalletAction,
  deleteCouponAction,
  deleteGiftCardAction,
  deleteStoreCustomCategoryAction,
  resolveOrderReturnRequestAction,
  saveCouponAction,
  saveCustomerAccountDiscountAction,
  saveGiftCardAction,
  saveStoreCustomCategoryAction,
  saveStoreSettingsAction,
} from "../../app/actions/orders";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field, LanguageFields } from "../setup/LanguageFields";
import { PageHeader } from "../layout/PageHeader";

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

export function StoreSettingsView({
  settings,
  coupons,
  gateways,
  currency,
  languages,
  canEdit,
  canCoupons,
  giftCards = [],
  storeCustomers = [],
  returnRequests = [],
  customCategories = [],
}: {
  settings: StoreSettingsRecord;
  coupons: CouponRow[];
  gateways: { id: string; test_mode: boolean }[];
  currency: string;
  languages: readonly ContentLanguage[];
  canEdit: boolean;
  canCoupons: boolean;
  giftCards?: GiftCardRow[];
  storeCustomers?: StoreCustomerRow[];
  returnRequests?: AdminOrderReturnRequestRow[];
  customCategories?: CustomStoreCategorySpec[];
}) {
  const { t } = useAdminLocale();
  const copy = t.orders.settings;
  const rewardsCopy = t.orders.rewards;
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
    loyaltyEnabled: settings.loyalty_enabled ?? true,
    pointsPerUnit: String(settings.points_per_unit ?? 10),
    pointsRedemptionRate: String(settings.points_redemption_rate ?? 500),
    minRedeemPoints: String(settings.min_redeem_points ?? 1000),
    walletEnabled: settings.wallet_enabled ?? true,
    minPartialWallet: String(settings.min_partial_wallet ?? 1),
    raffleEnabled: settings.raffle_enabled ?? true,
    raffleSpendUnit: String(settings.raffle_spend_unit ?? 10),
    rafflePrizeEn: settings.raffle_prize_en ?? "",
    rafflePrizeAr: settings.raffle_prize_ar ?? "",
    cookieBannerEnabled: settings.cookie_banner_enabled ?? true,
    sslBadgeEnabled: settings.ssl_badge_enabled ?? true,
    announcementEn: settings.announcement_en ?? "",
    announcementAr: settings.announcement_ar ?? "",
    crNumber: settings.cr_number ?? "",
    vatNumber: settings.vat_number ?? "",
    returnWindowDays: String(settings.return_window_days ?? 14),
    showCategoryBar: settings.show_category_bar ?? true,
    showDealsSection: settings.show_deals_section ?? true,
    showGiftCardsSection: settings.show_gift_cards_section ?? true,
  });
  const [categoriesList, setCategoriesList] = React.useState<CustomStoreCategorySpec[]>(customCategories);
  const [newCategory, setNewCategory] = React.useState({
    id: "",
    slug: "",
    nameEn: "",
    nameAr: "",
    displayOrder: String(customCategories.length + 1),
    featured: true,
    isActive: true,
  });
  const [coupon, setCoupon] = React.useState<CouponInput | null>(null);
  const [giftCard, setGiftCard] = React.useState<GiftCardInput | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState(storeCustomers[0]?.id ?? "");
  const [walletDelta, setWalletDelta] = React.useState("10");
  const [walletNote, setWalletNote] = React.useState("");
  const [pointsDelta, setPointsDelta] = React.useState("500");
  const [pointsNote, setPointsNote] = React.useState("");
  const selectedCustomer = storeCustomers.find((c) => c.id === selectedCustomerId) ?? null;
  const [discountPct, setDiscountPct] = React.useState(String(selectedCustomer?.discount_percent ?? 0));
  const [customerTier, setCustomerTier] = React.useState(selectedCustomer?.tier ?? "standard");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    if (selectedCustomer) {
      setDiscountPct(String(selectedCustomer.discount_percent ?? 0));
      setCustomerTier(selectedCustomer.tier ?? "standard");
    }
  }, [selectedCustomerId, selectedCustomer?.discount_percent, selectedCustomer?.tier]);

  const run = async (task: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "ok", text: done });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };
  const toggle = (
    key:
      | "guestCheckout"
      | "deliveryEnabled"
      | "pickupEnabled"
      | "codEnabled"
      | "bankTransferEnabled",
  ) => (
    <label className="flex items-center gap-2.5 text-sm text-ink">
      <input
        type="checkbox"
        className="h-4 w-4 accent-accent"
        checked={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
      />
      {copy[key]}
    </label>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader />
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`text-sm rounded-xl px-4 py-3 ${
            message.tone === "ok"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {message.text}
        </p>
      )}
      <Card className="p-5 space-y-5">
        <fieldset disabled={!canEdit} className="grid sm:grid-cols-2 gap-4">
          {toggle("guestCheckout")}
          {toggle("pickupEnabled")}
          {toggle("deliveryEnabled")}
          <span />
          <Field label={formatMessage(copy.deliveryFee, { currency })}>
            {(id) => (
              <Input
                id={id}
                name="deliveryFee"
                type="number"
                min={0}
                step="any"
                value={form.deliveryFee}
                onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })}
                className="rounded-lg"
              />
            )}
          </Field>
          <Field label={formatMessage(copy.freeDeliveryOver, { currency })}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="any"
                value={form.freeDeliveryOver}
                onChange={(e) => setForm({ ...form, freeDeliveryOver: e.target.value })}
                className="rounded-lg"
              />
            )}
          </Field>
          {toggle("codEnabled")}
          {toggle("bankTransferEnabled")}
          {form.bankTransferEnabled && (
            <LanguageFields
              label={copy.bankInstructions}
              languages={languages}
              multiline
              wide
              maxLength={2000}
              en={form.bankInstructionsEn}
              ar={form.bankInstructionsAr}
              onChange={({ en, ar }) =>
                setForm({ ...form, bankInstructionsEn: en, bankInstructionsAr: ar })
              }
            />
          )}
          <Field label={copy.paymentGateway} hint={copy.gatewayHint}>
            {(id) => (
              <Select
                id={id}
                name="paymentGateway"
                value={form.paymentGateway}
                onChange={(e) => setForm({ ...form, paymentGateway: e.target.value })}
                className="rounded-lg"
              >
                <option value="">{copy.noGateway}</option>
                {gateways.map((g) => (
                  <option key={g.id} value={g.id}>{`${
                    (t.integrations.providers as Record<string, { name: string }>)[g.id]?.name ??
                    g.id
                  }${g.test_mode ? ` (${copy.gatewayTest})` : ""}`}</option>
                ))}
                {form.paymentGateway && !gateways.some((g) => g.id === form.paymentGateway) && (
                  <option value={form.paymentGateway}>
                    {(t.integrations.providers as Record<string, { name: string }>)[
                      form.paymentGateway
                    ]?.name ?? form.paymentGateway}
                  </option>
                )}
              </Select>
            )}
          </Field>
          <Field label={copy.orderNotifyEmail}>
            {(id) => (
              <Input
                id={id}
                type="email"
                dir="ltr"
                value={form.orderNotifyEmail}
                onChange={(e) => setForm({ ...form, orderNotifyEmail: e.target.value })}
                className="rounded-lg"
              />
            )}
          </Field>
        </fieldset>

        {/* Loyalty, Wallet, Raffle & Privacy/SSL Controls */}
        <fieldset disabled={!canEdit} className="border-t border-outline-variant pt-4 space-y-4">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <Award className="w-4 h-4 text-accent" aria-hidden="true" />
            {rewardsCopy.rewardsSettingsHeading}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-accent"
                checked={form.loyaltyEnabled}
                onChange={(e) => setForm({ ...form, loyaltyEnabled: e.target.checked })}
              />
              {rewardsCopy.loyaltyEnabled}
            </label>
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-accent"
                checked={form.walletEnabled}
                onChange={(e) => setForm({ ...form, walletEnabled: e.target.checked })}
              />
              {rewardsCopy.walletEnabled}
            </label>
            <Field label={rewardsCopy.pointsPerUnit}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  step="any"
                  value={form.pointsPerUnit}
                  onChange={(e) => setForm({ ...form, pointsPerUnit: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={rewardsCopy.pointsRedemptionRate}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  value={form.pointsRedemptionRate}
                  onChange={(e) => setForm({ ...form, pointsRedemptionRate: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={rewardsCopy.minRedeemPoints}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={form.minRedeemPoints}
                  onChange={(e) => setForm({ ...form, minRedeemPoints: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={rewardsCopy.minPartialWallet}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  step="any"
                  value={form.minPartialWallet}
                  onChange={(e) => setForm({ ...form, minPartialWallet: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-accent"
                checked={form.raffleEnabled}
                onChange={(e) => setForm({ ...form, raffleEnabled: e.target.checked })}
              />
              {rewardsCopy.raffleEnabled}
            </label>
            <Field label={rewardsCopy.raffleSpendUnit}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  step="any"
                  value={form.raffleSpendUnit}
                  onChange={(e) => setForm({ ...form, raffleSpendUnit: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={rewardsCopy.rafflePrizeEn}>
              {(id) => (
                <Input
                  id={id}
                  value={form.rafflePrizeEn}
                  onChange={(e) => setForm({ ...form, rafflePrizeEn: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={rewardsCopy.rafflePrizeAr}>
              {(id) => (
                <Input
                  id={id}
                  dir="rtl"
                  value={form.rafflePrizeAr}
                  onChange={(e) => setForm({ ...form, rafflePrizeAr: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-accent"
                checked={form.cookieBannerEnabled}
                onChange={(e) => setForm({ ...form, cookieBannerEnabled: e.target.checked })}
              />
              {rewardsCopy.cookieBannerEnabled}
            </label>
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-accent"
                checked={form.sslBadgeEnabled}
                onChange={(e) => setForm({ ...form, sslBadgeEnabled: e.target.checked })}
              />
              {rewardsCopy.sslBadgeEnabled}
            </label>
          </div>
        </fieldset>

        {/* Website & Storefront Experience Settings */}
        <fieldset disabled={!canEdit} className="border-t border-outline-variant pt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" aria-hidden="true" />
              {rewardsCopy.websiteSettingsHeading}
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href={ROUTES.cms.website} className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-1 hover:border-accent">
                {rewardsCopy.cmsWebsiteLink}
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Link href={ROUTES.cms.banners} className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-1 hover:border-accent">
                {rewardsCopy.cmsBannersLink}
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Link href={ROUTES.products.categories} className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-1 hover:border-accent">
                {rewardsCopy.productCategoriesLink}
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Link href={ROUTES.products.list} className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-1 hover:border-accent">
                {rewardsCopy.productsLink}
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Link href={ROUTES.inventory.stock} className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-1 hover:border-accent">
                {rewardsCopy.inventoryLink}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={rewardsCopy.announcementEn}>
              {(id) => (
                <Input
                  id={id}
                  value={form.announcementEn}
                  onChange={(e) => setForm({ ...form, announcementEn: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={rewardsCopy.announcementAr}>
              {(id) => (
                <Input
                  id={id}
                  dir="rtl"
                  value={form.announcementAr}
                  onChange={(e) => setForm({ ...form, announcementAr: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={rewardsCopy.crNumber}>
              {(id) => (
                <Input
                  id={id}
                  dir="ltr"
                  value={form.crNumber}
                  onChange={(e) => setForm({ ...form, crNumber: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={rewardsCopy.vatNumber}>
              {(id) => (
                <Input
                  id={id}
                  dir="ltr"
                  value={form.vatNumber}
                  onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={rewardsCopy.returnWindowDays}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  max={365}
                  value={form.returnWindowDays}
                  onChange={(e) => setForm({ ...form, returnWindowDays: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent"
                  checked={form.showCategoryBar}
                  onChange={(e) => setForm({ ...form, showCategoryBar: e.target.checked })}
                />
                {rewardsCopy.showCategoryBar}
              </label>
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent"
                  checked={form.showDealsSection}
                  onChange={(e) => setForm({ ...form, showDealsSection: e.target.checked })}
                />
                {rewardsCopy.showDealsSection}
              </label>
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent"
                  checked={form.showGiftCardsSection}
                  onChange={(e) => setForm({ ...form, showGiftCardsSection: e.target.checked })}
                />
                {rewardsCopy.showGiftCardsSection}
              </label>
            </div>
          </div>
        </fieldset>

        {canEdit && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="rounded-full gap-1.5"
            disabled={busy}
            onClick={() => run(() => saveStoreSettingsAction(form), copy.saved)}
            data-testid="store-settings-save"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {copy.save}
          </Button>
        )}
      </Card>

      {/* Coupons Card */}
      <Card className="p-5 space-y-4" data-page-section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink flex items-center gap-2">
            <Ticket className="w-4 h-4 text-accent" aria-hidden="true" />
            {copy.coupons}
          </h2>
          {canCoupons && !coupon && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full gap-1.5"
              onClick={() =>
                setCoupon({
                  code: "",
                  kind: "percent",
                  value: "",
                  minOrder: "",
                  startsAt: "",
                  endsAt: "",
                  maxUses: "",
                  isActive: true,
                })
              }
            >
              <Plus className="w-3.5 h-3.5" />
              {copy.addCoupon}
            </Button>
          )}
        </div>
        {coupon && (
          <div
            className="grid sm:grid-cols-4 gap-3 rounded-xl border border-outline-variant p-3"
            data-testid="coupon-editor"
          >
            <Field label={copy.code}>
              {(id) => (
                <Input
                  id={id}
                  name="couponCode"
                  dir="ltr"
                  maxLength={30}
                  value={coupon.code}
                  onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })}
                  className="rounded-lg font-mono"
                />
              )}
            </Field>
            <Field label={copy.kind}>
              {(id) => (
                <Select
                  id={id}
                  value={coupon.kind}
                  onChange={(e) => setCoupon({ ...coupon, kind: e.target.value })}
                  className="rounded-lg"
                >
                  <option value="percent">{copy.kinds.percent}</option>
                  <option value="fixed">{copy.kinds.fixed}</option>
                </Select>
              )}
            </Field>
            <Field label={copy.value}>
              {(id) => (
                <Input
                  id={id}
                  name="couponValue"
                  type="number"
                  min={0}
                  step="any"
                  value={coupon.value}
                  onChange={(e) => setCoupon({ ...coupon, value: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={copy.minOrder}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  step="any"
                  value={coupon.minOrder}
                  onChange={(e) => setCoupon({ ...coupon, minOrder: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={copy.startsAt}>
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={coupon.startsAt}
                  onChange={(e) => setCoupon({ ...coupon, startsAt: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={copy.endsAt}>
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={coupon.endsAt}
                  onChange={(e) => setCoupon({ ...coupon, endsAt: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={copy.maxUses}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  value={coupon.maxUses}
                  onChange={(e) => setCoupon({ ...coupon, maxUses: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <label className="flex items-center gap-2.5 text-sm text-ink pt-6">
              <input
                type="checkbox"
                className="h-4 w-4 accent-accent"
                checked={coupon.isActive}
                onChange={(e) => setCoupon({ ...coupon, isActive: e.target.checked })}
              />
              {copy.active}
            </label>
            <div className="sm:col-span-4 flex gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="rounded-full"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await saveCouponAction(coupon);
                    setCoupon(null);
                  }, copy.saved)
                }
                data-testid="coupon-save"
              >
                {copy.save}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => setCoupon(null)}
              >
                {t.procurement.common.cancel}
              </Button>
            </div>
          </div>
        )}
        {coupons.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noCoupons}</p>
        ) : (
          <ul className="divide-y divide-outline-variant text-sm">
            {coupons.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <button
                  type="button"
                  disabled={!canCoupons}
                  onClick={() =>
                    setCoupon({
                      id: c.id,
                      code: c.code,
                      kind: c.kind,
                      value: String(c.value),
                      minOrder: c.min_order?.toString() ?? "",
                      startsAt: c.starts_at ?? "",
                      endsAt: c.ends_at ?? "",
                      maxUses: c.max_uses?.toString() ?? "",
                      isActive: c.is_active,
                    })
                  }
                  className="font-mono font-semibold text-ink enabled:hover:text-accent"
                  dir="ltr"
                >
                  {c.code}
                </button>
                <span>{c.kind === "percent" ? `${c.value}%` : `${c.value} ${currency}`}</span>
                <span className="text-xs text-ink-muted">
                  {formatMessage(copy.used, { count: c.used_count })}
                  {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                </span>
                {!c.is_active && <span className="text-xs text-ink-muted">—</span>}
                {canCoupons && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ms-auto rounded-full text-rose-600"
                    disabled={busy}
                    onClick={() => run(() => deleteCouponAction(c.id), copy.saved)}
                    data-testid={`coupon-delete-${c.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Gift Cards & Store Vouchers Card */}
      <Card className="p-5 space-y-4" data-page-section data-testid="gift-cards-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink flex items-center gap-2">
            <Gift className="w-4 h-4 text-accent" aria-hidden="true" />
            {rewardsCopy.giftCardsHeading}
          </h2>
          {canCoupons && !giftCard && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full gap-1.5"
              data-testid="gift-card-new"
              onClick={() =>
                setGiftCard({
                  code: "",
                  initialValue: "10",
                  currency,
                  recipientEmail: "",
                  note: "",
                  expiresAt: "",
                  isActive: true,
                })
              }
            >
              <Plus className="w-3.5 h-3.5" />
              {rewardsCopy.addGiftCard}
            </Button>
          )}
        </div>
        {giftCard && (
          <div className="grid sm:grid-cols-3 gap-3 rounded-xl border border-outline-variant p-3" data-testid="gift-card-editor">
            <Field label={copy.code}>
              {(id) => (
                <Input
                  id={id}
                  dir="ltr"
                  value={giftCard.code}
                  onChange={(e) => setGiftCard({ ...giftCard, code: e.target.value.toUpperCase() })}
                  className="rounded-lg font-mono"
                />
              )}
            </Field>
            <Field label={copy.value}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0.1}
                  step="any"
                  value={giftCard.initialValue}
                  onChange={(e) => setGiftCard({ ...giftCard, initialValue: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={rewardsCopy.recipientEmail}>
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  dir="ltr"
                  value={giftCard.recipientEmail ?? ""}
                  onChange={(e) => setGiftCard({ ...giftCard, recipientEmail: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <div className="sm:col-span-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="primary"
                className="rounded-full"
                disabled={busy}
                data-testid="gift-card-save"
                onClick={() =>
                  run(async () => {
                    await saveGiftCardAction(giftCard);
                    setGiftCard(null);
                  }, copy.saved)
                }
              >
                {copy.save}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setGiftCard(null)}>
                {t.procurement.common.cancel}
              </Button>
            </div>
          </div>
        )}
        {giftCards.length === 0 ? (
          <p className="text-sm text-ink-muted">{rewardsCopy.noGiftCards}</p>
        ) : (
          <ul className="divide-y divide-outline-variant text-sm">
            {giftCards.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="font-mono font-semibold" dir="ltr">{g.code}</span>
                <span>{g.remaining_value} / {g.initial_value} {g.currency}</span>
                {g.recipient_email && <span className="text-xs text-ink-muted">{g.recipient_email}</span>}
                {canCoupons && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ms-auto text-rose-600"
                    disabled={busy}
                    data-testid={`gift-card-delete-${g.id}`}
                    onClick={() => run(() => deleteGiftCardAction(g.id), copy.saved)}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Customer Loyalty, Wallet & Account Discounts Card */}
      <Card className="p-5 space-y-4" data-page-section data-testid="customer-rewards-panel">
        <h2 className="font-bold text-ink flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" aria-hidden="true" />
          {rewardsCopy.customerRewardsHeading}
        </h2>
        {storeCustomers.length === 0 ? (
          <p className="text-sm text-ink-muted">{rewardsCopy.noCustomers}</p>
        ) : (
          <div className="space-y-4">
            <Field label={rewardsCopy.selectCustomer}>
              {(id) => (
                <Select
                  id={id}
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="rounded-lg"
                >
                  {storeCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.email} ({c.wallet_balance.toFixed(3)} {currency} · {c.loyalty_points} pts · {c.discount_percent}%)
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {selectedCustomer && canCoupons && (
              <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-outline-variant text-sm">
                <div className="space-y-2">
                  <p className="font-semibold text-ink">{rewardsCopy.adjustWallet}</p>
                  <Input
                    type="number"
                    step="any"
                    value={walletDelta}
                    onChange={(e) => setWalletDelta(e.target.value)}
                    placeholder="10 or -5"
                    className="rounded-lg"
                    data-testid="admin-wallet-delta"
                  />
                  <Input
                    value={walletNote}
                    onChange={(e) => setWalletNote(e.target.value)}
                    placeholder={rewardsCopy.adjustmentNote}
                    className="rounded-lg"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={busy}
                    data-testid="admin-wallet-submit"
                    onClick={() =>
                      run(
                        () => adjustCustomerWalletAction(selectedCustomer.id, Number(walletDelta), walletNote),
                        copy.saved,
                      )
                    }
                  >
                    {rewardsCopy.applyWalletAdjustment}
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-ink">{rewardsCopy.adjustPoints}</p>
                  <Input
                    type="number"
                    value={pointsDelta}
                    onChange={(e) => setPointsDelta(e.target.value)}
                    placeholder="500 or -500"
                    className="rounded-lg"
                    data-testid="admin-points-delta"
                  />
                  <Input
                    value={pointsNote}
                    onChange={(e) => setPointsNote(e.target.value)}
                    placeholder={rewardsCopy.adjustmentNote}
                    className="rounded-lg"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={busy}
                    data-testid="admin-points-submit"
                    onClick={() =>
                      run(
                        () => adjustCustomerPointsAction(selectedCustomer.id, Number(pointsDelta), pointsNote),
                        copy.saved,
                      )
                    }
                  >
                    {rewardsCopy.applyPointsAdjustment}
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-ink">{rewardsCopy.accountDiscountTier}</p>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    placeholder="Discount %"
                    className="rounded-lg"
                    data-testid="admin-account-discount"
                  />
                  <Select
                    value={customerTier}
                    onChange={(e) => setCustomerTier(e.target.value)}
                    className="rounded-lg"
                  >
                    <option value="standard">standard</option>
                    <option value="silver">silver</option>
                    <option value="gold">gold</option>
                    <option value="vip">vip</option>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={busy}
                    data-testid="admin-tier-submit"
                    onClick={() =>
                      run(
                        () => saveCustomerAccountDiscountAction(selectedCustomer.id, Number(discountPct), customerTier),
                        copy.saved,
                      )
                    }
                  >
                    {copy.save}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Customer Return & Refund Requests Queue */}
      <Card className="p-5 space-y-4" data-page-section data-testid="return-requests-panel">
        <h2 className="font-bold text-ink flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-accent" aria-hidden="true" />
          {rewardsCopy.returnRequestsHeading}
        </h2>
        {returnRequests.length === 0 ? (
          <p className="text-sm text-ink-muted">{rewardsCopy.noReturnRequests}</p>
        ) : (
          <ul className="divide-y divide-outline-variant text-sm">
            {returnRequests.map((req) => (
              <li key={req.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink">
                    {req.order_number} · {req.amount_requested} {req.currency} ({req.refund_destination})
                  </p>
                  <p className="text-xs text-ink-muted">{req.reason}</p>
                </div>
                {req.status === "pending" && canCoupons ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      className="rounded-full"
                      disabled={busy}
                      data-testid={`return-approve-wallet-${req.id}`}
                      onClick={() =>
                        run(
                          () => resolveOrderReturnRequestAction(req.id, "approve_wallet", "Refunded to wallet"),
                          copy.saved,
                        )
                      }
                    >
                      {rewardsCopy.approveToWallet}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={busy}
                      data-testid={`return-approve-original-${req.id}`}
                      onClick={() =>
                        run(
                          () => resolveOrderReturnRequestAction(req.id, "approve_original", "Refunded to original payment"),
                          copy.saved,
                        )
                      }
                    >
                      {rewardsCopy.approveOriginal}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-rose-600"
                      disabled={busy}
                      data-testid={`return-reject-${req.id}`}
                      onClick={() =>
                        run(
                          () => resolveOrderReturnRequestAction(req.id, "reject", "Rejected by admin"),
                          copy.saved,
                        )
                      }
                    >
                      {rewardsCopy.rejectRequest}
                    </Button>
                  </div>
                ) : (
                  <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-semibold capitalize">
                    {req.status}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Custom Storefront Categories Manager */}
      <Card className="p-5 space-y-4" data-testid="admin-custom-categories-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-accent" aria-hidden="true" />
            {rewardsCopy.customCategoriesTitle}
          </h2>
          <span className="text-xs text-ink-muted">{categoriesList.length}</span>
        </div>

        <ul className="divide-y divide-outline-variant text-xs">
          {categoriesList.map((cat) => (
            <li key={cat.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="space-y-0.5">
                <span className="font-semibold text-ink">{cat.name_en}</span>
                {cat.name_ar && <span className="ms-2 text-ink-muted">({cat.name_ar})</span>}
                <span className="ms-2 font-mono text-[11px] text-ink-muted" dir="ltr">/category/{cat.slug}</span>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full text-xs"
                    disabled={busy}
                    onClick={() =>
                      setNewCategory({
                        id: cat.id,
                        slug: cat.slug,
                        nameEn: cat.name_en,
                        nameAr: cat.name_ar,
                        displayOrder: String(cat.display_order ?? 1),
                        featured: Boolean(cat.featured ?? true),
                        isActive: Boolean(cat.is_active),
                      })
                    }
                  >
                    {rewardsCopy.editCategory}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-rose-600"
                    disabled={busy}
                    data-testid={`custom-category-delete-${cat.id}`}
                    onClick={() =>
                      run(async () => {
                        const res = await deleteStoreCustomCategoryAction(cat.id);
                        if (res?.categories) setCategoriesList(res.categories);
                        else setCategoriesList((prev) => prev.filter((item) => item.id !== cat.id));
                      }, copy.saved)
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {canEdit && (
          <div className="grid sm:grid-cols-4 gap-3 pt-2 border-t border-outline-variant items-end">
            <Field label={rewardsCopy.categorySlug}>
              {(id) => (
                <Input
                  id={id}
                  dir="ltr"
                  placeholder="featured-collection"
                  value={newCategory.slug}
                  onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={rewardsCopy.categoryNameEn}>
              {(id) => (
                <Input
                  id={id}
                  placeholder="Featured Collection"
                  value={newCategory.nameEn}
                  onChange={(e) => setNewCategory({ ...newCategory, nameEn: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Field label={rewardsCopy.categoryNameAr}>
              {(id) => (
                <Input
                  id={id}
                  dir="rtl"
                  placeholder="المجموعة المختارة"
                  value={newCategory.nameAr}
                  onChange={(e) => setNewCategory({ ...newCategory, nameAr: e.target.value })}
                  className="rounded-lg"
                />
              )}
            </Field>
            <Button
              type="button"
              size="sm"
              variant="primary"
              className="rounded-full gap-1.5"
              disabled={busy || !newCategory.nameEn.trim()}
              data-testid="custom-category-save"
              onClick={() =>
                run(async () => {
                  const res = await saveStoreCustomCategoryAction({
                    id: newCategory.id || undefined,
                    slug: newCategory.slug || newCategory.nameEn,
                    nameEn: newCategory.nameEn,
                    nameAr: newCategory.nameAr || newCategory.nameEn,
                    displayOrder: Number(newCategory.displayOrder) || categoriesList.length + 1,
                    featured: newCategory.featured,
                    isActive: newCategory.isActive,
                  });
                  if (res?.categories) setCategoriesList(res.categories);
                  setNewCategory({
                    id: "",
                    slug: "",
                    nameEn: "",
                    nameAr: "",
                    displayOrder: String((res?.categories?.length ?? categoriesList.length) + 1),
                    featured: true,
                    isActive: true,
                  });
                }, copy.saved)
              }
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              {rewardsCopy.saveCategory}
            </Button>
          </div>
        )}
      </Card>

      {/* Storefront & Account Portal Pages Directory */}
      <Card className="p-5 space-y-4" data-testid="storefront-pages-directory">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-ink flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" aria-hidden="true" />
              {rewardsCopy.pagesDirectoryTitle}
            </h2>
            <p className="text-xs text-ink-muted">{rewardsCopy.pagesDirectorySubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={ROUTES.cms.website}
              className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1 text-xs font-semibold text-ink hover:border-accent"
            >
              {rewardsCopy.manageCmsPages}
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href={ROUTES.cms.banners}
              className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1 text-xs font-semibold text-ink hover:border-accent"
            >
              {rewardsCopy.manageBanners}
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href={ROUTES.cms.faqs}
              className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1 text-xs font-semibold text-ink hover:border-accent"
            >
              {rewardsCopy.manageFaqs}
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href={ROUTES.products.categories}
              className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1 text-xs font-semibold text-ink hover:border-accent"
            >
              {rewardsCopy.manageCategories}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono" dir="ltr">
          {[
            "/",
            "/shop",
            "/categories",
            "/deals",
            "/new-arrivals",
            "/gift-cards",
            "/rewards",
            "/account",
            "/account/orders",
            "/account/wallet",
            "/account/rewards",
            "/account/addresses",
            "/account/wishlist",
            "/account/returns",
            "/account/profile",
            "/terms",
            "/privacy",
            "/return-policy",
            "/warranty",
            "/vat-tax",
          ].map((routePath) => (
            <span
              key={routePath}
              className="rounded-xl border border-outline-variant bg-surface-muted px-3 py-1.5 text-ink"
            >
              {routePath}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
