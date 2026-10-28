import { isLocale } from "@platform/locales/registry";
import { isWebsitePreview } from "../../../../lib/website";
import { getSite } from "../../../../lib/site";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWebsiteTranslations, formatMessage } from "@platform/locales";
import {
  consumeAbuseLimit,
  createOrderHelpRequest,
  createCustomerSession,
  customerFromSession,
  deleteCustomerAccount,
  deleteCustomerAddress,
  endCustomerSession,
  issueCustomerCode,
  measureOperation,
  normalizeCustomerEmail,
  saveCustomerAddress,
  signUpCustomer,
  toggleWishlist,
  updateCustomerProfile,
  verifyCustomerCode,
  verifyCustomerPassword,
} from "@platform/database";
import {
  appleAuthUrl,
  googleAuthUrl,
  randomToken,
  safeNextPath,
  sealSignInState,
} from "@platform/database/services/oauth-signin";
import { escapeEmailHtml, sendEmail } from "@platform/email";
import {
  CUSTOMER_COOKIE,
  SIGNIN_STATE_COOKIE,
  jsonError,
  sameOrigin,
  setCustomerCookie,
  signInCredentials,
  signInSecret,
  accountsEnabled,
} from "../../../../lib/customer";
import { publicSiteUrl } from "../../../../lib/site-url";

const str = (value: unknown, max = 500) =>
  typeof value === "string" ? value.slice(0, max) : "";
const ip = (req: NextRequest) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

async function signedIn(req: NextRequest, customerId: string) {
  const token = await createCustomerSession(
    customerId,
    req.headers.get("user-agent"),
  );
  const response = NextResponse.json({ success: true });
  setCustomerCookie(response, token);
  return response;
}

/** Account actions posted from the website's account page. */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  return measureOperation("web:account:POST", async () => {
    const { action } = await context.params;
    if ((await isWebsitePreview()) || !(await accountsEnabled()))
      return NextResponse.json({ error: "unavailable" }, { status: 404 });
    if (action === "wishlist" && !(await getSite()).config.commerce.capabilities.wishlist)
      return NextResponse.json({ error: "unavailable" }, { status: 404 });
    if (!sameOrigin(req))
      return NextResponse.json({ error: "generic" }, { status: 403 });
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "generic" }, { status: 400 });
    }
    const locale = isLocale(body.locale) ? body.locale : "en";
    try {
      switch (action) {
        case "sign-up": {
          await consumeAbuseLimit("customer-signup-ip", ip(req), 10, 3600);
          const customer = await signUpCustomer({
            name: str(body.name, 120),
            email: str(body.email, 254),
            password: str(body.password, 200),
            locale,
            marketingOptIn: body.marketingOptIn === true,
          });
          return signedIn(req, customer.id);
        }
        case "sign-in": {
          const email = normalizeCustomerEmail(str(body.email, 254));
          await consumeAbuseLimit("customer-signin-ip", ip(req), 20, 900);
          await consumeAbuseLimit("customer-signin-email", email, 8, 900);
          const customer = await verifyCustomerPassword(
            email,
            str(body.password, 200),
          );
          if (!customer)
            return NextResponse.json(
              { error: "wrong_password" },
              { status: 401 },
            );
          return signedIn(req, customer.id);
        }
        case "code": {
          const email = normalizeCustomerEmail(str(body.email, 254));
          await consumeAbuseLimit("customer-code-ip", ip(req), 10, 600);
          await consumeAbuseLimit("customer-code-email", email, 3, 600);
          const code = await issueCustomerCode(email);
          const t = getWebsiteTranslations(locale).account.codeEmail;
          const sent = await sendEmail({
            to: email,
            subject: t.subject,
            html: `<p>${escapeEmailHtml(formatMessage(t.body, { code }))}</p><p style="font-size:24px;letter-spacing:4px"><strong>${code}</strong></p><p>${escapeEmailHtml(t.ignore)}</p>`,
          });
          if (!sent.success && process.env.NODE_ENV === "production")
            return NextResponse.json(
              { error: "email_unavailable" },
              { status: 503 },
            );
          return NextResponse.json({ success: true });
        }
        case "code-verify": {
          await consumeAbuseLimit("customer-verify-ip", ip(req), 20, 600);
          const customer = await verifyCustomerCode(
            str(body.email, 254),
            str(body.code, 10),
            str(body.name, 120),
            locale,
          );
          if (!customer)
            return NextResponse.json({ error: "wrong_code" }, { status: 401 });
          return signedIn(req, customer.id);
        }
        case "sign-out": {
          await endCustomerSession(
            (await cookies()).get(CUSTOMER_COOKIE)?.value,
          );
          const response = NextResponse.json({ success: true });
          response.cookies.delete(CUSTOMER_COOKIE);
          return response;
        }
      }
      // Everything else needs a signed-in customer.
      const customer = await customerFromSession(
        (await cookies()).get(CUSTOMER_COOKIE)?.value,
      );
      if (!customer)
        return NextResponse.json({ error: "signed_out" }, { status: 401 });
      switch (action) {
        case "profile":
          await updateCustomerProfile(customer.id, {
            name: str(body.name, 120),
            phone: str(body.phone, 40),
            locale: str(body.preferredLocale, 2),
            marketingOptIn: body.marketingOptIn === true,
            password: str(body.password, 200) || undefined,
          });
          return NextResponse.json({ success: true });
        case "address":
          return NextResponse.json({
            success: true,
            id: await saveCustomerAddress(customer.id, {
              id: str(body.id, 60) || undefined,
              label: str(body.label),
              name: str(body.name),
              phone: str(body.phone),
              line1: str(body.line1),
              line2: str(body.line2),
              area: str(body.area),
              city: str(body.city),
              country: str(body.country),
              postalCode: str(body.postalCode),
              isDefault: body.isDefault === true,
            }),
          });
        case "address-delete":
          await deleteCustomerAddress(customer.id, str(body.id, 60));
          return NextResponse.json({ success: true });
        case "wishlist":
          return NextResponse.json({
            success: true,
            saved: await toggleWishlist(customer.id, str(body.itemId, 60)),
          });
        case "order-help": {
          // A question or a problem about one of the customer's own orders goes to the service desk.
          await consumeAbuseLimit("customer-order-help", customer.id, 5, 3600);
          const result = await createOrderHelpRequest(
            {
              id: customer.id,
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
            },
            {
              orderId: str(body.orderId, 60),
              kind: body.kind === "problem" ? "problem" : "question",
              message: str(body.message, 5000),
              locale: isLocale(body.locale) ? body.locale : "en",
            },
          );
          return NextResponse.json({
            success: true,
            reference: result.reference,
          });
        }
        case "delete": {
          if (
            normalizeCustomerEmail(str(body.confirmEmail, 254)) !==
            customer.email
          )
            return NextResponse.json(
              { error: "confirm_email" },
              { status: 400 },
            );
          await deleteCustomerAccount(customer.id);
          const response = NextResponse.json({ success: true });
          response.cookies.delete(CUSTOMER_COOKIE);
          return response;
        }
      }
      return NextResponse.json({ error: "generic" }, { status: 404 });
    } catch (error) {
      return jsonError(error);
    }
  });
}

