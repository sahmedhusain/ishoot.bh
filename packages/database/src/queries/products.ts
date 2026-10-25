import { randomUUID } from "node:crypto";
import { serverMessages } from "@platform/locales";
import { db } from "../db";
import {
  MAX_VARIANTS,
  SKU_PATTERN,
  isProductUnit,
  normalizeProductOptions,
  variantCombinations,
  type ProductOption,
} from "../constants/products";

/** A product as the admin lists it. */
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
  /** Null when the product's price (or cost) applies. */
  price: number | null;
  cost: number | null;
  is_active: boolean;
}

/** A product with everything its editor shows. */
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

const num = (value: { toString(): string } | null | undefined) => (value == null ? null : Number(value.toString()));

type ProductWithRelations = Awaited<ReturnType<typeof findProduct>>;
function findProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: { category: true, variants: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }, catalogueItem: { select: { slug: true } } },
  });
}

const toRow = (p: NonNullable<ProductWithRelations> | (Omit<NonNullable<ProductWithRelations>, "variants" | "catalogueItem"> & { _count: { variants: number } })): ProductRow => ({
  id: p.id,
  sku: p.sku,
  barcode: p.barcode,
  name_en: p.nameEn,
  name_ar: p.nameAr,
  category_id: p.categoryId,
  category_en: p.category?.nameEn ?? null,
  category_ar: p.category?.nameAr ?? null,
  brand: p.brand,
  unit: p.unit,
  cost: num(p.cost) ?? 0,
  price: num(p.price) ?? 0,
  image_url: p.imageUrls[0] ?? null,
  track_stock: p.trackStock,
  is_active: p.isActive,
  variant_count: "_count" in p ? p._count.variants : p.variants.length,
  on_website: !!p.catalogueItemId,
});

export interface ProductListQuery {
  search?: string;
  categoryId?: string;
  /** "active" | "inactive" | "" (all) */
  status?: string;
  page?: number;
  pageSize?: number;
}

/** A page of products: newest first, searchable by name, SKU, barcode or brand (variant SKUs and barcodes too). */
export async function listProducts(query: ProductListQuery = {}) {
  const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 100);
  const page = Math.max(query.page ?? 1, 1);
  const search = query.search?.trim().slice(0, 80);
  const where = {
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.status === "active" ? { isActive: true } : query.status === "inactive" ? { isActive: false } : {}),
    ...(search
      ? {
          OR: [
            { nameEn: { contains: search, mode: "insensitive" as const } },
            { nameAr: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
            { barcode: search },
            { brand: { contains: search, mode: "insensitive" as const } },
            { variants: { some: { OR: [{ sku: { contains: search, mode: "insensitive" as const } }, { barcode: search }] } } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.product.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize, include: { category: true, _count: { select: { variants: true } } } }),
    db.product.count({ where }),
  ]);
  return { rows: rows.map(toRow), total, page, pageSize };
}

export async function getProduct(id: string): Promise<ProductRecord | null> {
  const p = await findProduct(id);
  if (!p) return null;
  return {
    ...toRow(p),
    description_en: p.descriptionEn ?? "",
    description_ar: p.descriptionAr ?? "",
    vat_exempt: p.vatExempt,
    track_batches: p.trackBatches,
    image_urls: p.imageUrls,
    options: normalizeProductOptions(p.options) ?? [],
    variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, barcode: v.barcode, option_values: v.optionValues, price: num(v.price), cost: num(v.cost), is_active: v.isActive })),
    catalogue_item_id: p.catalogueItemId,
    catalogue_slug: p.catalogueItem?.slug ?? null,
  };
}

export interface ProductVariantInput {
  id?: string;
  sku: string;
  barcode: string;
  optionValues: string[];
  /** Empty for the product's price (or cost). */
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
  /** Empty or missing for no category. */
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

/** A money amount typed in a form: empty is null, anything else must be a number from 0 to 99,999,999. */
function amount(value: string, optional: true): number | null;
function amount(value: string, optional?: false): number;
function amount(value: string, optional = false) {
  const text = String(value ?? "").trim();
  if (!text && optional) return null;
  const parsed = Number(text || "0");
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99_999_999) throw new Error(serverMessages.productAmountInvalid);
  return Math.round(parsed * 1000) / 1000;
}

const SAFE_IMAGE = /^(\/api\/files\/|https:\/\/)/;

/**
 * Creates or updates a product with its variants. SKUs and barcodes are unique across products and variants;
 * a variant exists for each combination of the options (combinations no longer possible are removed).
 * A product on the website keeps its catalogue item's price in step.
 */
