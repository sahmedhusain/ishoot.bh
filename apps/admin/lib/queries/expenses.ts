import { roundMoney, validMoneyAmount } from "../finance/money";
import { assertCompanyCurrency } from "../finance/company-currency";
import { serverMessages } from "@platform/locales";
import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";
import { claimUploadOrLink } from "../services/uploads";
import { Expense, ExpenseCategory, SupportedCurrency } from "../types";
import {
  listExpenseCategories,
  listExpenses as listFinanceExpenses,
  createExpense as createFinanceExpense,
  updateExpense as updateFinanceExpense,
  deleteExpense as deleteFinanceExpense,
} from "../api/finance";

const CATEGORY_KINDS = ["cost_of_sales", "operating", "payroll"] as const;

function mapCategory(c: any): ExpenseCategory {
  return {
    id: c.id,
    slug: c.slug || c.code || "",
    name_en: c.nameEn || c.name_en || "",
    name_ar: c.nameAr || c.name_ar || "",
    color: c.color || "#09937F",
    display_order: c.displayOrder || c.sortOrder || 0,
    kind: (CATEGORY_KINDS as readonly string[]).includes(c.kind) ? c.kind : "operating",
    is_system: Boolean(c.isSystem ?? true),
    is_active: c.isActive ?? true,
  };
}

function clientLabel(
  c:
    | {
        firstName?: string;
        lastName?: string | null;
        companyName?: string | null;
      }
    | null
    | undefined,
) {
  if (!c) return undefined;
  return (
    c.companyName ||
    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
    undefined
  );
}

export function mapExpense(e: any): Expense {
  return {
    id: e.id,
    category_id: e.categoryId || "",
    category: e.category ? mapCategory(e.category) : undefined,
    deal_id: e.dealId || undefined,
    deal_title: e.deal?.title || undefined,
    client_id: e.clientId || undefined,
    client_name: clientLabel(e.client),
    scope: e.scope ?? (e.dealId ? "deal" : "internal"),
    payment_method: e.paymentMethod || undefined,
    description_en: e.descriptionEn,
    description_ar: e.descriptionAr || undefined,
    amount: Number(e.amount),
    currency: String(e.currency ?? ""),
    expense_date: (e.expenseDate instanceof Date ? e.expenseDate.toISOString() : String(e.expenseDate ?? new Date().toISOString())).split("T")[0],
    vendor_name: e.vendorName || undefined,
    receipt_url: e.receiptUrl || undefined,
    is_billable: e.isBillable,
    is_recurring: e.isRecurring,
    recurrence_interval: (e.recurrenceInterval as any) || undefined,
    notes: e.notes || undefined,
    status: e.status,
    review_notes: e.reviewNotes || undefined,
    input_vat_amount: Number(e.inputVatAmount ?? 0),
    created_at: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt ?? new Date().toISOString()),
  };
}

export async function getExpenseCategories(
  options: { includeInactive?: boolean } = {},
): Promise<ExpenseCategory[]> {
  const apiCats = await listExpenseCategories().catch(() => null);
  if (apiCats && apiCats.length > 0) {
    return apiCats.map(mapCategory);
  }
  const allCategories = await listTableRows<any>("finance", "expense_category");
  const categories = allCategories
    .filter((c) => options.includeInactive || c.isActive)
    .sort((a, b) => {
      const ord = Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0);
      return ord !== 0 ? ord : String(a.nameEn ?? "").localeCompare(String(b.nameEn ?? ""));
    });
  return categories.map(mapCategory);
}

function categoryFields(data: {
  name_en?: string;
  name_ar?: string;
  color?: string;
  kind?: string;
}) {
  const nameEn = data.name_en?.trim();
  if (data.name_en !== undefined && (!nameEn || nameEn.length > 80))
    throw new Error(serverMessages.categoryNameIsRequired);
  if (
    data.kind !== undefined &&
    !(CATEGORY_KINDS as readonly string[]).includes(data.kind)
  )
    throw new Error(serverMessages.invalidCategoryType);
  if (data.color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(data.color))
    throw new Error(serverMessages.invalidColour);
  return {
    ...(nameEn !== undefined && { nameEn }),
    ...(data.name_ar !== undefined && {
      nameAr: data.name_ar.trim() || nameEn || "",
    }),
    ...(data.color !== undefined && { color: data.color }),
    ...(data.kind !== undefined && { kind: data.kind }),
  };
}

