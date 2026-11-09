"use server";
import { revalidatePath } from "next/cache";
import {
  addLegalNote,
  createActivityLog,
  measureOperation,
  queueBroadcast,
  requireFeatureEnabled,
  saveBroadcast,
  saveCampaign,
  saveCoverage,
  saveLegalMatter,
  saveMediaContact,
  saveSegment,
  type BroadcastInput,
  type CampaignInput,
  type CoverageInput,
  type LegalMatterInput,
  type MediaContactInput,
  type SegmentInput,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

export async function saveCampaignAction(input: CampaignInput) {
  return measureOperation("action:saveCampaignAction", async () => {
    await requireFeatureEnabled("marketing");
    const user = await requirePermission(
      "marketing",
      input.id ? "edit" : "create",
    );
    validateActionArguments("saveCampaignAction", { input });
    const campaign = await saveCampaign(input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: input.id ? "update" : "create",
      entity_type: "campaign",
      entity_id: campaign.id,
      details: { code: campaign.code },
    });
    revalidatePath(ROUTES.marketing.campaigns);
    return { success: true };
  });
}

export async function saveSegmentAction(input: SegmentInput) {
  return measureOperation("action:saveSegmentAction", async () => {
    await requireFeatureEnabled("marketing");
    const user = await requirePermission(
      "marketing",
      input.id ? "edit" : "create",
    );
    validateActionArguments("saveSegmentAction", { input });
    const segment = await saveSegment(input);
    await createActivityLog({
      user_id: user.id,
      action: input.id ? "update" : "create",
      entity_type: "customer_segment",
      entity_id: segment.id,
      details: { name: segment.name },
    });
    revalidatePath(ROUTES.marketing.audience);
    return { success: true };
  });
}

export async function saveBroadcastAction(input: BroadcastInput) {
  return measureOperation("action:saveBroadcastAction", async () => {
    await requireFeatureEnabled("marketing");
    const user = await requirePermission(
      "marketing",
      input.id ? "edit" : "create",
    );
    validateActionArguments("saveBroadcastAction", { input });
    const broadcast = await saveBroadcast(input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: input.id ? "update" : "create",
      entity_type: "broadcast",
      entity_id: broadcast.id,
      details: { name: input.name },
    });
    revalidatePath(ROUTES.marketing.audience);
    return { success: true };
  });
}

export async function sendBroadcastAction(id: string) {
  return measureOperation("action:sendBroadcastAction", async () => {
    await requireFeatureEnabled("marketing");
    const user = await requirePermission("marketing", "edit");
    validateActionArguments("sendBroadcastAction", { id });
    const count = await queueBroadcast(id);
    await createActivityLog({
      user_id: user.id,
      action: "send",
      entity_type: "broadcast",
      entity_id: id,
      details: { recipients: count },
    });
    revalidatePath(ROUTES.marketing.audience);
    return { success: true, count };
  });
}

export async function saveMediaContactAction(input: MediaContactInput) {
  return measureOperation("action:saveMediaContactAction", async () => {
    await requireFeatureEnabled("pr");
    const user = await requirePermission("press", input.id ? "edit" : "create");
    validateActionArguments("saveMediaContactAction", { input });
    const contact = await saveMediaContact(input);
    await createActivityLog({
      user_id: user.id,
      action: input.id ? "update" : "create",
      entity_type: "media_contact",
      entity_id: contact.id,
      details: { outlet: contact.outlet },
    });
    revalidatePath(ROUTES.press.overview);
    return { success: true };
  });
}

export async function saveCoverageAction(input: CoverageInput) {
  return measureOperation("action:saveCoverageAction", async () => {
    await requireFeatureEnabled("pr");
    const user = await requirePermission("press", input.id ? "edit" : "create");
    validateActionArguments("saveCoverageAction", { input });
    const coverage = await saveCoverage(input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: input.id ? "update" : "create",
      entity_type: "media_coverage",
      entity_id: coverage.id,
      details: { outlet: coverage.outlet },
    });
    revalidatePath(ROUTES.press.overview);
    return { success: true };
  });
}

export async function saveLegalMatterAction(input: LegalMatterInput) {
  return measureOperation("action:saveLegalMatterAction", async () => {
    await requireFeatureEnabled("legal");
    const user = await requirePermission("legal", input.id ? "edit" : "create");
    validateActionArguments("saveLegalMatterAction", { input });
    const matter = await saveLegalMatter(input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: input.id ? "update" : "create",
      entity_type: "legal_matter",
      entity_id: matter.id,
      details: { number: matter.number },
    });
    revalidatePath(ROUTES.legal.matters);
    revalidatePath(ROUTES.legal.matter(matter.id));
    return { success: true, id: matter.id };
  });
}

export async function addLegalNoteAction(id: string, body: string) {
  return measureOperation("action:addLegalNoteAction", async () => {
    await requireFeatureEnabled("legal");
    const user = await requirePermission("legal", "edit");
    validateActionArguments("addLegalNoteAction", { id, body });
    await addLegalNote(id, body, user.id);
    revalidatePath(ROUTES.legal.matter(id));
    return { success: true };
  });
}
