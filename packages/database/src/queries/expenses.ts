import { isLiveSupabaseConfigured, createBrowserClient } from '../client';
import { mockExpenses, mockExpenseCategories } from '../mock-data';
import { Expense, ExpenseCategory } from '../types';

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  if (!isLiveSupabaseConfigured()) {
    return mockExpenseCategories;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('expense_categories').select('*').order('display_order', { ascending: true });
  if (error || !data) return mockExpenseCategories;
  return data as ExpenseCategory[];
}

export async function getAllExpenses(): Promise<Expense[]> {
  if (!isLiveSupabaseConfigured()) {
    return mockExpenses;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('*, category:expense_categories(*), deal:crm_deals(*)')
    .order('expense_date', { ascending: false });
  if (error || !data) return mockExpenses;
  return data as Expense[];
}

export async function createExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
  const newExpense: Expense = {
    ...expense,
    id: `exp-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  if (!isLiveSupabaseConfigured()) {
    mockExpenses.unshift(newExpense);
    return newExpense;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('expenses').insert([newExpense]).select().single();
  if (error || !data) return newExpense;
  return data as Expense;
}
