import * as React from "react";
import Link from "next/link";
import { Building } from "lucide-react";
import { DocumentCard } from "./DocumentCard";

interface DocumentInfoRow {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** Dates and numbers read best in mono; names do not. */
  mono?: boolean;
}

interface DocumentInfoCardProps {
  title: React.ReactNode;
  rows?: DocumentInfoRow[];
  children?: React.ReactNode;
}

/** Side-column card of label/value rows. */
export function DocumentInfoCard({ title, rows, children }: DocumentInfoCardProps) {
  return (
    <DocumentCard title={title} variant="side">
      {rows && rows.length > 0 && (
        <div className="space-y-3 text-xs">
          {rows.map(({ label, value, icon: Icon, mono = true }, index) => (
            <div key={index}>
              <span className="text-ink-muted block mb-0.5">{label}</span>
              <div className={`${mono ? "font-mono" : "font-medium"} text-ink flex items-center gap-1.5`}>
                {Icon && <Icon className="w-3.5 h-3.5 text-ink-muted shrink-0" />}
                {value}
              </div>
            </div>
          ))}
        </div>
      )}
      {children}
    </DocumentCard>
  );
}

/** Client or payer block: name first, then contact lines. */
export function DocumentPartyDetails({
  name,
  href,
  lines,
}: {
  name: string;
  href?: string;
  lines: React.ReactNode[];
}) {
  return (
    <div className="space-y-2 text-xs">
      <div className="font-semibold text-ink text-sm flex items-center gap-1.5">
        <Building className="w-4 h-4 text-accent shrink-0" />
        {href ? (
          <Link href={href} className="hover:underline hover:text-accent transition-colors">
            <bdi dir="auto">{name}</bdi>
          </Link>
        ) : (
          <bdi dir="auto">{name}</bdi>
        )}
      </div>
      {lines.map((line, index) => (
        <div key={index} className="text-ink-muted">
          {line}
        </div>
      ))}
    </div>
  );
}
