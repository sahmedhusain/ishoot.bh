import { createHash } from "node:crypto";
import { getCompanyConfiguration } from "../api/company";

export async function installationFingerprint(): Promise<string | null> {
  try {
    const company = await getCompanyConfiguration();
    if (company?.id) {
      return createHash("sha256")
        .update(`installation:${company.id}`)
        .digest("hex")
        .slice(0, 16);
    }
  } catch {}
  return null;
}
