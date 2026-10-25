"use server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { serverMessages } from "@platform/locales";
import { revalidatePath } from "next/cache";
import { createActivityLog, installationFingerprint, measureOperation, runAtomicMutation, updateCompanySettings } from "@platform/database";
import { revalidatePublicSite } from "../../lib/revalidate-web";
import { publicSitePaths } from "../../lib/public-paths";
import { HEALTH_PATH, normalizeDomain } from "@platform/database/constants/domains";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

/** What the domain check found. */
export interface DomainCheckResult {
  /** connected: the domain reaches this installation; other: it answers, but as another site or app. */
  state: "connected" | "other" | "unreachable" | "private";
  /** The HTTP status the domain answered with, when it answered. */
  status?: number;
}

/** Private, loopback, link-local and other non-public addresses the check must never call. */
function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v6 = address.toLowerCase();
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("::ffff:");
}

/**
 * Settings → Website → Check domain: fetches https://<domain>/api/health and compares the installation it reports.
 * Only public addresses are called, with a short timeout and no redirects; nothing about DNS is changed.
 */
export async function checkDomainAction(kind: "website" | "admin", domain: string): Promise<DomainCheckResult> {
  return measureOperation("action:checkDomainAction", async () => {
    await requirePermission("settings", "edit");
    validateActionArguments("checkDomainAction", { kind, domain });
    const host = normalizeDomain(domain);
    if (!host) throw new Error(serverMessages.invalidDomain);
    const addresses = await lookup(host, { all: true }).catch(() => []);
    if (!addresses.length) return { state: "unreachable" };
    if (addresses.some((entry) => isPrivateAddress(entry.address))) return { state: "private" };
    try {
      const response = await fetch(`https://${host}${HEALTH_PATH}`, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!response.ok) return { state: "other", status: response.status };
      const body = (await response.json().catch(() => null)) as { app?: unknown; installation?: unknown } | null;
      const expected = kind === "admin" ? "admin" : "web";
      const connected = body?.app === expected && body.installation === (await installationFingerprint());
      return { state: connected ? "connected" : "other", status: response.status };
    } catch {
      return { state: "unreachable" };
    }
  });
}

/** The website's domain and the admin's own domain (setup wizard, Settings → Website). Empty clears one. */
export interface DomainSettingsInput {
  websiteDomain: string;
  adminDomain: string;
}

export async function saveDomainsAction(input: DomainSettingsInput) {
  return measureOperation("action:saveDomainsAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("saveDomainsAction", { input });
    const websiteDomain = normalizeDomain(input.websiteDomain);
    const adminDomain = normalizeDomain(input.adminDomain);
    if ((input.websiteDomain.trim() && !websiteDomain) || (input.adminDomain.trim() && !adminDomain)) throw new Error(serverMessages.invalidDomain);
    if (websiteDomain && websiteDomain === adminDomain) throw new Error(serverMessages.domainsMustDiffer);
    const saved = await runAtomicMutation(async () => {
      const company = await updateCompanySettings({ website_domain: websiteDomain, admin_domain: adminDomain });
      await createActivityLog({ user_id: user.id, action: "update", entity_type: "settings", entity_id: "domains", details: { websiteDomain, adminDomain } });
      return company;
    });
    revalidatePath("/", "layout");
    // Links, the sitemap and page metadata on the website use the domain.
    await revalidatePublicSite(["company"], ["/en", "/ar", ...(await publicSitePaths())]);
    return { success: true, websiteDomain: saved.website_domain ?? "", adminDomain: saved.admin_domain ?? "" };
  });
}