export async function saveProduct(input: ProductInput, userId: string | null) {
  const sku = input.sku.trim();
  const barcode = input.barcode.trim() || null;
  const nameEn = input.nameEn.trim().slice(0, 200);
  const nameAr = input.nameAr.trim().slice(0, 200);
  if (!SKU_PATTERN.test(sku)) throw new Error(serverMessages.productSkuInvalid);
  if (!nameEn || !nameAr) throw new Error(serverMessages.productNameRequired);
  if (!isProductUnit(input.unit)) throw new Error(serverMessages.productUnitInvalid);
  if (barcode && !/^[A-Za-z0-9-]{4,40}$/.test(barcode)) throw new Error(serverMessages.productBarcodeInvalid);
  const options = normalizeProductOptions(input.options);
  if (!options) throw new Error(serverMessages.productOptionsTooMany);
  const imageUrls = input.imageUrls.map((url) => url.trim()).filter((url) => url && SAFE_IMAGE.test(url)).slice(0, 12);
  const price = amount(input.price);
  const cost = amount(input.cost);

  // Variants: one per combination; what the form sent is kept for the combinations that still exist.
  const combos = variantCombinations(options);
  if (combos.length > MAX_VARIANTS) throw new Error(serverMessages.productOptionsTooMany);
  const sent = new Map(input.variants.map((v) => [v.optionValues.join("\u0000"), v]));
  const variants = combos.map((values, index) => {
    const given = sent.get(values.join("\u0000"));
    const variantSku = (given?.sku ?? "").trim();
    if (!SKU_PATTERN.test(variantSku)) throw new Error(serverMessages.productSkuInvalid);
    const variantBarcode = given?.barcode.trim() || null;
    if (variantBarcode && !/^[A-Za-z0-9-]{4,40}$/.test(variantBarcode)) throw new Error(serverMessages.productBarcodeInvalid);
    return { id: given?.id, sku: variantSku, barcode: variantBarcode, optionValues: values, price: amount(given?.price ?? "", true), cost: amount(given?.cost ?? "", true), isActive: given?.isActive ?? true, sortOrder: index };
  });

  // One code per thing: no SKU or barcode used twice here, or by another product or variant.
  const skus = [sku, ...variants.map((v) => v.sku)].map((s) => s.toLowerCase());
  const barcodes = [barcode, ...variants.map((v) => v.barcode)].filter((b): b is string => !!b);
  if (new Set(skus).size !== skus.length || new Set(barcodes).size !== barcodes.length) throw new Error(serverMessages.productCodeTaken);
  const ownVariantIds = input.id ? (await db.productVariant.findMany({ where: { productId: input.id }, select: { id: true } })).map((v) => v.id) : [];
  const clash = await Promise.all([
    db.product.findFirst({ where: { id: { not: input.id ?? "" }, OR: [{ sku: { in: [sku, ...variants.map((v) => v.sku)], mode: "insensitive" } }, ...(barcodes.length ? [{ barcode: { in: barcodes } }] : [])] }, select: { id: true } }),
    db.productVariant.findFirst({ where: { id: { notIn: ownVariantIds }, OR: [{ sku: { in: [sku, ...variants.map((v) => v.sku)], mode: "insensitive" } }, ...(barcodes.length ? [{ barcode: { in: barcodes } }] : [])] }, select: { id: true } }),
  ]);
  if (clash.some(Boolean)) throw new Error(serverMessages.productCodeTaken);
  if (input.categoryId && !(await db.productCategory.findUnique({ where: { id: input.categoryId }, select: { id: true } }))) throw new Error(serverMessages.productCategoryMissing);

  const data = {
    sku,
    barcode,
    nameEn,
    nameAr,
    descriptionEn: input.descriptionEn.trim().slice(0, 5000) || null,
    descriptionAr: input.descriptionAr.trim().slice(0, 5000) || null,
    categoryId: input.categoryId || null,
    brand: input.brand.trim().slice(0, 80) || null,
    unit: input.unit,
    cost,
    price,
    vatExempt: input.vatExempt,
    imageUrls,
    options: JSON.parse(JSON.stringify(options)),
    trackStock: input.trackStock,
    trackBatches: input.trackStock && !!input.trackBatches,
    isActive: input.isActive,
  };
  return db.$transaction(async (tx) => {
    const product = input.id ? await tx.product.update({ where: { id: input.id }, data }) : await tx.product.create({ data: { ...data, createdById: userId } });
    const keep = variants.filter((v) => v.id && ownVariantIds.includes(v.id)).map((v) => v.id!);
    // A variant with stock history stays (it can be taken off sale instead).
    const removed = ownVariantIds.filter((id) => !keep.includes(id));
    if (removed.length && (await tx.stockMovement.findFirst({ where: { productId: product.id, variantKey: { in: removed } }, select: { id: true } }))) throw new Error(serverMessages.productHasStock);
    await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: keep } } });
    for (const v of variants) {
      const values = { sku: v.sku, barcode: v.barcode, optionValues: v.optionValues, price: v.price, cost: v.cost, isActive: v.isActive, sortOrder: v.sortOrder };
      if (v.id && keep.includes(v.id)) await tx.productVariant.update({ where: { id: v.id }, data: values });
      else await tx.productVariant.create({ data: { ...values, productId: product.id } });
    }
    if (product.catalogueItemId) await tx.portfolioItem.update({ where: { id: product.catalogueItemId }, data: { price } });
    return product;
  });
}

