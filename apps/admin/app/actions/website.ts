"use server";
import { lookupFile } from "@platform/api-client";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";
import { createHmac } from "node:crypto";
import {
  requireFeatureEnabled,
  db,
  runAtomicMutation,
  collectWebsiteDraft,
  getWebsiteEditor,
} from "@platform/database";
import {
  validateWebsiteConfig,
  safeWebsiteUrl,
  type WebsiteArticles,
  type WebsiteConfig,
  type WebsiteMenus,
} from "@platform/database/website-config";
import { requirePermission } from "../../lib/auth";
import { revalidatePath } from "next/cache";
import { revalidatePublicSite } from "../../lib/revalidate-web";
import { publicSitePaths } from "../../lib/public-paths";

export async function saveWebsiteDraftAction(value: unknown, revision: number) {
  return measureOperation("action:saveWebsiteDraftAction", async () => {
    const user = await requirePermission("settings", "write");
    await requireFeatureEnabled("cms");
    validateActionArguments("saveWebsiteDraftAction", { value, revision });
    const config = validateWebsiteConfig(value);
    for (const document of config.documents ?? []) {
      if (!document.url.startsWith("/")) continue;
      const upload = await lookupFile(document.url);
      if (!upload?.isPublic || !upload.claimedAt || upload.mimeType !== "application/pdf") throw new Error(serverMessages.invalidUploadedFile);
    }
    await db.$transaction(async (tx) => {
      const updated = await tx.websiteContent.updateMany({
        where: { id: "main", revision },
        data: {
          draft: JSON.parse(JSON.stringify(config)),
          revision: { increment: 1 },
        },
      });
      if (!updated.count)
        throw new Error(
          "Content was changed by another editor. Refresh before saving.",
        );
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "update",
          entityType: "website",
          entityId: "main",
          details: { operation: "save_draft" },
        },
      });
    });
    revalidatePath(ROUTES.cms.website);
    return { revision: revision + 1 };
  });
}
export async function publishWebsiteAction(revision: number) {
  return measureOperation("action:publishWebsiteAction", async () => {
    const user = await requirePermission("settings", "write");
    await requireFeatureEnabled("cms");
    validateActionArguments("publishWebsiteAction", { revision });
    const content = await getWebsiteEditor();
    if (content.revision !== revision)
      throw new Error(serverMessages.contentChangedRefreshBeforePublishing);
    const snapshot = await collectWebsiteDraft(
      validateWebsiteConfig(content.draft),
    );
    const paths = await publicSitePaths();
    await db.$transaction(async (tx) => {
      const updated = await tx.websiteContent.updateMany({
        where: { id: "main", revision },
        data: {
          published: JSON.parse(JSON.stringify(snapshot)),
          ...(content.published ? { previous: content.published } : {}),
          publishedAt: new Date(),
          revision: { increment: 1 },
        },
      });
      if (!updated.count)
        throw new Error(serverMessages.contentChangedRefreshBeforePublishing);
      await tx.revalidationJob.create({
        data: {
          eventKey: `website:publish:${revision + 1}`,
          payload: {
            tags: ["website", "company"],
            paths,
          },
        },
      });
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "update",
          entityType: "website",
          entityId: "main",
          details: { operation: "publish", revision },
        },
      });
    });
    revalidatePath(ROUTES.cms.website);
    if (await revalidatePublicSite([], paths)) {
      try {
        await db.revalidationJob.updateMany({
          where: {
            eventKey: `website:publish:${revision + 1}`,
            status: "pending",
          },
          data: {
            status: "delivered",
            deliveredAt: new Date(),
            lastError: null,
          },
        });
      } catch {
        console.warn(
          "Publish cache delivery status could not be recorded; the queued job will retry.",
        );
      }
    }
    return { revision: revision + 1 };
  });
}
export async function restoreWebsiteAction(revision: number) {
  return measureOperation("action:restoreWebsiteAction", async () => {
    const user = await requirePermission("settings", "write");
    await requireFeatureEnabled("cms");
    validateActionArguments("restoreWebsiteAction", { revision });
    const paths = await publicSitePaths();
    await db.$transaction(async (tx) => {
      const content = await tx.websiteContent.findUniqueOrThrow({
        where: { id: "main" },
      });
      if (!content.previous || content.revision !== revision)
        throw new Error(
          serverMessages.noPreviousPublicationAvailableOrContentChanged,
        );
      const result = await tx.websiteContent.updateMany({
        where: { id: "main", revision },
        data: {
          published: content.previous,
          ...(content.published ? { previous: content.published } : {}),
          publishedAt: new Date(),
          revision: { increment: 1 },
        },
      });
      if (!result.count)
        throw new Error(serverMessages.contentChangedRefreshBeforeRestoring);
      await tx.revalidationJob.create({
        data: {
          eventKey: `website:restore:${revision + 1}`,
          payload: {
            tags: ["website", "company"],
            paths,
          },
        },
      });
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "update",
          entityType: "website",
          entityId: "main",
          details: { operation: "restore" },
        },
      });
    });
    revalidatePath(ROUTES.cms.website);
    if (await revalidatePublicSite([], paths)) {
      try {
        await db.revalidationJob.updateMany({
          where: {
            eventKey: `website:restore:${revision + 1}`,
            status: "pending",
          },
          data: {
            status: "delivered",
            deliveredAt: new Date(),
            lastError: null,
          },
        });
      } catch {
        console.warn(
          "Publish cache delivery status could not be recorded; the queued job will retry.",
        );
      }
    }
  });
}
/** A signed link that turns on draft preview in the website and opens `path` (a page of the website, default its home). */
export async function previewWebsiteAction(locale: string, path?: string) {
  return measureOperation("action:previewWebsiteAction", async () => {
    await requirePermission("settings", "read");
    await requireFeatureEnabled("cms");
    validateActionArguments("previewWebsiteAction", { locale, path });
    const secret = process.env.REVALIDATION_SECRET;
    const web = process.env.WEB_URL;
    if (!secret || !web)
      throw new Error(serverMessages.websitePreviewNotConfigured);
    const expires = String(Date.now() + 10 * 60 * 1000);
    const token = createHmac("sha256", secret)
      .update(`website-preview:${expires}`)
      .digest("hex");
    const target =
      path && /^\/(en|ar)(\/[a-z0-9-/]*)?$/.test(path)
        ? `&path=${encodeURIComponent(path)}`
        : "";
    return `${web}/api/preview?expires=${expires}&token=${token}&locale=${locale === "ar" ? "ar" : "en"}${target}`;
  });
}
export async function updateWebsiteServiceAction(
  id: string,
  isPublic: boolean,
  imageUrl: string,
) {
  return measureOperation("action:updateWebsiteServiceAction", async () => {
    const user = await requirePermission("settings", "write");
    await requireFeatureEnabled("cms");
    validateActionArguments("updateWebsiteServiceAction", {
      id,
      isPublic,
      imageUrl,
    });
    if (
      typeof isPublic !== "boolean" ||
      typeof imageUrl !== "string" ||
      imageUrl.length > 2000 ||
      (imageUrl && !safeWebsiteUrl(imageUrl))
    )
      throw new Error(serverMessages.invalidServiceImageUrl);
    await runAtomicMutation(async () => {
      await db.service.update({
        where: { id },
        data: { isPublic, imageUrl: imageUrl || null },
      });
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: "update",
          entityType: "service",
          entityId: id,
          details: { operation: "website_presentation" },
        },
      });
    });
    revalidatePath(ROUTES.cms.website);
  });
}

