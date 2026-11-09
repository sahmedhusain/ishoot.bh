import { headers } from "next/headers";

export async function itPublicOrigin(): Promise<string> {
  const configured =
    process.env.IT_APP_URL ||
    process.env.IT_URL ||
    process.env.NEXT_PUBLIC_IT_URL;
  if (configured) return configured.replace(/\/$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
  }
  return "http://localhost:3002";
}
