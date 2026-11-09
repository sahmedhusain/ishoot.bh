import * as React from "react";

export interface DocumentStatusMeta {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DocumentStatusBannerProps {
  status: string;
  statusMeta: Record<string, DocumentStatusMeta>;
  fallback: string;
  caption: React.ReactNode;
  label?: React.ReactNode;
  children?: React.ReactNode;
}

export function DocumentStatusBanner({
  status,
  statusMeta,
  fallback,
  caption,
  label,
  children,
}: DocumentStatusBannerProps) {
  const meta = statusMeta[status] || statusMeta[fallback];
  const StatusIcon = meta.icon;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-surface-raised border border-outline-variant">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${meta.color}`}>
          <StatusIcon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs text-ink-muted">{caption}</div>
          <div className="font-semibold text-ink">{label || meta.label}</div>
        </div>
      </div>
      {children}
    </div>
  );
}
