import { roundMoney, validMoneyAmount, toMinorUnits } from "../finance/money";
import { assertCompanyCurrency, companyCurrency as getAccountingCurrency } from "../finance/company-currency";
import { isLocale } from "@platform/locales/registry";
import { phoneSearchVariants, isValidPhone, formatPhoneE164 } from "../constants/phone";
import { isValidEmail, normalizeEmail } from "../constants/validation";
import { defaultWebsiteCommerce, selectedPickupBranch, validateWebsiteCommerce, type PublicBranch } from "../constants/website-commerce";
import { serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { listEntityAttachments } from "../api/files";
import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";
import { getCompanyConfiguration } from "../api/company";
import { allocateDocumentNumber } from "../finance/numbering";
import { normalizeProductOptions, variantLabel } from "../constants/products";
import { roundQuantity } from "../constants/inventory";
import {
  DEFAULT_STORE_CATEGORIES,
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  ORDER_PAYMENT_METHODS,
  RESERVED_STATUSES,
  canMoveOrder,
  couponProblem,
  parseCustomCategories,
  priceOrder,
  type CartLine,
  type CustomStoreCategorySpec,
  type OrderChannel,
  type OrderStatus,
} from "../constants/store";
import {
  ensureDefaultWarehouse,
  postMovements,
  reserveStock,
  type MovementInput,
} from "./inventory";
import { createPayment } from "./payments";
import { getNextSequenceNumber } from "./sequence";
import { isPaymentGateway } from "../constants/payments";
import { activePaymentGateway } from "../payments/active";
import { zoneForAddress } from "../constants/delivery";
import {
  activeZoneTerms,
  createShipmentForOrder,
  followOrderStatus,
  type ShipmentSlotChoice,
} from "./delivery";

const num = (value: unknown) => (value == null ? 0 : Number(value));
const numOrNull = (value: unknown) => (value == null ? null : Number(value));
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const toIso = (v: unknown) => (v ? new Date(v as any).toISOString() : new Date().toISOString());

export async function getStoreSettings() {
  let s: Record<string, any> | undefined;
  try {
    const rows = await listTableRows<Record<string, any>>("commerce", "store_settings");
    s = rows.find((r) => r.id === "default");
    if (!s) {
      s = await upsertTableRow("commerce", "store_settings", { id: "default" });
    }
  } catch {
    s = undefined;
  }

  return {
    guest_checkout: s?.guestCheckout ?? true,
    delivery_enabled: s?.deliveryEnabled ?? true,
    delivery_fee: num(s?.deliveryFee),
    free_delivery_over: numOrNull(s?.freeDeliveryOver),
    pickup_enabled: s?.pickupEnabled ?? true,
    cod_enabled: s?.codEnabled ?? true,
    bank_transfer_enabled: s?.bankTransferEnabled ?? true,
    bank_instructions_en: s?.bankInstructionsEn ?? "",
    bank_instructions_ar: s?.bankInstructionsAr ?? "",
    order_notify_email: s?.orderNotifyEmail ?? "",
    payment_gateway: s?.paymentGateway ?? "",
    loyalty_enabled: s?.loyaltyEnabled ?? true,
    points_per_unit: num(s?.pointsPerUnit ?? 10),
    points_redemption_rate: Math.max(1, num(s?.pointsRedemptionRate ?? 500)),
    min_redeem_points: Math.max(0, num(s?.minRedeemPoints ?? 1000)),
    wallet_enabled: s?.walletEnabled ?? true,
    min_partial_wallet: num(s?.minPartialWallet ?? 1),
    raffle_enabled: s?.raffleEnabled ?? true,
    raffle_spend_unit: Math.max(1, num(s?.raffleSpendUnit ?? 10)),
    raffle_prize_en: String(s?.rafflePrizeEn ?? s?.raffle_prize_en ?? ""),
    raffle_prize_ar: String(s?.rafflePrizeAr ?? s?.raffle_prize_ar ?? ""),
    cookie_banner_enabled: s?.cookieBannerEnabled ?? true,
    ssl_badge_enabled: s?.sslBadgeEnabled ?? true,
    announcement_en: String(s?.announcementEn ?? s?.announcement_en ?? ""),
    announcement_ar: String(s?.announcementAr ?? s?.announcement_ar ?? ""),
    cr_number: String(s?.crNumber ?? s?.cr_number ?? ""),
    vat_number: String(s?.vatNumber ?? s?.vat_number ?? ""),
    return_window_days: Math.max(1, num(s?.returnWindowDays ?? s?.return_window_days ?? 14)),
    show_category_bar:
      s?.showCategoryBar != null
        ? Boolean(s.showCategoryBar)
        : s?.show_category_bar == null
          ? true
          : Boolean(s.show_category_bar),
    show_deals_section:
      s?.showDealsSection != null
        ? Boolean(s.showDealsSection)
        : s?.show_deals_section == null
          ? true
          : Boolean(s.show_deals_section),
    show_gift_cards_section:
      s?.showGiftCardsSection != null
        ? Boolean(s.showGiftCardsSection)
        : s?.show_gift_cards_section == null
          ? true
          : Boolean(s.show_gift_cards_section),
    custom_categories_json: String(s?.customCategoriesJson ?? s?.custom_categories_json ?? "[]"),
    custom_categories: parseCustomCategories(s?.customCategoriesJson ?? s?.custom_categories_json),
  };
}
export type StoreSettingsRecord = Awaited<ReturnType<typeof getStoreSettings>>;

export interface StoreSettingsInput {
  guestCheckout: boolean;
  deliveryEnabled: boolean;
  deliveryFee: string;
  freeDeliveryOver: string;
  pickupEnabled: boolean;
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  bankInstructionsEn: string;
  bankInstructionsAr: string;
  orderNotifyEmail: string;
  paymentGateway?: string;
  loyaltyEnabled?: boolean;
  pointsPerUnit?: string;
  pointsRedemptionRate?: string;
  minRedeemPoints?: string;
  walletEnabled?: boolean;
  minPartialWallet?: string;
  raffleEnabled?: boolean;
  raffleSpendUnit?: string;
  rafflePrizeEn?: string;
  rafflePrizeAr?: string;
  cookieBannerEnabled?: boolean;
  sslBadgeEnabled?: boolean;
  announcementEn?: string;
  announcementAr?: string;
  crNumber?: string;
  vatNumber?: string;
  returnWindowDays?: string;
  showCategoryBar?: boolean;
  showDealsSection?: boolean;
  showGiftCardsSection?: boolean;
  customCategoriesJson?: string;
}

export async function saveStoreSettings(input: StoreSettingsInput) {
  const money = (text: string, optional: boolean) => {
    if (!text.trim() && optional) return null;
    const value = Number(text || 0);
    if (!Number.isFinite(value) || value < 0 || value > 99_999_999)
      throw new Error(serverMessages.productAmountInvalid);
    return round3(value);
  };
  if (!input.deliveryEnabled && !input.pickupEnabled)
    throw new Error(serverMessages.storeFulfilmentRequired);
  const email = input.orderNotifyEmail.trim().toLowerCase();
  if (email && !isValidEmail(email))
    throw new Error(serverMessages.customerEmailInvalid);
  const gateway = (input.paymentGateway ?? "").trim();
  if (gateway && !isPaymentGateway(gateway))
    throw new Error(serverMessages.storePaymentMethodInvalid);
  const data = {
    id: "default",
    guestCheckout: input.guestCheckout,
    deliveryEnabled: input.deliveryEnabled,
    deliveryFee: money(input.deliveryFee, false)!,
    freeDeliveryOver: money(input.freeDeliveryOver, true),
    pickupEnabled: input.pickupEnabled,
    codEnabled: input.codEnabled,
    bankTransferEnabled: input.bankTransferEnabled,
    bankInstructionsEn: input.bankInstructionsEn.trim().slice(0, 2000) || null,
    bankInstructionsAr: input.bankInstructionsAr.trim().slice(0, 2000) || null,
    orderNotifyEmail: email || null,
    ...(input.paymentGateway === undefined
      ? {}
      : { paymentGateway: gateway || null }),
    ...(input.loyaltyEnabled !== undefined ? { loyaltyEnabled: input.loyaltyEnabled } : {}),
    ...(input.pointsPerUnit !== undefined ? { pointsPerUnit: Math.max(0, Number(input.pointsPerUnit || 10)) } : {}),
    ...(input.pointsRedemptionRate !== undefined ? { pointsRedemptionRate: Math.max(1, Number(input.pointsRedemptionRate || 500)) } : {}),
    ...(input.minRedeemPoints !== undefined ? { minRedeemPoints: Math.max(0, Number(input.minRedeemPoints || 1000)) } : {}),
    ...(input.walletEnabled !== undefined ? { walletEnabled: input.walletEnabled } : {}),
    ...(input.minPartialWallet !== undefined ? { minPartialWallet: Math.max(0, Number(input.minPartialWallet || 1)) } : {}),
    ...(input.raffleEnabled !== undefined ? { raffleEnabled: input.raffleEnabled } : {}),
    ...(input.raffleSpendUnit !== undefined ? { raffleSpendUnit: Math.max(1, Number(input.raffleSpendUnit || 10)) } : {}),
    ...(input.rafflePrizeEn !== undefined ? { rafflePrizeEn: input.rafflePrizeEn.trim().slice(0, 200) || null } : {}),
    ...(input.rafflePrizeAr !== undefined ? { rafflePrizeAr: input.rafflePrizeAr.trim().slice(0, 200) || null } : {}),
    ...(input.cookieBannerEnabled !== undefined ? { cookieBannerEnabled: input.cookieBannerEnabled } : {}),
    ...(input.sslBadgeEnabled !== undefined ? { sslBadgeEnabled: input.sslBadgeEnabled } : {}),
    ...(input.announcementEn !== undefined ? { announcementEn: input.announcementEn.trim().slice(0, 300) || "" } : {}),
    ...(input.announcementAr !== undefined ? { announcementAr: input.announcementAr.trim().slice(0, 300) || "" } : {}),
    ...(input.crNumber !== undefined ? { crNumber: input.crNumber.trim().slice(0, 64) || "" } : {}),
    ...(input.vatNumber !== undefined ? { vatNumber: input.vatNumber.trim().slice(0, 64) || "" } : {}),
    ...(input.returnWindowDays !== undefined
      ? { returnWindowDays: Math.max(1, Math.min(365, Math.floor(Number(input.returnWindowDays || 14)))) }
      : {}),
    ...(input.showCategoryBar !== undefined ? { showCategoryBar: input.showCategoryBar } : {}),
    ...(input.showDealsSection !== undefined ? { showDealsSection: input.showDealsSection } : {}),
    ...(input.showGiftCardsSection !== undefined ? { showGiftCardsSection: input.showGiftCardsSection } : {}),
    ...(input.customCategoriesJson !== undefined ? { customCategoriesJson: input.customCategoriesJson } : {}),
  };
  await upsertTableRow("commerce", "store_settings", data);
}

export async function listCoupons() {
  const rows = (await listTableRows<Record<string, any>>("commerce", "coupon", "created_at DESC"))
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 500);
  return rows.map((c) => ({
    id: String(c.id),
    code: String(c.code ?? ""),
    kind: String(c.kind ?? "fixed"),
    value: num(c.value),
    min_order: numOrNull(c.minOrder),
    starts_at: c.startsAt ? toIso(c.startsAt).slice(0, 10) : null,
    ends_at: c.endsAt ? toIso(c.endsAt).slice(0, 10) : null,
    max_uses: c.maxUses ?? null,
    used_count: Number(c.usedCount ?? 0),
    is_active: Boolean(c.isActive),
  }));
}

