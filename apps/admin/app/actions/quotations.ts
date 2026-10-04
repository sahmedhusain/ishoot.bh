"use server";
import { measureOperation, runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";
import {
  createQuotation,
  updateQuotation,
  getQuotationById,
  submitQuotationForApproval,
  issueQuotation,
  acceptQuotation,
  rejectQuotation,
  convertQuotationToInvoice,
  createActivityLog,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

export async function createQuotationAction(data: {
  clientId?: string | null;
  dealId?: string | null;
  inquiryId?: string | null;
  validUntilDays?: number;
  currency?: string;
  language?: string;
  vatEnabled?: boolean;
  vatPercentage?: number;
  discountType?: "none" | "percentage" | "fixed";
  discountValue?: number;
  termsEn?: string | null;
  termsAr?: string | null;
  lineItems: Array<{
    serviceId?: string | null;
    descriptionEn: string;
    descriptionAr?: string | null;
    quantity: number;
    unitPrice: number;
    sortOrder?: number;
  }>;
}) {
  return measureOperation("action:createQuotationAction", async () => {
    const actor = await requirePermission("quotations", "create");
    validateActionArguments("createQuotationAction", { data });

    const validUntilDate = new Date(Date.now() + (data.validUntilDays || 30) * 24 * 60 * 60 * 1000);

    const { quotation } = await runAtomicMutation(async () => {
      const quotation = await createQuotation(
        {
          clientId: data.clientId,
          dealId: data.dealId,
          inquiryId: data.inquiryId,
          validUntilDate,
          currency: data.currency,
          language: data.language,
          vatEnabled: data.vatEnabled,
          vatPercentage: data.vatPercentage,
          discountType: data.discountType,
          discountValue: data.discountValue,
          termsEn: data.termsEn,
          termsAr: data.termsAr,
          lineItems: data.lineItems,
        },
        actor.id,
      );

      await createActivityLog({
        user_id: actor.id,
        action: "create",
        entity_type: "quotation",
        entity_id: quotation.id,
        details: { quotationNumber: quotation.quotationNumber, totalAmount: quotation.totalAmount },
      });

      return { quotation };
    });

    revalidatePath("/dashboard/quotations");
    revalidatePath("/dashboard");
    return { success: true, quotation };
  });
}

export async function updateQuotationAction(
  id: string,
  data: {
    validUntilDate?: string;
    currency?: string;
    language?: string;
    vatEnabled?: boolean;
    vatPercentage?: number;
    discountType?: "none" | "percentage" | "fixed";
    discountValue?: number;
    termsEn?: string | null;
    termsAr?: string | null;
    lineItems?: Array<{
      serviceId?: string | null;
      descriptionEn: string;
      descriptionAr?: string | null;
      quantity: number;
      unitPrice: number;
      sortOrder?: number;
    }>;
  },
) {
  return measureOperation("action:updateQuotationAction", async () => {
    const actor = await requirePermission("quotations", "edit");
    validateActionArguments("updateQuotationAction", { id, data });

    const { quotation } = await runAtomicMutation(async () => {
      const before = await getQuotationById(id);
      const quotation = await updateQuotation(
        id,
        {
          ...data,
          validUntilDate: data.validUntilDate ? new Date(data.validUntilDate) : undefined,
        },
        actor.id,
      );

      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "quotation",
        entity_id: quotation.id,
        details: { quotationNumber: quotation.quotationNumber, revision: quotation.revision, before, after: quotation },
      });

      return { quotation };
    });

    revalidatePath("/dashboard/quotations");
    revalidatePath(`/dashboard/quotations/${id}`);
    return { success: true, quotation };
  });
}

export async function submitQuotationForApprovalAction(id: string, discountReason?: string) {
  return measureOperation("action:submitQuotationForApprovalAction", async () => {
    const actor = await requirePermission("quotations", "edit");
    validateActionArguments("submitQuotationForApprovalAction", { id, discountReason });

    const { approvalRequest } = await runAtomicMutation(async () => {
      const approvalRequest = await submitQuotationForApproval(id, actor.id, discountReason);

      await createActivityLog({
        user_id: actor.id,
        action: "submit_approval",
        entity_type: "quotation",
        entity_id: id,
        details: { approvalRequestId: approvalRequest.approvalRequestId },
      });

      return { approvalRequest };
    });

    revalidatePath("/dashboard/quotations");
    revalidatePath(`/dashboard/quotations/${id}`);
    revalidatePath("/dashboard/approvals");
    return { success: true, approvalRequest };
  });
}

export async function issueQuotationAction(
  id: string,
  deliveryChannel?: "email" | "portal" | "whatsapp" | "manual",
) {
  return measureOperation("action:issueQuotationAction", async () => {
    const actor = await requirePermission("quotations", "issue_send");
    validateActionArguments("issueQuotationAction", { id, deliveryChannel });

    const { quotation } = await runAtomicMutation(async () => {
      const quotation = await issueQuotation(id, actor.id, deliveryChannel);

      await createActivityLog({
        user_id: actor.id,
        action: "issue",
        entity_type: "quotation",
        entity_id: id,
        details: { deliveryChannel },
      });

      return { quotation };
    });

    revalidatePath("/dashboard/quotations");
    revalidatePath(`/dashboard/quotations/${id}`);
    return { success: true, quotation };
  });
}

export async function acceptQuotationAction(id: string, evidence?: string) {
  return measureOperation("action:acceptQuotationAction", async () => {
    const actor = await requirePermission("quotations", "edit");
    validateActionArguments("acceptQuotationAction", { id, evidence });

    const { quotation } = await runAtomicMutation(async () => {
      const quotation = await acceptQuotation(id, actor.id, evidence);

      await createActivityLog({
        user_id: actor.id,
        action: "accept",
        entity_type: "quotation",
        entity_id: id,
        details: { evidence },
      });

      return { quotation };
    });

    revalidatePath("/dashboard/quotations");
    revalidatePath(`/dashboard/quotations/${id}`);
    return { success: true, quotation };
  });
}

export async function rejectQuotationAction(id: string, reason?: string) {
  return measureOperation("action:rejectQuotationAction", async () => {
    const actor = await requirePermission("quotations", "edit");
    validateActionArguments("rejectQuotationAction", { id, reason });

    const { quotation } = await runAtomicMutation(async () => {
      const quotation = await rejectQuotation(id, actor.id, reason);

      await createActivityLog({
        user_id: actor.id,
        action: "reject",
        entity_type: "quotation",
        entity_id: id,
        details: { reason },
      });

      return { quotation };
    });

    revalidatePath("/dashboard/quotations");
    revalidatePath(`/dashboard/quotations/${id}`);
    return { success: true, quotation };
  });
}

export async function convertQuotationToInvoiceAction(id: string) {
  return measureOperation("action:convertQuotationToInvoiceAction", async () => {
    const actor = await requirePermission("quotations", "edit");
    validateActionArguments("convertQuotationToInvoiceAction", { id });

    const { invoice } = await runAtomicMutation(async () => {
      const invoice = await convertQuotationToInvoice(id, actor.id);

      await createActivityLog({
        user_id: actor.id,
        action: "convert_to_invoice",
        entity_type: "quotation",
        entity_id: id,
        details: { invoiceId: invoice.invoiceId, invoiceNumber: invoice.invoiceNumber },
      });

      return { invoice };
    });

    revalidatePath("/dashboard/quotations");
    revalidatePath(`/dashboard/quotations/${id}`);
    revalidatePath("/dashboard/invoices");
    return { success: true, invoice };
  });
}
