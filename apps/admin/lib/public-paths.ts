import { getWebsiteEditor } from "@platform/database";
import {
  resolveWebsiteConfig,
  validateWebsiteConfig,
} from "@platform/database/website-config";

/** The public website's pages to refresh, with the catalogue at the address the website settings give it. */
export async function publicSitePaths() {
  const content = await getWebsiteEditor();
  const { collection } = resolveWebsiteConfig(
    validateWebsiteConfig(content.draft),
  );
  // The old address too, so a renamed catalogue's redirect is refreshed with it.
  return Array.from(
    new Set(["/", "/about", "/contact", `/${collection.slug}`, "/works"]),
  );
}