/** Starts signing in with Google or Apple: a signed state cookie, then off to the provider. */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  return measureOperation("web:account:GET", async () => {
    const { action } = await context.params;
    const requestedLocale = req.nextUrl.searchParams.get("locale");
    const locale = isLocale(requestedLocale) ? requestedLocale : "en";
    const back = new URL(`/${locale}/account`, req.url);
    if ((action !== "google" && action !== "apple") || !(await accountsEnabled()))
      return NextResponse.redirect(back);
    const credentials = await signInCredentials(action);
    if (!credentials) return NextResponse.redirect(back);
    const site = await publicSiteUrl();
    const redirectUri = new URL(
      `/api/account/${action}/callback`,
      site,
    ).toString();
    const state = {
      provider: action,
      state: randomToken(16),
      nonce: randomToken(16),
      verifier: randomToken(48),
      next: safeNextPath(
        req.nextUrl.searchParams.get("next"),
        `/${locale}/account`,
      ),
      locale,
      expires: Date.now() + 10 * 60_000,
    } as const;
    const target =
      action === "google"
        ? googleAuthUrl({
            clientId: credentials.clientId,
            redirectUri,
            state: state.state,
            nonce: state.nonce,
            verifier: state.verifier,
            locale,
          })
        : appleAuthUrl({
            serviceId: credentials.serviceId,
            redirectUri,
            state: state.state,
            nonce: state.nonce,
            verifier: state.verifier,
          });
    const response = NextResponse.redirect(target);
    // Apple returns with a cross-site form post, so its state cookie must be sent on that POST.
    response.cookies.set(
      SIGNIN_STATE_COOKIE,
      sealSignInState(state, signInSecret()),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" || action === "apple",
        sameSite: action === "apple" ? "none" : "lax",
        path: "/api/account",
        maxAge: 600,
      },
    );
    return response;
  });
}

export const dynamic = "force-dynamic";