export async function createExpenseCategory(data: {
  name_en: string;
  name_ar?: string;
  color?: string;
  kind?: string;
}): Promise<ExpenseCategory> {
  const fields = categoryFields({
    ...data,
    kind: data.kind ?? "operating",
    color: data.color ?? "#2563EB",
  });
  const base =
    (fields.nameEn || "category")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "category";
  const allCategories = await listTableRows<any>("finance", "expense_category");
  const usedSlugs = new Set(allCategories.map((c) => c.slug));
  let slug = `custom_${base}`;
  for (let i = 2; usedSlugs.has(slug); i++) slug = `custom_${base}_${i}`;
  const maxOrder = allCategories.reduce(
    (max, c) => Math.max(max, Number(c.displayOrder ?? 0)),
    0,
  );
  const created = await upsertTableRow("finance", "expense_category", {
    id: crypto.randomUUID(),
    slug,
    nameEn: fields.nameEn!,
    nameAr: fields.nameAr || fields.nameEn!,
    color: fields.color!,
    kind: fields.kind!,
    displayOrder: maxOrder + 1,
    isActive: true,
    isSystem: false,
  });
  return mapCategory(created);
}

export async function updateExpenseCategory(
  id: string,
  data: {
    name_en?: string;
    name_ar?: string;
    color?: string;
    kind?: string;
    is_active?: boolean;
  },
): Promise<ExpenseCategory> {
  const allCategories = await listTableRows<any>("finance", "expense_category");
  const existing = allCategories.find((c) => c.id === id);
  if (!existing) throw new Error("Category not found");
  const updated = await upsertTableRow("finance", "expense_category", {
    ...existing,
    ...categoryFields(data),
    ...(data.is_active !== undefined && { isActive: data.is_active }),
  });
  return mapCategory(updated);
}

export async function deleteExpenseCategory(
  id: string,
): Promise<"deleted" | "hidden"> {
  const [allCategories, allExpenses] = await Promise.all([
    listTableRows<any>("finance", "expense_category"),
    listTableRows<any>("finance", "expense"),
  ]);
  const category = allCategories.find((c) => c.id === id);
  if (!category) throw new Error("Category not found");
  const expenseCount = allExpenses.filter((e) => e.categoryId === id).length;
  if (category.isSystem || expenseCount > 0) {
    await upsertTableRow("finance", "expense_category", {
      ...category,
      isActive: false,
    });
    return "hidden";
  }
  await deleteTableRow("finance", "expense_category", id);
  return "deleted";
}

