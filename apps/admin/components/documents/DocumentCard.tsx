import * as React from "react";
import { Card } from "@platform/ui";

interface DocumentCardProps {
  title: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "main" | "side";
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function DocumentCard({
  title,
  icon: Icon,
  variant = "main",
  action,
  className = "",
  children,
}: DocumentCardProps) {
  const heading =
    variant === "main" ? (
      <h2
        className={`text-sm font-semibold uppercase tracking-wider text-ink font-mono${Icon ? " flex items-center gap-2" : ""}${action ? "" : " border-b border-outline-variant pb-3"}`}
      >
        {Icon && <Icon className="w-4 h-4 text-accent" />}
        {title}
      </h2>
    ) : (
      <h2
        className={`text-xs font-mono uppercase tracking-widest text-ink-muted${action ? "" : " border-b border-outline-variant pb-2"}`}
      >
        {title}
      </h2>
    );

  return (
    <Card
      className={`p-6 bg-surface-raised border border-outline-variant rounded-lg space-y-4 ${className}`}
      data-page-section
    >
      {action ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant ${variant === "main" ? "pb-3" : "pb-2"}`}
        >
          {heading}
          {action}
        </div>
      ) : (
        heading
      )}
      {children}
    </Card>
  );
}

export function DocumentBilingualText({
  en,
  ar,
}: {
  en: { label: React.ReactNode; text?: string | null; empty: React.ReactNode };
  ar: { label: React.ReactNode; text?: string | null; empty: React.ReactNode };
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="text-xs font-mono uppercase text-ink-muted mb-1">{en.label}</div>
        <div className="p-3 bg-surface-raised rounded-md text-xs font-mono text-ink whitespace-pre-line" dir="auto">
          {en.text || en.empty}
        </div>
      </div>
      <div>
        <div className="text-xs font-mono uppercase text-ink-muted mb-1">{ar.label}</div>
        <div className="p-3 bg-surface-raised rounded-md text-xs font-mono text-ink whitespace-pre-line" dir="rtl">
          {ar.text || ar.empty}
        </div>
      </div>
    </div>
  );
}