/** Deletes a product and its variants; a website catalogue item showing it stays, without the link. */
export async function deleteProduct(id: string) {
  // Stock history keeps the product: it is taken off sale instead.
  if (await db.stockMovement.findFirst({ where: { productId: id }, select: { id: true } })) throw new Error(serverMessages.productHasStock);
  await db.$transaction([db.stockItem.deleteMany({ where: { productId: id } }), db.stockBatch.deleteMany({ where: { productId: id } }), db.stockLevel.deleteMany({ where: { productId: id } }), db.product.deleteMany({ where: { id } })]);
}

export async function setProductsActive(ids: string[], isActive: boolean) {
  const result = await db.product.updateMany({ where: { id: { in: ids.slice(0, 200) } }, data: { isActive } });
  return result.count;
}

/** Shows the product in the website catalogue (a new catalogue item in step with it), or takes it off. */
export async function setProductOnWebsite(id: string, onWebsite: boolean) {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw new Error(serverMessages.productMissing);
  if (!onWebsite) {
    if (product.catalogueItemId) {
      const itemId = product.catalogueItemId;
      await db.$transaction([db.product.update({ where: { id }, data: { catalogueItemId: null } }), db.portfolioItem.delete({ where: { id: itemId } })]);
    }
    return null;
  }
  if (product.catalogueItemId) return product.catalogueItemId;
  if (!product.imageUrls[0]) throw new Error(serverMessages.productImageRequired);
  const base = product.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
  const slug = (await db.portfolioItem.findUnique({ where: { slug: base }, select: { id: true } })) ? `${base}-${randomUUID().slice(0, 6)}` : base;
  return db.$transaction(async (tx) => {
    const count = await tx.portfolioItem.count();
    const item = await tx.portfolioItem.create({
      data: {
        slug,
        titleEn: product.nameEn,
        titleAr: product.nameAr,
        subtitleEn: product.brand,
        subtitleAr: product.brand,
        price: product.price,
        thumbnailUrl: product.imageUrls[0],
        galleryUrls: product.imageUrls.slice(1),
        descriptionEn: product.descriptionEn,
        descriptionAr: product.descriptionAr,
        aspectRatio: "1:1",
        displayOrder: count,
      },
    });
    await tx.product.update({ where: { id }, data: { catalogueItemId: item.id } });
    return item.id;
  });
}

export async function listProductCategories(): Promise<ProductCategoryRecord[]> {
  const rows = await db.productCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], include: { _count: { select: { products: true } } } });
  return rows.map((row) => ({ id: row.id, name_en: row.nameEn, name_ar: row.nameAr, parent_id: row.parentId, sort_order: row.sortOrder, is_active: row.isActive, product_count: row._count.products }));
}

export interface ProductCategoryInput {
  id?: string;
  nameEn: string;
  nameAr: string;
  /** Empty or missing for the top level. */
  parentId?: string;
  isActive: boolean;
}

export async function saveProductCategory(input: ProductCategoryInput) {
  const nameEn = input.nameEn.trim().slice(0, 120);
  const nameAr = input.nameAr.trim().slice(0, 120);
  if (!nameEn || !nameAr) throw new Error(serverMessages.productNameRequired);
  const parentId = input.parentId || null;
  if (parentId) {
    // A category cannot sit inside itself or one of its own subcategories.
    const all = await db.productCategory.findMany({ select: { id: true, parentId: true } });
    for (let at: string | null = parentId, steps = 0; at && steps <= all.length; steps++) {
      if (at === input.id) throw new Error(serverMessages.productCategoryLoop);
      at = all.find((c) => c.id === at)?.parentId ?? null;
    }
    if (!all.some((c) => c.id === parentId)) throw new Error(serverMessages.productCategoryMissing);
  }
  const data = { nameEn, nameAr, parentId, isActive: input.isActive };
  if (input.id) return db.productCategory.update({ where: { id: input.id }, data });
  const count = await db.productCategory.count();
  return db.productCategory.create({ data: { ...data, sortOrder: count } });
}

/** Removes a category; its products become uncategorised and its subcategories move up a level. */
export async function deleteProductCategory(id: string) {
  const category = await db.productCategory.findUnique({ where: { id }, select: { parentId: true } });
  if (!category) return;
  await db.$transaction([
    db.productCategory.updateMany({ where: { parentId: id }, data: { parentId: category.parentId } }),
    db.productCategory.delete({ where: { id } }),
  ]);
}
