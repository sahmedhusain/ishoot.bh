
export const REQUEST_TRANSITIONS = {
  assign: ["received", "under_review", "returned", "assigned", "in_progress"],
  reassign: [
    "assigned",
    "in_progress",
    "pending_approval",
    "approved",
    "returned",
  ],
  return: [
    "received",
    "under_review",
    "assigned",
    "in_progress",
    "pending_approval",
    "approved",
    "confirmed",
  ],
  submit: ["assigned", "in_progress"],
  approve: ["pending_approval"],
  confirm: ["approved"],
  resolve: [
    "received",
    "under_review",
    "assigned",
    "in_progress",
    "approved",
    "confirmed",
    "returned",
  ],
} as const satisfies Record<string, readonly string[]>;

export type RequestTransition = keyof typeof REQUEST_TRANSITIONS;

export const REQUEST_TRANSITION_TARGET: Record<RequestTransition, string> = {
  assign: "assigned",
  reassign: "assigned",
  return: "returned",
  submit: "pending_approval",
  approve: "approved",
  confirm: "confirmed",
  resolve: "resolved",
};

export const REQUEST_TEAMS = [
  "production",
  "post_production",
  "finance",
  "sales",
  "executive",
  "support",
] as const;
export type RequestTeam = (typeof REQUEST_TEAMS)[number];

export const REQUEST_CLOSED_STATUSES = [
  "resolved",
  "archived",
  "rejected",
] as const;

export function canTransitionRequest(
  workflowStatus: string | null | undefined,
  transition: RequestTransition,
): boolean {
  return (REQUEST_TRANSITIONS[transition] as readonly string[]).includes(
    workflowStatus ?? "",
  );
}

export const REQUEST_KINDS = [
  "service",
  "quote",
  "inquiry",
  "feedback",
] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const REQUEST_PRIORITIES = ["urgent", "high", "normal"] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

export function requestKindOf(record: {
  requestType?: string | null;
  intent?: string | null;
  [key: string]: any;
}): RequestKind {
  if (record.requestType === "SR") return "service";
  if (
    record.requestType === "CR" ||
    record.intent === "complaint" ||
    record.intent === "suggestion"
  )
    return "feedback";
  if (
    record.requestType === "quote_request" ||
    record.intent === "quote_request"
  )
    return "quote";
  return "inquiry";
}

export function referencePrefixFor(record: {
  requestType?: string | null;
  intent?: string | null;
}): string {
  if (record.requestType === "SR") return "SR";
  if (record.intent === "complaint") return "CMP";
  if (record.intent === "suggestion") return "SUG";
  if (
    record.requestType === "quote_request" ||
    record.intent === "quote_request"
  )
    return "RFQ";
  return "INQ";
}

export const REQUEST_SORTS = [
  "urgency",
  "newest",
  "oldest",
  "sla_asc",
  "sla_desc",
  "priority",
  "customer_asc",
] as const;
export type RequestSort = (typeof REQUEST_SORTS)[number];
export const REQUEST_DUE_FILTERS = [
  "overdue",
  "today",
  "week",
  "none",
] as const;
export const REQUEST_SOURCES = [
  "website",
  "email",
  "whatsapp",
  "manual",
] as const;
