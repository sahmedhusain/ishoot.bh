import { serverMessages } from "../locales";
import { Webhook } from "svix";
export function verifyResendWebhook(
  payload: string,
  headers: Headers,
  secret = process.env.RESEND_WEBHOOK_SECRET,
) {
  if (!secret) throw new Error(serverMessages.webhookNotConfigured);
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature)
    throw new Error(serverMessages.invalidSignature);
  try {
    new Webhook(secret).verify(payload, {
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    });
    const event: unknown = JSON.parse(payload);
    if (
      !event ||
      typeof event !== "object" ||
      !("type" in event) ||
      typeof event.type !== "string"
    )
      throw new Error(serverMessages.invalidEvent);
    return {
      id,
      event: event as { type: string; data?: { email_id?: string } },
    };
  } catch {
    throw new Error(serverMessages.invalidSignature);
  }
}
