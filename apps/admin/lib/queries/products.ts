import { serverMessages } from "@platform/locales";
import {
  listProducts as listProductsApi,
  getProduct as getProductApi,
  createProduct,
  updateProduct,
  listCategories,
  createCategory,
  listVariants as listVariantsApi,
} from "@platform/api-client";
import {
  MAX_VARIANTS,
  SKU_PATTERN,
  isProductUnit,
  normalizeProductOptions,
  parseProductOptions,
  variantCombinations,
  type ProductOption,
} from "../constants/products";

export interface ProductRow {
  id: string;
  sku: string;
  barcode: string | null;
  name_en: string;
  name_ar: string;
  category_id: string | null;
  category_en: string | null;
  category_ar: string | null;
  brand: string | null;
  unit: string;
  cost: number;
  price: number;
  image_url: string | null;
  track_stock: boolean;
  is_active: boolean;
  variant_count: number;
  on_website: boolean;
}

export interface ProductVariantRecord {
  id: string;
  sku: string;
  barcode: string | null;
  option_values: string[];
  price: number | null;
  cost: number | null;
  is_active: boolean;
}

export interface ProductRecord extends ProductRow {
  description_en: string;
  description_ar: string;
  vat_exempt: boolean;
  track_batches: boolean;
  image_urls: string[];
  options: ProductOption[];
  variants: ProductVariantRecord[];
  catalogue_item_id: string | null;
  catalogue_slug: string | null;
}

export interface ProductCategoryRecord {
  id: string;
  name_en: string;
  name_ar: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
}

const num = (value: any) => value == null ? null : Number(value.toString());

const toRow = (p: any): ProductRow => ({
  id: p.id,
  sku: p.sku,
  barcode: p.barcode ?? null,
  name_en: p.nameEn,
  name_ar: p.nameAr,
  category_id: p.categoryId ?? null,
  category_en: p.category?.nameEn ?? p.categoryEn ?? null,
  category_ar: p.category?.nameAr ?? p.categoryAr ?? null,
  brand: p.brand ?? null,
  unit: p.unit ?? "item",
  cost: num(p.cost ?? p.costPrice) ?? 0,
  price: num(p.price ?? p.sellingPrice) ?? 0,
  image_url: p.imageUrls?.[0] ?? null,
  track_stock: p.trackStock ?? p.trackInventory ?? true,
  is_active: p.isActive ?? true,
  variant_count: p.variants?.length ?? 0,
  on_website: !!p.catalogueItemId,
});

export interface ProductListQuery {
  search?: string;
  categoryId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listProducts(query: ProductListQuery = {}) {
  const [products, categories] = await Promise.all([
    listProductsApi(),
    listCategories().catch(() => []),
  ]);
  const catMap = new Map<string, any>((categories || []).map((c: any) => [c.id, c] as [string, any]));
  const filtered = (products || []).filter(p => {
    if (query.categoryId && p.categoryId !== query.categoryId) return false;
    if (query.status === "active" && !p.isActive) return false;
    if (query.status === "inactive" && p.isActive) return false;
    if (query.search) {
      const s = query.search.toLowerCase();
      return p.nameEn?.toLowerCase().includes(s) || p.nameAr?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s) || p.barcode?.toLowerCase().includes(s);
    }
    return true;
  });
  const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 100);
  const page = Math.max(query.page ?? 1, 1);
  const items = filtered.slice((page - 1) * pageSize, page * pageSize).map(p => {
    const cat = p.categoryId ? catMap.get(p.categoryId) : undefined;
    return toRow({ ...p, category: (p as any).category || cat });
  });
  return { rows: items, total: filtered.length, page, pageSize };
}

export async function getProduct(id: string): Promise<ProductRecord | null> {
  const p = await getProductApi(id);
  if (!p) return null;
  return {
    ...toRow(p),
    description_en: (p as any).descriptionEn ?? "",
    description_ar: (p as any).descriptionAr ?? "",
    vat_exempt: (p as any).vatExempt ?? false,
    track_batches: (p as any).trackBatches ?? false,
    image_urls: (p as any).imageUrls ?? [],
    options: normalizeProductOptions((p as any).options) ?? [],
    variants: (await listVariantsApi(id)).map((v) => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode ?? null,
      option_values: (v as any).attributes ? Object.values((v as any).attributes).map(String) : [],
      price: num((v as any).sellingPrice),
      cost: num((v as any).costPrice),
      is_active: v.isActive,
    })),
    catalogue_item_id: (p as any).catalogueItemId ?? null,
    catalogue_slug: null,
  };
}

export interface ProductVariantInput {
  id?: string;
  sku: string;
  barcode: string;
  optionValues: string[];
  price: string;
  cost: string;
  isActive: boolean;
}

export interface ProductInput {
  id?: string;
  sku: string;
  barcode: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  categoryId?: string;
  brand: string;
  unit: string;
  cost: string;
  price: string;
  vatExempt: boolean;
  imageUrls: string[];
  options: unknown;
  variants: ProductVariantInput[];
  trackStock: boolean;
  trackBatches?: boolean;
  isActive: boolean;
}

function validateProductImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes("\\") || trimmed.includes(" ")) return false;
  if (trimmed.startsWith("/api/files/")) {
    const parts = trimmed.split("/").slice(3);
    return parts.length === 2 && parts.every((p) => p && !p.includes(".."));
  }
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

export async function saveProduct(input: ProductInput, userId: string | null) {
  if (input.imageUrls.length > 12 || !input.imageUrls.every(validateProductImageUrl)) {
    throw new Error(serverMessages.productImagesInvalid);
  }
  const parsedOptions = parseProductOptions(input.options);
  if (parsedOptions === null) {
    throw new Error(serverMessages.productOptionsInvalid);
  }
  const cleanedInput = {
    ...input,
    imageUrls: input.imageUrls.map((u) => u.trim()),
    cost: Number(input.cost || 0) as any,
  };
  if (cleanedInput.id) {
    return updateProduct(cleanedInput.id, cleanedInput);
  }
  return createProduct(cleanedInput);
}

export async function deleteProduct(id: string) {
  throw new Error("deleteProduct is not implemented in API");
}

export async function setProductsActive(ids: string[], isActive: boolean) {
  throw new Error("setProductsActive is not implemented in API");
}

export async function setProductOnWebsite(id: string, onWebsite: boolean) {
  throw new Error("setProductOnWebsite is not implemented in API");
}

export async function listProductCategories(): Promise<
  ProductCategoryRecord[]
> {
  const categories = await listCategories();
  return (categories || []).map((row) => ({
    id: row.id,
    name_en: row.nameEn,
    name_ar: row.nameAr,
    parent_id: row.parentId ?? null,
    sort_order: row.sortOrder,
    is_active: row.isActive,
    product_count: 0,
  }));
}

export interface ProductCategoryInput {
  id?: string;
  nameEn: string;
  nameAr: string;
  parentId?: string;
  isActive: boolean;
}

export async function saveProductCategory(input: ProductCategoryInput) {
  return createCategory(input);
}

export async function deleteProductCategory(id: string) {
  throw new Error("deleteProductCategory is not implemented in API");
}