"use server";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import {
  measureOperation,
  runAtomicMutation,
  signDocument,
  canSignDocument,
  requestInvoiceApproval,
  createActivityLog,
  type SignableDocument,
} from "@platform/database";
import { revalidatePath } from "next/cache";
import { validateActionArguments } from "../../lib/action-input";
import { hasPermission, requireAuth, requirePermission } from "../../lib/auth";

const SEND_PERMISSION = {
  quotation: ["quotations", "issue_send"],
  invoice: ["invoices", "issue_send"],
  receipt: ["payments", "write"],
} as const;

const path = (type: SignableDocument, id: string) =>
  type === "quotation"
    ? ROUTES.quotations.detail(id)
    : type === "invoice"
      ? ROUTES.invoices.detail(id)
      : ROUTES.payments.detail(id);

/**
 * Sign and stamp an approved quotation, invoice or receipt: with your approved signature, or with one drawn now
 * when the document type must be signed on the spot.
 */
export async function signDocumentAction(
  type: SignableDocument,
  id: string,
  signature?: string,
) {
  return measureOperation("action:signDocumentAction", async () => {
    const actor = await requireAuth();
    validateActionArguments("signDocumentAction", { type, id, signature });
    const [resource, action] = SEND_PERMISSION[type];
    if (
      !(await canSignDocument(
        type,
        id,
        actor,
        await hasPermission(resource, action),
      ))
    )
      throw new Error(
        serverMessages.onlyTheSalespersonCreditedWithThisDocument,
      );
    const state = await runAtomicMutation(async () => {
      const state = await signDocument(type, id, actor.id, signature);
      await createActivityLog({
        user_id: actor.id,
        action: "sign",
        entity_type: type === "receipt" ? "payment" : type,
        entity_id: id,
        details: { signedAt: state.signedAt, drawnNow: !!signature },
      });
      return state;
    });
    revalidatePath(path(type, id));
    return { success: true, state };
  });
}

/** Send a draft invoice for approval before it can be signed and sent. */
export async function requestInvoiceApprovalAction(id: string) {
  return measureOperation("action:requestInvoiceApprovalAction", async () => {
    const actor = await requirePermission("invoices", "write");
    validateActionArguments("requestInvoiceApprovalAction", { id });
    const outcome = await runAtomicMutation(async () => {
      const outcome = await requestInvoiceApproval(id, actor.id);
      await createActivityLog({
        user_id: actor.id,
        action: "submit_approval",
        entity_type: "invoice",
        entity_id: id,
        details: { status: outcome.status },
      });
      return outcome;
    });
    revalidatePath(ROUTES.invoices.detail(id));
    revalidatePath(ROUTES.approvals());
    return { success: true, status: outcome.status };
  });
}