export interface CouponInput {
  id?: string;
  code: string;
  kind: string;
  value: string;
  minOrder: string;
  startsAt: string;
  endsAt: string;
  maxUses: string;
  isActive: boolean;
}

export async function saveCoupon(input: CouponInput) {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,30}$/.test(code))
    throw new Error(serverMessages.couponCodeInvalid);
  if (input.kind !== "percent" && input.kind !== "fixed")
    throw new Error(serverMessages.couponCodeInvalid);
  const value = Number(input.value);
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    (input.kind === "percent" && value > 100)
  )
    throw new Error(serverMessages.productAmountInvalid);
  const date = (text: string, end = false) =>
    text ? `${text}T${end ? "23:59:59.999" : "00:00:00.000"}Z` : null;
  const maxUses = input.maxUses.trim() ? Number(input.maxUses) : null;
  if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1))
    throw new Error(serverMessages.productAmountInvalid);
  const coupons = await listTableRows<Record<string, any>>("commerce", "coupon");
  if (coupons.some((c) => c.code === code && c.id !== (input.id ?? "")))
    throw new Error(serverMessages.couponCodeTaken);
  const data = {
    code,
    kind: input.kind,
    value,
    minOrder: input.minOrder.trim() ? Number(input.minOrder) : null,
    startsAt: date(input.startsAt),
    endsAt: date(input.endsAt, true),
    maxUses,
    isActive: input.isActive,
  };
  return upsertTableRow("commerce", "coupon", {
    id: input.id || crypto.randomUUID(),
    ...data,
  });
}

export async function catalogueProductPrices(itemIds: string[]) {
  const idSet = new Set(itemIds);
  const [products, variants] = await Promise.all([
    listTableRows<Record<string, any>>("inventory", "product"),
    listTableRows<Record<string, any>>("inventory", "product_variant"),
  ]);
  const activeProducts = products.filter(
    (p) => p.isActive && p.catalogueItemId && idSet.has(String(p.catalogueItemId)),
  );
  return new Map(
    activeProducts.map((product) => {
      const pVars = variants.filter((v) => v.productId === product.id && v.isActive);
      const prices = pVars.length
        ? pVars.map((v) => num(v.price ?? product.price))
        : [num(product.price)];
      return [String(product.catalogueItemId), Math.min(...prices)];
    }),
  );
}

export async function storeProductForItem(catalogueItemId: string) {
  const [products, allVariants] = await Promise.all([
    listTableRows<Record<string, any>>("inventory", "product"),
    listTableRows<Record<string, any>>("inventory", "product_variant", "sort_order ASC"),
  ]);
  const product = products.find((p) => p.catalogueItemId === catalogueItemId && p.isActive);
  if (!product) return null;
  const variants = allVariants
    .filter((v) => v.productId === product.id && v.isActive)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const options = normalizeProductOptions(product.options) ?? [];
  const available = await availableByItem([String(product.id)]);
  const left = (variantKey: string) =>
    product.trackStock
      ? (available.get(`${product.id}|${variantKey}`) ?? 0)
      : null;
  return {
    product_id: String(product.id),
    track_stock: Boolean(product.trackStock),
    options,
    price: num(product.price),
    available: variants.length ? null : left(""),
    variants: variants.map((v) => ({
      id: String(v.id),
      values: v.optionValues,
      label_en: variantLabel(options, v.optionValues, "en"),
      label_ar: variantLabel(options, v.optionValues, "ar"),
      price: v.price == null ? num(product.price) : num(v.price),
      available: left(String(v.id)),
    })),
  };
}

async function availableByItem(productIds: string[], _client?: unknown) {
  const idSet = new Set(productIds);
  const [levels, locations, warehouses] = await Promise.all([
    listTableRows<Record<string, any>>("inventory", "stock_level"),
    listTableRows<Record<string, any>>("inventory", "stock_location"),
    listTableRows<Record<string, any>>("inventory", "warehouse"),
  ]);
  const activeWhIds = new Set(warehouses.filter((w) => w.isActive).map((w) => String(w.id)));
  const activeLocIds = new Set(
    locations
      .filter((l) => l.isActive && activeWhIds.has(String(l.warehouseId)))
      .map((l) => String(l.id)),
  );
  const totals = new Map<string, { onHand: number; reserved: number }>();
  for (const l of levels) {
    if (!idSet.has(String(l.productId)) || !activeLocIds.has(String(l.locationId))) continue;
    const key = `${l.productId}|${l.variantKey ?? ""}`;
    const cur = totals.get(key) ?? { onHand: 0, reserved: 0 };
    cur.onHand += num(l.onHand);
    cur.reserved += num(l.reserved);
    totals.set(key, cur);
  }
  return new Map<string, number>(
    Array.from(totals.entries()).map(([k, v]) => [k, roundQuantity(v.onHand - v.reserved)]),
  );
}

export type CartProblem =
  | "unavailable"
  | "out_of_stock"
  | "coupon_invalid"
  | "coupon_expired"
  | "coupon_used_up"
  | "coupon_min_order"
  | "no_delivery_zone"
  | "below_minimum";

