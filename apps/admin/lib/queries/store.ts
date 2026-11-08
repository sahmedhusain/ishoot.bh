import { roundMoney, validMoneyAmount, toMinorUnits } from "../finance/money";
import { assertCompanyCurrency } from "../finance/company-currency";
import { isLocale } from "@platform/locales/registry";
import { companyCurrency as getAccountingCurrency } from "../finance/company-currency";
import { Prisma } from "@prisma/client";
import { phoneSearchVariants, isValidPhone, formatPhoneE164 } from "../constants/phone";
import { isValidEmail, normalizeEmail } from "../constants/validation";
import { defaultWebsiteCommerce, selectedPickupBranch, validateWebsiteCommerce, type PublicBranch } from "../constants/website-commerce";
import { serverMessages } from "@platform/locales";
import { db, runAtomicMutation } from "../atomic";
import { allocateDocumentNumber } from "../finance/numbering";
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

type Tx = Prisma.TransactionClient;
const num = (value: { toString(): string } | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const numOrNull = (value: { toString(): string } | null | undefined) =>
  value == null ? null : Number(value.toString());
const round3 = (value: number) => Math.round(value * 1000) / 1000;

// ─── Settings and coupons ────────────────────────────────────────────────────────────────────────────────────────

export async function getStoreSettings() {
  const s = await db.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  return {
    guest_checkout: s.guestCheckout,
    delivery_enabled: s.deliveryEnabled,
    delivery_fee: num(s.deliveryFee),
    free_delivery_over: numOrNull(s.freeDeliveryOver),
    pickup_enabled: s.pickupEnabled,
    cod_enabled: s.codEnabled,
    bank_transfer_enabled: s.bankTransferEnabled,
    bank_instructions_en: s.bankInstructionsEn ?? "",
    bank_instructions_ar: s.bankInstructionsAr ?? "",
    order_notify_email: s.orderNotifyEmail ?? "",
    payment_gateway: s.paymentGateway ?? "",
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
  /** A payment gateway id for "Pay online", or empty for none. */
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
  await db.storeSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
}

export async function listCoupons() {
  const rows = await db.coupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    kind: c.kind,
    value: num(c.value),
    min_order: numOrNull(c.minOrder),
    starts_at: c.startsAt?.toISOString().slice(0, 10) ?? null,
    ends_at: c.endsAt?.toISOString().slice(0, 10) ?? null,
    max_uses: c.maxUses,
    used_count: c.usedCount,
    is_active: c.isActive,
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
    text ? new Date(`${text}T${end ? "23:59:59.999" : "00:00:00.000"}Z`) : null;
  const maxUses = input.maxUses.trim() ? Number(input.maxUses) : null;
  if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1))
    throw new Error(serverMessages.productAmountInvalid);
  if (
    await db.coupon.findFirst({
      where: { code, id: { not: input.id ?? "" } },
      select: { id: true },
    })
  )
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
  return input.id
    ? db.coupon.update({ where: { id: input.id }, data })
    : db.coupon.create({ data });
}

// ─── What the website sells ──────────────────────────────────────────────────────────────────────────────────────

/** Current prices for catalogue cards, in one query; authored project prices stay independent. */
export async function catalogueProductPrices(itemIds: string[]) {
  const products = await db.product.findMany({
    where: { catalogueItemId: { in: itemIds }, isActive: true },
    select: { catalogueItemId: true, price: true, variants: { where: { isActive: true }, select: { price: true } } },
  });
  return new Map(products.map(product => [product.catalogueItemId!, Math.min(...(product.variants.length ? product.variants.map(variant => num(variant.price ?? product.price)) : [num(product.price)]))]));
}

