// Service request (SR) / change request (CR) workflow, shared by the server and the UI.

/** Workflow states each transition may start from. */
export const REQUEST_TRANSITIONS = {
  assign: ["received", "under_review", "returned", "assigned", "in_progress"],
  reassign: ["assigned", "in_progress", "pending_approval", "approved", "returned"],
  return: ["received", "under_review", "assigned", "in_progress", "pending_approval", "approved", "confirmed"],
  /** Hand finished work to the approvers defined by the service request approval policy. */
  submit: ["assigned", "in_progress"],
  /** Applied by the approval engine once the policy's approvers sign off. */
  approve: ["pending_approval"],
  confirm: ["approved"],
  resolve: ["received", "under_review", "assigned", "in_progress", "approved", "confirmed", "returned"],
} as const satisfies Record<string, readonly string[]>;

export type RequestTransition = keyof typeof REQUEST_TRANSITIONS;

/** Workflow state each transition leads to. */
export const REQUEST_TRANSITION_TARGET: Record<RequestTransition, string> = {
  assign: "assigned",
  reassign: "assigned",
  return: "returned",
  submit: "pending_approval",
  approve: "approved",
  confirm: "confirmed",
  resolve: "resolved",
};

export const REQUEST_TEAMS = ["production", "post_production", "finance", "sales", "executive", "support"] as const;
export type RequestTeam = (typeof REQUEST_TEAMS)[number];

/** Request statuses that end the workflow. */
export const REQUEST_CLOSED_STATUSES = ["resolved", "archived", "rejected"] as const;

export function canTransitionRequest(workflowStatus: string | null | undefined, transition: RequestTransition): boolean {
  return (REQUEST_TRANSITIONS[transition] as readonly string[]).includes(workflowStatus ?? "");
}
