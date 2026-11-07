import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import { normalizeApiRecord } from "./normalize";

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
