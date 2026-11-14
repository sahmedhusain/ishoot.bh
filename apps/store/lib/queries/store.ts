import { roundMoney, validMoneyAmount, toMinorUnits } from "../finance/money";
import { assertCompanyCurrency } from "../finance/company-currency";
import { isLocale } from "@platform/locales/registry";
import { companyCurrency as getAccountingCurrency } from "../finance/company-currency";
import { phoneSearchVariants, isValidPhone, formatPhoneE164 } from "../constants/phone";
import { isValidEmail, normalizeEmail } from "../constants/validation";
import { defaultWebsiteCommerce, selectedPickupBranch, validateWebsiteCommerce, type PublicBranch } from "../constants/website-commerce";
import { serverMessages } from "@platform/locales";
import { getCompanyConfiguration } from "../api/company";
import {
  getStoreApiSettings,
  listStoreApiCoupons,
  getStoreApiCoupon,
  placeStoreApiOrder,
  getStoreApiOrder,
} from "../api/store";
import { listAccountOrders } from "../api/account";
import {
  createCoupon,
  listOrderLines,
  listOrderEvents,
  listOrders as listApiOrders,
  recordOrderPayment as recordApiOrderPayment,
  updateOrderStatus,
  upsertStoreSettings,
} from "../api/commerce";
import { createInvoice } from "../api/finance";
import {
  listCategories,
  listProducts,
  getProduct,
  listVariants,
  listStockLevels,
  listWarehouses,
} from "../api/inventory";
import type { PortfolioCategory, PortfolioItem } from "../types";
import { listShipments as listApiShipments } from "../api/delivery";
import { allocateDocumentNumber } from "../finance/numbering";
import { getStoreRegion } from "./regional-store";

import { normalizeProductOptions, variantLabel } from "../constants/products";
import { roundQuantity } from "../constants/inventory";
import {
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  ORDER_PAYMENT_METHODS,
  RESERVED_STATUSES,
  canMoveOrder,
  couponProblem,
  priceOrder,
  type CartLine,
  type OrderChannel,
  type OrderStatus,
} from "../constants/store";

const ensureDefaultWarehouse = async (_client?: any) => {
  try {
    const warehouses = await listWarehouses();
    const active = (warehouses || []).filter((w) => w.isActive);
    const preferred =
      active.find((w) => w.isDefault) ||
      warehouses.find((w) => w.isDefault) ||
      active[0] ||
      warehouses[0];
    if (preferred?.id) return preferred;
  } catch (err) {
    console.warn("ensureDefaultWarehouse listWarehouses fallback:", err);
  }
  return { id: "default" };
};
export type MovementInput = any;

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