/** The product behind a catalogue item, with each variant's price and what is available to sell. */
export async function storeProductForItem(catalogueItemId: string) {
  const product = await db.product.findFirst({
    where: { catalogueItemId, isActive: true },
    include: {
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) return null;
  const options = normalizeProductOptions(product.options) ?? [];
  const available = await availableByItem([product.id]);
  const left = (variantKey: string) =>
    product.trackStock
      ? (available.get(`${product.id}|${variantKey}`) ?? 0)
      : null;
  return {
    product_id: product.id,
    track_stock: product.trackStock,
    options,
    price: num(product.price),
    available: product.variants.length ? null : left(""),
    variants: product.variants.map((v) => ({
      id: v.id,
      values: v.optionValues,
      label_en: variantLabel(options, v.optionValues, "en"),
      label_ar: variantLabel(options, v.optionValues, "ar"),
      price: v.price == null ? num(product.price) : num(v.price),
      available: left(v.id),
    })),
  };
}

async function availableByItem(
  productIds: string[],
  client: Tx | typeof db = db,
) {
  const levels = await client.stockLevel.groupBy({
    by: ["productId", "variantKey"],
    where: {
      productId: { in: productIds },
      location: { isActive: true, warehouse: { isActive: true } },
    },
    _sum: { onHand: true, reserved: true },
  });
  return new Map<string, number>(
    levels.map((l: any) => [
      `${l.productId}|${l.variantKey}`,
      roundQuantity(num(l._sum.onHand) - num(l._sum.reserved)),
    ]),
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

/**
 * Prices a cart from the catalogue (never from the browser): each line's current price, whether it can still be
 * sold in that quantity, the coupon, delivery and VAT. Lines that cannot be sold are reported, not priced.
 */
export async function quoteCart(
  input: {
    lines: CartLine[];
    couponCode?: string;
    fulfilment: "delivery" | "pickup";
    address?: { area?: string; city?: string } | null;
    regionCode?: string;
  },
  client: Tx | typeof db = db,
) {
  const accountingCurrency = await getAccountingCurrency();
  let targetCurrency = accountingCurrency;
  let priceMultiplier = 1;
  if (input.regionCode) {
    const region = await client.storeRegion.findUnique({
      where: { code: input.regionCode.trim().toUpperCase() },
    });
    if (region && region.isEnabled) {
      targetCurrency = region.currency;
      priceMultiplier = Number(region.priceMultiplier) || 1;
    }
  }
  const cart = input.lines
    .slice(0, MAX_CART_LINES)
    .filter((l) => Number.isFinite(l.quantity) && l.quantity > 0);
  const products = await client.product.findMany({
    where: { id: { in: cart.map((l) => l.productId) }, isActive: true },
    include: { variants: true },
  });
  const available = await availableByItem(
    products.map((p) => p.id),
    client,
  );
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
    client.storeSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }),
    client.companySetting.findFirst({
      select: { vatEnabled: true, vatPercentage: true, defaultCurrency: true },
    }),
  ]);
  let coupon: {
    kind: "percent" | "fixed";
    value: number;
    minOrder: number | null;
  } | null = null;
  const code = input.couponCode?.trim().toUpperCase();
  const goods = roundMoney(lines.reduce((sum, line) => sum + roundMoney(line.unitPrice * line.quantity, targetCurrency), 0), targetCurrency);
  if (code) {
    const row = await client.coupon.findUnique({ where: { code } });
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
  // Delivery zones, when the company uses them, set the fee, minimum order and free-delivery threshold by address.
  // Without an address yet (the cart), the zone that covers everywhere else, or the cheapest, gives the estimate.
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

// ─── Placing orders ──────────────────────────────────────────────────────────────────────────────────────────────

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
  /** The delivery slot the customer chose, if any. */
  slot?: ShipmentSlotChoice | null;
  /** The marketing campaign that brought the customer, when known. */
  utm?: { campaign: string; source: string; medium: string } | null;
}

/** The CRM contact for an order: the customer's, the one given, else one matched or created by e-mail. */
async function orderContact(tx: Tx, input: PlaceOrderInput) {
  if (input.contactId) return input.contactId;
  if (input.customerId) {
    const customer = await tx.customer.findUnique({
      where: { id: input.customerId },
      select: { crmContactId: true },
    });
    if (customer?.crmContactId) return customer.crmContactId;
  }
  const email = input.email.trim().toLowerCase();
  if (email) {
    const existing = await tx.crmContact.findFirst({
      where: { emailNorm: email, contactType: { not: "vendor" } },
      select: { id: true },
    });
    if (existing) return existing.id;
  }
  const [firstName, ...rest] = input.name.trim().split(/\s+/);
  return (
    await tx.crmContact.create({
      data: {
        firstName: firstName || input.name,
        lastName: rest.join(" ") || null,
        email: email || null,
        emailNorm: email || null,
        phone: input.phone ? formatPhoneE164(input.phone) : null,
        contactType: "client",
        clientKind: "individual",
      },
    })
  ).id;
}

/**
 * Places an order: prices the cart again, holds the stock (at the default warehouse's location with the most
 * available, else any warehouse), counts the coupon, and records the order with its first history entry.
 */
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
  const settings = await db.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
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
  return db.$transaction(async (tx) => {
    await assertCompanyCurrency(undefined, tx);
    let pickupBranch: PublicBranch | null = null;
    if (input.channel === "website") {
      const publication = await tx.websiteContent.findUnique({ where: { id: "main" }, select: { published: true } });
      const raw = (publication?.published as { config?: { commerce?: unknown } } | null)?.config?.commerce;
      const commerce = raw ? validateWebsiteCommerce(raw) : defaultWebsiteCommerce();
      if (!commerce.capabilities.shop || !commerce.capabilities.ordering || !commerce.capabilities[input.fulfilment])
        throw new Error(serverMessages.storeFulfilmentRequired);
      if (input.fulfilment === "pickup") pickupBranch = selectedPickupBranch(commerce, input.pickupBranchId);
    }
    // Snapshot public collection details without coupling the branch to a stock warehouse.
    const destination = pickupBranch ? {
      name: input.locale === "ar" ? pickupBranch.nameAr : pickupBranch.nameEn,
      phone: pickupBranch.phone,
      line1: input.locale === "ar" ? pickupBranch.addressAr : pickupBranch.addressEn,
      city: pickupBranch.city, country: pickupBranch.country, pickupBranch,
    } : address;
    const quote = await quoteCart(
      {
        lines: input.lines,
        couponCode: input.couponCode,
        fulfilment: input.fulfilment,
        address,
        regionCode: input.regionCode,
      },
      tx,
    );
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
    // Hold the stock for every line that keeps stock.
    const held: { locationId: string | null }[] = [];
    for (const line of quote.lines) {
      if (!line.trackStock) {
        held.push({ locationId: null });
        continue;
      }
      const levels = await tx.stockLevel.findMany({
        where: {
          productId: line.productId,
          variantKey: line.variantKey,
          batchKey: "",
          location: { isActive: true, warehouse: { isActive: true } },
        },
        include: { location: true },
      });
      const ranked = levels
        .map((l) => ({
          id: l.locationId,
          free: num(l.onHand) - num(l.reserved),
          home: l.location.warehouseId === warehouse.id,
        }))
        .filter((l) => l.free >= line.quantity)
        .sort((a, b) => Number(b.home) - Number(a.home) || b.free - a.free);
      if (!ranked.length) throw new Error(serverMessages.storeCartChanged);
      await reserveStock(tx, {
        productId: line.productId,
        variantId: line.variantKey || undefined,
        locationId: ranked[0].id,
        quantity: line.quantity,
      });
      held.push({ locationId: ranked[0].id });
    }
    if (quote.couponCode) {
      const used =
        await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = "usedCount" + 1 WHERE code = ${quote.couponCode} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
      if (!used) throw new Error(serverMessages.couponCannotBeUsed);
    }
    const contactId = await orderContact(tx, { ...input, email, name });
    const number = await getNextSequenceNumber("SO", undefined, tx);
    const order = await tx.salesOrder.create({
      data: {
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
        shippingAddress: destination
          ? (destination as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
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
        lines: {
          create: quote.lines.map((l, index) => ({
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
          })),
        },
        events: {
          create: {
            kind: "status",
            status: "placed",
            byId: input.createdById ?? null,
          },
        },
      },
    });
    if (input.fulfilment === "delivery")
      await createShipmentForOrder(tx, order, {
        zoneId: quote.zoneId,
        slot: input.slot ?? null,
        requireSlot: input.channel === "website",
      });
    return order;
  });
}

// ─── Reading orders ──────────────────────────────────────────────────────────────────────────────────────────────

export async function getOrder(id: string) {
  const o = await db.salesOrder.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!o) return null;
  const people = await db.user.findMany({
    where: {
      id: { in: o.events.map((e) => e.byId).filter((v): v is string => !!v) },
    },
    select: { id: true, fullName: true },
  });
  const invoice = o.invoiceId
    ? await db.invoice.findUnique({
        where: { id: o.invoiceId },
        select: { id: true, invoiceNumber: true },
      })
    : null;
  // Files kept on the order, such as the customer's proof of a bank transfer.
  const files = await db.attachment.findMany({
    where: { entityType: "sales_order", entityId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, fileName: true, fileUrl: true, createdAt: true },
  });
  return {
    id: o.id,
    number: o.number,
    customer_id: o.customerId,
    contact_id: o.contactId,
    email: o.email ?? "",
    name: o.name,
    phone: o.phone ?? "",
    channel: o.channel,
    status: o.status,
    payment_status: o.paymentStatus,
    payment_method: o.paymentMethod,
    fulfilment: o.fulfilment,
    address: (o.shippingAddress as OrderAddress | null) ?? null,
    pickup_branch: (o.shippingAddress as { pickupBranch?: PublicBranch } | null)?.pickupBranch ?? null,
    subtotal: num(o.subtotal),
    discount: num(o.discountAmount),
    coupon_code: o.couponCode,
    vat_amount: num(o.vatAmount),
    delivery_fee: num(o.deliveryFee),
    total: num(o.total),
    amount_paid: num(o.amountPaid),
    amount_refunded: num(o.amountRefunded),
    currency: o.currency,
    locale: o.locale,
    note: o.note ?? "",
    invoice,
    placed_at: o.placedAt.toISOString(),
    lines: o.lines.map((l) => ({
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
    events: o.events.map((e) => ({
      id: e.id,
      kind: e.kind,
      status: e.status,
      note: e.note,
      amount: numOrNull(e.amount),
      by: people.find((p) => p.id === e.byId)?.fullName ?? null,
      at: e.createdAt.toISOString(),
    })),
    files: files.map((f) => ({
      id: f.id,
      name: f.fileName,
      url: f.fileUrl,
      at: f.createdAt.toISOString(),
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
  const search = query.search?.trim().slice(0, 80);
  const where: Prisma.SalesOrderWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.channel ? { channel: query.channel } : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            ...phoneSearchVariants(search).map((v) => ({ phone: { contains: v } })),
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.salesOrder.findMany({
      where,
      orderBy: [{ placedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.salesOrder.count({ where }),
  ]);
  return {
    rows: rows.map((o) => ({
      id: o.id,
      number: o.number,
      name: o.name,
      channel: o.channel,
      status: o.status,
      fulfilment: o.fulfilment,
      payment_status: o.paymentStatus,
      payment_method: o.paymentMethod,
      total: num(o.total),
      placed_at: o.placedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

/** A customer's own orders, newest first, for the account page. */
export async function customerOrders(customerId: string) {
  const rows = await db.salesOrder.findMany({
    where: { customerId },
    orderBy: { placedAt: "desc" },
    take: 100,
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      shipments: {
        where: { status: { not: "cancelled" } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { trackingToken: true },
      },
    },
  });
  return rows.map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    payment_status: o.paymentStatus,
    total: num(o.total),
    currency: o.currency,
    placed_at: o.placedAt.toISOString(),
    fulfilment: o.fulfilment,
    tracking_token: o.shipments[0]?.trackingToken ?? null,
    pickup_branch: (o.shippingAddress as { pickupBranch?: PublicBranch } | null)?.pickupBranch ?? null,
    lines: o.lines.map((l) => ({
      description: l.description,
      quantity: num(l.quantity),
    })),
  }));
}

/** Public account details are selected by ownership; staff notes and other customers' files never leave the server. */
export async function customerOrder(customerId: string, id: string) {
  return db.salesOrder.findFirst({
    where: { id, customerId },
    select: {
      id: true, number: true, status: true, paymentStatus: true, paymentMethod: true,
      fulfilment: true, shippingAddress: true, name: true, email: true, phone: true,
      subtotal: true, discountAmount: true, deliveryFee: true, vatAmount: true,
      total: true, amountPaid: true, currency: true, placedAt: true,
      lines: { orderBy: { sortOrder: "asc" }, select: { id: true, description: true, quantity: true, unitPrice: true, lineTotal: true } },
      shipments: { where: { status: { not: "cancelled" } }, orderBy: { createdAt: "desc" }, take: 1, select: { trackingToken: true } },
    },
  });
}

// ─── Moving orders along ─────────────────────────────────────────────────────────────────────────────────────────

async function releaseReservations(
  tx: Tx,
  order: {
    lines: {
      productId: string;
      variantKey: string;
      locationId: string | null;
      quantity: Prisma.Decimal;
    }[];
  },
) {
  for (const line of order.lines)
    if (line.locationId)
      await reserveStock(tx, {
        productId: line.productId,
        variantId: line.variantKey || undefined,
        locationId: line.locationId,
        quantity: -num(line.quantity),
      });
}

/**
 * Moves an order to its next status: shipping takes the held stock out (a sale), cancelling releases it, and a
 * return puts it back. Returns the low-stock items for alerts.
 */
export async function moveOrder(
  id: string,
  to: OrderStatus,
  byId: string | null,
  note?: string,
) {
  return db.$transaction((tx) => moveOrderIn(tx, id, to, byId, note, true));
}

/**
 * Moves an order inside a transaction. `followShipments` moves its shipments too (staff moving the order); a
 * shipment moving its order passes false.
 */
export async function moveOrderIn(
  tx: Tx,
  id: string,
  to: OrderStatus,
  byId: string | null,
  note: string | undefined,
  followShipments: boolean,
) {
  {
    await tx.$queryRaw`SELECT id FROM "SalesOrder" WHERE id = ${id} FOR UPDATE`;
    const order = await tx.salesOrder.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!order) throw new Error(serverMessages.procurementDocumentMissing);
    if (!canMoveOrder(order.status, to))
      throw new Error(serverMessages.orderStatusInvalid);
    let low: any = [];
    const held = (RESERVED_STATUSES as string[]).includes(order.status);
    if (to === "cancelled" && held) await releaseReservations(tx, order);
    if (to === "shipped") {
      await releaseReservations(tx, order);
      const movements: MovementInput[] = order.lines
        .filter((l) => l.locationId)
        .map((l) => ({
          type: "sale",
          productId: l.productId,
          variantId: l.variantKey || undefined,
          locationId: l.locationId!,
          quantity: -num(l.quantity),
          sourceType: "order",
          sourceId: order.id,
          note: order.number,
        }));
      low = await postMovements(tx, movements, byId);
    }
    if (to === "returned") {
      const movements: MovementInput[] = order.lines
        .filter(
          (l) => l.locationId && num(l.quantity) > num(l.returnedQuantity),
        )
        .map((l) => ({
          type: "return",
          productId: l.productId,
          variantId: l.variantKey || undefined,
          locationId: l.locationId!,
          quantity: roundQuantity(num(l.quantity) - num(l.returnedQuantity)),
          sourceType: "order",
          sourceId: order.id,
          note: order.number,
        }));
      await postMovements(tx, movements, byId);
      for (const l of order.lines)
        await tx.salesOrderLine.update({
          where: { id: l.id },
          data: { returnedQuantity: l.quantity },
        });
    }
    const now = new Date();
    await tx.salesOrder.update({
      where: { id },
      data: {
        status: to,
        ...(to === "shipped" ? { shippedAt: now } : {}),
        ...(to === "delivered" ? { deliveredAt: now } : {}),
        ...(to === "cancelled" ? { cancelledAt: now } : {}),
      },
    });
    await tx.salesOrderEvent.create({
      data: {
        orderId: id,
        kind: "status",
        status: to,
        note: note?.trim().slice(0, 500) || null,
        byId,
      },
    });
    if (followShipments) await followOrderStatus(tx, id, to, byId);
    return low;
  }
}

/** The order's invoice (issued, not a draft: the sale already happened), created the first time it is needed. */
export async function issueOrderInvoice(orderId: string, byId: string | null) {
  const order = await db.salesOrder.findUnique({
    where: { id: orderId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!order) throw new Error(serverMessages.procurementDocumentMissing);
  if (order.invoiceId) return order.invoiceId;
  const company = await db.companySetting.findFirst({
    select: { vatEnabled: true, vatPercentage: true, paymentTermsDays: true },
  });
  const issueDate = new Date();
  const fee = num(order.deliveryFee);
  const lines = [
    ...order.lines.map((l) => ({
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
  return db.$transaction(async (tx) => {
    const signerUser = byId
      ? await tx.user.findUnique({
          where: { id: byId },
          select: { id: true, signatureUrl: true },
        })
      : (await tx.user.findFirst({
          where: { role: { in: ["super_admin", "admin"] }, isActive: true, signatureUrl: { not: null } },
          select: { id: true, signatureUrl: true },
        })) || (await tx.user.findFirst({
          where: { role: { in: ["super_admin", "admin"] }, isActive: true },
          select: { id: true, signatureUrl: true },
        }));
    const signerId = signerUser?.id ?? byId ?? null;
    const signerSignature = signerUser?.signatureUrl ?? null;

    const invoiceNumber = await allocateDocumentNumber(
      "invoice",
      issueDate,
      tx,
    );
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        clientId: order.contactId,
        issueDate,
        dueDate: new Date(
          issueDate.getTime() + (company?.paymentTermsDays ?? 0) * 86_400_000,
        ),
        subtotal: roundMoney(num(order.subtotal) + fee, order.currency),
        discountType: num(order.discountAmount) > 0 ? "fixed" : "none",
        discountValue: order.discountAmount,
        discountAmount: order.discountAmount,
        vatEnabled: num(order.vatAmount) > 0,
        vatPercentage: company?.vatPercentage ?? 0,
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
        signedAt: issueDate,
        signerSignatureUrl: signerSignature,
        lineItems: {
          create: lines.map((l, index) => ({ ...l, displayOrder: index + 1 })),
        },
      },
    });
    await tx.salesOrder.update({
      where: { id: orderId },
      data: { invoiceId: invoice.id },
    });
    return invoice.id;
  });
}

/** Records money received for an order: on its invoice (with a receipt), and the order shows it as paid. */
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
    await db.$queryRaw`SELECT id FROM "SalesOrder" WHERE id = ${orderId} FOR UPDATE`;
    const order = await db.salesOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(serverMessages.procurementDocumentMissing);
    await assertCompanyCurrency(order.currency);
    if (!validMoneyAmount(input.amount, order.currency)) throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
    const amount = roundMoney(input.amount, order.currency);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      toMinorUnits(num(order.amountPaid) + amount, order.currency) > toMinorUnits(num(order.total), order.currency)
    )
      throw new Error(serverMessages.procurementOverpaid);
    if (["cancelled", "returned"].includes(order.status))
      throw new Error(serverMessages.orderStatusInvalid);
    const invoiceId = await issueOrderInvoice(orderId, byId);
    const receipt = await createPayment({
      invoice_id: invoiceId,
      amount,
      payment_method: input.method,
      reference_number: input.reference?.slice(0, 100),
      created_by: byId ?? undefined,
      notes: order.number,
    });
    const paid = roundMoney(num(order.amountPaid) + amount, order.currency);
    const full = toMinorUnits(paid, order.currency) >= toMinorUnits(num(order.total), order.currency);
    await db.$transaction([
      db.salesOrder.update({
        where: { id: orderId },
        data: {
          amountPaid: paid,
          paymentStatus: full ? "paid" : "pending",
          ...(full ? { paidAt: new Date() } : {}),
          ...(full && order.status === "placed" ? { status: "paid" } : {}),
        },
      }),
      db.salesOrderEvent.create({
        data: {
          orderId,
          kind: "payment",
          amount,
          note: input.reference?.slice(0, 100) || input.method,
          byId,
        },
      }),
      ...(full && order.status === "placed"
        ? [
            db.salesOrderEvent.create({
              data: { orderId, kind: "status", status: "paid", byId },
            }),
          ]
        : []),
    ]);
    return receipt.id;
  });
}

/** Records a refund given back to the customer (by hand here; online payments refund through their gateway). */
export async function recordOrderRefund(
  orderId: string,
  amountInput: number,
  reason: string,
  byId: string | null,
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "SalesOrder" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.salesOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(serverMessages.procurementDocumentMissing);
    if (!validMoneyAmount(amountInput, order.currency)) throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
    const amount = roundMoney(amountInput, order.currency);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      toMinorUnits(num(order.amountRefunded) + amount, order.currency) > toMinorUnits(num(order.amountPaid), order.currency)
    )
      throw new Error(serverMessages.orderRefundTooLarge);
    const refunded = roundMoney(num(order.amountRefunded) + amount, order.currency);
    await tx.salesOrder.update({
      where: { id: orderId },
      data: {
        amountRefunded: refunded,
        paymentStatus:
          toMinorUnits(refunded, order.currency) >= toMinorUnits(num(order.amountPaid), order.currency)
            ? "refunded"
            : "partially_refunded",
      },
    });
    await tx.salesOrderEvent.create({
      data: {
        orderId,
        kind: "refund",
        amount,
        note: reason.trim().slice(0, 500) || null,
        byId,
      },
    });
  });
}

export async function addOrderNote(
  orderId: string,
  note: string,
  byId: string | null,
) {
  const text = note.trim().slice(0, 1000);
  if (!text) return;
  await db.salesOrderEvent.create({
    data: { orderId, kind: "note", note: text, byId },
  });
}

/** Products to sell at the counter or by phone: names, codes, prices and variants. */
export async function saleProductOptions() {
  const products = await db.product.findMany({
    where: { isActive: true },
    orderBy: { nameEn: "asc" },
    take: 3000,
    select: {
      id: true,
      sku: true,
      barcode: true,
      nameEn: true,
      nameAr: true,
      price: true,
      options: true,
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sku: true,
          barcode: true,
          optionValues: true,
          price: true,
        },
      },
    },
  });
  return products.map((p) => {
    const options = normalizeProductOptions(p.options) ?? [];
    return {
      id: p.id,
      sku: p.sku,
      barcode: p.barcode ?? "",
      name_en: p.nameEn,
      name_ar: p.nameAr,
      price: num(p.price),
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode ?? "",
        label_en: variantLabel(options, v.optionValues, "en"),
        label_ar: variantLabel(options, v.optionValues, "ar"),
        price: v.price == null ? num(p.price) : num(v.price),
      })),
    };
  });
}
export type SaleProductOption = Awaited<
  ReturnType<typeof saleProductOptions>
>[number];
