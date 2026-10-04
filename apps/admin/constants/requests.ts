// Visual vocabulary for service requests. Labels live in the locale files (t.requestLabels).
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  FileQuestion,
  HelpCircle,
  Layers,
  RotateCcw,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

export type RequestTypeKey = "complaint" | "service_request" | "quote_request" | "inquiry";
export type RequestWorkflowKey =
  | "received"
  | "assigned"
  | "pending_approval"
  | "approved"
  | "confirmed"
  | "returned"
  | "resolved";
export type RequestPriorityKey = "urgent" | "high" | "normal" | "low";

/** Request types arrive both as workflow codes (SR/CR) and as inquiry intents. */
export function normalizeRequestType(type?: string | null): RequestTypeKey {
  if (type === "CR" || type === "complaint") return "complaint";
  if (type === "SR" || type === "service_request") return "service_request";
  if (type === "quote_request") return "quote_request";
  return "inquiry";
}

export const REQUEST_TYPE_STYLES: Record<RequestTypeKey, { icon: LucideIcon; className: string; iconClassName: string }> = {
  complaint: {
    icon: ShieldAlert,
    className: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40",
    iconClassName: "text-rose-600",
  },
  service_request: {
    icon: Layers,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40",
    iconClassName: "text-emerald-600",
  },
  quote_request: {
    icon: FileQuestion,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40",
    iconClassName: "text-amber-600",
  },
  inquiry: {
    icon: HelpCircle,
    className: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300/40",
    iconClassName: "text-sky-600",
  },
};

export const REQUEST_WORKFLOW_STYLES: Record<RequestWorkflowKey, { icon: LucideIcon; className: string; iconClassName: string }> = {
  received: {
    icon: Clock,
    className: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 border border-slate-200 dark:border-white/10",
    iconClassName: "text-slate-400",
  },
  assigned: {
    icon: UserCheck,
    className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50",
    iconClassName: "text-blue-500",
  },
  pending_approval: {
    icon: AlertTriangle,
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50",
    iconClassName: "text-amber-500",
  },
  approved: {
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50",
    iconClassName: "text-emerald-500",
  },
  confirmed: {
    icon: UserCheck,
    className: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50",
    iconClassName: "text-purple-500",
  },
  returned: {
    icon: RotateCcw,
    className: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50",
    iconClassName: "text-rose-500",
  },
  resolved: {
    icon: Check,
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50",
    iconClassName: "text-emerald-500",
  },
};

export const REQUEST_PRIORITY_STYLES: Record<RequestPriorityKey, string> = {
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200",
  normal: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  low: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400",
};
