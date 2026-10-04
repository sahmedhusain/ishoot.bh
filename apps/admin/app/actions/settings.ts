"use server";
import { measureOperation } from "@ishoot/database";
import { runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  updateCompanySettings,
  createActivityLog,
  upsertCompanyAsset,
  deleteCompanyAsset,
  db,
  claimUpload,
  CompanySettings,
  WebSettingsInput,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

export async function updateCompanySettingsAction(settings: CompanySettings) {
  return measureOperation("action:updateCompanySettingsAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("updateCompanySettingsAction", { settings });
    const { updated } = await runAtomicMutation(async () => {
      const updated = await updateCompanySettings(settings);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "settings",
        entity_id: updated.id,
        details: { companyNameEn: settings.company_name_en },
      });
      return { updated };
    });

    revalidatePath("/dashboard/settings/company");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/payments");
    return { success: true, settings: updated };
  });
}

export async function saveCompanyAssetAction(
  assetKey: string,
  data: {
    title: string;
    fileUrl: string;
    mimeType?: string;
    fileSize?: number;
  },
) {
  return measureOperation("action:saveCompanyAssetAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("saveCompanyAssetAction", { assetKey, data });
    const { asset, syncMap } = await runAtomicMutation(async () => {
      let verified = data;
      if (data.fileUrl.startsWith("/api/files/")) {
        const upload = await db.uploadObject.findUnique({
          where: { fileUrl: data.fileUrl },
        });
        const publicKey = [
          "logo_light",
          "logo_dark",
          "icon_light",
          "icon_dark",
          "icon",
        ].includes(assetKey);
        if (!upload || (publicKey && !upload.isPublic))
          throw new Error("Choose a registered public brand image");
        const attached = await db.attachment.findFirst({
          where: {
            fileUrl: data.fileUrl,
            entityType: "company_asset",
            entityId: assetKey,
          },
          select: { id: true },
        });
        if (!attached) {
          await claimUpload(db, data.fileUrl, user.id);
          await db.attachment.create({
            data: {
              fileName: upload.fileName,
              fileUrl: upload.fileUrl,
              fileSize: upload.fileSize,
              mimeType: upload.mimeType,
              entityType: "company_asset",
              entityId: assetKey,
              uploadedById: user.id,
            },
          });
        }
        verified = {
          ...data,
          mimeType: upload.mimeType,
          fileSize: upload.fileSize,
        };
      }
      const asset = await upsertCompanyAsset(assetKey, verified);
      const syncMap: Record<string, keyof CompanySettings> = {
        logo_light: "logo_url",
        logo_dark: "dark_logo_url",
        icon_light: "icon_url",
        icon_dark: "dark_icon_url",
        icon: "icon_url",
        stamp: "stamp_url",
        signature: "signature_url",
      };
      if (syncMap[assetKey]) {
        await updateCompanySettings({ [syncMap[assetKey]]: data.fileUrl });
      }
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "company_asset",
        entity_id: asset.id,
        details: { assetKey, title: data.title },
      });
      return { asset, syncMap };
    });

    revalidatePath("/dashboard/settings/company");
    revalidatePath("/dashboard");
    return { success: true, asset };
  });
}

export async function deleteCompanyAssetAction(assetKey: string) {
  return measureOperation("action:deleteCompanyAssetAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("deleteCompanyAssetAction", { assetKey });
    const { deleted, syncMap } = await runAtomicMutation(async () => {
      const deleted = await deleteCompanyAsset(assetKey);
      const syncMap: Record<string, keyof CompanySettings> = {
        logo_light: "logo_url",
        logo_dark: "dark_logo_url",
        icon_light: "icon_url",
        icon_dark: "dark_icon_url",
        icon: "icon_url",
        stamp: "stamp_url",
        signature: "signature_url",
      };
      if (syncMap[assetKey]) {
        await updateCompanySettings({ [syncMap[assetKey]]: "" });
      }
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "company_asset",
        entity_id: assetKey,
        details: { assetKey },
      });
      return { deleted, syncMap };
    });

    revalidatePath("/dashboard/settings/company");
    revalidatePath("/dashboard");
    return { success: deleted };
  });
}

