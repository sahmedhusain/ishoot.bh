import { headers } from "next/headers";
import { getCompanySettings } from "@platform/database";
import { domainOrigin } from "@platform/database/constants/domains";

export async function publicOrigin(): Promise<string> {
  const configured =
    process.env.ADMIN_APP_URL ||
    process.env.ADMIN_URL ||
    process.env.NEXT_PUBLIC_ADMIN_URL;
  if (configured) return configured.replace(/\/$/, "");
  const domain = await getCompanySettings()
    .then((company) => domainOrigin(company.admin_domain))
    .catch(() => "");
  if (domain) return domain;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host)
      return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  } catch {
  }
  return "http://localhost:3001";
}
