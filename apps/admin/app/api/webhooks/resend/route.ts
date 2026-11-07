import { getResendCredentials } from "@platform/email";
import { serverMessages } from "@platform/locales";
import { NextResponse } from "next/server";
import { verifyResendWebhook } from "../../../../lib/resend-webhook";

export async function POST(req: Request) {
  try {
    const credentials = await getResendCredentials();
    const { id, event } = verifyResendWebhook(
      await req.text(),
      req.headers,
      credentials?.webhookSecret || "",
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "WEBHOOK_NOT_CONFIGURED")
      return NextResponse.json(
        { error: serverMessages.runtimeWebhookIsNotConfigured },
        { status: 503 },
      );
    if (message === "INVALID_SIGNATURE")
      return NextResponse.json(
        { error: serverMessages.runtimeInvalidWebhookSignature },
        { status: 401 },
      );
    console.error("Webhook processing failed");
    return NextResponse.json(
      { error: serverMessages.runtimeInternalServerError },
      { status: 500 },
    );
  }
}
