import { serverMessages } from "@platform/locales";
import { measureOperation } from "@platform/database";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isBusinessActivity } from "@platform/database/website-presets";
export async function GET(req: NextRequest) {
  return measureOperation("web:preview:GET", async () => {
    const expires = req.nextUrl.searchParams.get("expires") || "";
    const token = req.nextUrl.searchParams.get("token") || "";
    const secret = process.env.REVALIDATION_SECRET;
    const expiry = Number(expires);
    if (
      !secret ||
      !Number.isFinite(expiry) ||
      expiry < Date.now() ||
      expiry > Date.now() + 600000 ||
      !/^[a-f0-9]{64}$/.test(token)
    )
      return new NextResponse("Preview expired or unavailable", {
        status: 403,
      });
    const example = req.nextUrl.searchParams.get("example") ?? "";
    if (example && !isBusinessActivity(example))
      return new NextResponse("Invalid preview", { status: 403 });
    const expected = createHmac("sha256", secret)
      .update(
        example
          ? `website-example:${example}:${expires}`
          : `website-preview:${expires}`,
      )
      .digest("hex");
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(token)))
      return new NextResponse("Invalid preview", { status: 403 });
    const locale =
      req.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
    const path = req.nextUrl.searchParams.get("path") ?? "";
    const target =
      /^\/(en|ar)(\/[a-z0-9-/]*)?$/.test(path) && !path.includes("//")
        ? path
        : `/${locale}`;
    const response = NextResponse.redirect(new URL(target, req.url));
    response.cookies.set(
      "platform_preview",
      example ? `${expires}.${token}.${example}` : `${expires}.${token}`,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      },
    );
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  });
}
export async function POST(req: NextRequest) {
  return measureOperation("web:preview:POST", async () => {
    if (req.headers.get("origin") !== req.nextUrl.origin)
      return new NextResponse(serverMessages.runtimeForbidden, { status: 403 });
    const response = NextResponse.redirect(new URL("/", req.url), 303);
    response.cookies.delete("platform_preview");
    return response;
  });
}
