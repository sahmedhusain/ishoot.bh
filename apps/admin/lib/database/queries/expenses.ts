import { roundMoney, validMoneyAmount } from "../finance/money";
import { assertCompanyCurrency } from "../finance/company-currency";
import { serverMessages } from "@platform/locales";
import { db, runAtomicMutation } from "../atomic";
import { claimUploadOrLink } from "../services/uploads";
import { Expense, ExpenseCategory, SupportedCurrency } from "../types";
import { listExpenseCategories } from "@platform/api-client";


function mapCategory(c: any): ExpenseCategory {
  return {
    id: c.id,
    slug: c.slug || c.code || "",
    name_en: c.nameEn || c.name_en || "",
    name_ar: c.nameAr || c.name_ar || "",
    color: c.color || "#09937F",
    display_order: c.displayOrder || c.sortOrder || 0,
    kind: c.kind ?? "operating",
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

export async function getExpenseCategories(
  options: { includeInactive?: boolean } = {},
): Promise<ExpenseCategory[]> {
  const apiCats = await listExpenseCategories().catch(() => null);
  if (apiCats && apiCats.length > 0) {
    return apiCats.map(mapCategory);
  }
  const categories = await db.expenseCategory.findMany({
    where: options.includeInactive ? undefined : { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { nameEn: "asc" }],
  });
  return categories.map(mapCategory);
}

const CATEGORY_KINDS = ["cost_of_sales", "operating", "payroll"] as const;

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

/** Adds a custom category; the slug is derived from the English name and kept unique. */
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
  let slug = `custom_${base}`;
  for (
    let i = 2;
    await db.expenseCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    i++
  )
    slug = `custom_${base}_${i}`;
  const last = await db.expenseCategory.aggregate({
    _max: { displayOrder: true },
  });
  const created = await db.expenseCategory.create({
    data: {
      slug,
      nameEn: fields.nameEn!,
      nameAr: fields.nameAr || fields.nameEn!,
      color: fields.color!,
      kind: fields.kind!,
      displayOrder: (last._max.displayOrder ?? 0) + 1,
    },
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
  const updated = await db.expenseCategory.update({
    where: { id },
    data: {
      ...categoryFields(data),
      ...(data.is_active !== undefined && { isActive: data.is_active }),
    },
  });
  return mapCategory(updated);
}

/** Custom categories without expenses are removed; anything in use (or built in) is hidden instead. */
export async function deleteExpenseCategory(
  id: string,
): Promise<"deleted" | "hidden"> {
  const category = await db.expenseCategory.findUniqueOrThrow({
    where: { id },
    select: { isSystem: true, _count: { select: { expenses: true } } },
  });
  if (category.isSystem || category._count.expenses > 0) {
    await db.expenseCategory.update({
      where: { id },
      data: { isActive: false },
    });
    return "hidden";
  }
  await db.expenseCategory.delete({ where: { id } });
  return "deleted";
}

export async function getAllExpenses(): Promise<Expense[]> {
  try {
    const expenses = await db.expense.findMany({
      include: {
        category: true,
        client: {
          select: { firstName: true, lastName: true, companyName: true },
        },
      },
      orderBy: { expenseDate: "desc" },
    });
    return expenses.map(mapExpense);
  } catch (e) {
    console.error("Error fetching expenses from DB:", e);
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
    /** VAT included in `amount` (the gross paid). */
    input_vat_amount?: number;
    is_vat_recoverable?: boolean;
  },
  ownerId?: string,
): Promise<Expense> {
  if (!Number.isFinite(expense.amount) || expense.amount <= 0)
    throw new Error(serverMessages.expenseAmountMustBePositive);
  const inputVat = expense.input_vat_amount ?? 0;
  if (!Number.isFinite(inputVat) || inputVat < 0 || inputVat >= expense.amount)
    throw new Error(serverMessages.inputVatMustBeLessThanThe);
  return runAtomicMutation(async () => {
    const currency = await assertCompanyCurrency(expense.currency);
    if (!validMoneyAmount(expense.amount, currency) || !validMoneyAmount(inputVat, currency, true)) throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
    const link = await resolveExpenseLink(expense);
    if (expense.category_id) {
      const category = await db.expenseCategory.findUnique({
        where: { id: expense.category_id },
        select: { isActive: true },
      });
      if (!category?.isActive)
        throw new Error(serverMessages.chooseAnActiveExpenseCategory);
    }
    const upload = expense.receipt_url
      ? await claimUploadOrLink(expense.receipt_url, ownerId)
      : null;
    const created = await db.expense.create({
      data: {
        categoryId: expense.category_id || null,
        ...link,
        paymentMethod: expense.payment_method || null,
        descriptionEn: expense.description_en,
        descriptionAr: expense.description_ar || null,
        amount: expense.amount,
        inputVatAmount: inputVat,
        netAmount: roundMoney(expense.amount - inputVat, currency),
        isVatRecoverable: expense.is_vat_recoverable ?? true,
        currency,
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
      include: {
        category: true,
        deal: true,
        client: {
          select: { firstName: true, lastName: true, companyName: true },
        },
      },
    });
    if (upload)
      await db.attachment.create({
        data: {
          entityType: "expense",
          entityId: created.id,
          fileName: upload.fileName,
          fileUrl: upload.fileUrl,
          fileSize: upload.fileSize,
          mimeType: upload.mimeType,
          uploadedById: ownerId,
        },
      });
    return mapExpense(created);
  });
}

/**
 * Where an expense is recorded: a deal (which also files it under the deal's client), a client
 * directly, or the business itself. The deal wins when both are given.
 */
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
    const deal = await db.crmDeal.findUnique({
      where: { id: input.deal_id },
      select: { contactId: true },
    });
    if (!deal) throw new Error(serverMessages.dealNotFound);
    return { scope, dealId: input.deal_id, clientId: deal.contactId ?? null };
  }
  if (scope === "client") {
    if (!input.client_id)
      throw new Error(serverMessages.chooseTheClientThisExpenseBelongsTo);
    const client = await db.crmContact.findUnique({
      where: { id: input.client_id },
      select: { id: true },
    });
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
  try {
    if (
      data.amount !== undefined &&
      (!Number.isFinite(data.amount) || data.amount <= 0)
    )
      throw new Error(serverMessages.expenseAmountMustBePositive);
    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) return null;
    await assertCompanyCurrency(existing.currency);
    if (data.amount !== undefined && !validMoneyAmount(data.amount, existing.currency)) throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
    const updateData: any = {};
    if (data.amount !== undefined) updateData.netAmount = roundMoney(data.amount - Number(existing.inputVatAmount), existing.currency);
    if (data.amount !== undefined && Number(existing.inputVatAmount) >= data.amount) throw new Error(serverMessages.inputVatMustBeLessThanThe);
    if (data.category_id !== undefined)
      updateData.categoryId = data.category_id;
    if (
      data.scope !== undefined ||
      data.deal_id !== undefined ||
      data.client_id !== undefined
    )
      Object.assign(
        updateData,
        await resolveExpenseLink({
          scope: data.scope,
          deal_id: data.deal_id,
          client_id: data.client_id,
        }),
      );
    if (data.payment_method !== undefined)
      updateData.paymentMethod = data.payment_method || null;
    if (data.description_en !== undefined)
      updateData.descriptionEn = data.description_en;
    if (data.description_ar !== undefined)
      updateData.descriptionAr = data.description_ar;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) {
      await assertCompanyCurrency(data.currency);
      updateData.currency = data.currency;
    }
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

/** Costs filed under a deal or a client (a client's file includes the costs of its deals). */
export async function getRelatedExpenses(
  filter: { dealId?: string; clientId?: string },
  take = 50,
) {
  if (!filter.dealId && !filter.clientId)
    throw new Error(serverMessages.aDealOrClientIsRequired);
  const where = filter.dealId
    ? { dealId: filter.dealId }
    : { clientId: filter.clientId };
  const [rows, totals] = await Promise.all([
    db.expense.findMany({
      where,
      include: {
        category: true,
        deal: { select: { title: true } },
        client: {
          select: { firstName: true, lastName: true, companyName: true },
        },
      },
      orderBy: { expenseDate: "desc" },
      take,
    }),
    db.expense.groupBy({
      by: ["currency"],
      where: { ...where, status: "approved" },
      _sum: { amount: true, netAmount: true },
      _count: { _all: true },
    }),
  ]);
  return {
    items: rows.map(mapExpense),
    totals: totals.map((t) => ({
      currency: t.currency,
      amount: Number(t._sum.amount ?? 0),
      net: Number(t._sum.netAmount ?? 0),
      count: t._count._all,
    })),
  };
}
