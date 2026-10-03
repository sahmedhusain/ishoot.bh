"use server";
import { createHmac } from "node:crypto";
import { db, collectWebsiteDraft, getWebsiteEditor } from "@ishoot/database";
import {
  validateWebsiteConfig,
  safeWebsiteUrl,
} from "@ishoot/database/website-config";
import { requirePermission } from "../../lib/auth";
import { revalidatePath } from "next/cache";
import { revalidatePublicSite } from "../../lib/revalidate-web";

export async function saveWebsiteDraftAction(value: unknown, revision: number) {
  const user = await requirePermission("settings", "write");
  const config = validateWebsiteConfig(value);
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
  revalidatePath("/dashboard/cms/website");
  return { revision: revision + 1 };
}
export async function publishWebsiteAction(revision: number) {
  const user = await requirePermission("settings", "write");
  const content = await getWebsiteEditor();
  if (content.revision !== revision)
    throw new Error("Content changed. Refresh before publishing.");
  const snapshot = await collectWebsiteDraft(
    validateWebsiteConfig(content.draft),
  );
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
      throw new Error("Content changed. Refresh before publishing.");
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
  revalidatePath("/dashboard/cms/website");
  await revalidatePublicSite([], ["/", "/about", "/contact", "/works"]);
  return { revision: revision + 1 };
}
export async function restoreWebsiteAction(revision: number) {
  const user = await requirePermission("settings", "write");
  await db.$transaction(async (tx) => {
    const content = await tx.websiteContent.findUniqueOrThrow({
      where: { id: "main" },
    });
    if (!content.previous || content.revision !== revision)
      throw new Error("No previous publication available or content changed");
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
      throw new Error("Content changed. Refresh before restoring.");
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
  revalidatePath("/dashboard/cms/website");
  await revalidatePublicSite([], ["/", "/about", "/contact", "/works"]);
}
export async function previewWebsiteAction(locale: string) {
  await requirePermission("settings", "read");
  const secret = process.env.REVALIDATION_SECRET;
  const web = process.env.WEB_URL;
  if (!secret || !web)
    throw new Error(
      "Set WEB_URL and REVALIDATION_SECRET in both apps to enable preview.",
    );
  const expires = String(Date.now() + 10 * 60 * 1000);
  const token = createHmac("sha256", secret)
    .update(`website-preview:${expires}`)
    .digest("hex");
  return `${web}/api/preview?expires=${expires}&token=${token}&locale=${locale === "ar" ? "ar" : "en"}`;
}
export async function updateWebsiteServiceAction(
  id: string,
  isPublic: boolean,
  imageUrl: string,
) {
  await requirePermission("settings", "write");
  if (
    typeof isPublic !== "boolean" ||
    typeof imageUrl !== "string" ||
    imageUrl.length > 2000 ||
    (imageUrl && !safeWebsiteUrl(imageUrl))
  )
    throw new Error("Invalid service image URL");
  await db.service.update({
    where: { id },
    data: { isPublic, imageUrl: imageUrl || null },
  });
  revalidatePath("/dashboard/cms/website");
}
