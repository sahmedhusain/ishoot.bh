import {
Instagram,
Youtube,
Twitter,
Facebook,
Linkedin,
Github,
Globe,
Mail,
Phone,
MessageCircle,
Send,
Link as LinkIcon,
type LucideIcon,
} from "lucide-react";

const SOCIAL_ICON_MAP: Record<string, LucideIcon> = {
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
  x: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  github: Github,
  globe: Globe,
  website: Globe,
  mail: Mail,
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  telegram: Send,
};

export function SocialIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) return <LinkIcon className={className} />;

  const key = name.toLowerCase().trim();
  const IconComponent = SOCIAL_ICON_MAP[key] || LinkIcon;

  return <IconComponent className={className} />;
}
