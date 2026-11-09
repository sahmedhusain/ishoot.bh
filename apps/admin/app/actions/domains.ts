"use server";
import { serverMessages } from "@platform/locales";
import { revalidatePath } from "next/cache";
import {
  checkDomain,
  createActivityLog,
  installationFingerprint,
  measureOperation,
  saveSiteDomains,
  type DomainCheckResult,
} from "@platform/database";
import { revalidatePublicSite } from "../../lib/revalidate-web";
import { publicSitePaths } from "../../lib/public-paths";
import { normalizeDomain } from "@platform/database/constants/domains";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

export async function checkDomainAction(
  kind: "website" | "admin",
  domain: string,
): Promise<DomainCheckResult> {
  return measureOperation("action:checkDomainAction", async () => {
    await requirePermission("settings", "edit");
    validateActionArguments("checkDomainAction", { kind, domain });
    return checkDomain(kind, domain, installationFingerprint);
  });
}

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
    if (
      (input.websiteDomain.trim() && !websiteDomain) ||
      (input.adminDomain.trim() && !adminDomain)
    )
      throw new Error(serverMessages.invalidDomain);
    if (websiteDomain && websiteDomain === adminDomain)
      throw new Error(serverMessages.domainsMustDiffer);
    const saved = await saveSiteDomains({ websiteDomain, adminDomain }, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "settings",
      entity_id: "domains",
      details: { websiteDomain, adminDomain },
    });
    revalidatePath("/", "layout");
    await revalidatePublicSite(
      ["company"],
      ["/en", "/ar", ...(await publicSitePaths())],
    );
    return {
      success: true,
      websiteDomain: saved.websiteDomain,
      adminDomain: saved.adminDomain,
    };
  });
}
