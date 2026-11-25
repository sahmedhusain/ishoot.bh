import { cn } from "./utils";

export function Separator({ className }: { className?: string }) {
  return <div role="separator" className={cn("h-px w-full bg-outline-variant my-6", className)} />;
}
