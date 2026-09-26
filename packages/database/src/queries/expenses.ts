import { db } from '../db';
import { mockExpenses, mockExpenseCategories } from '../mock-data';
import { Expense, ExpenseCategory } from '../types';

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  try {
    const categories = await db.expenseCategory.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    if (categories && categories.length > 0) {
      return categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name_en: c.nameEn,
        name_ar: c.nameAr,
        color: c.color,
        display_order: c.displayOrder,
      }));
    }
  } catch (e) {
    console.error('Error fetching expense categories from DB:', e);
  }
  return mockExpenseCategories;
}

export async function getAllExpenses(): Promise<Expense[]> {
  try {
    const expenses = await db.expense.findMany({
      include: {
        category: true,
        deal: true,
      },
      orderBy: { expenseDate: 'desc' },
    });
    if (expenses && expenses.length > 0) {
      return expenses.map((e) => ({
        id: e.id,
        category_id: e.categoryId || '',
        category: e.category
          ? {
              id: e.category.id,
              slug: e.category.slug,
              name_en: e.category.nameEn,
              name_ar: e.category.nameAr,
              color: e.category.color,
              display_order: e.category.displayOrder,
            }
          : undefined,
        deal_id: e.dealId || undefined,
        description_en: e.descriptionEn,
        description_ar: e.descriptionAr || undefined,
        amount: Number(e.amount),
        currency: e.currency as any,
        expense_date: e.expenseDate.toISOString().split('T')[0],
        vendor_name: e.vendorName || undefined,
        receipt_url: e.receiptUrl || undefined,
        is_recurring: e.isRecurring,
        recurrence_interval: (e.recurrenceInterval as any) || undefined,
        notes: e.notes || undefined,
        created_at: e.createdAt.toISOString(),
      }));
    }
  } catch (e) {
    console.error('Error fetching expenses from DB:', e);
  }
  return mockExpenses;
}

export async function createExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
  try {
    const created = await db.expense.create({
      data: {
        categoryId: expense.category_id || null,
        dealId: expense.deal_id || null,
        descriptionEn: expense.description_en,
        descriptionAr: expense.description_ar || null,
        amount: expense.amount,
        currency: expense.currency,
        expenseDate: new Date(expense.expense_date),
        vendorName: expense.vendor_name || null,
        receiptUrl: expense.receipt_url || null,
        isRecurring: expense.is_recurring || false,
        recurrenceInterval: expense.recurrence_interval || null,
        notes: expense.notes || null,
      },
      include: { category: true },
    });

    return {
      id: created.id,
      category_id: created.categoryId || '',
      category: created.category
        ? {
            id: created.category.id,
            slug: created.category.slug,
            name_en: created.category.nameEn,
            name_ar: created.category.nameAr,
            color: created.category.color,
            display_order: created.category.displayOrder,
          }
        : undefined,
      deal_id: created.dealId || undefined,
      description_en: created.descriptionEn,
      description_ar: created.descriptionAr || undefined,
      amount: Number(created.amount),
      currency: created.currency as any,
      expense_date: created.expenseDate.toISOString().split('T')[0],
      vendor_name: created.vendorName || undefined,
      receipt_url: created.receiptUrl || undefined,
      is_recurring: created.isRecurring,
      recurrence_interval: (created.recurrenceInterval as any) || undefined,
      notes: created.notes || undefined,
      created_at: created.createdAt.toISOString(),
    };
  } catch (e) {
    console.error('Error creating expense in DB:', e);
  }

  const newExpense: Expense = {
    ...expense,
    id: `exp-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  mockExpenses.unshift(newExpense);
  return newExpense;
}
