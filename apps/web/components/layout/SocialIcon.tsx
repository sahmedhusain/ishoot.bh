import { Globe, Mail, Phone, Link as LinkIcon, type LucideIcon } from "lucide-react";
import { findSocialPlatform } from "@ishoot/database/constants/social";

const GENERIC_ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  website: Globe,
  mail: Mail,
  email: Mail,
  phone: Phone,
};

/** `name` is the platform ("Instagram"); `hint` is the stored icon name, tried when the platform is custom. */
export function SocialIcon({ name, hint, className }: { name?: string; hint?: string; className?: string }) {
  const platform = findSocialPlatform(name) ?? findSocialPlatform(hint);
  if (platform)
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
        <path d={platform.path} />
      </svg>
    );
  const Icon = GENERIC_ICONS[(hint || name || "").toLowerCase().trim()] || LinkIcon;
  return <Icon className={className} />;
}
