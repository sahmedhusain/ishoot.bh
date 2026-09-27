import * as React from "react";

export function SectionBadge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#09937F]/10 border border-[#09937F]/25 text-xs font-semibold text-[#09937F] uppercase tracking-widest ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#09937F] animate-pulse" />
      <span>{children}</span>
    </div>
  );
}
