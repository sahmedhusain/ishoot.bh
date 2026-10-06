import { headers } from "next/headers";

/**
 * The address clients open links and QR codes on: ADMIN_APP_URL (or ADMIN_URL) when configured,
 * else the address staff are using right now, else the local development server.
 */
export async function publicOrigin(): Promise<string> {
  const configured = process.env.ADMIN_APP_URL || process.env.ADMIN_URL || process.env.NEXT_PUBLIC_ADMIN_URL;
  if (configured) return configured.replace(/\/$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  } catch {
    // Outside a request (workers): fall through.
  }
  return "http://localhost:3001";
}