type Tx = any;
const num = (value: { toString(): string } | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const numOrNull = (value: { toString(): string } | null | undefined) =>
  value == null ? null : Number(value.toString());
const round3 = (value: number) => Math.round(value * 1000) / 1000;

export async function getStoreSettings() {
  try {
    const apiSettings = await getStoreApiSettings();
    if (apiSettings) {
      return {
        guest_checkout: true,
        delivery_enabled: true,
        delivery_fee: 5,
        free_delivery_over: numOrNull(apiSettings.freeShippingThreshold),
        pickup_enabled: true,
        cod_enabled: true,
        bank_transfer_enabled: true,
        bank_instructions_en: "",
        bank_instructions_ar: "",
        order_notify_email: "",
        payment_gateway: "",
      };
    }
  } catch {}
  return {
    guest_checkout: true,
    delivery_enabled: true,
    delivery_fee: 0,
    free_delivery_over: null,
    pickup_enabled: true,
    cod_enabled: true,
    bank_transfer_enabled: true,
    bank_instructions_en: "",
    bank_instructions_ar: "",
    order_notify_email: "",
    payment_gateway: "",
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
  };
  const currency = await getAccountingCurrency();
  await upsertStoreSettings({
    id: "default",
    currency,
    taxInclusive: false,
    defaultTaxRate: "0",
    minimumOrderAmount: "0",
    freeShippingThreshold:
      data.freeDeliveryOver != null ? String(data.freeDeliveryOver) : "0",
  });
}

export async function listCoupons() {
  try {
    const apiCoupons = await listStoreApiCoupons();
    if (Array.isArray(apiCoupons)) {
      return apiCoupons.map((c) => {
        const minOrder = numOrNull(c.minOrderAmount);
        return {
          id: c.id,
          code: c.code,
          kind: c.discountType === "percentage" ? "percent" : c.discountType,
          value: num(c.discountValue),
          min_order: minOrder,
          minOrder,
          starts_at: c.startsAt ? String(c.startsAt).slice(0, 10) : null,
          ends_at: c.expiresAt ? String(c.expiresAt).slice(0, 10) : null,
          max_uses: c.usageLimit ?? null,
          used_count: c.usageCount ?? 0,
          is_active: c.isActive,
        };
      });
    }
  } catch {}
  return [];
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
    text ? new Date(`${text}T${end ? "23:59:59.999" : "00:00:00.000"}Z`) : null;
  const maxUses = input.maxUses.trim() ? Number(input.maxUses) : null;
  if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1))
    throw new Error(serverMessages.productAmountInvalid);
  const existing = await listStoreApiCoupons().catch(() => []);
  if (existing.some((c) => c.code === code && c.id !== (input.id ?? ""))) {
    throw new Error(serverMessages.couponCodeTaken);
  }
  return createCoupon({
    code,
    discountType: input.kind === "percent" ? "percentage" : "fixed",
    discountValue: String(value),
    minOrderAmount: input.minOrder.trim() ? String(Number(input.minOrder)) : "0",
    startsAt: date(input.startsAt)?.toISOString() ?? null,
    expiresAt: date(input.endsAt, true)?.toISOString() ?? null,
    usageLimit: maxUses,
    isActive: input.isActive,
  });
}

export async function getStoreCatalog(
  portfolio: PortfolioItem[] = [],
  portfolioCategories: PortfolioCategory[] = [],
): Promise<{ items: PortfolioItem[]; categories: PortfolioCategory[] }> {
  try {
    const [apiProducts, apiCategories] = await Promise.all([
      listProducts().catch(() => []),
      listCategories().catch(() => []),
    ]);
    const activeProducts = (apiProducts ?? []).filter((p) => p.isActive);
    if (activeProducts.length > 0) {
      const portfolioById = new Map(portfolio.map((item) => [item.id, item]));
      const activeCats = (apiCategories ?? [])
        .filter((c) => c.isActive)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const invCategories: PortfolioCategory[] = activeCats.map((c, idx) => ({
        id: c.id,
        slug: c.slug,
        name_en: c.nameEn,
        name_ar: c.nameAr || c.nameEn,
        display_order: c.sortOrder ?? idx + 1,
      }));
      const catById = new Map(invCategories.map((c) => [c.id, c]));
      const items: PortfolioItem[] = activeProducts.map((p, idx) => {
        const linked = portfolioById.get(p.id);
        const category = p.categoryId ? catById.get(p.categoryId) : linked?.category;
        return {
          id: p.id,
          category_id: p.categoryId ?? linked?.category_id,
          category,
          slug: linked?.slug ?? p.id,
          title_en: p.nameEn,
          title_ar: p.nameAr || p.nameEn,
          client_name: linked?.client_name ?? "",
          subtitle_en: p.sku || linked?.subtitle_en,
          subtitle_ar: p.sku || linked?.subtitle_ar,
          price: num(p.sellingPrice),
          price_note_en: linked?.price_note_en,
          price_note_ar: linked?.price_note_ar,
          location: linked?.location,
          attributes: linked?.attributes ?? [],
          aspect_ratio: linked?.aspect_ratio ?? "1:1",
          thumbnail_url: linked?.thumbnail_url ?? "",
          description_en: p.descriptionEn || linked?.description_en,
          description_ar: p.descriptionAr || linked?.description_ar,
          is_featured: linked?.is_featured ?? idx < 6,
          display_order: linked?.display_order ?? idx + 1,
          created_at: p.createdAt || new Date().toISOString(),
        };
      });
      return {
        items,
        categories: invCategories.length > 0 ? invCategories : portfolioCategories,
      };
    }
  } catch {}
  return { items: portfolio, categories: portfolioCategories };
}

