import { serverMessages } from "@platform/locales";
import { getIntegrationRecord } from "@platform/database";
import { randomUUID } from "node:crypto";
import { isApiError, queueMessage } from "@platform/api-client";

export async function getResendCredentials() {
  const record = await getIntegrationRecord("resend");
  if (record) {
    return record.isActive &&
      record.credentials &&
      Object.keys(record.credentials).length
      ? record.credentials
      : null;
  }
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
  idempotencyKey?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

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
    if (isApiError(error) && error.status === 422)
      return { success: false, error: serverMessages.enterAValidEMailAddress };
    return { success: false, error: serverMessages.providerAcceptanceMissing };
  }
}

export * from "./templates/html-templates";
