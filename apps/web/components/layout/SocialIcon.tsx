import * as React from "react";
import * as LucideIcons from "lucide-react";

export function SocialIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) return <LucideIcons.Link className={className} />;

  // Try to find the exact icon, otherwise fallback to Link
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const IconComponent = (LucideIcons as any)[formattedName] || (LucideIcons as any)[name] || LucideIcons.Link;

  return <IconComponent className={className} />;
}
