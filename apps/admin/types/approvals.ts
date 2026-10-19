import type { ApprovalRequest } from "@platform/database/types";

export type ApprovalScope = "awaiting" | "mine" | "all";

export interface ApprovalListItem extends ApprovalRequest {
  /** Server-computed: the viewer may approve or reject this request now. */
  canDecide: boolean;
  /** Where the underlying record is reviewed. */
  href: string;
}
