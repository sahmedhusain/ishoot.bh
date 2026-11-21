import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import { normalizeApiRecord } from "./normalize";
import { serviceFetch } from "./service-fetch";

export type Warehouse = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  address?: string | null;
  isActive: boolean;
  isDefault: boolean;
  branchId?: string | null;
  sortOrder: number;
};

export type StockLocation = {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type ProductCategory = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type Product = {
  id: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  categoryId?: string | null;
  costPrice: string;
  sellingPrice: string;
  currency: string;
  taxRate: string;
  barcode?: string | null;
  isActive: boolean;
  trackInventory: boolean;
  reorderPoint: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductVariant = {
  id: string;
  productId: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  barcode?: string | null;
  costPrice: string;
  sellingPrice: string;
  isActive: boolean;
  attributes: Record<string, unknown>;
};

export type StockLevel = {
  id: string;
  productId: string;
  variantId?: string | null;
  locationId: string;
  quantityOnHand: string;
  quantityReserved: string;
  quantityAvailable: string;
  reorderPoint: string;
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  movementType: string;
  productId: string;
  variantId?: string | null;
  locationId: string;
  quantity: string;
  unitCost: string;
  sourceType: string;
  sourceId?: string | null;
  transferId?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  reason?: string | null;
  note?: string | null;
  createdAt: string;
};

export type StockCount = {
  id: string;
  countNumber: string;
  number?: string;
  scope?: string;
  warehouseId: string;
  status: string;
  notes?: string | null;
  countedById?: string | null;
  approvedById?: string | null;
  countedAt?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  [key: string]: any;
};

export type StockCountLine = {
  id: string;
  countId: string;
  productId: string;
  variantId?: string | null;
  systemQuantity: string;
  countedQuantity: string;
  variance: string;
  notes?: string | null;
};

async function headers(token?: string): Promise<Record<string, string>> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const auth = token ?? (await serviceToken());
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

async function invFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const h = await headers(token);
  const res = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers: { ...h, ...(options.headers as any) },
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  if (res.status === 204) return undefined as unknown as T;
  const data = await res.json();
  return normalizeApiRecord(data) as T;
}

export async function listWarehouses(token?: string): Promise<Warehouse[]> {
  return invFetch<Warehouse[]>("/v1/inventory/warehouses", {}, token);
}

export async function getWarehouse(id: string, token?: string): Promise<Warehouse> {
  return invFetch<Warehouse>(`/v1/inventory/warehouses/${encodeURIComponent(id)}`, {}, token);
}

export async function createWarehouse(input: Partial<Warehouse>, token?: string): Promise<Warehouse> {
  return invFetch<Warehouse>("/v1/inventory/warehouses", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function listLocations(warehouseId: string, token?: string): Promise<StockLocation[]> {
  return invFetch<StockLocation[]>(`/v1/inventory/warehouses/${encodeURIComponent(warehouseId)}/locations`, {}, token);
}

export async function createLocation(warehouseId: string, input: Partial<StockLocation>, token?: string): Promise<StockLocation> {
  return invFetch<StockLocation>(`/v1/inventory/warehouses/${encodeURIComponent(warehouseId)}/locations`, {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function listCategories(token?: string): Promise<ProductCategory[]> {
  return invFetch<ProductCategory[]>("/v1/inventory/categories", {}, token);
}

export async function createCategory(input: Partial<ProductCategory>, token?: string): Promise<ProductCategory> {
  return invFetch<ProductCategory>("/v1/inventory/categories", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function listProducts(token?: string): Promise<Product[]> {
  return invFetch<Product[]>("/v1/inventory/products", {}, token);
}

export async function getProduct(id: string, token?: string): Promise<Product> {
  return invFetch<Product>(`/v1/inventory/products/${encodeURIComponent(id)}`, {}, token);
}

export async function createProduct(input: Partial<Product>, token?: string): Promise<Product> {
  return invFetch<Product>("/v1/inventory/products", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function updateProduct(id: string, input: Partial<Product>, token?: string): Promise<Product> {
  return invFetch<Product>(`/v1/inventory/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);
}

export async function listVariants(productId: string, token?: string): Promise<ProductVariant[]> {
  return invFetch<ProductVariant[]>(`/v1/inventory/products/${encodeURIComponent(productId)}/variants`, {}, token);
}

export async function createVariant(productId: string, input: Partial<ProductVariant>, token?: string): Promise<ProductVariant> {
  return invFetch<ProductVariant>(`/v1/inventory/products/${encodeURIComponent(productId)}/variants`, {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function listStockLevels(productId: string, token?: string): Promise<StockLevel[]> {
  return invFetch<StockLevel[]>(`/v1/inventory/stock/levels?productId=${encodeURIComponent(productId)}`, {}, token);
}

export async function adjustStock(
  input: {
    movement: Partial<StockMovement>;
    level: Partial<StockLevel>;
  },
  token?: string,
): Promise<StockMovement> {
  return invFetch<StockMovement>("/v1/inventory/stock/adjust", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function listStockCounts(token?: string): Promise<StockCount[]> {
  return invFetch<StockCount[]>("/v1/inventory/counts", {}, token);
}

export async function createStockCount(input: Partial<StockCount>, token?: string): Promise<StockCount> {
  return invFetch<StockCount>("/v1/inventory/counts", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export type PurchaseOrderLine = {
  id: string;
  purchaseOrderId: string;
  productId: string;
  variantKey?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  billedQuantity: number;
  sortOrder: number;
};

export type PurchaseOrder = {
  id: string;
  number: string;
  supplierId?: string | null;
  supplierName?: string | null;
  documentId?: string | null;
  status: string;
  orderDate?: string | null;
  expectedDate?: string | null;
  warehouseId?: string | null;
  warehouseName?: string;
  note?: string | null;
  terms?: string | null;
  subtotal: number;
  vatAmount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  lines?: PurchaseOrderLine[];
};

export type GoodsReceipt = {
  id: string;
  number: string;
  purchaseOrderId: string;
  locationId?: string | null;
  receivedById?: string | null;
  receivedAt: string;
  note?: string | null;
};

export async function listPurchaseOrders(
  filters?: { status?: string; supplierId?: string; warehouseId?: string },
  token?: string,
): Promise<PurchaseOrder[]> {
  const qs = new URLSearchParams();
  if (filters?.status) qs.set("status", filters.status);
  if (filters?.supplierId) qs.set("supplierId", filters.supplierId);
  if (filters?.warehouseId) qs.set("warehouseId", filters.warehouseId);
  const s = qs.toString();
  return invFetch<PurchaseOrder[]>(`/v1/inventory/purchase-orders${s ? `?${s}` : ""}`, {}, token);
}

export async function getPurchaseOrder(id: string, token?: string): Promise<PurchaseOrder> {
  return invFetch<PurchaseOrder>(`/v1/inventory/purchase-orders/${encodeURIComponent(id)}`, {}, token);
}

export async function createPurchaseOrder(input: Partial<PurchaseOrder>, token?: string): Promise<PurchaseOrder> {
  return invFetch<PurchaseOrder>("/v1/inventory/purchase-orders", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function receivePurchaseOrder(
  id: string,
  input: {
    locationId?: string;
    receivedById?: string;
    note?: string;
    lines: Array<{
      orderLineId?: string;
      productId?: string;
      quantity: number;
      rejectedQuantity?: number;
      rejectReason?: string;
      batchNumber?: string;
    }>;
  },
  token?: string,
): Promise<GoodsReceipt> {
  return invFetch<GoodsReceipt>(`/v1/inventory/purchase-orders/${encodeURIComponent(id)}/receive`, {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export type PurchaseRequisition = {
  id: string;
  number: string;
  requestedById?: string | null;
  departmentId?: string | null;
  status: string;
  neededBy?: string | null;
  note?: string | null;
  decisionNote?: string | null;
  estimatedTotal?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function listPurchaseRequisitions(token?: string): Promise<PurchaseRequisition[]> {
  const res = await invFetch<{ items: PurchaseRequisition[] }>("/v1/inventory/requisitions", {}, token);
  return res?.items ?? [];
}

export async function getPurchaseRequisition(id: string, token?: string): Promise<PurchaseRequisition> {
  return invFetch<PurchaseRequisition>(`/v1/inventory/requisitions/${encodeURIComponent(id)}`, {}, token);
}

export async function createPurchaseRequisition(input: Partial<PurchaseRequisition>, token?: string): Promise<PurchaseRequisition> {
  return invFetch<PurchaseRequisition>("/v1/inventory/requisitions", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function updatePurchaseRequisition(id: string, input: Partial<PurchaseRequisition>, token?: string): Promise<PurchaseRequisition> {
  return invFetch<PurchaseRequisition>(`/v1/inventory/requisitions/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);
}

export async function deletePurchaseRequisition(id: string, token?: string): Promise<void> {
  await invFetch<void>(`/v1/inventory/requisitions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }, token);
}

export async function updateWarehouseApi(id: string, input: Partial<Warehouse>, token?: string): Promise<void> {
  await invFetch<void>(`/v1/inventory/warehouses/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);
}

export async function updateLocationApi(id: string, input: Partial<StockLocation>, token?: string): Promise<void> {
  await invFetch<void>(`/v1/inventory/locations/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);
}

export async function deleteCategoryApi(id: string, token?: string): Promise<void> {
  await invFetch<void>(`/v1/inventory/categories/${encodeURIComponent(id)}`, { method: "DELETE" }, token);
}

export async function setReorderPointApi(
  input: { productId: string; variantId?: string | null; locationId?: string | null; reorderPoint: number | null; reorderQuantity: number | null },
  token?: string,
): Promise<void> {
  await invFetch<void>("/v1/inventory/stock/reorder-point", { method: "PUT", body: JSON.stringify(input) }, token);
}

export async function getStockCountApi(id: string, token?: string): Promise<StockCount> {
  return invFetch<StockCount>(`/v1/inventory/counts/${encodeURIComponent(id)}`, {}, token);
}

export async function listStockCountLinesApi(countId: string, token?: string): Promise<any[]> {
  return invFetch<any[]>(`/v1/inventory/counts/${encodeURIComponent(countId)}/lines`, {}, token);
}

export async function addCountLineApi(
  countId: string,
  input: { productId: string; variantId?: string; locationId: string },
  token?: string,
): Promise<any> {
  return invFetch<any>(`/v1/inventory/counts/${encodeURIComponent(countId)}/lines`, { method: "POST", body: JSON.stringify(input) }, token);
}

export async function recordCountedQuantitiesApi(
  countId: string,
  entries: Array<{ lineId: string; counted: number; note?: string }>,
  token?: string,
): Promise<void> {
  await invFetch<void>(`/v1/inventory/counts/${encodeURIComponent(countId)}/lines`, { method: "PUT", body: JSON.stringify({ entries }) }, token);
}

export async function setStockCountStatusApi(countId: string, status: string, token?: string): Promise<void> {
  await invFetch<void>(`/v1/inventory/counts/${encodeURIComponent(countId)}/status`, { method: "PUT", body: JSON.stringify({ status }) }, token);
}

export async function approveStockCountApi(countId: string, approvedById?: string | null, token?: string): Promise<{ adjusted: number; low: any[] }> {
  return invFetch<{ adjusted: number; low: any[] }>(`/v1/inventory/counts/${encodeURIComponent(countId)}/approve`, {
    method: "POST",
    body: JSON.stringify({ approvedById: approvedById ?? "" }),
  }, token);
}

export async function listMovementsApi(token?: string): Promise<any[]> {
  return invFetch<any[]>("/v1/inventory/stock/movements", {}, token);
}

export async function listExpiringBatchesApi(days = 30, token?: string): Promise<any[]> {
  return invFetch<any[]>(`/v1/inventory/batches/expiring?days=${encodeURIComponent(String(days))}`, {}, token);
}

export async function listStockSerialsApi(token?: string): Promise<any[]> {
  return invFetch<any[]>("/v1/inventory/serials", {}, token);
}

export async function listStockPackagesApi(token?: string): Promise<any[]> {
  return invFetch<any[]>("/v1/inventory/packages", {}, token);
}

export async function listStockTraceEventsApi(token?: string): Promise<any[]> {
  return invFetch<any[]>("/v1/inventory/trace-events", {}, token);
}

export async function listLabelPrintJobsApi(token?: string): Promise<any[]> {
  return serviceFetch<any[]>("/v1/system/tables/label_print_job", {}, token);
}

export async function listStockTransfersApi(token?: string): Promise<any[]> {
  return serviceFetch<any[]>("/v1/inventory/tables/stock_allocation", {}, token);
}
