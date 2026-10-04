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
      className={`inline-flex items-center gap-1.5 text-xs font-semibold text-[#5EEAD4] font-sans tracking-widest uppercase ${className}`}
    >
      <span>{children}</span>
    </div>
  );
}
