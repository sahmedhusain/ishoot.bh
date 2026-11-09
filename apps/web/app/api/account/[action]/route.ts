import { trustedClientIp } from "@platform/database/services/abuse-limits";
import { isLocale } from "@platform/locales/registry";
import { isWebsitePreview } from "../../../../lib/website";
import { getSite } from "../../../../lib/site";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWebsiteTranslations, formatMessage } from "@platform/locales";
import {
  consumeAbuseLimit,
  ensureCustomerProfile,
  createOrderHelpRequest,
  deleteCustomerAccount,
  deleteCustomerAddress,
  measureOperation,
  normalizeCustomerEmail,
  saveCustomerAddress,
  toggleWishlist,
  updateCustomerProfile,
} from "@platform/database";
import {
  signIn,
  signOut,
  issueCustomerSignInCode,
  signInCustomerWithCode,
  registerCustomerAccount,
  setAccountPassword,
  deleteOwnCustomerAccount,
  beginCustomerOAuth,
  completeCustomerOAuth,
  queueMessage,
  isApiError,
  type LoginCredential,
} from "@platform/api-client";
import {
  REALM,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearedCookies,
  verifyAccessToken,
} from "../../../../lib/identity-session";
import {
  SIGNIN_STATE_COOKIE,
  safeNextPath,
  readSignInState,
  setSignInState,
  clearSignInState,
  setCustomerCredentials,
} from "../../../../lib/customer-credentials";
import { escapeEmailHtml } from "@platform/email";
import {
  jsonError,
  currentCustomer,
  sameOrigin,
  accountsEnabled,
} from "../../../../lib/customer";
import { publicSiteUrl } from "../../../../lib/site-url";

const str = (value: unknown, max = 500) =>
  typeof value === "string" ? value.slice(0, max) : "";
const ip = (req: NextRequest) => trustedClientIp(req.headers) ?? "";

