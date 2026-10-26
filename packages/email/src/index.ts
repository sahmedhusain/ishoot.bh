import { serverMessages } from "@platform/locales";
import { db } from "@platform/database/db";
import { decryptIntegrationCredentials } from "@platform/database/services/integration-credentials";
import { Resend } from "resend";

class BoundedResend extends Resend {
  override fetchRequest<T>(path: string, options: RequestInit = {}) {
    return super.fetchRequest<T>(path, {
      ...options,
      signal: AbortSignal.timeout(30000),
    });
  }
}

/** Server-only credentials. A stored disabled connection takes precedence over legacy environment keys. */
export async function getResendCredentials() {
  const setting = await db.integrationSetting.findUnique({
    where: { provider: "resend" },
    select: { isActive: true, credentials: true },
  });
  if (setting)
    return setting.isActive && setting.credentials
      ? decryptIntegrationCredentials(setting.credentials)
      : null;
  return process.env.RESEND_API_KEY ||
    process.env.FROM_EMAIL ||
    process.env.RESEND_WEBHOOK_SECRET
    ? {
        apiKey: process.env.RESEND_API_KEY ?? "",
        fromEmail: process.env.FROM_EMAIL ?? "",
        webhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? "",
      }
    : null;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  idempotencyKey?: string;
  attachments?: Array<{ filename: string; content: Buffer | string }>;
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
  attachments,
  idempotencyKey,
}: SendEmailOptions) {
  try {
    const credentials = await getResendCredentials();
    if (!credentials?.apiKey || !(from ?? credentials.fromEmail))
      return {
        success: false,
        error: serverMessages.runtimeEmailServiceIsNotConfigured,
      };
    const resend = new BoundedResend(credentials.apiKey);
    const { data, error } = await resend.emails.send(
      { from: from ?? credentials.fromEmail, to, subject, html, attachments },
      { idempotencyKey },
    );
    if (error)
      return {
        success: false,
        error: error.message.split(credentials.apiKey).join("[redacted]"),
      };
    if (!data?.id)
      return {
        success: false,
        error: serverMessages.providerAcceptanceMissing,
      };
    return { success: true, id: data.id };
  } catch {
    return { success: false, error: serverMessages.providerAcceptanceMissing };
  }
}

export * from "./templates/html-templates";
