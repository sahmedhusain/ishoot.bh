"use server";
import { db, measureOperation, runAtomicMutation } from "@ishoot/database";
import { requirePermission } from "../../lib/auth";
import { revalidatePath } from "next/cache";

export async function createQuotation(data: any) {
  return measureOperation("action:createQuotation", async () => {
    const actor = await requirePermission("invoices", "write");

    const count = await db.quotation.count();
    const quotationNumber = `Q-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 30);

    const quotation = await db.quotation.create({
      data: {
        quotationNumber,
        clientId: data.clientId,
        dealId: data.dealId,
        inquiryId: data.inquiryId,
        issueDate: new Date(),
        validUntilDate,
        subtotal: data.subtotal,
        vatEnabled: data.vatEnabled,
        vatPercentage: data.vatPercentage,
        vatAmount: data.vatAmount,
        discountType: data.discountType || "none",
        discountValue: data.discountValue || 0,
        discountAmount: data.discountAmount || 0,
        totalAmount: data.totalAmount,
        currency: data.currency || "BHD",
        language: data.language || "ar",
        status: "draft",
        createdById: actor.id,
        lineItems: {
          create: (data.lineItems || []).map((item: any, idx: number) => ({
            descriptionEn: item.descriptionEn,
            descriptionAr: item.descriptionAr,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            orderIndex: idx
          }))
        }
      }
    });

    revalidatePath("/dashboard/quotations");
    return { success: true, id: quotation.id };
  });
}

export async function updateQuotationStatus(id: string, newStatus: string) {
  return measureOperation("action:updateQuotationStatus", async () => {
    await requirePermission("invoices", "write");
    await db.quotation.update({
      where: { id },
      data: { status: newStatus }
    });
    revalidatePath(`/dashboard/quotations/${id}`);
    return { success: true };
  });
}

export async function convertQuotationToInvoice(quotationId: string) {
  return measureOperation("action:convertQuotationToInvoice", async () => {
    const actor = await requirePermission("invoices", "write");

    return await runAtomicMutation(async () => {
      // Lock quotation
      await db.$queryRaw`SELECT id FROM "Quotation" WHERE id = ${quotationId} FOR UPDATE`;
      
      const quotation = await db.quotation.findUnique({
        where: { id: quotationId },
        include: { lineItems: true, invoice: true }
      });

      if (!quotation) throw new Error("Quotation not found");
      if (quotation.invoiceId || quotation.invoice) throw new Error("Quotation already converted to an invoice");
      if (quotation.status !== "accepted") throw new Error("Quotation must be accepted before conversion");

      const invoiceCount = await db.invoice.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, "0")}`;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const invoice = await db.invoice.create({
        data: {
          invoiceNumber,
          clientId: quotation.clientId,
          dealId: quotation.dealId,
          issueDate: new Date(),
          dueDate,
          subtotal: quotation.subtotal,
          vatEnabled: quotation.vatEnabled,
          vatPercentage: quotation.vatPercentage,
          vatAmount: quotation.vatAmount,
          discountType: quotation.discountType,
          discountValue: quotation.discountValue,
          discountAmount: quotation.discountAmount,
          totalAmount: quotation.totalAmount,
          currency: quotation.currency,
          language: quotation.language,
          status: "draft",
          createdById: actor.id,
          lineItems: {
            create: quotation.lineItems.map(item => ({
              descriptionEn: item.descriptionEn,
            descriptionAr: item.descriptionAr,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              orderIndex: item.orderIndex
            }))
          }
        }
      });

      await db.quotation.update({
        where: { id: quotation.id },
        data: { invoiceId: invoice.id }
      });

      revalidatePath("/dashboard/finance/invoices");
      revalidatePath(`/dashboard/quotations/${quotation.id}`);
      return { success: true, invoiceId: invoice.id };
    });
  });
}
