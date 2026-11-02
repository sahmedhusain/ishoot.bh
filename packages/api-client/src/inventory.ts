import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";

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
  reason?: string | null;
  note?: string | null;
  createdAt: string;
};

export type StockCount = {
  id: string;
  countNumber: string;
  warehouseId: string;
  status: string;
  notes?: string | null;
  countedById?: string | null;
  approvedById?: string | null;
  countedAt?: string | null;
  approvedAt?: string | null;
  createdAt: string;
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
  const auth = token ?? (await serviceToken("inventory"));
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

export async function listWarehouses(token?: string): Promise<Warehouse[]> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/warehouses`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function getWarehouse(id: string, token?: string): Promise<Warehouse> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/warehouses/${id}`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createWarehouse(input: Partial<Warehouse>, token?: string): Promise<Warehouse> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/warehouses`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listLocations(warehouseId: string, token?: string): Promise<StockLocation[]> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/warehouses/${warehouseId}/locations`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createLocation(warehouseId: string, input: Partial<StockLocation>, token?: string): Promise<StockLocation> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/warehouses/${warehouseId}/locations`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listCategories(token?: string): Promise<ProductCategory[]> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/categories`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createCategory(input: Partial<ProductCategory>, token?: string): Promise<ProductCategory> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/categories`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listProducts(token?: string): Promise<Product[]> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/products`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function getProduct(id: string, token?: string): Promise<Product> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/products/${id}`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createProduct(input: Partial<Product>, token?: string): Promise<Product> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/products`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function updateProduct(id: string, input: Partial<Product>, token?: string): Promise<Product> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/products/${id}`, {
    method: "PUT",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listVariants(productId: string, token?: string): Promise<ProductVariant[]> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/products/${productId}/variants`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createVariant(productId: string, input: Partial<ProductVariant>, token?: string): Promise<ProductVariant> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/products/${productId}/variants`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listStockLevels(productId: string, token?: string): Promise<StockLevel[]> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/stock/levels?productId=${encodeURIComponent(productId)}`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function adjustStock(
  input: {
    movement: Partial<StockMovement>;
    level: Partial<StockLevel>;
  },
  token?: string,
): Promise<StockMovement> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/stock/adjust`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listStockCounts(token?: string): Promise<StockCount[]> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/counts`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createStockCount(input: Partial<StockCount>, token?: string): Promise<StockCount> {
  const res = await fetch(`${apiUrl("inventory")}/v1/inventory/counts`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}
