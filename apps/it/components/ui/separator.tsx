import { cn } from "./utils";

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-outline-variant my-5", className)} />;
}
