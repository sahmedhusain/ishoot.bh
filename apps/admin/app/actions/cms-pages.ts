"use server";
import { revalidatePath } from "next/cache";
import { serverMessages } from "@platform/locales";
import {
  codeBlocksChanged,
  createActivityLog,
  deleteCmsPage,
  duplicateCmsPage,
  getCmsPage,
  getWebsiteEditor,
  measureOperation,
  reorderCmsPages,
  requireFeatureEnabled,
  runAtomicMutation,
  saveCmsPage,
  updateCmsPageFlags,
  validateBlocks,
  type CmsPageInput,
} from "@platform/database";
import type { Block } from "@platform/database/cms/blocks";
import {
  resolveWebsiteConfig,
  validateWebsiteConfig,
} from "@platform/database/website-config";
import { ROUTES } from "../../constants/routes";
import { hasPermission, requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";
import { renderRichText } from "../../lib/rich-text/render";

function revalidatePages(id?: string) {
  revalidatePath(ROUTES.cms.pages);
  if (id) revalidatePath(ROUTES.cms.page(id));
  revalidatePath(ROUTES.cms.website);
}

function withRenderedText(blocks: Block[]): Block[] {
  return blocks.map((block) =>
    block.type === "rich_text"
      ? ({
          ...block,
          data: {
            ...block.data,
            html: {
              en: renderRichText(
                (block.data as Block<"rich_text">["data"]).doc.en,
                "en",
              ),
              ar: renderRichText(
                (block.data as Block<"rich_text">["data"]).doc.ar,
                "ar",
              ),
            },
          },
        } as Block)
      : block,
  );
}

export async function saveCmsPageAction(input: CmsPageInput) {
  return measureOperation("action:saveCmsPageAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("pages", input.id ? "edit" : "create");
    validateActionArguments("saveCmsPageAction", { input });
    const blocks = withRenderedText(validateBlocks(input.blocks));
    const before = input.id ? await getCmsPage(input.id) : null;
    const codeChanged = codeBlocksChanged(before?.blocks ?? [], blocks);
    if (codeChanged && !(await hasPermission("cms_code", "edit")))
      throw new Error(serverMessages.cmsCodePermission);
    const collection = resolveWebsiteConfig(
      validateWebsiteConfig((await getWebsiteEditor()).draft),
    ).collection.slug;
    const page = await runAtomicMutation(async () => {
      const saved = await saveCmsPage(input, blocks, collection);
      await createActivityLog({
        user_id: user.id,
        action: input.id ? "update" : "create",
        entity_type: "cms_page",
        entity_id: saved.id,
        details: {
          slug: saved.slug,
          blocks: blocks.length,
          ...(codeChanged
            ? {
                customCode: blocks
                  .filter((b) => b.type === "code")
                  .map((b) => b.data),
              }
            : {}),
        },
      });
      return saved;
    });
    revalidatePages(page.id);
    return { success: true, page };
  });
}

export async function duplicateCmsPageAction(id: string) {
  return measureOperation("action:duplicateCmsPageAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("pages", "create");
    validateActionArguments("duplicateCmsPageAction", { id });
    const source = await getCmsPage(id);
    if (
      source?.blocks.some((block) => block.type === "code") &&
      !(await hasPermission("cms_code", "edit"))
    )
      throw new Error(serverMessages.cmsCodePermission);
    const page = await runAtomicMutation(async () => {
      const copy = await duplicateCmsPage(id);
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "cms_page",
        entity_id: copy.id,
        details: { duplicateOf: id },
      });
      return copy;
    });
    revalidatePages();
    return { success: true, id: page.id };
  });
}

export async function deleteCmsPageAction(id: string) {
  return measureOperation("action:deleteCmsPageAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("pages", "delete");
    validateActionArguments("deleteCmsPageAction", { id });
    await runAtomicMutation(async () => {
      await deleteCmsPage(id);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "cms_page",
        entity_id: id,
        details: {},
      });
    });
    revalidatePages();
    return { success: true };
  });
}

export async function updateCmsPagesListAction(
  pages: {
    id: string;
    is_visible: boolean;
    in_header: boolean;
    in_footer: boolean;
  }[],
) {
  return measureOperation("action:updateCmsPagesListAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("pages", "edit");
    validateActionArguments("updateCmsPagesListAction", { pages });
    await runAtomicMutation(async () => {
      await reorderCmsPages(pages.map((page) => page.id));
      for (const page of pages) await updateCmsPageFlags(page.id, page);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "cms_page",
        entity_id: "list",
        details: { order: pages.map((p) => p.id) },
      });
    });
    revalidatePages();
    return { success: true };
  });
}
