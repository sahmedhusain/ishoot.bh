"use server";
import { serverMessages } from "@platform/locales";
import { ROUTES, entityRoute } from "../../constants/routes";
import { runAtomicMutation, measureOperation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  createAttachment,
  deleteAttachment,
  createActivityLog,
} from "@platform/database";
import { requireAuth } from "../../lib/auth";
import { revalidatePath } from "next/cache";
import { requireAttachmentAccess } from "../../lib/attachment-access";

/** Refreshes the archive and the page of the record the file belongs to. */
function revalidateAttachmentOwner(entityType: string, entityId: string) {
  revalidatePath(ROUTES.archive);
  const owner = entityRoute(entityType, entityId);
  if (owner) revalidatePath(owner.split("?")[0]);
}

export async function createAttachmentAction(data: {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  entityType: string;
  entityId: string;
}) {
  return measureOperation("action:createAttachmentAction", async () => {
    validateActionArguments("createAttachmentAction", { data });
    try {
      const user = await requireAttachmentAccess(
        data.entityType,
        data.entityId,
        "write",
      );
      const attachment = await runAtomicMutation(async () => {
        const attachment = await createAttachment({
          ...data,
          uploadedById: user?.id,
        });

        if (user) {
          await createActivityLog({
            user_id: user.id,
            action: "create",
            entity_type: "attachment",
            entity_id: attachment.id,
            details: {
              fileName: data.fileName,
              entityType: data.entityType,
              entityId: data.entityId,
            },
          });
        }

        return attachment;
      });
      revalidateAttachmentOwner(data.entityType, data.entityId);
      return { success: true, attachment };
    } catch (error: any) {
      console.error("Failed to create attachment:", error);
      return {
        success: false,
        error: error.message || "Failed to upload attachment",
      };
    }
  });
}

export async function deleteAttachmentAction(id: string) {
  return measureOperation("action:deleteAttachmentAction", async () => {
    validateActionArguments("deleteAttachmentAction", { id });
    try {
      const user = await requireAuth();
      await runAtomicMutation(async () => {
        await deleteAttachment(id);

        if (user) {
          await createActivityLog({
            user_id: user.id,
            action: "delete",
            entity_type: "attachment",
            entity_id: id,
            details: { id },
          });
        }
      });
      return { success: true };
    } catch (error: any) {
      console.error("Failed to delete attachment:", error);
      return {
        success: false,
        error: error.message || "Failed to delete attachment",
      };
    }
  });
}
