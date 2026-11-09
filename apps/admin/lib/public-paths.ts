import { getWebsiteEditor } from "@platform/database";
import {
  resolveWebsiteConfig,
  validateWebsiteConfig,
} from "@platform/database/website-config";

export async function publicSitePaths() {
  const content = await getWebsiteEditor();
  const { collection } = resolveWebsiteConfig(
    validateWebsiteConfig(content.draft),
  );
  return Array.from(
    new Set(["/", "/about", "/contact", `/${collection.slug}`, "/works"]),
  );
}
