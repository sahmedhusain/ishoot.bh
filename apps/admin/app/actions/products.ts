"use server";
import { revalidatePath } from "next/cache";
import {
  createActivityLog,
  deleteProduct,
  deleteProductCategory,
  getProduct,
  measureOperation,
  requireFeatureEnabled,
  runAtomicMutation,
  saveProduct,
  saveProductCategory,
  setProductOnWebsite,
  setProductsActive,
  type ProductCategoryInput,
  type ProductInput,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

function revalidateProducts(id?: string) {
  revalidatePath(ROUTES.products.list);
  revalidatePath(ROUTES.products.categories);
  if (id) revalidatePath(ROUTES.products.detail(id));
}

/** Creates or updates a product with its variants (Products → product). */
export async function saveProductAction(input: ProductInput) {
  return measureOperation("action:saveProductAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("products", input.id ? "edit" : "create");
    validateActionArguments("saveProductAction", { input });
    const product = await saveProduct(input, user.id);
    await createActivityLog({ user_id: user.id, action: input.id ? "update" : "create", entity_type: "product", entity_id: product.id, details: { sku: product.sku } });
    revalidateProducts(product.id);
    if (product.catalogueItemId) revalidatePath(ROUTES.cms.portfolio);
    return { success: true, id: product.id };
  });
}

export async function deleteProductAction(id: string) {
  return measureOperation("action:deleteProductAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("products", "delete");
    validateActionArguments("deleteProductAction", { id });
    const product = await getProduct(id);
    await runAtomicMutation(async () => {
      await deleteProduct(id);
      await createActivityLog({ user_id: user.id, action: "delete", entity_type: "product", entity_id: id, details: { sku: product?.sku ?? null } });
    });
    revalidateProducts();
    return { success: true };
  });
}

/** Switches several products on or off for sale at once (the list's bulk action). */
export async function setProductsActiveAction(ids: string[], isActive: boolean) {
  return measureOperation("action:setProductsActiveAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("products", "edit");
    validateActionArguments("setProductsActiveAction", { ids, isActive });
    const count = await setProductsActive(ids, isActive);
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "product", entity_id: "bulk", details: { count, isActive } });
    revalidateProducts();
    return { success: true, count };
  });
}

/** Shows the product in the website catalogue, or takes it off; the website changes when it is published. */
export async function setProductOnWebsiteAction(id: string, onWebsite: boolean) {
  return measureOperation("action:setProductOnWebsiteAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("products", "edit");
    await requirePermission("portfolio", onWebsite ? "create" : "delete");
    validateActionArguments("setProductOnWebsiteAction", { id, onWebsite });
    const itemId = await setProductOnWebsite(id, onWebsite);
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "product", entity_id: id, details: { onWebsite, catalogueItemId: itemId } });
    revalidateProducts(id);
    revalidatePath(ROUTES.cms.portfolio);
    return { success: true, catalogueItemId: itemId };
  });
}

export async function saveProductCategoryAction(input: ProductCategoryInput) {
  return measureOperation("action:saveProductCategoryAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("products", input.id ? "edit" : "create");
    validateActionArguments("saveProductCategoryAction", { input });
    const category = await saveProductCategory(input);
    await createActivityLog({ user_id: user.id, action: input.id ? "update" : "create", entity_type: "product_category", entity_id: category.id, details: {} });
    revalidateProducts();
    return { success: true, id: category.id };
  });
}

export async function deleteProductCategoryAction(id: string) {
  return measureOperation("action:deleteProductCategoryAction", async () => {
    await requireFeatureEnabled("products");
    const user = await requirePermission("products", "delete");
    validateActionArguments("deleteProductCategoryAction", { id });
    await deleteProductCategory(id);
    await createActivityLog({ user_id: user.id, action: "delete", entity_type: "product_category", entity_id: id, details: {} });
    revalidateProducts();
    return { success: true };
  });
}
