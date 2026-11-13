import { config } from "./config";

async function revalidateOrigin(origin: string, tags: string[]): Promise<boolean> {
  const secret = config.revalidationSecret();
  if (!origin || !secret) return false;
  try {
    const response = await fetch(`${origin}/api/revalidate`, {
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
    console.warn("Failed to revalidate public cache:", error);
    return false;
  }
}

export async function revalidatePublicStore(tags: string[]): Promise<boolean> {
  return revalidateOrigin(config.storeUrl(), tags);
}

export async function revalidatePublicSite(tags: string[]): Promise<boolean> {
  const [webOk, storeOk] = await Promise.all([
    revalidateOrigin(config.webUrl(), tags),
    revalidateOrigin(config.storeUrl(), tags),
  ]);
  return webOk || storeOk;
}
