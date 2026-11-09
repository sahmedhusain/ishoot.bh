
import itsm from "../catalog/itsm.json";

export type TicketCategory = (typeof itsm.categories)[number];
export type TicketTransition = keyof typeof itsm.transitions;

export const TICKET_STATUSES: readonly string[] = itsm.statuses;
export const TICKET_OPEN_STATUSES: readonly string[] = itsm.openStatuses;
export const TICKET_PRIORITIES: readonly string[] = itsm.priorities;
export const TICKET_DEFAULT_PRIORITY = itsm.defaultPriority;
export const TICKET_CATEGORIES: readonly TicketCategory[] = itsm.categories;

export const ticketCategory = (key: string) =>
  TICKET_CATEGORIES.find((c) => c.key === key);

export const requesterTransitions = (status: string): TicketTransition[] =>
  (itsm.requesterTransitions as TicketTransition[]).filter((name) =>
    itsm.transitions[name].from.includes(status),
  );

export const transitionsFrom = (status: string): TicketTransition[] =>
  (Object.keys(itsm.transitions) as TicketTransition[]).filter((name) =>
    itsm.transitions[name].from.includes(status),
  );
