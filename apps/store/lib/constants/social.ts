import catalog from "./social-platforms.json";

export interface SocialPlatform {
  id: string;
  name: string;
  path: string;
  aliases?: string[];
}

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] =
  catalog as readonly SocialPlatform[];

export function findSocialPlatform(
  value?: string | null,
): SocialPlatform | undefined {
  const key = (value || "").toLowerCase().trim();
  if (!key) return undefined;
  return (
    SOCIAL_PLATFORMS.find(
      (p) =>
        p.id === key ||
        p.name.toLowerCase() === key ||
        p.aliases?.includes(key),
    ) ?? SOCIAL_PLATFORMS.find((p) => key.includes(p.id) && p.id.length > 2)
  );
}