export async function quoteCart(
  input: {
    lines: CartLine[];
    couponCode?: string;
    fulfilment: "delivery" | "pickup";
    address?: { area?: string; city?: string } | null;
    regionCode?: string;
  },
  _client?: unknown,
) {
  const accountingCurrency = await getAccountingCurrency();
  let targetCurrency = accountingCurrency;
  let priceMultiplier = 1;
  if (input.regionCode) {
    const regions = await listTableRows<Record<string, any>>("commerce", "store_region");
    const region = regions.find(
      (r) => String(r.code ?? "").toUpperCase() === input.regionCode!.trim().toUpperCase(),
    );
    if (region && region.isEnabled) {
      targetCurrency = String(region.currency);
      priceMultiplier = Number(region.priceMultiplier) || 1;
    }
  }
  const cart = input.lines
    .slice(0, MAX_CART_LINES)
    .filter((l) => Number.isFinite(l.quantity) && l.quantity > 0);
  const cartProductIds = new Set(cart.map((l) => l.productId));
  const [allProducts, allVariants] = await Promise.all([
    listTableRows<Record<string, any>>("inventory", "product"),
    listTableRows<Record<string, any>>("inventory", "product_variant"),
  ]);
  const products: Array<Record<string, any>> = allProducts
    .filter((p) => p.isActive && cartProductIds.has(String(p.id)))
    .map((p): Record<string, any> => ({
      ...p,
      variants: allVariants.filter((v) => v.productId === p.id),
    }));
  const available = await availableByItem(products.map((p) => String(p.id)));
  const problems: {
    productId: string;
    variantId?: string;
    problem: CartProblem;
  }[] = [];
  const lines: {
    productId: string;
    variantKey: string;
    sku: string;
    description: string;
    nameEn: string;
    nameAr: string;
    variantEn: string;
    variantAr: string;
    imageUrl: string | null;
    quantity: number;
    unitPrice: number;
    vatExempt: boolean;
    trackStock: boolean;
  }[] = [];
  for (const line of cart) {
    const product = products.find((p) => p.id === line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (
      !product ||
      (product.variants.length
        ? !variant || !variant.isActive
        : !!line.variantId)
    ) {
      problems.push({
        productId: line.productId,
        variantId: line.variantId,
        problem: "unavailable",
      });
      continue;
    }
    const quantity = Math.min(MAX_LINE_QUANTITY, Math.floor(line.quantity));
    const variantKey = variant?.id ? String(variant.id) : "";
    if (
      product.trackStock &&
      (available.get(`${product.id}|${variantKey}`) ?? 0) < quantity
    ) {
      problems.push({
        productId: String(product.id),
        variantId: variant?.id ? String(variant.id) : undefined,
        problem: "out_of_stock",
      });
      continue;
    }
    const options = normalizeProductOptions(product.options) ?? [];
    const variantEn = variant
      ? variantLabel(options, variant.optionValues, "en")
      : "";
    const variantAr = variant
      ? variantLabel(options, variant.optionValues, "ar")
      : "";
    const basePrice =
      variant?.price != null ? num(variant.price) : num(product.price);
    const unitPrice = roundMoney(basePrice * priceMultiplier, targetCurrency);
    lines.push({
      productId: String(product.id),
      variantKey,
      sku: String(variant?.sku ?? product.sku ?? ""),
      description: [product.nameEn, variantEn].filter(Boolean).join(" · "),
      nameEn: String(product.nameEn ?? ""),
      nameAr: String(product.nameAr ?? ""),
      variantEn,
      variantAr,
      imageUrl: (Array.isArray(product.imageUrls) ? product.imageUrls[0] : null) ?? null,
      quantity,
      unitPrice,
      vatExempt: Boolean(product.vatExempt),
      trackStock: Boolean(product.trackStock),
    });
  }
  const [settingsRows, company] = await Promise.all([
    listTableRows<Record<string, any>>("commerce", "store_settings"),
    getCompanyConfiguration().catch(() => null),
  ]);
  const settings =
    settingsRows.find((s) => s.id === "default") ??
    (await upsertTableRow<Record<string, any>>("commerce", "store_settings", { id: "default" }));

  let coupon: {
    kind: "percent" | "fixed";
    value: number;
    minOrder: number | null;
  } | null = null;
  const code = input.couponCode?.trim().toUpperCase();
  const goods = roundMoney(
    lines.reduce((sum, line) => sum + roundMoney(line.unitPrice * line.quantity, targetCurrency), 0),
    targetCurrency,
  );
  if (code) {
    const coupons = await listTableRows<Record<string, any>>("commerce", "coupon");
    const row = coupons.find((c) => c.code === code);
    const problem = row
      ? couponProblem(
          {
            isActive: Boolean(row.isActive),
            startsAt: row.startsAt ? new Date(row.startsAt) : null,
            endsAt: row.endsAt ? new Date(row.endsAt) : null,
            maxUses: row.maxUses ?? null,
            usedCount: Number(row.usedCount ?? 0),
            minOrder: numOrNull(row.minOrder),
          },
          goods,
        )
      : "invalid";
    if (problem)
      problems.push({
        productId: "",
        problem: `coupon_${problem}` as CartProblem,
      });
    else
      coupon = {
        kind: row!.kind as "percent" | "fixed",
        value: num(row!.value),
        minOrder: numOrNull(row!.minOrder),
      };
  }
  const delivery = input.fulfilment === "delivery";
  const zones = delivery ? await activeZoneTerms() : [];
  const hasAddress = !!(
    input.address?.area?.trim() || input.address?.city?.trim()
  );
  const zone = zones.length
    ? hasAddress
      ? zoneForAddress(zones, input.address!)
      : (zones.find((z) => !z.areas.length) ??
        [...zones].sort((a, b) => a.fee - b.fee)[0])
    : null;
  if (zones.length && hasAddress && !zone)
    problems.push({ productId: "", problem: "no_delivery_zone" });
  if (zone?.minOrder != null && hasAddress && goods < zone.minOrder)
    problems.push({ productId: "", problem: "below_minimum" });
  const finalCurrency = input.regionCode ? targetCurrency : (company?.defaultCurrency ?? accountingCurrency);
  const totals = priceOrder({
    currency: finalCurrency,
    lines,
    vatPercentage: company?.vatEnabled ? num(company.vatPercentage) : 0,
    coupon,
    deliveryFee: zone ? zone.fee : num(settings.deliveryFee),
    freeDeliveryOver: zone
      ? zone.freeOver
      : numOrNull(settings.freeDeliveryOver),
    delivery,
  });
  return {
    lines,
    problems,
    couponCode: coupon ? code! : null,
    currency: finalCurrency,
    zoneId: hasAddress ? (zone?.id ?? null) : null,
    minOrder: zone?.minOrder ?? null,
    ...totals,
  };
}
export type CartQuote = Awaited<ReturnType<typeof quoteCart>>;

export interface OrderAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  area?: string;
  city: string;
  country: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PlaceOrderInput {
  lines: CartLine[];
  couponCode?: string;
  fulfilment: "delivery" | "pickup";
  address?: OrderAddress | null;
  pickupBranchId?: string | null;
  regionCode?: string;
  name: string;
  email: string;
  phone: string;
  paymentMethod: string;
  note?: string;
  locale: string;
  channel: OrderChannel;
  customerId?: string | null;
  contactId?: string | null;
  createdById?: string | null;
  slot?: ShipmentSlotChoice | null;
  utm?: { campaign: string; source: string; medium: string } | null;
}

async function orderContact(input: PlaceOrderInput) {
  if (input.contactId) return input.contactId;
  if (input.customerId) {
    const customers = await listTableRows<Record<string, any>>("commerce", "customer");
    const customer = customers.find((c) => c.id === input.customerId);
    if (customer?.crmContactId) return String(customer.crmContactId);
  }
  const email = input.email.trim().toLowerCase();
  if (email) {
    const contacts = await listTableRows<Record<string, any>>("sales", "crm_contact");
    const existing = contacts.find(
      (c) => c.emailNorm === email && c.contactType !== "vendor",
    );
    if (existing) return String(existing.id);
  }
  const [firstName, ...rest] = input.name.trim().split(/\s+/);
  const created = await upsertTableRow<Record<string, any>>("sales", "crm_contact", {
    id: crypto.randomUUID(),
    firstName: firstName || input.name,
    lastName: rest.join(" ") || null,
    email: email || null,
    emailNorm: email || null,
    phone: input.phone ? formatPhoneE164(input.phone) : null,
    contactType: "client",
    clientKind: "individual",
  });
  return String(created.id);
}

export async function placeOrder(input: PlaceOrderInput) {
  const name = input.name.trim().slice(0, 120);
  const rawEmail = input.email.trim();
  if (!name) throw new Error(serverMessages.customerNameRequired);
  if (rawEmail && !isValidEmail(rawEmail))
    throw new Error(serverMessages.customerEmailInvalid);
  if (input.channel === "website" && !rawEmail)
    throw new Error(serverMessages.customerEmailInvalid);
  const email = rawEmail ? normalizeEmail(rawEmail) : "";

  const rawPhone = input.phone?.trim() ?? "";
  if (rawPhone && !isValidPhone(rawPhone))
    throw new Error(serverMessages.invalidInput);
  const phone = rawPhone ? formatPhoneE164(rawPhone) : "";

  if (
    !(ORDER_PAYMENT_METHODS as readonly string[]).includes(input.paymentMethod)
  )
    throw new Error(serverMessages.storePaymentMethodInvalid);
  const settingsRows = await listTableRows<Record<string, any>>("commerce", "store_settings");
  const settings =
    settingsRows.find((s) => s.id === "default") ??
    (await upsertTableRow<Record<string, any>>("commerce", "store_settings", { id: "default" }));
  if (input.channel === "website") {
    if (
      input.fulfilment === "delivery"
        ? !settings.deliveryEnabled
        : !settings.pickupEnabled
    )
      throw new Error(serverMessages.storeFulfilmentRequired);
    const online =
      input.paymentMethod === "online" && !!(await activePaymentGateway());
    const allowed = [
      settings.codEnabled && "cod",
      settings.bankTransferEnabled && "bank_transfer",
      online && "online",
    ].filter(Boolean);
    if (!allowed.includes(input.paymentMethod))
      throw new Error(serverMessages.storePaymentMethodInvalid);
    if (!input.customerId && !settings.guestCheckout)
      throw new Error(serverMessages.storeSignInRequired);
  }
  let address: OrderAddress | null = null;
  if (input.fulfilment === "delivery") {
    const a = input.address;
    if (
      !a ||
      !a.name?.trim() ||
      !a.phone?.trim() ||
      !a.line1?.trim() ||
      !a.city?.trim() ||
      !a.country?.trim()
    )
      throw new Error(serverMessages.customerAddressIncomplete);
    if (!isValidPhone(a.phone.trim()))
      throw new Error(serverMessages.invalidInput);
    if (
      (a.latitude != null) !== (a.longitude != null) ||
      (a.latitude != null &&
        (typeof a.latitude !== "number" ||
          !Number.isFinite(a.latitude) ||
          Math.abs(a.latitude) > 90)) ||
      (a.longitude != null &&
        (typeof a.longitude !== "number" ||
          !Number.isFinite(a.longitude) ||
          Math.abs(a.longitude) > 180))
    )
      throw new Error(serverMessages.customerAddressIncomplete);
    address = {
      ...(a.latitude != null && a.longitude != null
        ? { latitude: a.latitude, longitude: a.longitude }
        : {}),
      name: a.name.trim().slice(0, 120),
      phone: formatPhoneE164(a.phone.trim()),
      line1: a.line1.trim().slice(0, 200),
      line2: a.line2?.trim().slice(0, 200) || "",
      area: a.area?.trim().slice(0, 80) || "",
      city: a.city.trim().slice(0, 80),
      country: a.country.trim().slice(0, 80),
      postalCode: a.postalCode?.trim().slice(0, 20) || "",
    };
  }
  const warehouse = await ensureDefaultWarehouse();
  return runAtomicMutation(async () => {
    await assertCompanyCurrency(undefined);
    let pickupBranch: PublicBranch | null = null;
    if (input.channel === "website") {
      const publications = await listTableRows<Record<string, any>>("cms", "website_content");
      const publication = publications.find((p) => p.id === "main");
      const raw = (publication?.published as { config?: { commerce?: unknown } } | null)?.config?.commerce;
      const commerce = raw ? validateWebsiteCommerce(raw) : defaultWebsiteCommerce();
      if (
        !commerce.capabilities.shop ||
        !commerce.capabilities.ordering ||
        !commerce.capabilities[input.fulfilment]
      )
        throw new Error(serverMessages.storeFulfilmentRequired);
      if (input.fulfilment === "pickup")
        pickupBranch = selectedPickupBranch(commerce, input.pickupBranchId);
    }
    const destination = pickupBranch
      ? {
          name: input.locale === "ar" ? pickupBranch.nameAr : pickupBranch.nameEn,
          phone: pickupBranch.phone,
          line1: input.locale === "ar" ? pickupBranch.addressAr : pickupBranch.addressEn,
          city: pickupBranch.city,
          country: pickupBranch.country,
          pickupBranch,
        }
      : address;
    const quote = await quoteCart({
      lines: input.lines,
      couponCode: input.couponCode,
      fulfilment: input.fulfilment,
      address,
      regionCode: input.regionCode,
    });
    const problem = (p: string) => quote.problems.some((x) => x.problem === p);
    if (problem("no_delivery_zone"))
      throw new Error(serverMessages.deliveryNotCovered);
    if (problem("below_minimum"))
      throw new Error(serverMessages.deliveryBelowMinimum);
    if (quote.problems.length || !quote.lines.length)
      throw new Error(
        quote.problems.some((p) => p.problem.startsWith("coupon"))
          ? serverMessages.couponCannotBeUsed
          : serverMessages.storeCartChanged,
      );

    const [allLevels, allLocations, allWarehouses] = await Promise.all([
      listTableRows<Record<string, any>>("inventory", "stock_level"),
      listTableRows<Record<string, any>>("inventory", "stock_location"),
      listTableRows<Record<string, any>>("inventory", "warehouse"),
    ]);
    const activeWhIds = new Set(allWarehouses.filter((w) => w.isActive).map((w) => String(w.id)));
    const locById = new Map(allLocations.map((l) => [String(l.id), l]));

    const held: { locationId: string | null }[] = [];
    for (const line of quote.lines) {
      if (!line.trackStock) {
        held.push({ locationId: null });
        continue;
      }
      const levels = allLevels.filter((l) => {
        if (
          l.productId !== line.productId ||
          (l.variantKey ?? "") !== line.variantKey ||
          (l.batchKey ?? "") !== ""
        )
          return false;
        const loc = locById.get(String(l.locationId));
        return Boolean(loc?.isActive && activeWhIds.has(String(loc.warehouseId)));
      });
      const ranked = levels
        .map((l) => {
          const loc = locById.get(String(l.locationId))!;
          return {
            id: String(l.locationId),
            free: num(l.onHand) - num(l.reserved),
            home: loc.warehouseId === warehouse.id,
          };
        })
        .filter((l) => l.free >= line.quantity)
        .sort((a, b) => Number(b.home) - Number(a.home) || b.free - a.free);
      if (!ranked.length) throw new Error(serverMessages.storeCartChanged);
      await reserveStock(null, {
        productId: line.productId,
        variantId: line.variantKey || undefined,
        locationId: ranked[0].id,
        quantity: line.quantity,
      });
      held.push({ locationId: ranked[0].id });
    }
    if (quote.couponCode) {
      const coupons = await listTableRows<Record<string, any>>("commerce", "coupon");
      const couponRow = coupons.find((c) => c.code === quote.couponCode);
      if (
        !couponRow ||
        (couponRow.maxUses != null && Number(couponRow.usedCount ?? 0) >= Number(couponRow.maxUses))
      ) {
        throw new Error(serverMessages.couponCannotBeUsed);
      }
      await upsertTableRow("commerce", "coupon", {
        id: couponRow.id,
        usedCount: Number(couponRow.usedCount ?? 0) + 1,
      });
    }
    const contactId = await orderContact({ ...input, email, name });
    const number = await getNextSequenceNumber("SO");
    const orderId = crypto.randomUUID();
    const order = await upsertTableRow<Record<string, any>>("commerce", "sales_order", {
      id: orderId,
      number,
      customerId: input.customerId ?? null,
      contactId,
      email: email || null,
      name,
      phone: phone || null,
      channel: input.channel,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === "online" ? "pending" : "unpaid",
      fulfilment: input.fulfilment,
      shippingAddress: destination ?? null,
      subtotal: quote.subtotal,
      discountAmount: quote.discount,
      couponCode: quote.couponCode,
      vatAmount: quote.vatAmount,
      deliveryFee: quote.deliveryFee,
      total: quote.total,
      currency: quote.currency,
      locale: isLocale(input.locale) ? input.locale : "en",
      note: input.note?.trim().slice(0, 1000) || null,
      warehouseId: warehouse.id,
      createdById: input.createdById ?? null,
      utmCampaign: input.utm?.campaign || null,
      utmSource: input.utm?.source || null,
      utmMedium: input.utm?.medium || null,
      status: "placed",
    });

    for (let index = 0; index < quote.lines.length; index++) {
      const l = quote.lines[index];
      await upsertTableRow("commerce", "sales_order_line", {
        id: crypto.randomUUID(),
        orderId,
        productId: l.productId,
        variantKey: l.variantKey,
        sku: l.sku,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        vatExempt: l.vatExempt,
        lineTotal: roundMoney(l.quantity * l.unitPrice, quote.currency),
        locationId: held[index].locationId,
        sortOrder: index,
      });
    }
    await upsertTableRow("commerce", "sales_order_event", {
      id: crypto.randomUUID(),
      orderId,
      kind: "status",
      status: "placed",
      byId: input.createdById ?? null,
    });
    if (input.fulfilment === "delivery")
      await createShipmentForOrder(null, order, {
        zoneId: quote.zoneId,
        slot: input.slot ?? null,
        requireSlot: input.channel === "website",
      });
    return order;
  });
}

export async function getOrder(id: string) {
  const [orders, allLines, allEvents, users, invoices, attachments] = await Promise.all([
    listTableRows<Record<string, any>>("commerce", "sales_order"),
    listTableRows<Record<string, any>>("commerce", "sales_order_line", "sort_order ASC"),
    listTableRows<Record<string, any>>("commerce", "sales_order_event", "created_at ASC"),
    listTableRows<Record<string, any>>("identity", "user"),
    listTableRows<Record<string, any>>("finance", "invoice"),
    listEntityAttachments({ entityType: "sales_order", entityId: id }).catch(() => []),
  ]);
  const o = orders.find((r) => r.id === id);
  if (!o) return null;
  const lines = allLines
    .filter((l) => l.orderId === id)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const events = allEvents
    .filter((e) => e.orderId === id)
    .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
  const userById = new Map(users.map((u) => [String(u.id), String(u.fullName ?? "")]));
  const inv = o.invoiceId ? invoices.find((i) => i.id === o.invoiceId) : null;
  const invoice = inv ? { id: String(inv.id), invoiceNumber: String(inv.invoiceNumber ?? "") } : null;
  const files = attachments
    .filter((f) => f.entityType === "sales_order" && f.entityId === id)
    .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());

  return {
    id: String(o.id),
    number: String(o.number ?? ""),
    customer_id: o.customerId ?? null,
    contact_id: o.contactId ?? null,
    email: o.email ?? "",
    name: String(o.name ?? ""),
    phone: o.phone ?? "",
    channel: String(o.channel ?? ""),
    status: String(o.status ?? ""),
    payment_status: String(o.paymentStatus ?? ""),
    payment_method: String(o.paymentMethod ?? ""),
    fulfilment: String(o.fulfilment ?? ""),
    address: (o.shippingAddress as OrderAddress | null) ?? null,
    pickup_branch: (o.shippingAddress as { pickupBranch?: PublicBranch } | null)?.pickupBranch ?? null,
    subtotal: num(o.subtotal),
    discount: num(o.discountAmount),
    coupon_code: o.couponCode ?? null,
    vat_amount: num(o.vatAmount),
    delivery_fee: num(o.deliveryFee),
    total: num(o.total),
    amount_paid: num(o.amountPaid),
    amount_refunded: num(o.amountRefunded),
    account_discount_amount: num(o.accountDiscountAmount ?? o.account_discount_amount),
    points_earned: Math.floor(num(o.pointsEarned ?? o.points_earned)),
    points_redeemed: Math.floor(num(o.pointsRedeemed ?? o.points_redeemed)),
    points_discount_amount: num(o.pointsDiscountAmount ?? o.points_discount_amount),
    wallet_applied: num(o.walletApplied ?? o.wallet_applied),
    raffle_tickets: Math.floor(num(o.raffleTickets ?? o.raffle_tickets)),
    currency: String(o.currency ?? "BHD"),
    locale: String(o.locale ?? "en"),
    note: o.note ?? "",
    invoice,
    placed_at: toIso(o.placedAt),
    lines: lines.map((l) => ({
      id: String(l.id),
      product_id: String(l.productId),
      variant_key: String(l.variantKey ?? ""),
      sku: String(l.sku ?? ""),
      description: String(l.description ?? ""),
      quantity: num(l.quantity),
      unit_price: num(l.unitPrice),
      line_total: num(l.lineTotal),
      returned: num(l.returnedQuantity),
    })),
    events: events.map((e) => ({
      id: String(e.id),
      kind: String(e.kind ?? ""),
      status: e.status ?? null,
      note: e.note ?? null,
      amount: numOrNull(e.amount),
      by: e.byId ? (userById.get(String(e.byId)) ?? null) : null,
      at: toIso(e.createdAt),
    })),
    files: files.map((f) => ({
      id: String(f.id),
      name: String(f.fileName ?? ""),
      url: String(f.fileUrl ?? ""),
      at: toIso(f.createdAt),
    })),
  };
}
export type OrderRecord = NonNullable<Awaited<ReturnType<typeof getOrder>>>;

