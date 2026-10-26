import { NextRequest, NextResponse } from "next/server";
import { measureOperation, signWithToken } from "@platform/database";
import {
  consumeAbuseLimit,
  trustedClientIp,
} from "@platform/database/services/abuse-limits";
import { signingConsent } from "../../../../lib/client-signing";

export const dynamic = "force-dynamic";

/** Public: the client signs through their one-time link. Errors are returned as codes the page translates. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  return measureOperation("admin:sign/[token]:POST", async () => {
    const { token } = await params;
    const ip = trustedClientIp(request.headers);
    try {
      await consumeAbuseLimit(
        "client-sign",
        `${token}:${ip ?? "unknown"}`,
        10,
        600,
      );
    } catch {
      return NextResponse.json(
        { error: "invalid" },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }
    if (Number(request.headers.get("content-length") ?? 0) > 400_000)
      return NextResponse.json({ error: "signature" }, { status: 413 });
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "failed" }, { status: 400 });
    }
    const signerName =
      typeof body.signerName === "string" ? body.signerName : "";
    const signerTitle =
      typeof body.signerTitle === "string" ? body.signerTitle : null;
    const signatureData =
      typeof body.signatureData === "string" ? body.signatureData : "";
    if (signerName.trim().length < 2)
      return NextResponse.json({ error: "name" }, { status: 400 });
    if (body.termsAccepted !== true)
      return NextResponse.json({ error: "terms" }, { status: 400 });
    try {
      const result = await signWithToken(
        token,
        {
          signerName,
          signerTitle,
          signatureData,
          termsAccepted: true,
          ip: ip ?? null,
          userAgent: request.headers.get("user-agent"),
        },
        signingConsent,
      );
      return NextResponse.json({ ok: true, signedAt: result.signedAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const code = /signature/i.test(message)
        ? "signature"
        : /no longer valid|not found|Only issued|expired/i.test(message)
          ? "invalid"
          : "failed";
      if (code === "failed") console.error("Client signing failed:", error);
      return NextResponse.json(
        { error: code },
        { status: code === "invalid" ? 410 : 400 },
      );
    }
  });
}
