"use server";
import { revalidatePath } from "next/cache";
import { createHmac } from "node:crypto";
import { serverMessages } from "@platform/locales";
import {
  createActivityLog,
  insertSampleContent,
  measureOperation,
  removeSampleContent,
  runAtomicMutation,
} from "@platform/database";
import { isBusinessActivity } from "@platform/database/website-presets";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

/** Fills the website with the activity's sample content, marked so one click removes it. */
export async function addSampleContentAction(activity: string) {
  return measureOperation("action:addSampleContentAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("addSampleContentAction", { activity });
    if (!isBusinessActivity(activity))
      throw new Error(serverMessages.businessActivityInvalid);
    await insertSampleContent(activity, user.id);
    await createActivityLog({
      user_id: user.id,
      action: "create",
      entity_type: "settings",
      entity_id: "sample_content",
      details: { activity },
    });
    revalidatePath("/dashboard", "layout");
    return { success: true };
  });
}

/** Removes every sample; what the company wrote stays. */
export async function removeSampleContentAction() {
  validateActionArguments("removeSampleContentAction", {});
  return measureOperation("action:removeSampleContentAction", async () => {
    const user = await requirePermission("settings", "write");
    await runAtomicMutation(async () => {
      await removeSampleContent();
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "settings",
        entity_id: "sample_content",
        details: {},
      });
    });
    revalidatePath("/dashboard", "layout");
    return { success: true };
  });
}

/** A short-lived link to the demo website of an activity, built from its samples; nothing is saved. */
export async function exampleWebsiteAction(activity: string, locale: string) {
  return measureOperation("action:exampleWebsiteAction", async () => {
    await requirePermission("settings", "read");
    validateActionArguments("exampleWebsiteAction", { activity, locale });
    if (!isBusinessActivity(activity))
      throw new Error(serverMessages.businessActivityInvalid);
    const secret = process.env.REVALIDATION_SECRET;
    const web = process.env.WEB_URL;
    if (!secret || !web)
      throw new Error(serverMessages.websitePreviewNotConfigured);
    const expires = String(Date.now() + 10 * 60 * 1000);
    const token = createHmac("sha256", secret)
      .update(`website-example:${activity}:${expires}`)
      .digest("hex");
    return `${web}/api/preview?expires=${expires}&token=${token}&example=${activity}&locale=${locale === "ar" ? "ar" : "en"}`;
  });
}
