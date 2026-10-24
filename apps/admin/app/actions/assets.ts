"use server";
import { revalidatePath } from "next/cache";
import {
  cancelAssetHandover,
  createActivityLog,
  db,
  measureOperation,
  runAtomicMutation,
  saveAsset,
  saveAssetCategory,
  signAssetHandover,
  startAssetHandover,
  type AssetCategoryInput,
  type AssetInput,
  type HandoverInput,
  type HandoverSignature,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { requireAuth, requirePermission } from "../../lib/auth";

const refresh = (assetId?: string, handoverId?: string) => {
  revalidatePath(ROUTES.assets.list());
  if (assetId) revalidatePath(ROUTES.assets.detail(assetId));
  if (handoverId) revalidatePath(ROUTES.assets.handover(handoverId));
  revalidatePath(ROUTES.profile());
  revalidatePath(ROUTES.approvals());
};

/** Adds or edits an asset category with its spec fields and handover checklist. */
export async function saveAssetCategoryAction(
  data: AssetCategoryInput,
  categoryId?: string,
) {
  return measureOperation("action:saveAssetCategoryAction", async () => {
    const user = await requirePermission("assets", "edit");
    validateActionArguments("saveAssetCategoryAction", { data, categoryId });
    const saved = await runAtomicMutation(async () => {
      const saved = await saveAssetCategory(data, categoryId);
      await createActivityLog({
        user_id: user.id,
        action: categoryId ? "update" : "create",
        entity_type: "asset_category",
        entity_id: saved.id,
        details: { name: saved.nameEn },
      });
      return saved;
    });
    revalidatePath(ROUTES.assets.categories);
    return { success: true, id: saved.id };
  });
}

export async function saveAssetAction(data: AssetInput, assetId?: string) {
  return measureOperation("action:saveAssetAction", async () => {
    const user = await requirePermission("assets", assetId ? "edit" : "create");
    validateActionArguments("saveAssetAction", { data, assetId });
    const saved = await runAtomicMutation(async () => {
      const saved = await saveAsset(data, user.id, assetId);
      await createActivityLog({
        user_id: user.id,
        action: assetId ? "update" : "create",
        entity_type: "asset",
        entity_id: saved.id,
        details: {
          tag: saved.assetTag,
          name: saved.name,
          status: saved.status,
        },
      });
      return saved;
    });
    refresh(saved.id);
    return { success: true, id: saved.id };
  });
}

/**
 * Starts issuing or returning an asset; with `inPerson` the employee signs on this device right away.
 * `issuerSignature` is drawn now when handovers are signed on the spot.
 */
export async function startAssetHandoverAction(
  data: HandoverInput,
  inPerson?: HandoverSignature,
  issuerSignature?: string,
) {
  return measureOperation("action:startAssetHandoverAction", async () => {
    const user = await requirePermission("assets", "edit");
    validateActionArguments("startAssetHandoverAction", {
      data,
      inPerson,
      issuerSignature,
    });
    const handover = await runAtomicMutation(async () => {
      const handover = await startAssetHandover(
        data,
        user.id,
        inPerson,
        issuerSignature,
      );
      await createActivityLog({
        user_id: user.id,
        action: data.kind === "issue" ? "issue" : "return",
        entity_type: "asset_handover",
        entity_id: handover.id,
        details: {
          reference: handover.reference,
          assetId: data.asset_id,
          employeeId: data.employee_id,
          inPerson: !!inPerson,
        },
      });
      return handover;
    });
    refresh(data.asset_id, handover.id);
    return { success: true, id: handover.id, status: handover.status };
  });
}

/** The employee signs their own handover from their profile. */
export async function signAssetHandoverAction(
  handoverId: string,
  data: HandoverSignature,
) {
  return measureOperation("action:signAssetHandoverAction", async () => {
    const user = await requireAuth();
    validateActionArguments("signAssetHandoverAction", { handoverId, data });
    const handover = await runAtomicMutation(async () => {
      const handover = await signAssetHandover(
        handoverId,
        data,
        user.id,
        false,
      );
      await createActivityLog({
        user_id: user.id,
        action: "sign",
        entity_type: "asset_handover",
        entity_id: handoverId,
        details: { status: handover.status },
      });
      return handover;
    });
    refresh(handover.assetId, handoverId);
    return { success: true, status: handover.status };
  });
}

/** Staff collect the employee's signature in person on this device. */
export async function signAssetHandoverInPersonAction(
  handoverId: string,
  data: HandoverSignature,
) {
  return measureOperation(
    "action:signAssetHandoverInPersonAction",
    async () => {
      const user = await requirePermission("assets", "edit");
      validateActionArguments("signAssetHandoverInPersonAction", {
        handoverId,
        data,
      });
      const handover = await runAtomicMutation(async () => {
        const handover = await signAssetHandover(
          handoverId,
          data,
          user.id,
          true,
        );
        await createActivityLog({
          user_id: user.id,
          action: "sign_in_person",
          entity_type: "asset_handover",
          entity_id: handoverId,
          details: { status: handover.status },
        });
        return handover;
      });
      refresh(handover.assetId, handoverId);
      return { success: true, status: handover.status };
    },
  );
}

export async function cancelAssetHandoverAction(handoverId: string) {
  return measureOperation("action:cancelAssetHandoverAction", async () => {
    const user = await requirePermission("assets", "edit");
    validateActionArguments("cancelAssetHandoverAction", { handoverId });
    const assetId = await runAtomicMutation(async () => {
      await cancelAssetHandover(handoverId);
      await createActivityLog({
        user_id: user.id,
        action: "cancel",
        entity_type: "asset_handover",
        entity_id: handoverId,
        details: {},
      });
      return (
        await db.assetHandover.findUniqueOrThrow({
          where: { id: handoverId },
          select: { assetId: true },
        })
      ).assetId;
    });
    refresh(assetId, handoverId);
    return { success: true };
  });
}