export async function toggleFeatureAction(
  moduleKey: string,
  isEnabled: boolean,
) {
  return measureOperation("action:toggleFeatureAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("toggleFeatureAction", { moduleKey, isEnabled });
    const { updateFeatureToggle } = require("@ishoot/database");
    const feature = await runAtomicMutation(async () => {
      const feature = await updateFeatureToggle(moduleKey, isEnabled);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "feature",
        entity_id: feature.id,
      });
      return feature;
    });
    revalidatePath("/dashboard", "layout");
    return { success: true, feature };
  });
}

export async function updateWebSettingsAction(settings: WebSettingsInput) {
  return measureOperation("action:updateWebSettingsAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("updateWebSettingsAction", { settings });
    const { revalidatePublicSite } = await import("../../lib/revalidate-web");
    const { updated } = await runAtomicMutation(async () => {
      const updated = await updateCompanySettings(settings as CompanySettings);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "web_settings",
        entity_id: updated.id,
        details: { type: "web_presentation_content" },
      });
      return { updated };
    });

    revalidatePath("/dashboard/settings/web");
    revalidatePath("/dashboard/settings/company");
    revalidatePath("/dashboard");
    await revalidatePublicSite(
      [
        "banners",
        "portfolio",
        "clients",
        "equipment",
        "reviews",
        "faqs",
        "stats",
        "company",
      ],
      ["/", "/en", "/ar", "/about", "/works", "/contact"],
    );

    return { success: true, settings: updated };
  });
}

export async function revalidateEntireSiteAction() {
  return measureOperation("action:revalidateEntireSiteAction", async () => {
    await requirePermission("settings", "write");
    validateActionArguments("revalidateEntireSiteAction", {});
    const { revalidatePublicSite } = await import("../../lib/revalidate-web");
    await revalidatePublicSite(
      [
        "banners",
        "portfolio",
        "clients",
        "equipment",
        "reviews",
        "faqs",
        "stats",
        "company",
      ],
      ["/", "/en", "/ar", "/about", "/works", "/contact"],
    );
    return { success: true };
  });
}

export async function createSocialLinkAction(data: {
  platform: string;
  url: string;
  icon?: string;
  is_active?: boolean;
  display_order?: number;
}) {
  return measureOperation("action:createSocialLinkAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("createSocialLinkAction", { data });
    const { createSocialLink } = require("@ishoot/database");
    const { revalidatePublicSite } = await import("../../lib/revalidate-web");
    const link = await runAtomicMutation(async () => {
      const link = await createSocialLink(data);
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "sociallink",
        entity_id: link.id,
      });
      return link;
    });
    revalidatePath("/dashboard/settings/web");
    await revalidatePublicSite(
      ["socialLinks"],
      ["/", "/en", "/ar", "/about", "/works", "/contact"],
    );
    return { success: true, link };
  });
}

export async function updateSocialLinkAction(
  id: string,
  data: Partial<{
    platform: string;
    url: string;
    icon?: string;
    is_active?: boolean;
    display_order?: number;
  }>,
) {
  return measureOperation("action:updateSocialLinkAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("updateSocialLinkAction", { id, data });
    const { updateSocialLink } = require("@ishoot/database");
    const { revalidatePublicSite } = await import("../../lib/revalidate-web");
    const link = await runAtomicMutation(async () => {
      const link = await updateSocialLink(id, data);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "sociallink",
        entity_id: link.id,
      });
      return link;
    });
    revalidatePath("/dashboard/settings/web");
    await revalidatePublicSite(
      ["socialLinks"],
      ["/", "/en", "/ar", "/about", "/works", "/contact"],
    );
    return { success: true, link };
  });
}

export async function deleteSocialLinkAction(id: string) {
  return measureOperation("action:deleteSocialLinkAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("deleteSocialLinkAction", { id });
    const { deleteSocialLink } = require("@ishoot/database");
    const { revalidatePublicSite } = await import("../../lib/revalidate-web");
    const deleted = await runAtomicMutation(async () => {
      const deleted = await deleteSocialLink(id);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "sociallink",
        entity_id: deleted.id,
      });
      return deleted;
    });
    revalidatePath("/dashboard/settings/web");
    await revalidatePublicSite(
      ["socialLinks"],
      ["/", "/en", "/ar", "/about", "/works", "/contact"],
    );
    return { success: deleted };
  });
}
