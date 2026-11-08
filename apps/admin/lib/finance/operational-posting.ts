import { db } from "../atomic";
import { postJournal } from "../queries/accounting-ledger";

export interface StandardAccounts {
  cash: string;
  bank: string;
  ar: string;
  inventory: string;
  ap: string;
  tax: string;
  revenue: string;
  cogs: string;
  shrinkage: string;
  variance: string;
}

export async function ensureStandardAccounts(): Promise<StandardAccounts> {
  const definitions = [
    { code: "1010", name: "Cash on Hand", kind: "asset" },
    { code: "1020", name: "Bank Account", kind: "asset" },
    { code: "1100", name: "Accounts Receivable", kind: "asset" },
    { code: "1200", name: "Inventory Asset", kind: "asset" },
    { code: "2000", name: "Accounts Payable", kind: "liability" },
    { code: "2100", name: "VAT / Sales Tax Payable", kind: "liability" },
    { code: "4000", name: "Sales Revenue", kind: "income" },
    { code: "5000", name: "Cost of Goods Sold", kind: "expense" },
    { code: "5100", name: "Inventory Shrinkage", kind: "expense" },
    { code: "5200", name: "Cash Over / Short", kind: "expense" },
  ];

  const map = new Map<string, string>();
  for (const def of definitions) {
    const account = await db.accountingAccount.upsert({
      where: { code: def.code },
      update: { name: def.name, kind: def.kind, isActive: true },
      create: { code: def.code, name: def.name, kind: def.kind, isActive: true },
    });
    map.set(def.code, account.id);
  }

  return {
    cash: map.get("1010")!,
    bank: map.get("1020")!,
    ar: map.get("1100")!,
    inventory: map.get("1200")!,
    ap: map.get("2000")!,
    tax: map.get("2100")!,
    revenue: map.get("4000")!,
    cogs: map.get("5000")!,
    shrinkage: map.get("5100")!,
    variance: map.get("5200")!,
  };
}

export interface SalePostingInput {
  orderId: string;
  orderNumber: string;
  total: string;
  subtotal: string;
  vatAmount?: string;
  currency: string;
  branchId?: string;
  postingDate: string;
  isPaid?: boolean;
}

export async function postSaleJournal(input: SalePostingInput, actorId: string) {
  const accounts = await ensureStandardAccounts();
  const debitAccount = input.isPaid ? accounts.cash : accounts.ar;
  const vat = input.vatAmount && Number(input.vatAmount) > 0 ? input.vatAmount : "0";

  const lines = [
    { accountId: debitAccount, debit: input.total, credit: "0", memo: `Order ${input.orderNumber}` },
    { accountId: accounts.revenue, debit: "0", credit: input.subtotal, memo: `Revenue ${input.orderNumber}` },
  ];

  if (Number(vat) > 0) {
    lines.push({ accountId: accounts.tax, debit: "0", credit: vat, memo: `VAT ${input.orderNumber}` });
  }

  return postJournal(
    {
      sourceKey: `sale:${input.orderId}`,
      postingDate: input.postingDate,
      currency: input.currency,
      memo: `Sale: ${input.orderNumber}`,
      branchId: input.branchId,
      lines,
    },
    actorId,
  );
}

export interface PaymentPostingInput {
  collectionId: string;
  collectionNumber: string;
  amount: string;
  currency: string;
  branchId?: string;
  postingDate: string;
  method?: string;
}

export async function postPaymentCollectionJournal(input: PaymentPostingInput, actorId: string) {
  const accounts = await ensureStandardAccounts();
  const debitAccount = input.method === "card" || input.method === "benefit" ? accounts.bank : accounts.cash;

  return postJournal(
    {
      sourceKey: `collection:${input.collectionId}`,
      postingDate: input.postingDate,
      currency: input.currency,
      memo: `Collection: ${input.collectionNumber}`,
      branchId: input.branchId,
      lines: [
        { accountId: debitAccount, debit: input.amount, credit: "0", memo: `Collected ${input.collectionNumber}` },
        { accountId: accounts.ar, debit: "0", credit: input.amount, memo: `Cleared AR for ${input.collectionNumber}` },
      ],
    },
    actorId,
  );
}

export interface InventoryAdjustmentPostingInput {
  adjustmentId: string;
  reference: string;
  amount: string;
  currency: string;
  branchId?: string;
  postingDate: string;
  isPositive: boolean;
}

export async function postInventoryAdjustmentJournal(input: InventoryAdjustmentPostingInput, actorId: string) {
  const accounts = await ensureStandardAccounts();
  const lines = input.isPositive
    ? [
        { accountId: accounts.inventory, debit: input.amount, credit: "0", memo: `Gain ${input.reference}` },
        { accountId: accounts.shrinkage, debit: "0", credit: input.amount, memo: `Offset ${input.reference}` },
      ]
    : [
        { accountId: accounts.shrinkage, debit: input.amount, credit: "0", memo: `Shrinkage ${input.reference}` },
        { accountId: accounts.inventory, debit: "0", credit: input.amount, memo: `Asset write-down ${input.reference}` },
      ];

  return postJournal(
    {
      sourceKey: `inventory-adj:${input.adjustmentId}`,
      postingDate: input.postingDate,
      currency: input.currency,
      memo: `Inventory adjustment: ${input.reference}`,
      branchId: input.branchId,
      lines,
    },
    actorId,
  );
}
