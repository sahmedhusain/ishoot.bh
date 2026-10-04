"use client";

import { StatusBadge } from "@ishoot/ui";
import {
  REQUEST_PRIORITY_STYLES,
  REQUEST_TYPE_STYLES,
  REQUEST_WORKFLOW_STYLES,
  normalizeRequestType,
  type RequestPriorityKey,
  type RequestWorkflowKey,
} from "../../constants/requests";
import { useAdminLocale } from "../../hooks/useAdminLocale";

type BadgeSize = "sm" | "md";

const sizes: Record<BadgeSize, { pill: string; icon: string }> = {
  sm: { pill: "gap-1 px-2.5 py-0.5 text-[11px]", icon: "w-3 h-3" },
  md: { pill: "gap-1.5 px-3 py-1 text-xs", icon: "w-3.5 h-3.5" },
};

export function RequestTypeBadge({ type, size = "md" }: { type?: string | null; size?: BadgeSize }) {
  const { t } = useAdminLocale();
  const key = normalizeRequestType(type);
  const { icon: Icon, className, iconClassName } = REQUEST_TYPE_STYLES[key];
  return (
    <span className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider ${sizes[size].pill} ${className}`}>
      <Icon className={`${sizes[size].icon} ${iconClassName}`} />
      <span>{t.requestLabels.types[key]}</span>
    </span>
  );
}

export function RequestWorkflowBadge({ status, size = "md" }: { status?: string | null; size?: BadgeSize }) {
  const { t } = useAdminLocale();
  const key = (status || "received") as RequestWorkflowKey;
  const style = REQUEST_WORKFLOW_STYLES[key];
  if (!style) return <StatusBadge status={key} />;
  const { icon: Icon, className, iconClassName } = style;
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sizes[size].pill} ${className}`}>
      <Icon className={`${sizes[size].icon} ${iconClassName}`} />
      <span>{t.requestLabels.workflow[key]}</span>
    </span>
  );
}

export function RequestPriorityBadge({ priority }: { priority?: string | null }) {
  const { t } = useAdminLocale();
  const key = (priority && priority in REQUEST_PRIORITY_STYLES ? priority : "normal") as RequestPriorityKey;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${REQUEST_PRIORITY_STYLES[key]}`}>
      {t.requestLabels.priority[key]}
    </span>
  );
}
