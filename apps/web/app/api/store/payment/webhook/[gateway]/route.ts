import { NextRequest, NextResponse } from "next/server";
import {
  WebhookSignatureError,
  handlePaymentWebhook,
  measureOperation,
} from "@platform/database";

/** A payment gateway's notification: verified against the gateway's signature, applied once however often it comes. */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ gateway: string }> },
) {
  return measureOperation("web:payment:webhook", async () => {
    const { gateway } = await context.params;
    const rawBody = await req.text();
    if (rawBody.length > 200_000)
      return NextResponse.json({ error: "too_large" }, { status: 413 });
    try {
      const result = await handlePaymentWebhook(gateway, {
        headers: req.headers,
        rawBody,
      });
      return NextResponse.json({ received: true, handled: result.handled });
    } catch (error) {
      if (error instanceof WebhookSignatureError)
        return NextResponse.json(
          { error: "invalid_signature" },
          { status: 401 },
        );
      // Anything else is ours: the gateway will retry.
      console.error(`Payment webhook for ${gateway} failed`);
      return NextResponse.json({ error: "failed" }, { status: 500 });
    }
  });
}

export const dynamic = "force-dynamic";
