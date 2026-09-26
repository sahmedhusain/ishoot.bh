import { db } from '../db';
import { mockPayments, mockInvoices } from '../mock-data';
import { Payment } from '../types';

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
      orderBy: { paymentDate: 'desc' },
    });
    if (payments && payments.length > 0) {
      return payments.map((p) => ({
        id: p.id,
        invoice_id: p.invoiceId,
        receipt_number: p.receiptNumber,
        payment_date: p.paymentDate.toISOString().split('T')[0],
        amount: Number(p.amount),
        currency: p.currency as any,
        payment_method: p.paymentMethod as any,
        reference_number: p.referenceNumber || undefined,
        notes: p.notes || undefined,
        receipt_pdf_path: p.receiptPdfPath || undefined,
        notification_channel: (p.notificationChannel as any) || undefined,
        notification_sent: p.notificationSent,
        created_by: p.createdById || undefined,
        created_at: p.createdAt.toISOString(),
      }));
    }
  } catch (e) {
    console.error('Error fetching payments from DB:', e);
  }
  return mockPayments;
}

export async function recordPayment(paymentData: Omit<Payment, 'id' | 'created_at' | 'receipt_number'>): Promise<Payment> {
  const receiptNumber = `RCT-2026-${String(mockPayments.length + 1).padStart(3, '0')}`;
  try {
    const created = await db.payment.create({
      data: {
        invoiceId: paymentData.invoice_id,
        receiptNumber: receiptNumber,
        paymentDate: new Date(paymentData.payment_date),
        amount: paymentData.amount,
        currency: paymentData.currency,
        paymentMethod: paymentData.payment_method,
        referenceNumber: paymentData.reference_number || null,
        notes: paymentData.notes || null,
        notificationSent: false,
      },
    });

    return {
      id: created.id,
      invoice_id: created.invoiceId,
      receipt_number: created.receiptNumber,
      payment_date: created.paymentDate.toISOString().split('T')[0],
      amount: Number(created.amount),
      currency: created.currency as any,
      payment_method: created.paymentMethod as any,
      reference_number: created.referenceNumber || undefined,
      notes: created.notes || undefined,
      receipt_pdf_path: created.receiptPdfPath || undefined,
      notification_channel: undefined,
      notification_sent: created.notificationSent,
      created_by: created.createdById || undefined,
      created_at: created.createdAt.toISOString(),
    };
  } catch (e) {
    console.error('Error recording payment in DB:', e);
  }

  const newPayment: Payment = {
    ...paymentData,
    id: `pay-${Date.now()}`,
    receipt_number: receiptNumber,
    notification_sent: false,
    created_at: new Date().toISOString(),
  };
  mockPayments.unshift(newPayment);
  return newPayment;
}
