// Tells the people a ticket concerns that it changed (docs/adr/0012): the desk's other agents see their queue update
// live, and the employee who raised it gets an in-app notification and sees their ticket page update. Never fails
// the change itself.
import { deliverNotifications, publishHint } from "@platform/api-client";
import { formatMessage } from "@platform/locales";
import adminEn from "@platform/locales/admin/en";

type ChangedTicket = { id: string; number: number; requesterId: string };

export async function announceTicketChange(ticket: ChangedTicket, change: "status" | "reply" | "note") {
  try {
    await publishHint({
      type: "entity.changed",
      topics: ["it.tickets"],
      // An internal note is not the requester's business.
      users: change === "note" ? [] : [{ realm: "staff", id: ticket.requesterId }],
      data: { resource: "it_support", id: ticket.id },
    });
  } catch (error) {
    console.error("Announcing a ticket change failed:", error);
  }
  if (change === "note") return;
  // The admin shows the message key in the employee's language; the English text is kept as the fallback.
  const key = change === "reply" ? "reply" : "updated";
  const params = { number: String(ticket.number) };
  const copy = adminEn.itSupport.notifications[key];
  try {
    await deliverNotifications([
      {
        realm: "staff",
        recipient: ticket.requesterId,
        category: "service_desk",
        title: formatMessage(copy.title, params),
        body: copy.message,
        messageKey: `itSupport.notifications.${key}`,
        messageParams: params,
        entityType: "it_ticket",
        entityId: ticket.id,
        actionUrl: `/dashboard/it-support/${ticket.id}`,
      },
    ]);
  } catch (error) {
    console.error("Notifying the requester failed:", error);
  }
}
