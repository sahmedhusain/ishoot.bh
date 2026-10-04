import { Badge } from "./badge";

export interface StatusBadgeProps {
  status: string;
  label?: string;
  variant?: "default" | "emerald" | "amber" | "blue" | "rose" | "purple";
}

const defaultVariants: Record<
  string,
  "default" | "emerald" | "amber" | "blue" | "rose" | "purple"
> = {
  lead: "blue",
  proposal_sent: "amber",
  contract_signed: "purple",
  production: "emerald",
  post_production: "purple",
  delivered: "emerald",
  invoiced: "blue",
  closed_won: "emerald",
  closed_lost: "rose",
  draft: "default",
  sent: "blue",
  partially_paid: "amber",
  paid: "emerald",
  overdue: "rose",
  void: "default",
  new: "blue",
  contacted: "amber",
  qualified: "emerald",
  archived: "default",
};

export function StatusBadge({ status, label, variant }: StatusBadgeProps) {
  const resolvedVariant = variant || defaultVariants[status] || "default";
  const displayText = label || status;

  return <Badge variant={resolvedVariant}>{displayText}</Badge>;
}
