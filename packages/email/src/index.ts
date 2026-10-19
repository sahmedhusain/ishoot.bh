import { serverMessages } from "@ishoot/locales";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
class BoundedResend extends Resend {
  override fetchRequest<T>(path:string, options:RequestInit={}) {
    return super.fetchRequest<T>(path,{...options,signal:AbortSignal.timeout(30000)});
  }
}
const resend = resendApiKey ? new BoundedResend(resendApiKey) : null;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  idempotencyKey?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.FROM_EMAIL ?? "",
  attachments,
  idempotencyKey,
}: SendEmailOptions) {
  if (!resend || !from) return { success: false, error: serverMessages.runtimeEmailServiceIsNotConfigured };

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      attachments,
    }, { idempotencyKey });
    if (error) {
      console.error("[Resend Error]:", error);
      return { success: false, error };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[Resend Exception]:", err);
    return { success: false, error: err };
  }
}

export * from "./templates/html-templates";