export async function listOrders(
  query: {
    status?: string;
    channel?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 100);
  const page = Math.max(query.page ?? 1, 1);
  const search = query.search?.trim().slice(0, 80).toLowerCase() ?? "";
  const phoneVariants = search ? phoneSearchVariants(search).map((v) => v.toLowerCase()) : [];

  const allOrders = await listTableRows<Record<string, any>>("commerce", "sales_order", "placed_at DESC");
  const filtered = allOrders.filter((o) => {
    if (query.status && o.status !== query.status) return false;
    if (query.channel && o.channel !== query.channel) return false;
    if (search) {
      const hay = [o.number, o.name, o.email]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(search));
      const phoneHit =
        phoneVariants.length > 0 &&
        phoneVariants.some((v) => String(o.phone ?? "").toLowerCase().includes(v));
      if (!hay && !phoneHit) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const diff = new Date(b.placedAt ?? 0).getTime() - new Date(a.placedAt ?? 0).getTime();
    return diff !== 0 ? diff : String(a.id).localeCompare(String(b.id));
  });

  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  return {
    rows: rows.map((o) => ({
      id: String(o.id),
      number: String(o.number ?? ""),
      name: String(o.name ?? ""),
      channel: String(o.channel ?? ""),
      status: String(o.status ?? ""),
      fulfilment: String(o.fulfilment ?? ""),
      payment_status: String(o.paymentStatus ?? ""),
      payment_method: String(o.paymentMethod ?? ""),
      total: num(o.total),
      placed_at: toIso(o.placedAt),
    })),
    total: filtered.length,
    page,
    pageSize,
  };
}

