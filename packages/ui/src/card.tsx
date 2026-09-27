import * as React from "react";
import { cn } from "./utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[#0B1210] border border-[#09937F]/20 rounded-2xl p-6 text-[#F2F6F5] shadow-xl",
        className,
      )}
      {...props}
    />
  );
}
