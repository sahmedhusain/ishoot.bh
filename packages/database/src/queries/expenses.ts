import { getCompanySettings } from "./company-settings";
import { db, runAtomicMutation } from "../db";
import {claimUpload} from "../services/uploads";
import { Expense, ExpenseCategory, SupportedCurrency } from "../types";

function mapCategory(c: any): ExpenseCategory {
  return {
    id: c.id,
    slug: c.slug,
    name_en: c.nameEn,
    name_ar: c.nameAr,
    color: c.color,
    display_order: c.displayOrder,
  };
}

export function mapExpense(e: any): Expense {
  return {
    id: e.id,
    category_id: e.categoryId || "",
    category: e.category ? mapCategory(e.category) : undefined,
    deal_id: e.dealId || undefined,
    description_en: e.descriptionEn,
    description_ar: e.descriptionAr || undefined,
    amount: Number(e.amount),
    currency: (e.currency as SupportedCurrency) || "BHD",
    expense_date: e.expenseDate.toISOString().split("T")[0],
    vendor_name: e.vendorName || undefined,
    receipt_url: e.receiptUrl || undefined,
    is_billable: e.isBillable,
    is_recurring: e.isRecurring,
    recurrence_interval: (e.recurrenceInterval as any) || undefined,
    notes: e.notes || undefined,
    status: e.status,
    review_notes: e.reviewNotes || undefined,
    input_vat_amount: Number(e.inputVatAmount ?? 0),
    created_at: e.createdAt.toISOString(),
  };
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  try {
    const categories = await db.expenseCategory.findMany({
      orderBy: { displayOrder: "asc" },
    });
    return categories.map(mapCategory);
  } catch (e) {
    console.error("Error fetching expense categories from DB:", e);
    throw e;
  }
}

export async function createExpenseCategory(data: {
  slug: string;
  name_en: string;
  name_ar?: string;
  color?: string;
  display_order?: number;
}): Promise<ExpenseCategory> {
  const created = await db.expenseCategory.create({
    data: {
      slug: data.slug,
      nameEn: data.name_en,
      nameAr: data.name_ar || data.name_en,
      color: data.color || "#09937F",
      displayOrder: data.display_order ?? 0,
    },
  });
  return mapCategory(created);
}

export async function getAllExpenses(): Promise<Expense[]> {
  try {
    const expenses = await db.expense.findMany({
      include: {
        category: true,
      },
      orderBy: { expenseDate: "desc" },
    });
    return expenses.map(mapExpense);
  } catch (e) {
    console.error("Error fetching expenses from DB:", e);
    throw e;
  }
}

export async function createExpense(expense: {
  category_id?: string;
  deal_id?: string;
  description_en: string;
  description_ar?: string;
  amount: number;
  currency?: SupportedCurrency;
  expense_date?: string;
  vendor_name?: string;
  receipt_url?: string;
  is_recurring?: boolean;
  recurrence_interval?: string;
  notes?: string;
  is_billable?: boolean;
  /** VAT included in `amount` (the gross paid). */
  input_vat_amount?: number;
  is_vat_recoverable?: boolean;
}, ownerId?: string): Promise<Expense> {
  if (!Number.isFinite(expense.amount) || expense.amount <= 0)
    throw new Error("Expense amount must be positive");
  const inputVat = expense.input_vat_amount ?? 0;
  if (!Number.isFinite(inputVat) || inputVat < 0 || inputVat >= expense.amount)
    throw new Error("Input VAT must be less than the expense amount");
  return runAtomicMutation(async () => {
  const upload = expense.receipt_url ? await claimUpload(db, expense.receipt_url, ownerId) : null;
  const created = await db.expense.create({
    data: {
      categoryId: expense.category_id || null,
      dealId: expense.deal_id || null,
      descriptionEn: expense.description_en,
      descriptionAr: expense.description_ar || null,
      amount: expense.amount,
      inputVatAmount: inputVat,
      netAmount: Math.round((expense.amount - inputVat) * 1000) / 1000,
      isVatRecoverable: expense.is_vat_recoverable ?? true,
      currency: expense.currency || (await getCompanySettings()).default_currency,
      createdById: ownerId || null,
      expenseDate: expense.expense_date
        ? new Date(expense.expense_date)
        : new Date(),
      vendorName: expense.vendor_name || null,
      receiptUrl: expense.receipt_url || null,
      isBillable: expense.is_billable || false,
      isRecurring: expense.is_recurring || false,
      recurrenceInterval: expense.recurrence_interval || null,
      notes: expense.notes || null,
      // Becomes approved/rejected through the expense approval policy (or immediately if the policy is off).
      status: "pending",
    },
    include: { category: true, deal: true },
  });
  if(upload) await db.attachment.create({data:{entityType:"expense",entityId:created.id,fileName:upload.fileName,fileUrl:upload.fileUrl,fileSize:upload.fileSize,mimeType:upload.mimeType,uploadedById:ownerId}});
  return mapExpense(created);
  });
}

export async function updateExpense(
  id: string,
  data: Partial<Expense>,
): Promise<Expense | null> {
  try {
    if (
      data.amount !== undefined &&
      (!Number.isFinite(data.amount) || data.amount <= 0)
    )
      throw new Error("Expense amount must be positive");
    const updateData: any = {};
    if (data.category_id !== undefined)
      updateData.categoryId = data.category_id;
    if (data.deal_id !== undefined) updateData.dealId = data.deal_id;
    if (data.description_en !== undefined)
      updateData.descriptionEn = data.description_en;
    if (data.description_ar !== undefined)
      updateData.descriptionAr = data.description_ar;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.expense_date !== undefined)
      updateData.expenseDate = new Date(data.expense_date);
    if (data.vendor_name !== undefined)
      updateData.vendorName = data.vendor_name;
    if (data.receipt_url !== undefined)
      updateData.receiptUrl = data.receipt_url;
    if (data.is_recurring !== undefined)
      updateData.isRecurring = data.is_recurring;
    if (data.recurrence_interval !== undefined)
      updateData.recurrenceInterval = data.recurrence_interval;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await db.expense.update({
      where: { id },
      data: updateData,
      include: { category: true, deal: true },
    });
    return mapExpense(updated);
  } catch (e) {
    console.error(`Error updating expense ${id}:`, e);
    throw e;
  }
}

export async function deleteExpense(id: string): Promise<boolean> {
  try {
    await db.expense.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting expense ${id}:`, e);
    throw e;
  }
}
