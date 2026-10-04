import { NextResponse } from "next/server";
import { db } from "@ishoot/database";
import crypto from "crypto";

// Example webhook for Resend
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("svix-signature");
    
    // Verify signature logic would go here
    // ...

    const event = JSON.parse(rawBody);
    
    if (event.type === "email.delivered" || event.type === "email.bounced" || event.type === "email.complained") {
      const emailId = event.data?.email_id;
      if (!emailId) return NextResponse.json({ success: true });
      
      const statusMap: Record<string, string> = {
        "email.delivered": "delivered",
        "email.bounced": "bounced",
        "email.complained": "failed"
      };

      const message = await db.communicationMessage.findUnique({ where: { messageId: emailId } });
      if (message) {
        // Deduplicate using deliveryLog
        const currentLog: any[] = Array.isArray(message.deliveryLog) ? message.deliveryLog : [];
        const isDuplicate = currentLog.some(log => log.id === event.data?.id);
        
        if (!isDuplicate) {
          await db.communicationMessage.update({
            where: { id: message.id },
            data: {
              status: statusMap[event.type] || message.status,
              deliveryLog: [...currentLog, event]
            }
          });
        }
      }
    } else if (event.type === "email.inbound") {
      // Inbound email processing
      const from = event.data?.from;
      const to = event.data?.to;
      const subject = event.data?.subject;
      const text = event.data?.text;
      const messageId = event.data?.messageId;
      const inReplyTo = event.data?.inReplyTo;

      // Find thread by inReplyTo
      let threadId: string | undefined;
      
      if (inReplyTo) {
        const parentMessage = await db.communicationMessage.findUnique({
          where: { messageId: inReplyTo }
        });
        if (parentMessage && parentMessage.threadId) {
          threadId = parentMessage.threadId;
        }
      }

      if (!threadId) {
        // Create new thread
        const thread = await db.communicationThread.create({
          data: {
            subject: subject || "No Subject",
            status: "open"
          }
        });
        threadId = thread.id;
      }

      await db.communicationMessage.create({
        data: {
          threadId,
          messageId,
          inReplyTo,
          direction: "inbound",
          fromEmail: from,
          toEmail: to,
          subject: subject || "No Subject",
          bodyText: text,
          status: "delivered"
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
