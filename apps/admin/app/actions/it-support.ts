"use server";
import {
  claimUpload,
  commentOnMyTicket,
  createTicket,
  transitionMyTicket,
} from "@platform/api-client";
import { measureOperation } from "@platform/database";
import { revalidatePath } from "next/cache";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { requirePermission } from "../../lib/auth";

// IT requests live in the itsm service (backend/services/itsm). The signed-in employee is always the requester:
// the service shows them only their own tickets.

function refresh(id?: string) {
  revalidatePath(ROUTES.itSupport.list());
  if (id) revalidatePath(ROUTES.itSupport.detail(id));
}

/** Any staff member: raise an IT request. Attachments are uploads of this user, made permanent here. */
export async function createItTicketAction(data: {
  category: string;
  subcategory: string;
  priority?: string;
  title: string;
  description: string;
  assetRef?: string;
  attachmentUrls: string[];
}) {
  return measureOperation("action:createItTicketAction", async () => {
    const user = await requirePermission("it_support", "create");
    validateActionArguments("createItTicketAction", { data });
    const attachments = [];
    for (const url of data.attachmentUrls) {
      const file = await claimUpload(url, user.id, { requirePrivate: true });
      attachments.push({
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
      });
    }
    const ticket = await createTicket({
      requesterId: user.id,
      requesterName: user.full_name,
      requesterEmail: user.email,
      category: data.category,
      subcategory: data.subcategory,
      priority: data.priority || undefined,
      title: data.title,
      description: data.description,
      assetRef: data.assetRef || undefined,
      attachments,
    });
    refresh();
    return { success: true, id: ticket.id };
  });
}

/** The requester adds a message to their own ticket. */
export async function commentOnItTicketAction(id: string, body: string) {
  return measureOperation("action:commentOnItTicketAction", async () => {
    const user = await requirePermission("it_support", "edit");
    validateActionArguments("commentOnItTicketAction", { id, body });
    await commentOnMyTicket(id, { id: user.id, name: user.full_name }, body);
    refresh(id);
    return { success: true };
  });
}

/** The requester answers, reopens, closes or cancels their own ticket (the catalogue's requester transitions). */
export async function transitionItTicketAction(id: string, transition: string) {
  return measureOperation("action:transitionItTicketAction", async () => {
    const user = await requirePermission("it_support", "edit");
    validateActionArguments("transitionItTicketAction", { id, transition });
    const ticket = await transitionMyTicket(
      id,
      { id: user.id, name: user.full_name },
      transition,
    );
    refresh(id);
    return { success: true, status: ticket.status };
  });
}
