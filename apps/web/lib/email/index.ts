import { serverMessages } from "@platform/locales";
import { randomUUID } from "node:crypto";
import { getIntegration, isApiError, queueMessage } from "@platform/api-client";

export function escapeEmailHtml(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Server-only Resend credentials (the delivery webhook checks its signature with them). */
export async function getResendCredentials() {
  const record = await getIntegration("resend");
  if (record) {
    return record.isActive &&
      record.credentials &&
      Object.keys(record.credentials).length
      ? record.credentials
      : null;
  }
  // Before the integration is saved, only the webhook's signing secret may come from the environment.
  return process.env.RESEND_WEBHOOK_SECRET
    ? {
        apiKey: "",
        fromEmail: "",
        webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
      }
    : null;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  /** Repeating a key never sends again (per recipient). Without one, every call is a new message. */
  idempotencyKey?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Hands the e-mail to the notify service (backend/services/notify), which sends it through the provider IT set up
 * (Resend), or Mailpit locally, retrying while the provider is unavailable. Success means the message is queued; IT
 * sees how each delivery went in the IT dashboard. Several recipients are separate messages.
 */
export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  idempotencyKey,
}: SendEmailOptions): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  const recipients = Array.isArray(to) ? to : [to];
  const key = idempotencyKey ?? randomUUID();
  try {
    const ids: string[] = [];
    for (let index = 0; index < recipients.length; index++) {
      const recipient = recipients[index];
      const message = await queueMessage({
        channel: "email",
        to: recipient,
        subject,
        html,
        idempotencyKey: recipients.length > 1 ? `${key}:${index}` : key,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          contentType: a.contentType,
          content: (typeof a.content === "string"
            ? Buffer.from(a.content)
            : a.content
          ).toString("base64"),
        })),
      });
      ids.push(message.id);
    }
    return { success: true, id: ids[0] };
  } catch (error) {
    // notify refused the message itself (an invalid address, too large attachments): say so, in the person's terms.
    if (isApiError(error) && error.status === 422)
      return { success: false, error: serverMessages.enterAValidEMailAddress };
    return { success: false, error: serverMessages.providerAcceptanceMissing };
  }
}