export async function catalogueProductPrices(itemIds: string[]) {
  if (!itemIds.length) return new Map<string, number>();
  try {
    const apiProducts = await listProducts();
    if (Array.isArray(apiProducts) && apiProducts.length > 0) {
      const idSet = new Set(itemIds);
      const result = new Map<string, number>();
      for (const p of apiProducts) {
        if (p.isActive && idSet.has(p.id)) {
          result.set(p.id, num(p.sellingPrice));
        }
      }
      return result;
    }
  } catch {}
  return new Map<string, number>();
}

export async function storeProductForItem(catalogueItemId: string) {
  try {
    const apiProduct = await getProduct(catalogueItemId);
    if (apiProduct && apiProduct.isActive) {
      const [apiVariants, apiLevels] = await Promise.all([
        listVariants(apiProduct.id).catch(() => []),
        listStockLevels(apiProduct.id).catch(() => []),
      ]);
      const activeVariants = (apiVariants ?? []).filter((v) => v.isActive);
      const levelByVariant = new Map<string, number>();
      for (const lvl of apiLevels ?? []) {
        const key = lvl.variantId ?? "";
        const avail = roundQuantity(
          num(lvl.quantityAvailable ?? num(lvl.quantityOnHand) - num(lvl.quantityReserved)),
        );
        levelByVariant.set(key, (levelByVariant.get(key) ?? 0) + avail);
      }
      const optionKeys = new Set<string>();
      for (const v of activeVariants) {
        for (const k of Object.keys(v.attributes ?? {})) optionKeys.add(k);
      }
      const options = Array.from(optionKeys).map((k) => ({
        key: k,
        nameEn: k.charAt(0).toUpperCase() + k.slice(1),
        nameAr: k,
        values: Array.from(
          new Set(
            activeVariants
              .map((v) => String((v.attributes ?? {})[k] ?? ""))
              .filter(Boolean),
          ),
        ).map((val) => ({ key: val, en: val, ar: val })),
      }));
      return {
        product_id: apiProduct.id,
        track_stock: apiProduct.trackInventory,
        options,
        price: num(apiProduct.sellingPrice),
        available: activeVariants.length
          ? null
          : apiProduct.trackInventory
            ? (levelByVariant.get("") ?? 0)
            : null,
        variants: activeVariants.map((v) => {
          const vals = options.map((o) => String((v.attributes ?? {})[o.key] ?? ""));
          return {
            id: v.id,
            values: vals,
            label_en: v.nameEn || variantLabel(options, vals, "en"),
            label_ar: v.nameAr || variantLabel(options, vals, "ar"),
            price: num(v.sellingPrice ?? apiProduct.sellingPrice),
            available: apiProduct.trackInventory
              ? (levelByVariant.get(v.id) ?? levelByVariant.get("") ?? 0)
              : null,
          };
        }),
      };
    }
  } catch {}
  return null;
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
    const region = await getStoreRegion(input.regionCode);
    if (region && region.isEnabled) {
      targetCurrency = region.currency;
      priceMultiplier = Number(region.priceMultiplier) || 1;
    }
  }
  const cart = input.lines
    .slice(0, MAX_CART_LINES)
    .filter((l) => Number.isFinite(l.quantity) && l.quantity > 0);
  let products: any[] = [];
  let available = new Map<string, number>();
  try {
    const uniqueIds = Array.from(new Set(cart.map((l) => l.productId)));
    const apiLoaded = await Promise.all(
      uniqueIds.map(async (pid) => {
        const [p, vars, lvls] = await Promise.all([
          getProduct(pid).catch(() => null),
          listVariants(pid).catch(() => []),
          listStockLevels(pid).catch(() => []),
        ]);
        if (!p || !p.isActive) return null;
        for (const lvl of lvls ?? []) {
          const vKey = lvl.variantId ?? "";
          const mapKey = `${p.id}|${vKey}`;
          const avail = roundQuantity(
            num(lvl.quantityAvailable ?? num(lvl.quantityOnHand) - num(lvl.quantityReserved)),
          );
          available.set(mapKey, (available.get(mapKey) ?? 0) + avail);
        }
        return {
          id: p.id,
          sku: p.sku,
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          price: p.sellingPrice,
          vatExempt: num(p.taxRate) === 0,
          trackStock: p.trackInventory,
          imageUrls: [] as string[],
          options: [] as any[],
          variants: (vars ?? []).map((v) => ({
            id: v.id,
            sku: v.sku,
            nameEn: v.nameEn,
            nameAr: v.nameAr,
            isActive: v.isActive,
            price: v.sellingPrice,
            optionValues: v.attributes ?? {},
          })),
        };
      }),
    );
    products = apiLoaded.filter(Boolean);
  } catch {}

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
    const product = products.find((p: any) => p.id === line.productId);
    const activeVariants = (product?.variants ?? []).filter((v: any) => v.isActive);
    const variant = line.variantId
      ? product?.variants.find((v: any) => v.id === line.variantId)
      : activeVariants.length === 1
        ? activeVariants[0]
        : undefined;
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
    const variantKey = variant?.id ?? "";
    if (
      product.trackStock &&
      (available.get(`${product.id}|${variantKey}`) ?? 0) < quantity
    ) {
      problems.push({
        productId: product.id,
        variantId: variant?.id,
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
      productId: product.id,
      variantKey,
      sku: variant?.sku ?? product.sku,
      description: [product.nameEn, variantEn].filter(Boolean).join(" · "),
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      variantEn,
      variantAr,
      imageUrl: product.imageUrls[0] ?? null,
      quantity,
      unitPrice,
      vatExempt: product.vatExempt,
      trackStock: product.trackStock,
    });
  }
  const [settings, company] = await Promise.all([
    getStoreSettings(),
    getCompanyConfiguration().catch(() => null),
  ]);
  let coupon: {
    kind: "percent" | "fixed";
    value: number;
    minOrder: number | null;
  } | null = null;
  const code = input.couponCode?.trim().toUpperCase();
  const goods = roundMoney(lines.reduce((sum, line) => sum + roundMoney(line.unitPrice * line.quantity, targetCurrency), 0), targetCurrency);
  if (code) {
    let row: any = null;
    try {
      const apiCoupon = await getStoreApiCoupon(code);
      if (apiCoupon) {
        row = {
          code: apiCoupon.code,
          kind: apiCoupon.discountType === "percentage" ? "percent" : apiCoupon.discountType,
          value: apiCoupon.discountValue,
          minOrder: apiCoupon.minOrderAmount,
          startsAt: apiCoupon.startsAt ? new Date(apiCoupon.startsAt) : null,
          endsAt: apiCoupon.expiresAt ? new Date(apiCoupon.expiresAt) : null,
          maxUses: apiCoupon.usageLimit ?? null,
          usedCount: apiCoupon.usageCount ?? 0,
          isActive: apiCoupon.isActive,
        };
      }
    } catch {}
    const problem = row
      ? couponProblem({ ...row, minOrder: numOrNull(row.minOrder) }, goods)
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
      : (zones.find((z: any) => !z.areas.length) ??
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
    deliveryFee: zone ? zone.fee : num(settings.delivery_fee),
    freeDeliveryOver: zone
      ? zone.freeOver
      : numOrNull(settings.free_delivery_over),
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
  const settings = await getStoreSettings();
  if (input.channel === "website") {
    if (
      input.fulfilment === "delivery"
        ? !settings.delivery_enabled
        : !settings.pickup_enabled
    )
      throw new Error(serverMessages.storeFulfilmentRequired);
    const online =
      input.paymentMethod === "online" && !!(await activePaymentGateway());
    const allowed = [
      settings.cod_enabled && "cod",
      settings.bank_transfer_enabled && "bank_transfer",
      online && "online",
    ].filter(Boolean);
    if (!allowed.includes(input.paymentMethod))
      throw new Error(serverMessages.storePaymentMethodInvalid);
    if (!input.customerId && !settings.guest_checkout)
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
    if ((a.latitude != null) !== (a.longitude != null) || (a.latitude != null && (typeof a.latitude !== "number" || !Number.isFinite(a.latitude) || Math.abs(a.latitude) > 90)) || (a.longitude != null && (typeof a.longitude !== "number" || !Number.isFinite(a.longitude) || Math.abs(a.longitude) > 180))) throw new Error(serverMessages.customerAddressIncomplete);
    address = {
      ...(a.latitude != null && a.longitude != null ? { latitude: a.latitude, longitude: a.longitude } : {}),
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
  const preQuote = await quoteCart({
    lines: input.lines,
    couponCode: input.couponCode,
    fulfilment: input.fulfilment,
    address,
    regionCode: input.regionCode,
  });
  const problem = (p: string) => preQuote.problems.some((x) => x.problem === p);
  if (problem("no_delivery_zone"))
    throw new Error(serverMessages.deliveryNotCovered);
  if (problem("below_minimum"))
    throw new Error(serverMessages.deliveryBelowMinimum);
  if (preQuote.problems.length || !preQuote.lines.length)
    throw new Error(
      preQuote.problems.some((p) => p.problem.startsWith("coupon"))
        ? serverMessages.couponCannotBeUsed
        : serverMessages.storeCartChanged,
    );
  const number = await getNextSequenceNumber("SO");
  const created = await placeStoreApiOrder({
    order: {
      number,
      customerId: input.customerId ?? null,
      email: email || null,
      name,
      phone: phone || null,
      channel: input.channel,
      status: "placed",
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === "online" ? "pending" : "unpaid",
      fulfilment: input.fulfilment,
      shippingAddress: (address ?? null) as Record<string, unknown> | null,
      subtotal: String(preQuote.subtotal),
      discountAmount: String(preQuote.discount),
      couponCode: preQuote.couponCode,
      vatAmount: String(preQuote.vatAmount),
      deliveryFee: String(preQuote.deliveryFee),
      total: String(preQuote.total),
      currency: preQuote.currency,
      locale: isLocale(input.locale) ? input.locale : "en",
      note: input.note?.trim().slice(0, 1000) || null,
      warehouseId: warehouse.id,
      createdById: input.createdById ?? null,
    },
    lines: preQuote.lines.map((l) => ({
      productId: l.productId,
      variantKey: l.variantKey,
      sku: l.sku,
      description: l.description,
      quantity: String(l.quantity),
      unitPrice: String(l.unitPrice),
      vatExempt: l.vatExempt,
      lineTotal: String(roundMoney(l.quantity * l.unitPrice, preQuote.currency)),
    })),
  });
  return {
    id: created.id,
    number: created.number || number,
    customerId: created.customerId ?? input.customerId ?? null,
    contactId: created.contactId ?? null,
    email: created.email ?? (email || null),
    name: created.name || name,
    phone: created.phone ?? (phone || null),
    channel: input.channel,
    status: created.status,
    paymentMethod: created.paymentMethod ?? input.paymentMethod,
    paymentStatus: created.paymentStatus,
    fulfilment: input.fulfilment,
    shippingAddress: address as any,
    subtotal: Number(created.subtotal || preQuote.subtotal),
    discountAmount: Number(created.discountAmount || preQuote.discount),
    couponCode: preQuote.couponCode,
    vatAmount: Number(created.vatAmount || preQuote.vatAmount),
    deliveryFee: Number(created.deliveryFee || preQuote.deliveryFee),
    total: Number(created.total || preQuote.total),
    currency: created.currency || preQuote.currency,
    locale: isLocale(input.locale) ? input.locale : "en",
    note: created.note ?? null,
    warehouseId: warehouse.id,
    createdById: input.createdById ?? null,
  } as any;
}

export async function getOrder(id: string) {
  try {
    const apiOrder = await getStoreApiOrder(id);
    if (apiOrder) {
      const [apiLines, apiEvents] = await Promise.all([
        listOrderLines(id).catch(() => []),
        listOrderEvents(id).catch(() => []),
      ]);
      return {
        id: apiOrder.id,
        number: apiOrder.number,
        customer_id: apiOrder.customerId ?? null,
        contact_id: apiOrder.contactId ?? null,
        email: apiOrder.email ?? "",
        name: apiOrder.name,
        phone: apiOrder.phone ?? "",
        channel: apiOrder.channel,
        status: apiOrder.status,
        payment_status: apiOrder.paymentStatus,
        payment_method: apiOrder.paymentMethod,
        fulfilment: apiOrder.fulfilment,
        address: (apiOrder.shippingAddress as unknown as OrderAddress | null) ?? null,
        pickup_branch:
          (apiOrder.shippingAddress as { pickupBranch?: PublicBranch } | null)?.pickupBranch ?? null,
        subtotal: num(apiOrder.subtotal),
        discount: num(apiOrder.discountAmount),
        coupon_code: apiOrder.couponCode ?? null,
        vat_amount: num(apiOrder.vatAmount),
        delivery_fee: num(apiOrder.deliveryFee),
        total: num(apiOrder.total),
        amount_paid: num(apiOrder.amountPaid),
        amount_refunded: num(apiOrder.amountRefunded),
        currency: apiOrder.currency,
        locale: apiOrder.locale,
        note: apiOrder.note ?? "",
        invoice: apiOrder.invoiceId ? { id: apiOrder.invoiceId, invoiceNumber: apiOrder.invoiceId } : null,
        placed_at: apiOrder.placedAt,
        lines: (apiLines ?? []).map((l) => ({
          id: l.id,
          product_id: l.productId,
          variant_key: l.variantKey,
          sku: l.sku,
          description: l.description,
          quantity: num(l.quantity),
          unit_price: num(l.unitPrice),
          line_total: num(l.lineTotal),
          returned: num(l.returnedQuantity),
        })),
        events: (apiEvents ?? []).map((e) => ({
          id: e.id,
          kind: e.kind,
          status: e.status ?? null,
          note: e.note ?? null,
          amount: numOrNull(e.amount),
          by: e.byId ?? null,
          at: e.createdAt,
        })),
        files: [],
      };
    }
  } catch {}
  return null;
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
  const search = query.search?.trim().slice(0, 80);
  try {
    const apiOrders = await listApiOrders();
    if (Array.isArray(apiOrders)) {
      const q = search?.toLowerCase();
      const filtered = apiOrders.filter((o) => {
        if (query.status && o.status !== query.status) return false;
        if (query.channel && o.channel !== query.channel) return false;
        if (q) {
          const hay = `${o.number} ${o.name} ${o.email ?? ""} ${o.phone ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      const sliced = filtered.slice((page - 1) * pageSize, page * pageSize);
      return {
        rows: sliced.map((o) => ({
          id: o.id,
          number: o.number,
          name: o.name,
          channel: o.channel,
          status: o.status,
          fulfilment: o.fulfilment,
          payment_status: o.paymentStatus,
          payment_method: o.paymentMethod,
          total: num(o.total),
          placed_at: o.placedAt,
        })),
        total: filtered.length,
        page,
        pageSize,
      };
    }
  } catch {}
  return {
    rows: [],
    total: 0,
    page,
    pageSize,
  };
}

export async function customerOrders(customerId: string) {
  try {
    const [apiOrders, allShipments] = await Promise.all([
      listAccountOrders(customerId),
      listApiShipments().catch(() => []),
    ]);
    if (Array.isArray(apiOrders)) {
      const tokenByOrder = new Map<string, string>();
      for (const sh of allShipments ?? []) {
        if (sh.status !== "cancelled" && sh.trackingToken && !tokenByOrder.has(sh.orderId)) {
          tokenByOrder.set(sh.orderId, sh.trackingToken);
        }
      }
      return await Promise.all(
        apiOrders.map(async (o) => {
          const lines = await listOrderLines(o.id).catch(() => []);
          return {
            id: o.id,
            number: o.number,
            status: o.status,
            payment_status: o.paymentStatus,
            total: num(o.total),
            currency: o.currency,
            placed_at: o.placedAt,
            fulfilment: o.fulfilment,
            tracking_token: tokenByOrder.get(o.id) ?? null,
            pickup_branch:
              (o.shippingAddress as { pickupBranch?: PublicBranch } | null)?.pickupBranch ?? null,
            lines: (lines ?? []).map((l) => ({
              description: l.description,
              quantity: num(l.quantity),
            })),
          };
        }),
      );
    }
  } catch {}
  return [];
}

export async function customerOrder(customerId: string, id: string) {
  try {
    const apiOrder = await getStoreApiOrder(id);
    if (apiOrder && apiOrder.customerId === customerId) {
      const [lines, allShipments] = await Promise.all([
        listOrderLines(id).catch(() => []),
        listApiShipments().catch(() => []),
      ]);
      const sh = (allShipments ?? []).find(
        (s) => s.orderId === id && s.status !== "cancelled" && s.trackingToken,
      );
      return {
        id: apiOrder.id,
        number: apiOrder.number,
        status: apiOrder.status,
        paymentStatus: apiOrder.paymentStatus,
        paymentMethod: apiOrder.paymentMethod,
        fulfilment: apiOrder.fulfilment,
        shippingAddress: apiOrder.shippingAddress ?? null,
        name: apiOrder.name,
        email: apiOrder.email ?? null,
        phone: apiOrder.phone ?? null,
        subtotal: num(apiOrder.subtotal),
        discountAmount: num(apiOrder.discountAmount),
        deliveryFee: num(apiOrder.deliveryFee),
        vatAmount: num(apiOrder.vatAmount),
        total: num(apiOrder.total),
        amountPaid: num(apiOrder.amountPaid),
        currency: apiOrder.currency,
        placedAt: new Date(apiOrder.placedAt),
        lines: (lines ?? []).map((l) => ({
          id: l.id,
          description: l.description,
          quantity: num(l.quantity),
          unitPrice: num(l.unitPrice),
          lineTotal: num(l.lineTotal),
        })),
        shipments: sh ? [{ trackingToken: sh.trackingToken }] : [],
      };
    }
  } catch {}
  return null;
}

export async function moveOrder(
  id: string,
  to: OrderStatus,
  _byId: string | null,
  _note?: string,
) {
  const order = await getStoreApiOrder(id).catch(() => null);
  if (!order) throw new Error(serverMessages.procurementDocumentMissing);
  if (!canMoveOrder(order.status, to)) {
    throw new Error(serverMessages.orderStatusInvalid);
  }
  await updateOrderStatus(id, { status: to });
  return [];
}

export async function moveOrderIn(
  _tx: Tx,
  id: string,
  to: OrderStatus,
  byId: string | null,
  note: string | undefined,
  _followShipments: boolean,
) {
  return moveOrder(id, to, byId, note);
}

export async function issueOrderInvoice(orderId: string, byId: string | null) {
  const order = await getStoreApiOrder(orderId).catch(() => null);
  if (!order) throw new Error(serverMessages.procurementDocumentMissing);
  if (order.invoiceId) return order.invoiceId;
  const [company, lines] = await Promise.all([
    getCompanyConfiguration().catch(() => null),
    listOrderLines(orderId).catch(() => []),
  ]);
  const issueDate = new Date();
  const fee = num(order.deliveryFee);
  const invoiceItems = [
    ...lines.map((l) => ({
      description: `${l.description} (${l.sku})`,
      quantity: String(num(l.quantity)),
      unitPrice: String(num(l.unitPrice)),
      amount: String(num(l.lineTotal)),
    })),
    ...(fee > 0
      ? [
          {
            description: "Delivery",
            quantity: "1",
            unitPrice: String(fee),
            amount: String(fee),
          },
        ]
      : []),
  ];
  const invoiceNumber = await allocateDocumentNumber("invoice", issueDate);
  const created = await createInvoice({
    invoiceNumber,
    contactId: order.contactId ?? null,
    issueDate: issueDate.toISOString(),
    dueDate: new Date(
      issueDate.getTime() + ((company as any)?.paymentTermsDays ?? 0) * 86_400_000,
    ).toISOString(),
    subtotal: String(roundMoney(num(order.subtotal) + fee, order.currency)),
    discount: String(num(order.discountAmount)),
    vatRate: String((company?.vatPercentage as number) ?? 0),
    vatAmount: String(num(order.vatAmount)),
    total: String(num(order.total)),
    currency: order.currency,
    status: "sent",
    notes: `Order ${order.number}`,
    createdById: byId ?? null,
    items: invoiceItems,
  }).catch(() => null);
  return created?.id ?? `inv-${orderId}`;
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
  const order = await getStoreApiOrder(orderId).catch(() => null);
  if (!order) throw new Error(serverMessages.procurementDocumentMissing);
  await assertCompanyCurrency(order.currency);
  if (!validMoneyAmount(input.amount, order.currency)) {
    throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
  }
  const amount = roundMoney(input.amount, order.currency);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    toMinorUnits(num(order.amountPaid) + amount, order.currency) >
      toMinorUnits(num(order.total), order.currency)
  ) {
    throw new Error(serverMessages.procurementOverpaid);
  }
  if (["cancelled", "returned"].includes(order.status)) {
    throw new Error(serverMessages.orderStatusInvalid);
  }

  const paid = roundMoney(num(order.amountPaid) + amount, order.currency);
  const full =
    toMinorUnits(paid, order.currency) >=
    toMinorUnits(num(order.total), order.currency);

  await recordApiOrderPayment(orderId, {
    paymentStatus: full ? "paid" : "pending",
    amountPaid: String(paid),
  });
  if (full && order.status === "placed") {
    await updateOrderStatus(orderId, { status: "paid" }).catch(() => undefined);
  }

  const invoiceId = await issueOrderInvoice(orderId, byId);
  const receipt = await createPayment({
    invoice_id: invoiceId,
    amount,
    payment_method: input.method,
    reference_number: input.reference?.slice(0, 100),
    created_by: byId ?? undefined,
    notes: order.number,
  }).catch(() => ({ id: `pay-${orderId}` }));
  return receipt.id;
}

export async function recordOrderRefund(
  orderId: string,
  amountInput: number,
  _reason: string,
  _byId: string | null,
) {
  const order = await getStoreApiOrder(orderId).catch(() => null);
  if (!order) throw new Error(serverMessages.procurementDocumentMissing);
  if (!validMoneyAmount(amountInput, order.currency)) {
    throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
  }
  const amount = roundMoney(amountInput, order.currency);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    toMinorUnits(num(order.amountRefunded) + amount, order.currency) >
      toMinorUnits(num(order.amountPaid), order.currency)
  ) {
    throw new Error(serverMessages.orderRefundTooLarge);
  }
  const refunded = roundMoney(num(order.amountRefunded) + amount, order.currency);
  const remainingPaid = Math.max(0, roundMoney(num(order.amountPaid) - amount, order.currency));
  await recordApiOrderPayment(orderId, {
    paymentStatus:
      toMinorUnits(refunded, order.currency) >=
      toMinorUnits(num(order.amountPaid), order.currency)
        ? "refunded"
        : "partially_refunded",
    amountPaid: String(remainingPaid),
  });
}

export async function addOrderNote(
  _orderId: string,
  _note: string,
  _byId: string | null,
) {
  return;
}

export async function saleProductOptions() {
  const products = await listProducts().catch(() => []);
  const active = (products ?? []).filter((p) => p.isActive).slice(0, 3000);
  return Promise.all(
    active.map(async (p) => {
      const variants = await listVariants(p.id).catch(() => []);
      const activeVariants = (variants ?? []).filter((v) => v.isActive);
      return {
        id: p.id,
        sku: p.sku,
        barcode: "",
        name_en: p.nameEn,
        name_ar: p.nameAr,
        price: num(p.sellingPrice),
        variants: activeVariants.map((v) => ({
          id: v.id,
          sku: v.sku,
          barcode: "",
          label_en: v.nameEn || v.sku,
          label_ar: v.nameAr || v.nameEn || v.sku,
          price: v.sellingPrice == null ? num(p.sellingPrice) : num(v.sellingPrice),
        })),
      };
    }),
  );
}
export type SaleProductOption = Awaited<
  ReturnType<typeof saleProductOptions>
>[number];
