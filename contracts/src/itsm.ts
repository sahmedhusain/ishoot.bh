// IT ticket workflow (catalog/itsm.json). The itsm service applies the same rules in Go.
import itsm from "../catalog/itsm.json";

export type TicketCategory = (typeof itsm.categories)[number];
export type TicketTransition = keyof typeof itsm.transitions;

export const TICKET_STATUSES: readonly string[] = itsm.statuses;
export const TICKET_OPEN_STATUSES: readonly string[] = itsm.openStatuses;
export const TICKET_PRIORITIES: readonly string[] = itsm.priorities;
export const TICKET_DEFAULT_PRIORITY = itsm.defaultPriority;
export const TICKET_CATEGORIES: readonly TicketCategory[] = itsm.categories;

/** The category with this key. */
export const ticketCategory = (key: string) =>
  TICKET_CATEGORIES.find((c) => c.key === key);

/** The transitions a requester may apply to a ticket in this status, in catalogue order. */
export const requesterTransitions = (status: string): TicketTransition[] =>
  (itsm.requesterTransitions as TicketTransition[]).filter((name) =>
    itsm.transitions[name].from.includes(status),
  );
