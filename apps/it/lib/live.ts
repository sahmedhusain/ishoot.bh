

import { deliverNotifications, publishHint } from "@platform/api-client";
import { formatMessage } from "@platform/locales";
import en from "../locales/en.json";

type ChangedTicket = { id: string; number: number; requesterId: string };

export async function announceTicketChange(ticket: ChangedTicket, change: "status" | "reply" | "note") {
  try {
    await publishHint({
      type: "entity.changed",
      topics: ["it.tickets"],

      users: change === "note" ? [] : [{ realm: "staff", id: ticket.requesterId }],
      data: { resource: "it_support", id: ticket.id },
    });
  } catch (error) {
    console.error("Announcing a ticket change failed:", error);
  }
  if (change === "note") return;

  const key = change === "reply" ? "reply" : "updated";
  const params = { number: String(ticket.number) };
  const copy = en.itSupport.notifications[key];
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
