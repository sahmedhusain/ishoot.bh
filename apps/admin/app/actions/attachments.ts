"use server";
import { runAtomicMutation, measureOperation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  createAttachment,
  db,
  deleteAttachment,
  createActivityLog,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requireAttachmentAccess } from "../../lib/attachment-access";

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
            details: { fileName: data.fileName, entityType: data.entityType },
          });
        }

        return attachment;
      });
      revalidatePath("/dashboard/archive");
      revalidatePath("/dashboard/crm/contacts");
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
      const attachment = await db.attachment.findUnique({ where: { id } });
      if (!attachment) throw new Error("Attachment not found");
      const user = await requireAttachmentAccess(
        attachment.entityType,
        attachment.entityId,
        "delete",
      );
      await runAtomicMutation(async () => {
        await deleteAttachment(id);

        if (user) {
          await createActivityLog({
            user_id: user.id,
            action: "delete",
            entity_type: "attachment",
            entity_id: id,
          });
        }
      });
      revalidatePath("/dashboard/archive");
      revalidatePath("/dashboard/crm/contacts");
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
