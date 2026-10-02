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
      className={`inline-flex items-center gap-1.5 text-xs font-bold text-[#09937F] font-sans tracking-widest uppercase ${className}`}
    >
      <span className="text-[#09937F] font-mono opacity-80">&lt;&lt;</span>
      <span>{children}</span>
      <span className="text-[#09937F] font-mono opacity-80">&gt;&gt;</span>
    </div>
  );
}
