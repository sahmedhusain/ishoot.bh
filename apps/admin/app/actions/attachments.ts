"use server";

import {
  createAttachment,
  deleteAttachment,
  createActivityLog,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "../../lib/auth";


export async function createAttachmentAction(data: {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  entityType: string;
  entityId: string;
}) {
  try {
    const user = await getCurrentUser();
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

    revalidatePath("/dashboard/archive");
    revalidatePath("/dashboard/crm/contacts");
    return { success: true, attachment };
  } catch (error: any) {
    console.error("Failed to create attachment:", error);
    return { success: false, error: error.message || "Failed to upload attachment" };
  }
}

export async function deleteAttachmentAction(id: string) {
  try {
    const user = await getCurrentUser();
    await deleteAttachment(id);

    if (user) {
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "attachment",
        entity_id: id,
      });
    }

    revalidatePath("/dashboard/archive");
    revalidatePath("/dashboard/crm/contacts");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete attachment:", error);
    return { success: false, error: error.message || "Failed to delete attachment" };
  }
}