export async function customerOrders(customerId: string) {
  const [orders, allLines, allShipments] = await Promise.all([
    listTableRows<Record<string, any>>("commerce", "sales_order", "placed_at DESC"),
    listTableRows<Record<string, any>>("commerce", "sales_order_line", "sort_order ASC"),
    listTableRows<Record<string, any>>("delivery", "shipment", "created_at DESC"),
  ]);
  const rows = orders
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => new Date(b.placedAt ?? 0).getTime() - new Date(a.placedAt ?? 0).getTime())
    .slice(0, 100);

  return rows.map((o) => {
    const lines = allLines
      .filter((l) => l.orderId === o.id)
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
    const shipment = allShipments
      .filter((s) => s.orderId === o.id && s.status !== "cancelled")
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
    return {
      id: String(o.id),
      number: String(o.number ?? ""),
      status: String(o.status ?? ""),
      payment_status: String(o.paymentStatus ?? ""),
      total: num(o.total),
      currency: String(o.currency ?? "BHD"),
      placed_at: toIso(o.placedAt),
      fulfilment: String(o.fulfilment ?? ""),
      tracking_token: shipment?.trackingToken ?? null,
      pickup_branch: (o.shippingAddress as { pickupBranch?: PublicBranch } | null)?.pickupBranch ?? null,
      lines: lines.map((l) => ({
        description: String(l.description ?? ""),
        quantity: num(l.quantity),
      })),
    };
  });
}

