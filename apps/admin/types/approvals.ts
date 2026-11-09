import type { ApprovalRequest } from "@platform/database/types";

export type ApprovalScope = "awaiting" | "mine" | "all";

export interface ApprovalListItem extends ApprovalRequest {
  canDecide: boolean;
  href: string;
}
