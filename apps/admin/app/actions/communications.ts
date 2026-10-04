"use server";
import { db, measureOperation, runAtomicMutation } from "@ishoot/database";
import { requirePermission } from "../../lib/auth";
import { revalidatePath } from "next/cache";

// Creates an outbound message or sends a document (e.g. Invoice, Quotation)
export async function sendOutboundMessage(data: {
  toEmail: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  contactId?: string;
  inquiryId?: string;
  invoiceId?: string;
  quotationId?: string;
}) {
  return measureOperation("action:sendOutboundMessage", async () => {
    const actor = await requirePermission("settings", "write"); // Or appropriate resource

    return await runAtomicMutation(async () => {
      // Find or create thread
      let threadId: string | undefined;
      
      if (data.contactId || data.inquiryId) {
        const existingThread = await db.communicationThread.findFirst({
          where: {
            OR: [
              { contactId: data.contactId },
              { inquiryId: data.inquiryId }
            ]
          }
        });
        
        if (existingThread) {
          threadId = existingThread.id;
        } else {
          const newThread = await db.communicationThread.create({
            data: {
              subject: data.subject,
              contactId: data.contactId,
              inquiryId: data.inquiryId,
              status: "open"
            }
          });
          threadId = newThread.id;
        }
      }

      // Persist the message FIRST with "queued" status
      const message = await db.communicationMessage.create({
        data: {
          threadId,
          direction: "outbound",
          fromEmail: "noreply@ishoot.bh", // Read from config ideally
          toEmail: data.toEmail,
          subject: data.subject,
          bodyText: data.bodyText,
          bodyHtml: data.bodyHtml,
          status: "queued",
          invoiceId: data.invoiceId,
          quotationId: data.quotationId,
        }
      });

      // Here would be the actual Resend API call:
      // const res = await resend.emails.send({...})
      // await db.communicationMessage.update({ where: { id: message.id }, data: { messageId: res.id, status: "accepted" }});

      revalidatePath("/dashboard/communications");
      return { success: true, messageId: message.id };
    });
  });
}