export async function customerOrder(customerId: string, id: string) {
  const [orders, allLines, allShipments] = await Promise.all([
    listTableRows<Record<string, any>>("commerce", "sales_order"),
    listTableRows<Record<string, any>>("commerce", "sales_order_line", "sort_order ASC"),
    listTableRows<Record<string, any>>("delivery", "shipment", "created_at DESC"),
  ]);
  const o = orders.find((r) => r.id === id && r.customerId === customerId);
  if (!o) return null;
  const lines = allLines
    .filter((l) => l.orderId === id)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((l) => ({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    }));
  const shipments = allShipments
    .filter((s) => s.orderId === id && s.status !== "cancelled")
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 1)
    .map((s) => ({ trackingToken: s.trackingToken }));
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    fulfilment: o.fulfilment,
    shippingAddress: o.shippingAddress,
    name: o.name,
    email: o.email,
    phone: o.phone,
    subtotal: o.subtotal,
    discountAmount: o.discountAmount,
    deliveryFee: o.deliveryFee,
    vatAmount: o.vatAmount,
    total: o.total,
    amountPaid: o.amountPaid,
    currency: o.currency,
    placedAt: o.placedAt,
    lines,
    shipments,
  };
}

async function releaseReservations(
  order: {
    lines: {
      productId: string;
      variantKey: string;
      locationId: string | null;
      quantity: unknown;
    }[];
  },
) {
  for (const line of order.lines)
    if (line.locationId)
      await reserveStock(null, {
        productId: line.productId,
        variantId: line.variantKey || undefined,
        locationId: line.locationId,
        quantity: -num(line.quantity),
      });
}

export async function moveOrder(
  id: string,
  to: OrderStatus,
  byId: string | null,
  note?: string,
) {
  return runAtomicMutation(() => moveOrderIn(null, id, to, byId, note, true));
}

export async function moveOrderIn(
  _tx: unknown,
  id: string,
  to: OrderStatus,
  byId: string | null,
  note: string | undefined,
  followShipments: boolean,
) {
  const [orders, allLines] = await Promise.all([
    listTableRows<Record<string, any>>("commerce", "sales_order"),
    listTableRows<Record<string, any>>("commerce", "sales_order_line"),
  ]);
  const rawOrder = orders.find((o) => o.id === id);
  if (!rawOrder) throw new Error(serverMessages.procurementDocumentMissing);
  const lines = allLines.filter((l) => l.orderId === id);
  const order: Record<string, any> = { ...rawOrder, lines };
  if (!canMoveOrder(String(order.status), to))
    throw new Error(serverMessages.orderStatusInvalid);
  let low: any = [];
  const held = (RESERVED_STATUSES as string[]).includes(String(order.status));
  if (to === "cancelled" && held) await releaseReservations(order as any);
  if (to === "shipped") {
    await releaseReservations(order as any);
    const movements: MovementInput[] = order.lines
      .filter((l: any) => l.locationId)
      .map((l: any) => ({
        type: "sale",
        productId: String(l.productId),
        variantId: l.variantKey || undefined,
        locationId: String(l.locationId),
        quantity: -num(l.quantity),
        sourceType: "order",
        sourceId: String(order.id),
        note: String(order.number ?? ""),
      }));
    low = await postMovements(null, movements, byId);
  }
  if (to === "returned") {
    const movements: MovementInput[] = order.lines
      .filter((l: any) => l.locationId && num(l.quantity) > num(l.returnedQuantity))
      .map((l: any) => ({
        type: "return",
        productId: String(l.productId),
        variantId: l.variantKey || undefined,
        locationId: String(l.locationId),
        quantity: roundQuantity(num(l.quantity) - num(l.returnedQuantity)),
        sourceType: "order",
        sourceId: String(order.id),
        note: String(order.number ?? ""),
      }));
    await postMovements(null, movements, byId);
    for (const l of order.lines)
      await upsertTableRow("commerce", "sales_order_line", {
        id: l.id,
        returnedQuantity: l.quantity,
      });
  }
  const nowIso = new Date().toISOString();
  await upsertTableRow("commerce", "sales_order", {
    id,
    status: to,
    ...(to === "shipped" ? { shippedAt: nowIso } : {}),
    ...(to === "delivered" ? { deliveredAt: nowIso } : {}),
    ...(to === "cancelled" ? { cancelledAt: nowIso } : {}),
  });
  await upsertTableRow("commerce", "sales_order_event", {
    id: crypto.randomUUID(),
    orderId: id,
    kind: "status",
    status: to,
    note: note?.trim().slice(0, 500) || null,
    byId,
  });
  if (followShipments) await followOrderStatus(null, id, to, byId);
  return low;
}

export async function issueOrderInvoice(orderId: string, byId: string | null) {
  const [orders, allLines, users] = await Promise.all([
    listTableRows<Record<string, any>>("commerce", "sales_order"),
    listTableRows<Record<string, any>>("commerce", "sales_order_line", "sort_order ASC"),
    listTableRows<Record<string, any>>("identity", "user"),
  ]);
  const order = orders.find((o) => o.id === orderId);
  if (!order) throw new Error(serverMessages.procurementDocumentMissing);
  if (order.invoiceId) return String(order.invoiceId);
  const orderLines = allLines
    .filter((l) => l.orderId === orderId)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const company = await getCompanyConfiguration().catch(() => null);
  const issueDate = new Date();
  const fee = num(order.deliveryFee);
  const lines = [
    ...orderLines.map((l) => ({
      descriptionEn: `${l.description} (${l.sku})`,
      quantity: num(l.quantity),
      unitPrice: num(l.unitPrice),
      lineTotal: num(l.lineTotal),
    })),
    ...(fee > 0
      ? [
          {
            descriptionEn: "Delivery",
            quantity: 1,
            unitPrice: fee,
            lineTotal: fee,
          },
        ]
      : []),
  ];
  return runAtomicMutation(async () => {
    const signerUser = byId
      ? users.find((u) => u.id === byId)
      : users.find(
          (u) =>
            (u.role === "super_admin" || u.role === "admin") &&
            u.isActive &&
            u.signatureUrl != null,
        ) ||
        users.find((u) => (u.role === "super_admin" || u.role === "admin") && u.isActive);
    const signerId = signerUser?.id ?? byId ?? null;
    const signerSignature = signerUser?.signatureUrl ?? null;

    const invoiceNumber = await allocateDocumentNumber("invoice", issueDate);
    const invoiceId = crypto.randomUUID();
    const invoice = await upsertTableRow<Record<string, any>>("finance", "invoice", {
      id: invoiceId,
      invoiceNumber,
      clientId: order.contactId,
      issueDate: issueDate.toISOString(),
      dueDate: new Date(
        issueDate.getTime() + ((company as any)?.paymentTermsDays ?? 0) * 86_400_000,
      ).toISOString(),
      subtotal: roundMoney(num(order.subtotal) + fee, String(order.currency)),
      discountType: num(order.discountAmount) > 0 ? "fixed" : "none",
      discountValue: order.discountAmount,
      discountAmount: order.discountAmount,
      vatEnabled: num(order.vatAmount) > 0,
      vatPercentage: (company?.vatPercentage as number) ?? 0,
      vatAmount: order.vatAmount,
      totalAmount: order.total,
      currency: order.currency,
      language: order.locale === "ar" ? "ar" : "en",
      status: "sent",
      approvalStatus: "approved",
      notesEn: `Order ${order.number}`,
      createdById: byId,
      salesOwnerId: signerId,
      signedById: signerId,
      signedAt: issueDate.toISOString(),
      signerSignatureUrl: signerSignature,
    });
    for (let index = 0; index < lines.length; index++) {
      await upsertTableRow("finance", "invoice_line_item", {
        id: crypto.randomUUID(),
        invoiceId,
        ...lines[index],
        displayOrder: index + 1,
      });
    }
    await upsertTableRow("commerce", "sales_order", {
      id: orderId,
      invoiceId: invoice.id,
    });
    return String(invoice.id);
  });
}

