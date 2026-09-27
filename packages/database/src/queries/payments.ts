import { db } from "../db";
import { Payment, SupportedCurrency, PaymentMethod } from "../types";

function mapPayment(p: any): Payment {
  return {
    id: p.id,
    invoice_id: p.invoiceId,
    receipt_number: p.receiptNumber,
    payment_date: p.paymentDate.toISOString().split("T")[0],
    amount: Number(p.amount),
    currency: (p.currency as SupportedCurrency) || "BHD",
    payment_method: (p.paymentMethod as PaymentMethod) || "bank_transfer",
    reference_number: p.referenceNumber || undefined,
    notes: p.notes || undefined,
    receipt_pdf_path: p.receiptPdfPath || undefined,
    notification_channel: (p.notificationChannel as any) || undefined,
    notification_sent: p.notificationSent,
    created_by: p.createdById || undefined,
    created_at: p.createdAt.toISOString(),
    invoice: p.invoice
      ? {
          id: p.invoice.id,
          invoice_number: p.invoice.invoiceNumber,
          contact_id: p.invoice.deal?.contactId || p.invoice.clientId || "",
          deal_id: p.invoice.dealId || undefined,
          issue_date: p.invoice.issueDate.toISOString().split("T")[0],
          due_date: p.invoice.dueDate.toISOString().split("T")[0],
          subtotal: Number(p.invoice.subtotal),
          discount_type: "none",
          discount_value: 0,
          discount_amount: Number(p.invoice.discountAmount),
          after_discount:
            Number(p.invoice.subtotal) - Number(p.invoice.discountAmount),
          vat_enabled: Number(p.invoice.vatAmount) > 0,
          vat_percentage: 10,
          vat_amount: Number(p.invoice.vatAmount),
          total_amount: Number(p.invoice.totalAmount),
          amount_paid: Number(p.amount),
          amount_due: Math.max(
            0,
            Number(p.invoice.totalAmount) - Number(p.amount),
          ),
          currency: p.invoice.currency as SupportedCurrency,
          language: p.invoice.language as "en" | "ar",
          status: p.invoice.status as any,
          created_at: p.invoice.createdAt.toISOString(),
          updated_at: p.invoice.updatedAt.toISOString(),
          contact: p.invoice.deal?.contact
            ? {
                id: p.invoice.deal.contact.id,
                full_name:
                  `${p.invoice.deal.contact.firstName} ${p.invoice.deal.contact.lastName || ""}`.trim(),
                email: p.invoice.deal.contact.email || "",
                phone: p.invoice.deal.contact.phone || undefined,
                company: p.invoice.deal.contact.companyName || undefined,
                created_at: p.invoice.deal.contact.createdAt.toISOString(),
                updated_at: p.invoice.deal.contact.updatedAt.toISOString(),
              }
            : undefined,
        }
      : undefined,
  };
}

export async function getAllPayments(): Promise<Payment[]> {
  try {
    const payments = await db.payment.findMany({
      include: {
        invoice: {
          include: {
            lineItems: true,
            deal: {
              include: { contact: true },
            },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    });
    return payments.map(mapPayment);
  } catch (e) {
    console.error("Error fetching payments from DB:", e);
    return [];
  }
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  try {
    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            lineItems: true,
            deal: {
              include: { contact: true },
            },
          },
        },
      },
    });
    return payment ? mapPayment(payment) : null;
  } catch (e) {
    console.error(`Error fetching payment ${id}:`, e);
    return null;
  }
}

export async function getPaymentByIdOrNumber(
  idOrNumber: string,
): Promise<Payment | null> {
  try {
    const payment = await db.payment.findFirst({
      where: {
        OR: [{ id: idOrNumber }, { receiptNumber: idOrNumber }],
      },
      include: {
        invoice: {
          include: {
            lineItems: true,
            deal: {
              include: { contact: true },
            },
          },
        },
      },
    });
    return payment ? mapPayment(payment) : null;
  } catch (e) {
    console.error(`Error fetching payment ${idOrNumber}:`, e);
    return null;
  }
}

export async function recordPayment(paymentData: {
  invoice_id: string;
  payment_date?: string;
  amount: number;
  currency?: SupportedCurrency;
  payment_method?: PaymentMethod;
  reference_number?: string;
  notes?: string;
  receipt_pdf_path?: string;
  notification_channel?: any;
  notification_sent?: boolean;
  created_by?: string;
}): Promise<Payment> {
  const year = new Date().getFullYear();
  const count = await db.payment.count();
  const receiptNumber = `RCT-${year}-${String(count + 1).padStart(3, "0")}`;

  const created = await db.payment.create({
    data: {
      invoiceId: paymentData.invoice_id,
      receiptNumber,
      paymentDate: paymentData.payment_date
        ? new Date(paymentData.payment_date)
        : new Date(),
      amount: paymentData.amount,
      currency: paymentData.currency || "BHD",
      paymentMethod: paymentData.payment_method || "bank_transfer",
      referenceNumber: paymentData.reference_number || null,
      notes: paymentData.notes || null,
      notificationSent: paymentData.notification_sent || false,
      notificationChannel: paymentData.notification_channel || null,
      createdById: paymentData.created_by || null,
    },
    include: {
      invoice: {
        include: {
          payments: true,
          deal: { include: { contact: true } },
        },
      },
    },
  });

  try {
    const invoice = await db.invoice.findUnique({
      where: { id: paymentData.invoice_id },
      include: { payments: true },
    });
    if (invoice) {
      const totalPaid = invoice.payments.reduce(
        (acc, p) => acc + Number(p.amount),
        0,
      );
      const totalInvoice = Number(invoice.totalAmount);
      let newStatus = invoice.status;

      if (totalPaid >= totalInvoice) {
        newStatus = "paid";
      } else if (totalPaid > 0) {
        newStatus = "partially_paid";
      }

      if (newStatus !== invoice.status) {
        await db.invoice.update({
          where: { id: invoice.id },
          data: { status: newStatus },
        });
      }
    }
  } catch (err) {
    console.error("Error auto-reconciling invoice status after payment:", err);
  }

  return mapPayment(created);
}

export async function deletePayment(id: string): Promise<boolean> {
  try {
    await db.payment.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting payment ${id}:`, e);
    return false;
  }
}

export const createPayment = recordPayment;
