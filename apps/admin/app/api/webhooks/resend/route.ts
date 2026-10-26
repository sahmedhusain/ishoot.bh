import { getResendCredentials } from "@platform/email";
import { serverMessages } from "@platform/locales";
import { NextResponse } from "next/server";
import { db,type Prisma } from "@platform/database";
import { verifyResendWebhook } from "../../../../lib/resend-webhook";

export async function POST(req: Request) {
  try {
    const credentials = await getResendCredentials();
    const { id, event } = verifyResendWebhook(await req.text(), req.headers, credentials?.webhookSecret || "");
    const statuses: Record<string, string> = { "email.delivered": "delivered", "email.bounced": "bounced", "email.complained": "failed" };
    const status = statuses[event.type];
    const emailId = event.data?.email_id;
    if (status && typeof emailId === "string") {
      await db.$transaction(async (tx) => {
        // Serialize retries and simultaneous delivery events for the same message.
        await tx.$queryRaw`SELECT id FROM "CommunicationMessage" WHERE "messageId"=${emailId} FOR UPDATE`;
        const message = await tx.communicationMessage.findUnique({ where: { messageId: emailId } });
        if (!message) return;
        const log = Array.isArray(message.deliveryLog) ? message.deliveryLog : [];
        if (log.some((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && entry.id === id)) return;
        await tx.communicationMessage.update({ where: { id: message.id }, data: {
          status,
          // Bound stored evidence; use the signed Svix event ID, not data.id (often absent).
          deliveryLog: [...log.slice(-99), { id, type: event.type, data: { email_id: emailId } }] as Prisma.InputJsonValue,
        } });
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "WEBHOOK_NOT_CONFIGURED") return NextResponse.json({ error: serverMessages.runtimeWebhookIsNotConfigured }, { status: 503 });
    if (message === "INVALID_SIGNATURE") return NextResponse.json({ error: serverMessages.runtimeInvalidWebhookSignature }, { status: 401 });
    console.error("Webhook processing failed");
    return NextResponse.json({ error: serverMessages.runtimeInternalServerError }, { status: 500 });
  }
}
