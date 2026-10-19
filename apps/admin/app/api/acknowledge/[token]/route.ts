import { NextRequest, NextResponse } from "next/server";
import { measureOperation, signWithSignatureRequest } from "@ishoot/database";
import {
  consumeAbuseLimit,
  trustedClientIp,
} from "@ishoot/database/services/abuse-limits";

export const dynamic = "force-dynamic";

/** Public: the employee signs a handover through their one-time link. Errors come back as codes the page translates. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  return measureOperation("admin:acknowledge/[token]:POST", async () => {
    const { token } = await params;
    const ip = trustedClientIp(request.headers);
    try {
      await consumeAbuseLimit(
        "handover-sign",
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
    const signatureData =
      typeof body.signatureData === "string" ? body.signatureData : "";
    if (signerName.trim().length < 2)
      return NextResponse.json({ error: "name" }, { status: 400 });
    if (body.acknowledged !== true)
      return NextResponse.json({ error: "terms" }, { status: 400 });
    try {
      const result = await signWithSignatureRequest(token, {
        signerName,
        signatureData,
        acknowledged: true,
        ip: ip ?? null,
        userAgent: request.headers.get("user-agent"),
      });
      return NextResponse.json({ ok: true, signedAt: result.signedAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const code = /signature/i.test(message)
        ? "signature"
        : /no longer valid|not found|not waiting/i.test(message)
          ? "invalid"
          : "failed";
      if (code === "failed") console.error("Handover signing failed:", error);
      return NextResponse.json(
        { error: code },
        { status: code === "invalid" ? 410 : 400 },
      );
    }
  });
}
