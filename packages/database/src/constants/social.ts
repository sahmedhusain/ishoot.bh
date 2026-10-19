import catalog from "./social-platforms.json";
// Brand marks for social links shown on the website and in the admin. Paths are from Simple Icons (CC0),
// drawn on a 24x24 viewBox. Runtime-free so both apps and the seed can import it.

export interface SocialPlatform {
  id: string;
  name: string;
  /** SVG path data on a 24x24 viewBox. */
  path: string;
  aliases?: string[];
}

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = catalog as readonly SocialPlatform[];

/** Resolves a stored platform name or icon hint ("Instagram", "twitter", "X (Twitter)") to a known platform. */
export function findSocialPlatform(value?: string | null): SocialPlatform | undefined {
  const key = (value || "").toLowerCase().trim();
  if (!key) return undefined;
  return SOCIAL_PLATFORMS.find(
    (p) => p.id === key || p.name.toLowerCase() === key || p.aliases?.includes(key),
  ) ?? SOCIAL_PLATFORMS.find((p) => key.includes(p.id) && p.id.length > 2);
}