export async function recordOrderPayment(
  orderId: string,
  input: {
    amount: number;
    method: "cash" | "card" | "bank_transfer" | "online";
    reference?: string;
  },
  byId: string | null,
) {
  return runAtomicMutation(async () => {
    const orders = await listTableRows<Record<string, any>>("commerce", "sales_order");
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error(serverMessages.procurementDocumentMissing);
    const currency = String(order.currency);
    await assertCompanyCurrency(currency);
    if (!validMoneyAmount(input.amount, currency))
      throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
    const amount = roundMoney(input.amount, currency);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      toMinorUnits(num(order.amountPaid) + amount, currency) >
        toMinorUnits(num(order.total), currency)
    )
      throw new Error(serverMessages.procurementOverpaid);
    if (["cancelled", "returned"].includes(String(order.status)))
      throw new Error(serverMessages.orderStatusInvalid);
    const invoiceId = await issueOrderInvoice(orderId, byId);
    const receipt = await createPayment({
      invoice_id: invoiceId,
      amount,
      payment_method: input.method,
      reference_number: input.reference?.slice(0, 100),
      created_by: byId ?? undefined,
      notes: String(order.number ?? ""),
    });
    const paid = roundMoney(num(order.amountPaid) + amount, currency);
    const full =
      toMinorUnits(paid, currency) >= toMinorUnits(num(order.total), currency);
    await upsertTableRow("commerce", "sales_order", {
      id: orderId,
      amountPaid: paid,
      paymentStatus: full ? "paid" : "pending",
      ...(full ? { paidAt: new Date().toISOString() } : {}),
      ...(full && order.status === "placed" ? { status: "paid" } : {}),
    });
    await upsertTableRow("commerce", "sales_order_event", {
      id: crypto.randomUUID(),
      orderId,
      kind: "payment",
      amount,
      note: input.reference?.slice(0, 100) || input.method,
      byId,
    });
    if (full && order.status === "placed") {
      await upsertTableRow("commerce", "sales_order_event", {
        id: crypto.randomUUID(),
        orderId,
        kind: "status",
        status: "paid",
        byId,
      });
    }
    return receipt.id;
  });
}

export async function recordOrderRefund(
  orderId: string,
  amountInput: number,
  reason: string,
  byId: string | null,
  toWallet = false,
) {
  return runAtomicMutation(async () => {
    const orders = await listTableRows<Record<string, any>>("commerce", "sales_order");
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error(serverMessages.procurementDocumentMissing);
    const currency = String(order.currency);
    if (!validMoneyAmount(amountInput, currency))
      throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
    const amount = roundMoney(amountInput, currency);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      toMinorUnits(num(order.amountRefunded) + amount, currency) >
        toMinorUnits(num(order.amountPaid), currency)
    )
      throw new Error(serverMessages.orderRefundTooLarge);
    const refunded = roundMoney(num(order.amountRefunded) + amount, currency);
    await upsertTableRow("commerce", "sales_order", {
      id: orderId,
      amountRefunded: refunded,
      paymentStatus:
        toMinorUnits(refunded, currency) >= toMinorUnits(num(order.amountPaid), currency)
          ? "refunded"
          : "partially_refunded",
    });
    const cleanReason = reason.trim().slice(0, 500);
    await upsertTableRow("commerce", "sales_order_event", {
      id: crypto.randomUUID(),
      orderId,
      kind: toWallet ? "refund_wallet" : "refund",
      amount,
      note: cleanReason || (toWallet ? "Refunded to customer wallet" : null),
      byId,
    });
    if (toWallet && order.customerId) {
      await adjustCustomerWallet(
        String(order.customerId),
        amount,
        `Order ${order.number ?? orderId} refund: ${cleanReason}`.trim().slice(0, 500),
        byId,
        "refund_credit",
        String(order.number ?? orderId),
      );
    }
  });
}

export async function addOrderNote(
  orderId: string,
  note: string,
  byId: string | null,
) {
  const text = note.trim().slice(0, 1000);
  if (!text) return;
  await upsertTableRow("commerce", "sales_order_event", {
    id: crypto.randomUUID(),
    orderId,
    kind: "note",
    note: text,
    byId,
  });
}

export async function saleProductOptions() {
  const [allProducts, allVariants] = await Promise.all([
    listTableRows<Record<string, any>>("inventory", "product", "name_en ASC"),
    listTableRows<Record<string, any>>("inventory", "product_variant", "sort_order ASC"),
  ]);
  const products = allProducts
    .filter((p) => p.isActive)
    .sort((a, b) => String(a.nameEn ?? "").localeCompare(String(b.nameEn ?? "")))
    .slice(0, 3000);
  return products.map((p) => {
    const options = normalizeProductOptions(p.options) ?? [];
    const variants = allVariants
      .filter((v) => v.productId === p.id && v.isActive)
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
    return {
      id: String(p.id),
      sku: String(p.sku ?? ""),
      barcode: String(p.barcode ?? ""),
      name_en: String(p.nameEn ?? ""),
      name_ar: String(p.nameAr ?? ""),
      price: num(p.price),
      variants: variants.map((v) => {
        const vals = Array.isArray(v.optionValues)
          ? v.optionValues
          : Array.isArray(v.attributes)
            ? v.attributes
            : v.attributes && typeof v.attributes === "object"
              ? Object.values(v.attributes).map(String)
              : [];
        return {
          id: String(v.id),
          sku: String(v.sku ?? ""),
          barcode: String(v.barcode ?? ""),
          label_en:
            variantLabel(options, vals, "en") ||
            String(v.nameEn ?? v.sku ?? ""),
          label_ar:
            variantLabel(options, vals, "ar") ||
            String(v.nameAr ?? v.nameEn ?? v.sku ?? ""),
          price: v.price == null ? num(p.price) : num(v.price),
        };
      }),
    };
  });
}
export type SaleProductOption = Awaited<
  ReturnType<typeof saleProductOptions>
>[number];

export async function deleteCoupon(id: string) {
  if (!id) throw new Error(serverMessages.invalidInput);
  await deleteTableRow("commerce", "coupon", id);
}

export interface GiftCardInput {
  id?: string;
  code: string;
  initialValue: string;
  currency?: string;
  recipientEmail?: string;
  note?: string;
  expiresAt?: string;
  isActive: boolean;
}

export async function listGiftCards() {
  const rows = await listTableRows<Record<string, any>>(
    "commerce",
    "gift_card",
    "created_at DESC",
  ).catch(() => []);
  return rows.map((r) => ({
    id: String(r.id),
    code: String(r.code ?? ""),
    initial_value: num(r.initialValue ?? r.initial_value),
    remaining_value: num(r.remainingValue ?? r.remaining_value),
    currency: String(r.currency ?? "BHD"),
    recipient_email: r.recipientEmail ?? r.recipient_email ?? "",
    note: r.note ?? "",
    is_active: Boolean(r.isActive ?? r.is_active ?? true),
    redeemed_by: r.redeemedBy ?? r.redeemed_by ?? null,
    redeemed_at: r.redeemedAt ?? r.redeemed_at ?? null,
    expires_at: r.expiresAt ? toIso(r.expiresAt).slice(0, 10) : null,
  }));
}
export type GiftCardRow = Awaited<ReturnType<typeof listGiftCards>>[number];

export async function saveGiftCard(input: GiftCardInput) {
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (!code || code.length < 4) throw new Error(serverMessages.couponCodeInvalid);
  const val = Number(input.initialValue);
  if (!Number.isFinite(val) || val <= 0 || val > 99_999) {
    throw new Error(serverMessages.productAmountInvalid);
  }
  const existing = await listGiftCards();
  const prev = input.id ? existing.find((g) => g.id === input.id) : null;
  if (existing.some((g) => g.code === code && g.id !== (input.id ?? ""))) {
    throw new Error(serverMessages.couponCodeTaken);
  }
  const currency = (input.currency || "BHD").trim().toUpperCase() || "BHD";
  const roundedVal = round3(val);
  return upsertTableRow("commerce", "gift_card", {
    id: input.id || crypto.randomUUID(),
    code,
    initialValue: roundedVal,
    remainingValue: prev ? Math.min(prev.remaining_value, roundedVal) : roundedVal,
    currency,
    recipientEmail: input.recipientEmail?.trim().toLowerCase().slice(0, 254) || null,
    note: input.note?.trim().slice(0, 500) || null,
    isActive: Boolean(input.isActive),
    expiresAt: input.expiresAt ? `${input.expiresAt}T23:59:59.999Z` : null,
  });
}

export async function deleteGiftCard(id: string) {
  if (!id) throw new Error(serverMessages.invalidInput);
  await deleteTableRow("commerce", "gift_card", id);
}

export async function listStoreCustomers() {
  const rows = await listTableRows<Record<string, any>>(
    "commerce",
    "customer",
    "created_at DESC",
  ).catch(() => []);
  return rows.map((c) => ({
    id: String(c.id),
    email: String(c.email ?? ""),
    name: String(c.name ?? ""),
    phone: String(c.phone ?? ""),
    loyalty_points: Math.floor(num(c.loyaltyPoints ?? c.loyalty_points)),
    wallet_balance: round3(num(c.walletBalance ?? c.wallet_balance)),
    discount_percent: num(c.discountPercent ?? c.discount_percent),
    tier: String(c.tier ?? "standard"),
  }));
}
export type StoreCustomerRow = Awaited<ReturnType<typeof listStoreCustomers>>[number];

