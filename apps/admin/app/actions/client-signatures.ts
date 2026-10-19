"use server";
import { publicOrigin } from "../../lib/public-origin";
import { revalidatePath } from "next/cache";
import {
  measureOperation,
  createSigningLink,
  revokeSigningLink,
  recordSignedCopy,
  db,
  type ClientSignableType,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { requirePermission } from "../../lib/auth";

const resourceFor = (type: ClientSignableType) => (type === "quotation" ? "quotations" : "invoices");

function revalidateDocument(type: ClientSignableType, id: string) {
  revalidatePath(type === "quotation" ? ROUTES.quotations.detail(id) : ROUTES.invoices.detail(id));
  // Invoice pages are also opened by number.
  if (type === "invoice") revalidatePath("/dashboard/invoices/[id]", "page");
}


/** Creates a one-time signing link for the client. The raw link is returned once and never stored. */
export async function createSigningLinkAction(type: ClientSignableType, id: string, days: number, recipientEmail?: string | null) {
  validateActionArguments("createSigningLinkAction", { type, id, days, recipientEmail });
  return measureOperation("action:createSigningLinkAction", async () => {
    const actor = await requirePermission(resourceFor(type), "issue_send");
    const { token, record } = await createSigningLink(type, id, actor.id, { days, recipientEmail });
    revalidateDocument(type, id);
    return { url: `${await publicOrigin()}/sign/${token}`, expiresAt: record.expiresAt!.toISOString() };
  });
}

export async function revokeSigningLinkAction(signatureId: string) {
  validateActionArguments("revokeSigningLinkAction", { signatureId });
  return measureOperation("action:revokeSigningLinkAction", async () => {
    const record = await db.clientSignature.findUniqueOrThrow({ where: { id: signatureId }, select: { documentType: true, documentId: true } });
    const type = record.documentType as ClientSignableType;
    const actor = await requirePermission(resourceFor(type), "issue_send");
    await revokeSigningLink(signatureId, actor.id);
    revalidateDocument(type, record.documentId);
    return { success: true };
  });
}

/** Records a copy the client signed by hand; a signed quotation becomes accepted. */
export async function recordSignedCopyAction(
  type: ClientSignableType,
  id: string,
  input: { signerName: string; signerTitle?: string | null; signedAt: string; fileUrl: string; fileName?: string | null },
) {
  validateActionArguments("recordSignedCopyAction", { type, id, input });
  return measureOperation("action:recordSignedCopyAction", async () => {
    const actor = await requirePermission(resourceFor(type), "edit");
    const record = await recordSignedCopy(type, id, actor.id, input);
    revalidateDocument(type, id);
    if (type === "quotation") revalidatePath(ROUTES.quotations.list);
    return { success: true, id: record.id };
  });
}
