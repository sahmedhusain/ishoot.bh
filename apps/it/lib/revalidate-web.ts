
import { config } from "./config";

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
