import { createHash } from "node:crypto";
import { db } from "../atomic";

/**
 * A short, stable fingerprint of this installation (a hash of the company record's id, which reveals nothing).
 * The domain check compares it to make sure a domain reaches this installation and not someone else's site.
 */
export async function installationFingerprint(): Promise<string | null> {
  const company = await db.companySetting.findUnique({
    where: { singleton: 1 },
    select: { id: true },
  });
  return company
    ? createHash("sha256")
        .update(`installation:${company.id}`)
        .digest("hex")
        .slice(0, 16)
    : null;
}