export async function adjustCustomerWallet(
  customerId: string,
  deltaAmount: number,
  note: string,
  byId: string | null,
  kind = "admin_adjustment",
  reference?: string,
) {
  const amount = round3(Number(deltaAmount));
  if (!customerId || !Number.isFinite(amount) || amount === 0) {
    throw new Error(serverMessages.productAmountInvalid);
  }
  const customers = await listStoreCustomers();
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) throw new Error(serverMessages.procurementDocumentMissing);
  const nextBalance = Math.max(0, round3(customer.wallet_balance + amount));
  await upsertTableRow("commerce", "customer", {
    id: customerId,
    walletBalance: nextBalance,
  });
  await upsertTableRow("commerce", "customer_wallet_tx", {
    id: crypto.randomUUID(),
    customerId,
    kind,
    amount,
    balanceAfter: nextBalance,
    reference: reference ?? null,
    note: note.trim().slice(0, 500) || null,
    createdBy: byId,
  });
  return { id: customerId, wallet_balance: nextBalance };
}

export async function adjustCustomerPoints(
  customerId: string,
  deltaPoints: number,
  note: string,
  byId: string | null,
) {
  const delta = Math.trunc(Number(deltaPoints));
  if (!customerId || !Number.isFinite(delta) || delta === 0) {
    throw new Error(serverMessages.productAmountInvalid);
  }
  const customers = await listStoreCustomers();
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) throw new Error(serverMessages.procurementDocumentMissing);
  const nextPoints = Math.max(0, customer.loyalty_points + delta);
  await upsertTableRow("commerce", "customer", {
    id: customerId,
    loyaltyPoints: nextPoints,
  });
  await upsertTableRow("commerce", "customer_points_tx", {
    id: crypto.randomUUID(),
    customerId,
    kind: "admin_adjustment",
    points: delta,
    balanceAfter: nextPoints,
    note: note.trim().slice(0, 500) || null,
    createdBy: byId,
  });
  return { id: customerId, loyalty_points: nextPoints };
}

export async function saveCustomerAccountDiscount(
  customerId: string,
  discountPercentInput: number,
  tierInput: string,
) {
  const pct = Number(discountPercentInput);
  if (!customerId || !Number.isFinite(pct) || pct < 0 || pct > 100) {
    throw new Error(serverMessages.productAmountInvalid);
  }
  const tier = ["standard", "silver", "gold", "vip"].includes(tierInput.trim().toLowerCase())
    ? tierInput.trim().toLowerCase()
    : "standard";
  await upsertTableRow("commerce", "customer", {
    id: customerId,
    discountPercent: Math.round(pct * 100) / 100,
    tier,
  });
  return { id: customerId, discount_percent: pct, tier };
}

export async function listOrderReturnRequests() {
  const [requests, orders] = await Promise.all([
    listTableRows<Record<string, any>>(
      "commerce",
      "order_return_request",
      "created_at DESC",
    ).catch(() => []),
    listTableRows<Record<string, any>>("commerce", "sales_order").catch(() => []),
  ]);
  const orderById = new Map<string, Record<string, any>>(
    orders.map((o) => [String(o.id), o] as const),
  );
  return requests.map((r) => {
    const ord = orderById.get(String(r.orderId ?? r.order_id));
    return {
      id: String(r.id),
      order_id: String(r.orderId ?? r.order_id ?? ""),
      order_number: String(ord?.number ?? r.orderId ?? ""),
      customer_id: r.customerId ?? r.customer_id ?? null,
      customer_name: String(ord?.name ?? ""),
      status: String(r.status ?? "pending"),
      refund_destination: String(r.refundDestination ?? r.refund_destination ?? "wallet"),
      amount_requested: num(r.amountRequested ?? r.amount_requested),
      currency: String(ord?.currency ?? "BHD"),
      reason: String(r.reason ?? ""),
      resolution_note: r.resolutionNote ?? r.resolution_note ?? null,
      created_at: r.createdAt ? toIso(r.createdAt) : new Date().toISOString(),
    };
  });
}
export type AdminOrderReturnRequestRow = Awaited<
  ReturnType<typeof listOrderReturnRequests>
>[number];

export async function resolveOrderReturnRequest(
  requestId: string,
  decision: "approve_wallet" | "approve_original" | "reject",
  note: string,
  byId: string | null,
) {
  const requests = await listOrderReturnRequests();
  const req = requests.find((r) => r.id === requestId);
  if (!req) throw new Error(serverMessages.procurementDocumentMissing);

  const cleanNote = note.trim().slice(0, 500);
  const now = new Date().toISOString();
  if (decision === "reject") {
    await upsertTableRow("commerce", "order_return_request", {
      id: requestId,
      status: "rejected",
      resolutionNote: cleanNote || "Rejected",
      resolvedBy: byId,
      resolvedAt: now,
    });
    return { id: requestId, status: "rejected" };
  }

  const toWallet = decision === "approve_wallet";
  if (req.amount_requested > 0) {
    await recordOrderRefund(
      req.order_id,
      req.amount_requested,
      cleanNote || `Return request approved (${toWallet ? "wallet" : "original"})`,
      byId,
      toWallet,
    ).catch(async () => {
      if (toWallet && req.customer_id) {
        await adjustCustomerWallet(
          req.customer_id,
          req.amount_requested,
          cleanNote || `Return refund for order ${req.order_number}`,
          byId,
          "refund_credit",
          req.order_number,
        );
      }
    });
  }

  await upsertTableRow("commerce", "order_return_request", {
    id: requestId,
    status: "refunded",
    refundDestination: toWallet ? "wallet" : "original_payment",
    resolutionNote: cleanNote || "Approved & refunded",
    resolvedBy: byId,
    resolvedAt: now,
  });
  return { id: requestId, status: "refunded" };
}

export interface StoreCustomCategoryInput {
  id?: string;
  slug: string;
  nameEn: string;
  nameAr?: string;
  icon?: string;
  displayOrder?: number;
  featured?: boolean;
  isActive?: boolean;
}

export async function listStoreCustomCategories(): Promise<CustomStoreCategorySpec[]> {
  const settings = await getStoreSettings();
  return settings.custom_categories.map((c) => ({ ...c }));
}

export async function saveStoreCustomCategory(
  input: StoreCustomCategoryInput,
): Promise<CustomStoreCategorySpec[]> {
  const current = await listStoreCustomCategories();
  const normalizedSlug = (input.slug || input.nameEn)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!normalizedSlug || !input.nameEn.trim()) {
    throw new Error(serverMessages.productAmountInvalid);
  }
  const existingIdx = current.findIndex(
    (c) => (input.id && c.id === input.id) || c.slug.toLowerCase() === normalizedSlug,
  );
  const entry: CustomStoreCategorySpec = {
    id: input.id?.trim() || (existingIdx >= 0 ? current[existingIdx]!.id : `cat-${normalizedSlug}`),
    slug: normalizedSlug,
    name_en: input.nameEn.trim().slice(0, 120),
    name_ar: (input.nameAr ?? input.nameEn).trim().slice(0, 120) || input.nameEn.trim().slice(0, 120),
    icon: (input.icon ?? "tag").trim().slice(0, 40) || "tag",
    display_order: Number(input.displayOrder ?? (existingIdx >= 0 ? current[existingIdx]!.display_order : current.length + 1)) || current.length + 1,
    featured: input.featured ?? true,
    is_active: input.isActive ?? true,
  };
  const next =
    existingIdx >= 0
      ? current.map((item, idx) => (idx === existingIdx ? entry : item))
      : [...current, entry];
  next.sort((a, b) => a.display_order - b.display_order);
  await upsertTableRow("commerce", "store_settings", {
    id: "default",
    customCategoriesJson: JSON.stringify(next),
  });
  return next;
}

export async function deleteStoreCustomCategory(
  idOrSlug: string,
): Promise<CustomStoreCategorySpec[]> {
  const target = idOrSlug.trim();
  const current = await listStoreCustomCategories();
  const next = current.filter(
    (c) => c.id !== target && c.slug !== target,
  );
  await upsertTableRow("commerce", "store_settings", {
    id: "default",
    customCategoriesJson: JSON.stringify(next),
  });
  return next;
}