/** Merges part of the website settings into the draft (menus, articles address, site code) and logs it. */
async function updateWebsiteDraft(
  userId: string,
  patch: Partial<WebsiteConfig>,
  operation: string,
  details: Record<string, unknown> = {},
) {
  const content = await getWebsiteEditor();
  const config = validateWebsiteConfig({
    ...validateWebsiteConfig(content.draft),
    ...patch,
  });
  await db.$transaction(async (tx) => {
    const updated = await tx.websiteContent.updateMany({
      where: { id: "main", revision: content.revision },
      data: {
        draft: JSON.parse(JSON.stringify(config)),
        revision: { increment: 1 },
      },
    });
    if (!updated.count)
      throw new Error(serverMessages.contentChangedRefreshBeforePublishing);
    await tx.activityLog.create({
      data: {
        userId,
        action: "update",
        entityType: "website",
        entityId: "main",
        details: { operation, ...details },
      },
    });
  });
  revalidatePath(ROUTES.cms.website);
  revalidatePath(ROUTES.cms.menus);
}

/** Website → Menus: the header and footer menus and the articles address and name. */
export async function saveWebsiteMenusAction(
  menus: WebsiteMenus | null,
  articles: WebsiteArticles,
) {
  return measureOperation("action:saveWebsiteMenusAction", async () => {
    await requireFeatureEnabled("cms");
    const user = await requirePermission("pages", "edit");
    validateActionArguments("saveWebsiteMenusAction", { menus, articles });
    await updateWebsiteDraft(
      user.id,
      { menus: menus ?? undefined, articles },
      "menus",
    );
    return { success: true };
  });
}
