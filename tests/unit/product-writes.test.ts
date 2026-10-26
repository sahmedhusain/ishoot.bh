import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ find: vi.fn(), transaction: vi.fn(), create: vi.fn(), removeVariants: vi.fn() }));
vi.mock("../../packages/database/src/db", () => ({ db: {
  product: { findFirst: mocks.find }, productVariant: { findFirst: mocks.find },
  $transaction: mocks.transaction,
} }));
import { saveProduct, type ProductInput } from "../../packages/database/src/queries/products";
import { serverMessages } from "../../packages/locales/src";
const input: ProductInput = { sku: "TEST-1", barcode: "", nameEn: "Product", nameAr: "منتج", descriptionEn: "", descriptionAr: "", brand: "", unit: "piece", cost: "0", price: "1", vatExempt: false, imageUrls: [], options: [], variants: [], trackStock: true, isActive: true };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.find.mockResolvedValue(null);
  mocks.create.mockImplementation(async ({ data }) => ({ ...data, id: "product" }));
  mocks.transaction.mockImplementation(async task => task({ product: { create: mocks.create }, productVariant: { deleteMany: mocks.removeVariants } }));
});
test.each(["http://example.test/a.png", "javascript:alert(1)", "https://user:pass@example.test/a.png", "https://example.test/a b.png", "/api/files/../secret", "/api/files/products/a/b", "https:\\example.test/a.png", ""]) ("refuses an invalid image before writing: %s", async url => {
  await expect(saveProduct({ ...input, imageUrls: [url] }, null)).rejects.toThrow(serverMessages.productImagesInvalid);
  expect(mocks.transaction).not.toHaveBeenCalled();
});
test("refuses overflow and incomplete options before any write", async () => {
  await expect(saveProduct({ ...input, imageUrls: Array(13).fill("https://example.test/a.png") }, null)).rejects.toThrow(serverMessages.productImagesInvalid);
  await expect(saveProduct({ ...input, options: [{ nameEn: "Size", values: [] }] }, null)).rejects.toThrow(serverMessages.productOptionsInvalid);
  expect(mocks.transaction).not.toHaveBeenCalled();
});
test("keeps every valid image, trims it, and preserves zero cost at persistence", async () => {
  const urls = [" https://example.test/a.png ", "/api/files/products/photo.png"];
  await saveProduct({ ...input, imageUrls: urls }, null);
  expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ imageUrls: urls.map(url => url.trim()), cost: 0, options: [] }) });
});