function signedIn(credential: LoginCredential) {
  const response = NextResponse.json({ success: true });
  setCustomerCredentials(response, credential);
  return response;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  return measureOperation("web:account:POST", async () => {
    const { action } = await context.params;
    if ((await isWebsitePreview()) || !(await accountsEnabled()))
      return NextResponse.json({ error: "unavailable" }, { status: 404 });
    if (
      action === "wishlist" &&
      !(await getSite()).config.commerce.capabilities.wishlist
    )
      return NextResponse.json({ error: "unavailable" }, { status: 404 });
    if (!sameOrigin(req))
      return NextResponse.json({ error: "generic" }, { status: 403 });
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "generic" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return NextResponse.json({ error: "generic" }, { status: 400 });
    const locale = isLocale(body.locale) ? body.locale : "en";
    try {
      switch (action) {
        case "sign-up": {
          await consumeAbuseLimit("customer-signup-ip", ip(req), 10, 3600);
          const email = normalizeCustomerEmail(str(body.email, 254));
          const name = str(body.name, 120).trim();
          if (!name)
            return NextResponse.json(
              { error: "customerNameRequired" },
              { status: 400 },
            );
          const password = str(body.password, 200);
          const account = await registerCustomerAccount(
            email,
            password,
            ip(req),
          );
          await ensureCustomerProfile(account.subjectId, email, {
            name,
            locale,
            marketingOptIn: body.marketingOptIn === true,
          });
          return signedIn(
            await signIn(REALM, {
              email,
              password,
              clientIp: ip(req),
              userAgent: req.headers.get("user-agent")?.slice(0, 512),
            }),
          );
        }
        case "sign-in": {
          const email = normalizeCustomerEmail(str(body.email, 254));
          await consumeAbuseLimit("customer-signin-ip", ip(req), 20, 900);
          await consumeAbuseLimit("customer-signin-email", email, 8, 900);
          const credential = await signIn(REALM, {
            email,
            password: str(body.password, 200),
            otp: str(body.otp, 64) || undefined,
            clientIp: ip(req),
            userAgent: req.headers.get("user-agent")?.slice(0, 512),
          });
          await ensureCustomerProfile(credential.subjectId, email, { locale });
          return signedIn(credential);
        }
        case "code": {
          const email = normalizeCustomerEmail(str(body.email, 254));
          await consumeAbuseLimit("customer-code-ip", ip(req), 10, 600);
          await consumeAbuseLimit("customer-code-email", email, 3, 600);
          const { code } = await issueCustomerSignInCode(email, ip(req));
          const t = getWebsiteTranslations(locale).account.codeEmail;
          try {
            await queueMessage({
              channel: "email",
              to: email,
              subject: t.subject,
              text: `${formatMessage(t.body, { code })}\n\n${code}\n\n${t.ignore}`,
              html: `<p>${escapeEmailHtml(formatMessage(t.body, { code }))}</p><p style="font-size:24px;letter-spacing:4px"><strong>${code}</strong></p><p>${escapeEmailHtml(t.ignore)}</p>`,
              actorId: "identity:customer",
              idempotencyKey: `customer-code:${email}:${code}`,
            });
          } catch {
            if (process.env.NODE_ENV === "production")
              return NextResponse.json(
                { error: "email_unavailable" },
                { status: 503 },
              );
          }
          return NextResponse.json({ success: true });
        }
        case "code-verify": {
          await consumeAbuseLimit("customer-verify-ip", ip(req), 20, 600);
          const out = await signInCustomerWithCode({
            email: str(body.email, 254),
            code: str(body.code, 10).trim(),
            otp: str(body.otp, 64) || undefined,
            clientIp: ip(req),
            userAgent: req.headers.get("user-agent")?.slice(0, 512),
          });
          await ensureCustomerProfile(
            out.credential.subjectId,
            out.email,
            { name: str(body.name, 120), locale },
            true,
          );
          return signedIn(out.credential);
        }
        case "oauth-mfa": {
          const state = readSignInState(
            (await cookies()).get(SIGNIN_STATE_COOKIE)?.value,
          );
          if (!state)
            return NextResponse.json({ error: "expired" }, { status: 401 });
          const out = await completeCustomerOAuth(state.provider, {
            state: state.state,
            browserState: state.state,
            otp: str(body.otp, 64),
            clientIp: ip(req),
            userAgent: req.headers.get("user-agent")?.slice(0, 512),
          });
          await ensureCustomerProfile(
            out.credential.subjectId,
            out.email,
            { name: out.name, locale: out.locale },
            true,
          );
          return signedIn(out.credential);
        }
        case "sign-out": {
          const refresh = (await cookies()).get(REFRESH_COOKIE)?.value;
          try {
            if (refresh) await signOut(REALM, refresh);
          } catch {}
          const response = NextResponse.json({ success: true });
          for (const c of clearedCookies())
            response.cookies.set(c.name, c.value, c.options);
          clearSignInState(response);
          return response;
        }
      }
      const customer = await currentCustomer();
      if (!customer)
        return NextResponse.json({ error: "signed_out" }, { status: 401 });
      switch (action) {
        case "profile": {
          if (str(body.password, 200)) {
            const staff = await verifyAccessToken(
              (await cookies()).get(ACCESS_COOKIE)?.value,
            );
            if (!staff)
              return NextResponse.json(
                { error: "signed_out" },
                { status: 401 },
              );
            await setAccountPassword(REALM, customer.id, {
              password: str(body.password, 200),
              keepSessionId: staff.sessionId,
            });
          }
          await updateCustomerProfile(customer.id, {
            name: str(body.name, 120),
            phone: str(body.phone, 40),
            locale: str(body.preferredLocale, 2),
            marketingOptIn: body.marketingOptIn === true,
          });
          return NextResponse.json({ success: true });
        }
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
          const identity = await verifyAccessToken(
            (await cookies()).get(ACCESS_COOKIE)?.value,
          );
          if (!identity)
            return NextResponse.json({ error: "signed_out" }, { status: 401 });
          await deleteOwnCustomerAccount(identity.token);
          await deleteCustomerAccount(customer.id);
          const response = NextResponse.json({ success: true });
          for (const c of clearedCookies())
            response.cookies.set(c.name, c.value, c.options);
          clearSignInState(response);
          return response;
        }
      }
      return NextResponse.json({ error: "generic" }, { status: 404 });
    } catch (error) {
      if (isApiError(error)) {
        if (error.code === "mfa_required")
          return NextResponse.json({ error: "mfa_required" }, { status: 401 });
        if (error.status === 429)
          return NextResponse.json({ error: "rateLimit" }, { status: 429 });
        if (error.code === "email_taken")
          return NextResponse.json(
            { error: "customerEmailTaken" },
            { status: 409 },
          );
        if (error.status === 401)
          return NextResponse.json(
            {
              error: action === "code-verify" ? "wrong_code" : "wrong_password",
            },
            { status: 401 },
          );
      }
      return jsonError(error);
    }
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  return measureOperation("web:account:GET", async () => {
    const { action } = await context.params;
    const locale =
      req.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
    const back = new URL(`/${locale}/account`, req.url);
    if (
      (action !== "google" && action !== "apple") ||
      !(await accountsEnabled())
    )
      return NextResponse.redirect(back);
    const next = safeNextPath(
      req.nextUrl.searchParams.get("next"),
      `/${locale}/account`,
    );
    try {
      const out = await beginCustomerOAuth(action, {
        redirectUri: new URL(
          `/api/account/${action}/callback`,
          await publicSiteUrl(),
        ).toString(),
        next,
        locale,
        clientIp: ip(req),
      });
      const response = NextResponse.redirect(out.authorizationUrl);
      setSignInState(
        response,
        { state: out.state, provider: action, locale, next },
        out.expiresAt,
      );
      return response;
    } catch {
      back.searchParams.set("signin", "generic");
      return NextResponse.redirect(back);
    }
  });
}

export const dynamic = "force-dynamic";
