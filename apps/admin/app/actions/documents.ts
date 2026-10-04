"use server";
import { measureOperation } from "@ishoot/database";
import { runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import {
createCompanyDocument,
deleteCompanyDocument,
createActivityLog,
DocumentCategory
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

export async function createCompanyDocumentAction(data: {
  title_en: string;
  title_ar?: string;
  category: DocumentCategory;
  document_number?: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  valid_from?: string;
  valid_until?: string;
  notes?: string;
}) {
  return measureOperation("action:createCompanyDocumentAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("createCompanyDocumentAction", { data });
    const { doc } = await runAtomicMutation(async () => {
      const doc = await createCompanyDocument({
        ...data,
        uploaded_by_id: user.id,
      });
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "company_document",
        entity_id: doc.id,
        details: { title: data.title_en, category: data.category },
      });
      return { doc };
    });

    revalidatePath("/dashboard/company/documents");
    return { success: true, doc };
  });
}

export async function deleteCompanyDocumentAction(id: string) {
  return measureOperation("action:deleteCompanyDocumentAction", async () => {
    const user = await requirePermission("settings", "delete");
    validateActionArguments("deleteCompanyDocumentAction", { id });
    await runAtomicMutation(async () => {
      await deleteCompanyDocument(id);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "company_document",
        entity_id: id,
      });
      return {};
    });

    revalidatePath("/dashboard/company/documents");
    return { success: true };
  });
}