function mapApiExpense(e: any): Expense {
  return {
    id: e.id,
    category_id: e.categoryId ?? null,
    scope: "internal",
    deal_id: undefined,
    client_id: undefined,
    payment_method: undefined,
    description_en: e.title ?? "",
    description_ar: e.title ?? "",
    amount: Number(e.amount ?? 0),
    input_vat_amount: 0,
    currency: (e.currency || "BHD") as SupportedCurrency,
    expense_date: e.expenseDate ? String(e.expenseDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    vendor_name: e.vendor ?? null,
    receipt_url: e.receiptUrl ?? null,
    is_recurring: false,
    recurrence_interval: undefined,
    notes: e.notes ?? null,
    is_billable: false,
    status: (e.status || "approved") as any,
    created_at: e.createdAt ?? new Date().toISOString(),
  };
}

export async function getAllExpenses(): Promise<Expense[]> {
  try {
    const expenses = await listFinanceExpenses();
    return (expenses || []).map(mapApiExpense);
  } catch (e) {
    console.error("Error fetching expenses from API:", e);
    throw e;
  }
}

export async function createExpense(
  expense: {
    category_id?: string;
    deal_id?: string;
    client_id?: string;
    scope?: "deal" | "client" | "internal";
    payment_method?: string;
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
    input_vat_amount?: number;
    is_vat_recoverable?: boolean;
  },
  ownerId?: string,
): Promise<Expense> {
  if (!Number.isFinite(expense.amount) || expense.amount <= 0)
    throw new Error(serverMessages.expenseAmountMustBePositive);
  const currency = await assertCompanyCurrency(expense.currency);
  const created = await createFinanceExpense({
    title: expense.description_en || expense.description_ar || "Expense",
    categoryId: expense.category_id || null,
    amount: String(roundMoney(expense.amount, currency)),
    currency,
    expenseDate: expense.expense_date || new Date().toISOString().slice(0, 10),
    status: "approved",
    notes: expense.notes || null,
    vendor: expense.vendor_name || null,
    receiptUrl: expense.receipt_url || null,
  });
  return mapApiExpense(created);
}

async function resolveExpenseLink(input: {
  scope?: string;
  deal_id?: string | null;
  client_id?: string | null;
}) {
  const scope =
    input.scope ??
    (input.deal_id ? "deal" : input.client_id ? "client" : "internal");
  if (scope === "deal") {
    if (!input.deal_id)
      throw new Error(serverMessages.chooseTheDealThisExpenseBelongsTo);
    const deals = await listTableRows<any>("sales", "crm_deal");
    const deal = deals.find((d) => d.id === input.deal_id);
    if (!deal) throw new Error(serverMessages.dealNotFound);
    return { scope, dealId: input.deal_id, clientId: deal.contactId ?? null };
  }
  if (scope === "client") {
    if (!input.client_id)
      throw new Error(serverMessages.chooseTheClientThisExpenseBelongsTo);
    const contacts = await listTableRows<any>("sales", "crm_contact");
    const client = contacts.find((c) => c.id === input.client_id);
    if (!client) throw new Error(serverMessages.clientNotFound);
    return { scope, dealId: null, clientId: input.client_id };
  }
  if (scope !== "internal") throw new Error(serverMessages.invalidExpenseScope);
  return { scope, dealId: null, clientId: null };
}

export async function updateExpense(
  id: string,
  data: Partial<Expense>,
): Promise<Expense | null> {
  if (
    data.amount !== undefined &&
    (!Number.isFinite(data.amount) || data.amount <= 0)
  ) {
    throw new Error(serverMessages.expenseAmountMustBePositive);
  }
  const updated = await updateFinanceExpense(id, {
    title: data.description_en,
    categoryId: data.category_id,
    amount: data.amount,
    notes: data.notes,
    vendor: data.vendor_name,
  });
  return mapApiExpense(updated);
}

export async function deleteExpense(id: string): Promise<boolean> {
  await deleteFinanceExpense(id);
  return true;
}

export async function getRelatedExpenses(
  filter: { dealId?: string; clientId?: string },
  take = 50,
) {
  if (!filter.dealId && !filter.clientId)
    throw new Error(serverMessages.aDealOrClientIsRequired);
  const [allExpenses, categories, deals, contacts] = await Promise.all([
    listTableRows<any>("finance", "expense"),
    listTableRows<any>("finance", "expense_category"),
    listTableRows<any>("sales", "crm_deal"),
    listTableRows<any>("sales", "crm_contact"),
  ]);
  const catMap = new Map<string, any>(categories.map((c) => [c.id, c]));
  const dealMap = new Map<string, any>(deals.map((d) => [d.id, d]));
  const clientMap = new Map<string, any>(contacts.map((c) => [c.id, c]));
  const filtered = allExpenses.filter((e) =>
    filter.dealId ? e.dealId === filter.dealId : e.clientId === filter.clientId,
  );
  const rows = [...filtered]
    .sort((a, b) =>
      String(b.expenseDate ?? "").localeCompare(String(a.expenseDate ?? "")),
    )
    .slice(0, take)
    .map((e) => ({
      ...e,
      category: e.categoryId ? catMap.get(e.categoryId) ?? null : null,
      deal: e.dealId ? dealMap.get(e.dealId) ?? null : null,
      client: e.clientId ? clientMap.get(e.clientId) ?? null : null,
    }));
  const totalsByCurrency = new Map<
    string,
    { amount: number; net: number; count: number }
  >();
  for (const e of filtered) {
    if (e.status !== "approved") continue;
    const cur = String(e.currency ?? "");
    const entry = totalsByCurrency.get(cur) ?? { amount: 0, net: 0, count: 0 };
    entry.amount += Number(e.amount ?? 0);
    entry.net += Number(e.netAmount ?? 0);
    entry.count += 1;
    totalsByCurrency.set(cur, entry);
  }
  return {
    items: rows.map(mapExpense),
    totals: Array.from(totalsByCurrency.entries()).map(([currency, t]) => ({
      currency,
      amount: t.amount,
      net: t.net,
      count: t.count,
    })),
  };
}
