import { NextRequest, NextResponse } from "next/server";
import { formatMessage, getTranslations, getWebsiteTranslations } from "@platform/locales";
import { consumeAbuseLimit, deliveryOptions, getOrder, orderTrackingTokens, measureOperation, notifyUsersWithPermission, orderFromPaymentLink, paymentLinkToken, placeOrder, quoteCart, startOrderPayment } from "@platform/database";
import type { CartLine } from "@platform/database/constants/store";
import { escapeEmailHtml, sendEmail } from "@platform/email";
import { currentCustomer, jsonError, sameOrigin, storeEnabled } from "../../../../lib/customer";

const str = (value: unknown, max = 300) => (typeof value === "string" ? value.slice(0, max) : "");
/** The website's public address, for the gateway's return and notification addresses. */
const siteUrl = (req: NextRequest) => (process.env.WEB_URL || req.nextUrl.origin).replace(/\/$/, "");
const ip = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

/** The cart as posted: product, variant and a whole quantity per line. */
function cartLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((line) => {
    const l = (line ?? {}) as Record<string, unknown>;
    return { productId: str(l.productId, 60), variantId: str(l.variantId, 60) || undefined, quantity: Math.max(0, Math.floor(Number(l.quantity) || 0)) };
  });
}

/** The delivery slot chosen at checkout, as "date" and "slotId". */
function slotChoice(value: unknown) {
  const v = (value ?? {}) as Record<string, unknown>;
  const date = str(v.date, 10);
  const slotId = str(v.slotId, 40);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && slotId ? { date, slotId } : null;
}

/** Prices the cart (quote) or places the order (order), for the website's cart and checkout. */
export async function POST(req: NextRequest, context: { params: Promise<{ action: string }> }) {
  return measureOperation("web:store:POST", async () => {
    const { action } = await context.params;
    if (!(await storeEnabled())) return NextResponse.json({ error: "unavailable" }, { status: 404 });
    if (!sameOrigin(req)) return NextResponse.json({ error: "generic" }, { status: 403 });
    const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
    const fulfilment = body.fulfilment === "pickup" ? "pickup" : "delivery";
    try {
      const place = (body.address ?? null) as Record<string, unknown> | null;
      const area = place ? { area: str(place.area, 80), city: str(place.city, 80) } : null;
      if (action === "quote") return NextResponse.json(await quoteCart({ lines: cartLines(body.lines), couponCode: str(body.couponCode, 30), fulfilment, address: area }));
      // Delivery times (and whether the area is served) for the checkout.
      if (action === "delivery") return NextResponse.json(await deliveryOptions(area ?? {}));
      if (action === "pay") {
        // Pays what is owed on an order through the store's gateway, from a payment link or right after checkout.
        await consumeAbuseLimit("store-pay-ip", ip(req), 20, 600);
        const orderId = orderFromPaymentLink(str(body.token, 120));
        if (!orderId) return NextResponse.json({ error: "generic" }, { status: 404 });
        const started = await startOrderPayment(orderId, { url: siteUrl(req), locale: str(body.locale, 2) === "en" ? "en" : "ar" });
        return NextResponse.json("redirectUrl" in started ? { redirectUrl: started.redirectUrl } : { widget: started.widget, returnUrl: `/api/store/payment/return?attempt=${started.attemptId}`, testMode: started.testMode });
      }
      if (action !== "order") return NextResponse.json({ error: "generic" }, { status: 404 });
      await consumeAbuseLimit("store-order-ip", ip(req), 10, 600);
      const customer = await currentCustomer();
      const locale = str(body.locale, 2) === "en" ? "en" : "ar";
      const address = (body.address ?? null) as Record<string, unknown> | null;
      const order = await placeOrder({
        lines: cartLines(body.lines),
        couponCode: str(body.couponCode, 30),
        fulfilment,
        address: address ? { name: str(address.name, 120), phone: str(address.phone, 40), line1: str(address.line1, 200), line2: str(address.line2, 200), area: str(address.area, 80), city: str(address.city, 80), country: str(address.country, 80), postalCode: str(address.postalCode, 20) } : null,
        name: customer?.name || str(body.name, 120),
        email: customer?.email || str(body.email, 254),
        phone: str(body.phone, 40),
        paymentMethod: str(body.paymentMethod, 20),
        note: str(body.note, 1000),
        locale,
        channel: "website",
        customerId: customer?.id ?? null,
        slot: slotChoice(body.slot),
      });
      await sendConfirmation(order.id, locale, siteUrl(req));
      // The people who handle orders hear about it at once.
      const alert = getTranslations("en").admin.orders.notifications.placed;
      const params = { number: order.number, name: order.name, total: `${Number(order.total).toFixed(3)} ${order.currency}` };
      await notifyUsersWithPermission("orders", "read", { title: formatMessage(alert.title, params), message: formatMessage(alert.message, params), message_key: "orders.notifications.placed", message_params: params, type: "action", entity_type: "sales_order", entity_id: order.id }).catch(() => undefined);
      return NextResponse.json({ success: true, number: order.number, ...(order.paymentMethod === "online" ? { payToken: paymentLinkToken(order.id) } : {}) });
    } catch (error) {
      return jsonError(error);
    }
  });
}

/** The order confirmation e-mail, in the customer's language. Failing to send never undoes the order. */
async function sendConfirmation(orderId: string, locale: "en" | "ar", site: string) {
  const order = await getOrder(orderId);
  if (!order?.email) return;
  const t = getWebsiteTranslations(locale).store.confirmationEmail;
  const money = (value: number) => `${value.toFixed(3)} ${order.currency}`;
  // The delivery's tracking page, when the order is delivered by the company.
  const token = (await orderTrackingTokens([order.id])).get(order.id);
  const trackLink = token ? `<p><a href="${escapeEmailHtml(`${site}/${locale}/track/${token}`)}">${escapeEmailHtml(getWebsiteTranslations(locale).store.track)}</a></p>` : "";
  const rows = order.lines.map((l) => `<tr><td>${escapeEmailHtml(l.description)}</td><td>× ${l.quantity}</td><td style="text-align:end">${money(l.line_total)}</td></tr>`).join("");
  await sendEmail({
    to: order.email,
    subject: formatMessage(t.subject, { number: order.number }),
    html: `<p>${escapeEmailHtml(formatMessage(t.greeting, { name: order.name }))}</p><p>${escapeEmailHtml(formatMessage(t.body, { number: order.number }))}</p><table>${rows}</table><p><strong>${escapeEmailHtml(t.total)}: ${money(order.total)}</strong></p>${trackLink}`,
    idempotencyKey: `order-confirmation:${order.id}`,
  }).catch(() => undefined);
}

export const dynamic = "force-dynamic";
