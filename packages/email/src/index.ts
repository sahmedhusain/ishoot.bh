import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
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
}: SendEmailOptions) {
  if (!resend) {
    console.log("\n========================================");
    console.log("[LOCAL EMAIL DISPATCH - RESEND DEV MODE]");
    console.log(`To: ${Array.isArray(to) ? to.join(", ") : to}`);
    console.log(`From: ${from}`);
    console.log(`Subject: ${subject}`);
    console.log(`Attachments: ${attachments?.length || 0} file(s)`);
    console.log("========================================\n");
    return { success: true, id: `mock-email-${Date.now()}` };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      attachments,
    });
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
