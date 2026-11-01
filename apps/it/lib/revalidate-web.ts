// Asks the public website to drop cached pages and data (its /api/revalidate route). Server-only.
import { config } from "./config";

/** Returns false when unconfigured or failed: the website then refreshes within its 60-second cache lifetime. */
export async function revalidatePublicSite(tags: string[]): Promise<boolean> {
  const webUrl = config.webUrl();
  const secret = config.revalidationSecret();
  if (!webUrl || !secret) return false;
  try {
    const response = await fetch(`${webUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags, paths: ["/"] }),
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch (error) {
    console.warn("Failed to revalidate public site cache:", error);
    return false;
  }
}
