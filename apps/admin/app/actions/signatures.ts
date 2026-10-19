"use server";
import { serverMessages } from "@ishoot/locales";
import { revalidatePath } from "next/cache";
import {
  createActivityLog,
  createSignatureRequest,
  db,
  getSignatureMode,
  measureOperation,
  revokeSignatureRequest,
  setSignaturePolicy,
} from "@ishoot/database";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { requireAuth, requirePermission } from "../../lib/auth";
import { publicOrigin } from "../../lib/public-origin";

/** Whether a document type is signed with the saved signature or drawn on the spot. */
export async function getSignatureModeAction(documentType: string) {
  return measureOperation("action:getSignatureModeAction", async () => {
    await requireAuth();
    validateActionArguments("getSignatureModeAction", { documentType });
    return { mode: await getSignatureMode(documentType) };
  });
}

/** Super Admin: choose, per document, whether signers draw their signature at the moment of signing. */
export async function setSignaturePolicyAction(
  documentType: string,
  mode: "stored" | "live",
) {
  return measureOperation("action:setSignaturePolicyAction", async () => {
    const actor = await requirePermission("settings", "write");
    validateActionArguments("setSignaturePolicyAction", { documentType, mode });
    if (actor.role !== "super_admin")
      throw new Error(serverMessages.onlyASuperAdminCanChangeHowDocuments);
    const before = await getSignatureMode(documentType);
    await setSignaturePolicy(documentType, mode, actor.id);
    await createActivityLog({
      user_id: actor.id,
      action: "update",
      entity_type: "signature_policy",
      entity_id: documentType,
      details: { before, after: mode },
    });
    revalidatePath(ROUTES.settings.approvals);
    return { success: true };
  });
}

/** A one-time link the employee opens on their own phone to read and sign an asset handover. */
export async function createHandoverSigningLinkAction(
  handoverId: string,
  days: number,
  recipientEmail?: string | null,
) {
  return measureOperation(
    "action:createHandoverSigningLinkAction",
    async () => {
      const actor = await requirePermission("assets", "edit");
      validateActionArguments("createHandoverSigningLinkAction", {
        handoverId,
        days,
        recipientEmail,
      });
      const handover = await db.assetHandover.findUniqueOrThrow({
        where: { id: handoverId },
        select: { employee: { select: { email: true, phone: true } } },
      });
      const { token, record } = await createSignatureRequest(
        "asset_handover",
        handoverId,
        actor.id,
        {
          days,
          recipientEmail: recipientEmail ?? handover.employee.email,
          recipientPhone: handover.employee.phone,
        },
      );
      revalidatePath(ROUTES.assets.handover(handoverId));
      return {
        url: `${await publicOrigin()}/acknowledge/${token}`,
        expiresAt: record.expiresAt.toISOString(),
        phone: handover.employee.phone,
        email: record.recipientEmail,
      };
    },
  );
}

export async function revokeHandoverSigningLinkAction(requestId: string) {
  return measureOperation(
    "action:revokeHandoverSigningLinkAction",
    async () => {
      const actor = await requirePermission("assets", "edit");
      validateActionArguments("revokeHandoverSigningLinkAction", { requestId });
      const record = await revokeSignatureRequest(requestId, actor.id);
      revalidatePath(ROUTES.assets.handover(record.documentId));
      return { success: true };
    },
  );
}

/** The employee opens their own handover on the signing page (a fresh one-time link, created for them). */
export async function openMyHandoverSigningPageAction(handoverId: string) {
  return measureOperation(
    "action:openMyHandoverSigningPageAction",
    async () => {
      const user = await requireAuth();
      validateActionArguments("openMyHandoverSigningPageAction", {
        handoverId,
      });
      const handover = await db.assetHandover.findUniqueOrThrow({
        where: { id: handoverId },
        select: { employee: { select: { userId: true } } },
      });
      if (handover.employee.userId !== user.id)
        throw new Error(serverMessages.onlyTheEmployeeCanSignThis);
      const { token } = await createSignatureRequest(
        "asset_handover",
        handoverId,
        user.id,
        { days: 1 },
      );
      return { url: `/acknowledge/${token}` };
    },
  );
}
