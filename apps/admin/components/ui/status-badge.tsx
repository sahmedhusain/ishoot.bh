"use client";
import * as React from "react";
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

/** Localized status names supplied once by the app, so badges never show raw codes. */
const StatusLabelsContext = React.createContext<Record<string, string>>({});
export const StatusLabelsProvider = StatusLabelsContext.Provider;

const humanize = (status: string) => status.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());

export function StatusBadge({ status, label, variant }: StatusBadgeProps) {
  const labels = React.useContext(StatusLabelsContext) ?? {};
  const resolvedVariant = variant || defaultVariants[status] || "default";
  const displayText = label || labels[status] || labels[status?.toLowerCase()] || humanize(String(status ?? ""));

  return <Badge variant={resolvedVariant}>{displayText}</Badge>;
}
