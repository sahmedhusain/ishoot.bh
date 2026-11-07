/**
 * Normalizes Go microservice PascalCase responses to camelCase and aliases
 * common frontend/Prisma field names so that data renders seamlessly with no undefined values.
 */
export function normalizeApiRecord<T = any>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => normalizeApiRecord(item)) as unknown as T;
  }
  if (typeof data !== "object" || data instanceof Date) {
    return data;
  }

  const result: Record<string, any> = {};
  const entries = Object.entries(data);

  for (const [key, value] of entries) {
    const normalizedValue = normalizeApiRecord(value);

    // Compute camelCase key:
    let camelKey = key;
    if (key === "ID") {
      camelKey = "id";
    } else if (key === "CRNumber") {
      camelKey = "crNumber";
    } else if (key === "VATAmount") {
      camelKey = "vatAmount";
    } else if (key === "VATRate") {
      camelKey = "vatRate";
    } else {
      const replaced = key
        .replace(/ID$/, "Id")
        .replace(/URL$/, "Url")
        .replace(/UUID$/, "Uuid");
      camelKey = replaced
        .replace(/^([A-Z]+)([A-Z][a-z])/, (_, p1, p2) => p1.toLowerCase() + p2)
        .replace(/^([A-Z])/, (m) => m.toLowerCase());
    }

    result[camelKey] = normalizedValue;
    if (camelKey !== key) {
      result[key] = normalizedValue;
    }
  }

  // Common ID alias
  if (result.ID && !result.id) result.id = result.ID;
  if (result.id && !result.ID) result.ID = result.id;

  // Contact aliases:
  if (result.firstName && result.lastName && !result.fullName) {
    result.fullName = `${result.firstName} ${result.lastName}`.trim();
  }
  if (result.company && !result.companyName) {
    result.companyName = result.company;
  }
  if (result.companyName && !result.company) {
    result.company = result.companyName;
  }

  // Deal aliases:
  if (result.stage !== undefined && result.dealStage === undefined) {
    result.dealStage = result.stage;
  }
  if (result.dealStage !== undefined && result.stage === undefined) {
    result.stage = result.dealStage;
  }
  if (result.value !== undefined && result.dealValue === undefined) {
    result.dealValue = result.value;
  }
  if (result.dealValue !== undefined && result.value === undefined) {
    result.value = result.dealValue;
  }
  if (result.expectedCloseDate && !result.targetCloseDate) {
    result.targetCloseDate = result.expectedCloseDate;
  }
  if (result.targetCloseDate && !result.expectedCloseDate) {
    result.expectedCloseDate = result.targetCloseDate;
  }

  // Invoice / Payment / Quotation aliases:
  if (result.total !== undefined && result.totalAmount === undefined) {
    result.totalAmount = result.total;
  }
  if (result.totalAmount !== undefined && result.total === undefined) {
    result.total = result.totalAmount;
  }
  if (result.amount !== undefined && result.amountPaid === undefined) {
    result.amountPaid = result.amount;
  }
  if (result.amountPaid !== undefined && result.amount === undefined) {
    result.amount = result.amountPaid;
  }
  if (result.items && !result.lineItems) {
    result.lineItems = result.items;
  }
  if (result.lineItems && !result.items) {
    result.items = result.lineItems;
  }
  if (result.amount !== undefined && result.lineTotal === undefined) {
    result.lineTotal = result.amount;
  }
  if (result.lineTotal !== undefined && result.amount === undefined) {
    result.amount = result.lineTotal;
  }
  if (result.paymentNumber && !result.receiptNumber) {
    result.receiptNumber = result.paymentNumber;
  }
  if (result.receiptNumber && !result.paymentNumber) {
    result.paymentNumber = result.receiptNumber;
  }

  // Inventory aliases:
  if (result.sku && !result.code) {
    result.code = result.sku;
  }
  if (result.costPrice !== undefined && result.cost === undefined) {
    result.cost = result.costPrice;
  }
  if (result.cost !== undefined && result.costPrice === undefined) {
    result.costPrice = result.cost;
  }
  if (result.sellingPrice !== undefined && result.price === undefined) {
    result.price = result.sellingPrice;
  }
  if (result.price !== undefined && result.sellingPrice === undefined) {
    result.sellingPrice = result.price;
  }
  if (result.trackInventory !== undefined && result.trackStock === undefined) {
    result.trackStock = result.trackInventory;
  }
  if (result.trackStock !== undefined && result.trackInventory === undefined) {
    result.trackInventory = result.trackStock;
  }

  // Expense aliases:
  if (result.vendor && !result.vendorName) {
    result.vendorName = result.vendor;
  }
  if (result.vendorName && !result.vendor) {
    result.vendor = result.vendorName;
  }
  if (result.title && !result.descriptionEn) {
    result.descriptionEn = result.title;
  }
  if (result.descriptionEn && !result.title) {
    result.title = result.descriptionEn;
  }

  return result as T;
}
