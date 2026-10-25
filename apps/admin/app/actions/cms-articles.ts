"use server";
import { revalidatePath } from "next/cache";
import { createActivityLog, deleteCmsArticle, measureOperation, requireFeatureEnabled, runAtomicMutation, saveCmsArticle, type CmsArticleInput } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { hasPermission, requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";
import { renderRichText } from "../../lib/rich-text/render";

/**
 * Saves an article. The body is rendered to clean HTML here from the editor document. Publishing needs
 * articles:approve; others save drafts that a publisher releases. The website shows it after the next publication.
 */
export async function saveCmsArticleAction(input: CmsArticleInput) {
  return measureOperation("action:saveCmsArticleAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("articles", input.id ? "edit" : "create");
    validateActionArguments("saveCmsArticleAction", { input });
    const canPublish = await hasPermission("articles", "approve");
    const status = input.status === "published" && canPublish ? "published" : "draft";
    const html = { en: renderRichText(input.body_en), ar: renderRichText(input.body_ar) };
    const article = await runAtomicMutation(async () => {
      const saved = await saveCmsArticle({ ...input, status }, html, user.id);
      await createActivityLog({ user_id: user.id, action: input.id ? "update" : "create", entity_type: "cms_article", entity_id: saved.id, details: { slug: saved.slug, status } });
      return saved;
    });
    revalidatePath(ROUTES.cms.articles);
    revalidatePath(ROUTES.cms.article(article.id));
    return { success: true, article, published: status === "published" };
  });
}

export async function deleteCmsArticleAction(id: string) {
  return measureOperation("action:deleteCmsArticleAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("articles", "delete");
    validateActionArguments("deleteCmsArticleAction", { id });
    await runAtomicMutation(async () => {
      await deleteCmsArticle(id);
      await createActivityLog({ user_id: user.id, action: "delete", entity_type: "cms_article", entity_id: id, details: {} });
    });
    revalidatePath(ROUTES.cms.articles);
    return { success: true };
  });
}
