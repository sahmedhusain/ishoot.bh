"use server";
import {
  getContentSnapshot,
  lookupFile,
  publishContentSnapshot,
  saveContentDraft,
} from "@platform/api-client";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import {
  collectWebsiteDraft,
  createActivityLog,
  getWebsiteEditor,
  measureOperation,
  requireFeatureEnabled,
  runAtomicMutation,
  updateService,
} from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";
import { createHmac } from "node:crypto";
import {
  defaultWebsiteConfig,
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
      if (
        !upload?.isPublic ||
        !upload.claimedAt ||
        upload.mimeType !== "application/pdf"
      )
        throw new Error(serverMessages.invalidUploadedFile);
    }

    const snap = await getContentSnapshot("main").catch(() => null);
    if (snap && snap.revision !== revision)
      throw new Error(serverMessages.contentChangedRefreshBeforePublishing);

    const saved = await saveContentDraft("", "main", {
      ...(snap?.draft ?? {}),
      config,
    });

    await runAtomicMutation(async () => {
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "website",
        entity_id: "main",
        details: { operation: "save_draft" },
      });
    });
    revalidatePath(ROUTES.cms.website);
    return { revision: saved.revision };
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
    const snap = await getContentSnapshot("main").catch(() => null);
    const snapshot = await collectWebsiteDraft(
      validateWebsiteConfig(content.draft),
    );
    await saveContentDraft("", "main", {
      ...(snap?.draft ?? {}),
      ...snapshot,
    });
    const published = await publishContentSnapshot("", "main");
    const paths = await publicSitePaths();
    await runAtomicMutation(async () => {
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "website",
        entity_id: "main",
        details: { operation: "publish", revision },
      });
    });
    revalidatePath(ROUTES.cms.website);
    await revalidatePublicSite([], paths);
    return { revision: published.revision };
  });
}

export async function restoreWebsiteAction(revision: number) {
  return measureOperation("action:restoreWebsiteAction", async () => {
    const user = await requirePermission("settings", "write");
    await requireFeatureEnabled("cms");
    validateActionArguments("restoreWebsiteAction", { revision });
    const snap = await getContentSnapshot("main").catch(() => null);
    if (snap && snap.revision !== revision)
      throw new Error(serverMessages.contentChangedRefreshBeforePublishing);
    if (snap?.published) {
      const pubConfig = validateWebsiteConfig(
        (snap.published as Record<string, any>).config ?? snap.published,
      );
      await saveContentDraft("", "main", {
        ...(snap.draft ?? {}),
        config: pubConfig,
      });
    }
    const paths = await publicSitePaths();
    await runAtomicMutation(async () => {
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "website",
        entity_id: "main",
        details: { operation: "restore" },
      });
    });
    revalidatePath(ROUTES.cms.website);
    await revalidatePublicSite([], paths);
  });
}

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

    await updateService(id, {
      is_public: isPublic,
      image_url: imageUrl || null,
    } as Record<string, any>);

    await runAtomicMutation(async () => {
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "service",
        entity_id: id,
        details: { operation: "website_presentation" },
      });
    });
    revalidatePath(ROUTES.cms.website);
  });
}

async function updateWebsiteDraft(
  userId: string,
  patch: Partial<WebsiteConfig>,
  operation: string,
  details: Record<string, unknown> = {},
) {
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const currentConfig =
    currentDraft.config ??
    (currentDraft.sections ? currentDraft : defaultWebsiteConfig);
  const nextConfig = validateWebsiteConfig({
    ...currentConfig,
    ...patch,
  });

  await saveContentDraft("", "main", {
    ...currentDraft,
    config: nextConfig,
  });

  await runAtomicMutation(async () => {
    await createActivityLog({
      user_id: userId,
      action: "update",
      entity_type: "website",
      entity_id: "main",
      details: { operation, ...details },
    });
  });
  revalidatePath(ROUTES.cms.website);
  revalidatePath(ROUTES.cms.menus);
}

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
