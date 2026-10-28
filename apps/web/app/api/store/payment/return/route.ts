import { isLocale } from "@platform/locales/registry";
import { NextRequest, NextResponse } from "next/server";
import {
  confirmReturn,
  measureOperation,
  paymentLinkToken,
} from "@platform/database";

/**
 * Where the payment gateway sends the customer back (some gateways by GET, some by a form POST). The result always
 * comes from asking the gateway, never from these parameters alone.
 */
async function handle(req: NextRequest) {
  return measureOperation("web:payment:return", async () => {
    const params: Record<string, string> = {};
    req.nextUrl.searchParams.forEach(
      (value, key) => (params[key] = value.slice(0, 300)),
    );
    if (req.method === "POST") {
      const form = await req.formData().catch(() => null);
      form?.forEach((value, key) => {
        if (typeof value === "string") params[key] = value.slice(0, 300);
      });
    }
    const attemptId = /^[0-9a-f-]{36}$/.test(params.attempt ?? "")
      ? params.attempt
      : "";
    const result = attemptId ? await confirmReturn(attemptId, params) : null;
    const home = new URL("/", process.env.WEB_URL || req.nextUrl.origin);
    if (!result) return NextResponse.redirect(home, 303);
    const locale = isLocale(result.order.locale) ? result.order.locale : "en";
    const target =
      result.state === "paid"
        ? `/${locale}/checkout/done?number=${encodeURIComponent(result.order.number)}`
        : `/${locale}/pay/${paymentLinkToken(result.order.id)}?${result.state === "review" ? "review" : result.state === "pending" ? "pending" : "failed"}=1`;
    return NextResponse.redirect(new URL(target, home), 303);
  });
}

export const GET = handle;
export const POST = handle;
export const dynamic = "force-dynamic";
