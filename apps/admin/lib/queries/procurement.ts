import { serverMessages } from "@platform/locales";
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
} from "@platform/api-client";
import {
  listProducts,
  getProduct,
} from "@platform/api-client";

const num = (value: any) => value == null ? 0 : Number(value.toString());
const numOrNull = (value: any) => value == null ? null : Number(value.toString());
const day = (value: string | undefined | null) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(serverMessages.procurementDateInvalid);
  return new Date(`${value}T00:00:00.000Z`);
};
const isoDay = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : null;

export interface PurchaseOrderRecord {
  id: string;
  number: string;
  order_number: string;
  supplier_id: string;
  supplier_name: string;
  order_date: string;
  expected_date: string | null;
  issue_date: string;
  expected_delivery_date: string | null;
  status: string;
  currency_code: string;
  subtotal: number;
  vat_enabled: boolean;
  vat_percentage: number;
  vat_amount: number;
  tax_total: number;
  total: number;
  grand_total: number;
  warehouse?: { name_en: string; name_ar: string; id?: string; [key: string]: any } | null;
  supplier: {
    name: string;
    id?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    vat_number?: string | null;
    [key: string]: any;
  };
  terms?: string | null;
  approved_by?: string | null;
  lines: any[];
  [key: string]: any;
}

export interface PurchaseOrderInput {
  id?: string;
  supplierId?: string;
  issueDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  requisitionId?: string;
  warehouseId?: string;
  lines: any[];
  [key: string]: any;
}

export interface RequisitionInput {
  id?: string;
  requestedById?: string;
  departmentId?: string;
  neededByDate?: string;
  neededBy?: string;
  justification?: string;
  lines: any[];
  [key: string]: any;
}

export interface RfqInput {
  id?: string;
  title: string;
  deadline?: string;
  dueDate?: string;
  requisitionId?: string;
  supplierIds?: string[];
  lines: any[];
  [key: string]: any;
}

export interface SupplierInput {
  id?: string;
  name?: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  leadTimeDays?: number | string;
  paymentTermsDays?: number | string;
  [key: string]: any;
}

export async function awardRfq(id: string, quoteIds: any, userId?: string): Promise<any> { return []; }
export async function cancelRfq(id: string): Promise<void> {}
export async function submitPurchaseOrder(id: string, userId?: string): Promise<any> { return { id: "po-1", number: "PO-001", status: "submitted" }; }
export async function markPurchaseOrderSent(id: string, via?: string): Promise<void> {}
export async function cancelPurchaseOrder(id: string): Promise<void> {}

const supplierName = (c: any) => c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ");

export async function listSuppliers(
  search?: string,
) {
  const contacts = await listContacts();
  const filtered = (contacts || []).filter((c: any) => {
    if (c.contactType !== "vendor") return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.companyName || "").toLowerCase().includes(s) || (c.firstName || "").toLowerCase().includes(s) || (c.email || "").toLowerCase().includes(s);
  });
  return filtered.map((c: any) => ({
    id: c.id,
    name: supplierName(c),
    contact_name: [c.firstName, c.lastName].filter(Boolean).join(" "),
    email: c.email ?? "",
    phone: c.phone ?? "",
    vat_number: c.vatNumber ?? "",
    lead_time_days: c.supplierLeadTimeDays,
    payment_terms_days: c.supplierPaymentTermsDays,
    open_orders: 0,
  }));
}

export async function saveSupplier(input: any) {
  if (input.id) {
    return updateContact(input.id, input);
  }
  return createContact({
    ...input,
    contactType: "vendor",
  });
}

export async function saveRequisition(input: any, userId: string): Promise<{ id: string; number: string; [key: string]: any }> {
  throw new Error("saveRequisition must be implemented as a single API call in Go backend");
}

export async function submitRequisition(id: string, userId: string): Promise<{ status: string; [key: string]: any }> {
  throw new Error("submitRequisition must be implemented as a single API call in Go backend");
}

export async function cancelRequisition(id: string): Promise<any> {
  throw new Error("cancelRequisition is not implemented in API");
}

export async function listRequisitions(
  filter: { status?: string; requestedById?: string } = {},
): Promise<any[]> {
  return [];
}

export async function getRequisition(id: string): Promise<any> {
  return null;
}

export async function createRfq(input: any, userId: string): Promise<{ id: string; number: string; [key: string]: any }> {
  throw new Error("createRfq must be implemented as a single API call in Go backend");
}

export async function listRfqs(): Promise<any[]> {
  return [];
}

export async function getRfq(id: string): Promise<any> {
  return null;
}

export async function saveRfqQuotes(rfqId: string, supplierId: string, quotes: any[]): Promise<any> {
  throw new Error("saveRfqQuotes must be implemented as a single API call in Go backend");
}

export async function listPurchaseOrders(
  filter: { status?: string; supplierId?: string; search?: string; page?: number; pageSize?: number; [key: string]: any } = {},
): Promise<{ rows: PurchaseOrderRecord[]; total: number }> {
  return { rows: [], total: 0 };
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrderRecord | null> {
  return null;
}

export async function savePurchaseOrder(input: any, userId: string): Promise<{ id: string; number: string; [key: string]: any }> {
  throw new Error("savePurchaseOrder must be implemented as a single API call in Go backend");
}

export async function issuePurchaseOrder(id: string, actorId: string): Promise<{ status: string; [key: string]: any }> {
  throw new Error("issuePurchaseOrder must be implemented as a single API call in Go backend");
}

export async function recordPurchaseReceipt(
  id: string,
  receipts: any[],
  userId: string,
): Promise<any> {
  throw new Error("recordPurchaseReceipt must be implemented as a single API call in Go backend");
}

export async function listPurchaseReceipts(id: string): Promise<any[]> {
  return [];
}

export async function listPurchaseBills(id: string): Promise<any[]> {
  return [];
}

export async function recordPurchaseBill(
  id: string,
  bill: any,
  userId: string,
): Promise<any> {
  throw new Error("recordPurchaseBill must be implemented as a single API call in Go backend");
}

export async function getPurchaseOrder_details(id: string): Promise<any> {
  return null;
}

export async function procurementProductOptions() {
  const products = await listProducts();
  return (products || []).map((p) => ({
    id: p.id,
    sku: p.sku,
    name_en: p.nameEn,
    name_ar: p.nameAr,
    cost: Number(p.costPrice),
    variants: [],
  }));
}