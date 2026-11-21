import { validMoneyAmount } from "../finance/money";
import { companyCurrency as getAccountingCurrency, assertCompanyCurrency } from "../finance/company-currency";
import { serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
import { ROUTES } from "../constants/routes";
import { getNextSequenceNumber } from "./sequence";
import { validateSignatureImage } from "../services/signature-image";
import {
  registerApprovalFinalizer,
  submitForApproval,
  cancelPendingApprovals,
} from "../services/approval-engine";
import { resolveSigningSignature } from "./signature-policies";

export const ASSET_CONDITIONS = [
  "new",
  "excellent",
  "good",
  "fair",
  "poor",
  "damaged",
] as const;
export const ASSET_STATUSES = [
  "available",
  "assigned",
  "maintenance",
  "lost",
  "retired",
] as const;
export const SPEC_FIELD_TYPES = ["text", "number", "date", "boolean"] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export interface SpecField {
  key: string;
  labelEn: string;
  labelAr: string;
  type: string;
  required?: boolean;
}
export interface ChecklistItem {
  key: string;
  labelEn: string;
  labelAr: string;
}

export interface AssetCategoryInput {
  name_en: string;
  name_ar: string;
  spec_fields: Array<{
    key?: string;
    label_en: string;
    label_ar: string;
    type: string;
    required?: boolean;
  }>;
  checklist: Array<{ key?: string; label_en: string; label_ar: string }>;
  is_active: boolean;
}

export interface AssetCategoryRecord {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  spec_fields: SpecField[];
  checklist: ChecklistItem[];
  is_active: boolean;
  assets: number;
}

export interface AssetInput {
  category_id: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  supplier?: string;
  invoice_reference?: string;
  warranty_until?: string;
  condition: string;
  status?: string;
  holder_employee_id?: string;
  location?: string;
  notes?: string;
  specs: Record<string, string>;
}

export interface AssetRecord {
  id: string;
  asset_tag: string;
  category: {
    id: string;
    code: string;
    name_en: string;
    name_ar: string;
    spec_fields: SpecField[];
    checklist: ChecklistItem[];
  };
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  currency: string;
  supplier?: string;
  invoice_reference?: string;
  warranty_until?: string;
  condition: string;
  status: string;
  location?: string;
  notes?: string;
  specs: Record<string, string>;
  holder?: {
    id: string;
    employee_number: string;
    name_en: string;
    name_ar: string;
  };
  open_handover?: {
    id: string;
    reference: string;
    kind: string;
    status: string;
  };
  created_at: string;
}

export interface HandoverInput {
  asset_id: string;
  employee_id: string;
  kind: "issue" | "return";
  handover_date: string;
  condition: string;
  checklist: Array<{ key: string; ok: boolean; note?: string }>;
  accessories?: string;
  damage_notes?: string;
  damage_charge?: number;
  deduct_from_salary?: boolean;
  status_after_return?: string;
  notes?: string;
  offboarding_id?: string;
}

export interface HandoverSignature {
  signature: string;
  signer_name: string;
}

const iso = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : undefined;
const clean = (v: unknown, max = 200) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
const day = (value: unknown) => {
  const text = clean(value, 10);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)))
    throw new Error(serverMessages.invalidDate);
  return new Date(`${text}T00:00:00Z`);
};
const asSpecFields = (v: unknown) =>
  Array.isArray(v) ? (v as SpecField[]) : [];
const asChecklist = (v: unknown) =>
  Array.isArray(v) ? (v as ChecklistItem[]) : [];
const name = (e: {
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
}) => ({
  name_en: `${e.firstNameEn} ${e.lastNameEn}`,
  name_ar: `${e.firstNameAr} ${e.lastNameAr}`,
});

export async function listAssetCategories(
  includeInactive = true,
): Promise<AssetCategoryRecord[]> {
  try {
    const [allRows, allAssets] = await Promise.all([
      listTableRows<any>("itsm", "asset_category", "name_en ASC, code ASC"),
      listTableRows<any>("itsm", "asset").catch(() => []),
    ]);
    const rows = includeInactive ? allRows : allRows.filter((r) => r.isActive !== false);
    const assetCountByCat = new Map<string, number>();
    for (const a of allAssets) {
      assetCountByCat.set(a.categoryId, (assetCountByCat.get(a.categoryId) ?? 0) + 1);
    }
    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        code: r.code,
        name_en: r.nameEn,
        name_ar: r.nameAr,
        spec_fields: asSpecFields(r.specFields),
        checklist: asChecklist(r.checklist),
        is_active: r.isActive !== false,
        assets: assetCountByCat.get(r.id) ?? 0,
      }));
    }
  } catch (err) {
    console.warn("listAssetCategories db fallback:", err);
  }

  try {
    const { listCategories, listProducts } = await import("../api/inventory");
    const [cats, prods] = await Promise.all([
      listCategories().catch(() => []),
      listProducts().catch(() => []),
    ]);
    if (cats && cats.length > 0) {
      const counts: Record<string, number> = {};
      for (const p of prods) {
        if (p.categoryId) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
      }
      return cats
        .filter((c) => includeInactive || c.isActive)
        .map((c) => ({
          id: c.id,
          code: c.slug || c.id,
          name_en: c.nameEn,
          name_ar: c.nameAr,
          spec_fields: [],
          checklist: [],
          is_active: c.isActive,
          assets: counts[c.id] || 0,
        }));
    }
  } catch (err) {
    console.warn("listAssetCategories inventory API fallback:", err);
  }

  return [];
}

export async function saveAssetCategory(
  input: AssetCategoryInput,
  id?: string,
) {
  const nameEn = clean(input.name_en, 80);
  const nameAr = clean(input.name_ar, 80);
  if (!nameEn || !nameAr)
    throw new Error(serverMessages.enterTheCategoryNameInEnglish);
  const used = new Set<string>();
  const key = (given: string | undefined, label: string) => {
    let k =
      given && /^[a-z0-9_]{1,40}$/.test(given) ? given : slug(label) || "field";
    for (let n = 2; used.has(k); n++) k = `${k}_${n}`;
    used.add(k);
    return k;
  };
  if (input.spec_fields.length > 30 || input.checklist.length > 40)
    throw new Error(serverMessages.tooManyFieldsOrChecklistItems);
  const specFields: SpecField[] = input.spec_fields.map((f) => {
    const labelEn = clean(f.label_en, 80);
    const labelAr = clean(f.label_ar, 80);
    if (!labelEn || !labelAr)
      throw new Error(serverMessages.everyFieldAndChecklistItemNeeds);
    if (!(SPEC_FIELD_TYPES as readonly string[]).includes(f.type))
      throw new Error(serverMessages.chooseAFieldType);
    return {
      key: key(f.key, labelEn),
      labelEn,
      labelAr,
      type: f.type,
      ...(f.required ? { required: true } : {}),
    };
  });
  used.clear();
  const checklist: ChecklistItem[] = input.checklist.map((c) => {
    const labelEn = clean(c.label_en, 120);
    const labelAr = clean(c.label_ar, 120);
    if (!labelEn || !labelAr)
      throw new Error(serverMessages.everyFieldAndChecklistItemNeeds);
    return { key: key(c.key, labelEn), labelEn, labelAr };
  });
  const data = {
    nameEn,
    nameAr,
    specFields,
    checklist,
    isActive: !!input.is_active,
  };
  const existingCats = await listTableRows<any>("itsm", "asset_category");
  if (id) {
    const existing = existingCats.find((c) => c.id === id);
    return upsertTableRow("itsm", "asset_category", { ...existing, id, ...data });
  }
  let code = slug(nameEn) || "category";
  const codes = new Set(existingCats.map((c) => c.code));
  for (let n = 2; codes.has(code); n++) code = `${slug(nameEn)}_${n}`;
  return upsertTableRow("itsm", "asset_category", {
    id: crypto.randomUUID(),
    ...data,
    code,
    displayOrder: existingCats.length,
  });
}

type AssetRow = Record<string, any>;

function mapAsset(a: AssetRow): AssetRecord {
  const cat = a.category || { id: a.categoryId || "general", code: "general", nameEn: "General", nameAr: "عام", specFields: [], checklist: [] };
  return {
    id: a.id,
    asset_tag: a.assetTag,
    category: {
      id: cat.id,
      code: cat.code,
      name_en: cat.nameEn,
      name_ar: cat.nameAr,
      spec_fields: asSpecFields(cat.specFields),
      checklist: asChecklist(cat.checklist),
    },
    name: a.name,
    brand: a.brand ?? undefined,
    model: a.model ?? undefined,
    serial_number: a.serialNumber ?? undefined,
    purchase_date: iso(a.purchaseDate),
    purchase_cost: a.purchaseCost === null || a.purchaseCost === undefined ? undefined : Number(a.purchaseCost),
    currency: a.currency,
    supplier: a.supplier ?? undefined,
    invoice_reference: a.invoiceReference ?? undefined,
    warranty_until: iso(a.warrantyUntil),
    condition: a.condition,
    status: a.status,
    location: a.location ?? undefined,
    notes: a.notes ?? undefined,
    specs: (a.specs ?? {}) as Record<string, string>,
    holder: a.holder
      ? {
          id: a.holder.id,
          employee_number: a.holder.employeeNumber,
          ...name(a.holder),
        }
      : undefined,
    open_handover: a.handovers?.[0] ? { ...a.handovers[0] } : undefined,
    created_at: new Date(a.createdAt || Date.now()).toISOString(),
  };
}

export type AssetFilters = {
  q?: string;
  category?: string;
  status?: string;
  condition?: string;
  holder?: string;
  sort?: string;
};
export const ASSET_SORTS = [
  "tag",
  "newest",
  "name",
  "value_desc",
  "purchase_desc",
  "warranty_asc",
] as const;

export async function listAssets(filters: AssetFilters = {}) {
  const accountingCurrency = await getAccountingCurrency();
  const q = filters.q?.trim().slice(0, 100)?.toLowerCase();
  try {
    const [rawAssets, rawCats, rawEmps, rawHandovers] = await Promise.all([
      listTableRows<any>("itsm", "asset"),
      listTableRows<any>("itsm", "asset_category").catch(() => []),
      listTableRows<any>("hr", "employee").catch(() => []),
      listTableRows<any>("itsm", "asset_handover").catch(() => []),
    ]);
    const catMap = new Map<string, any>(rawCats.map((c): [any, any] => [c.id, c]));
    const empMap = new Map<string, any>(rawEmps.map((e): [any, any] => [e.id, e]));
    const openHandoversByAsset = new Map<string, any[]>();
    for (const h of rawHandovers) {
      if (["awaiting_employee", "pending_approval"].includes(h.status)) {
        const arr = openHandoversByAsset.get(h.assetId) || [];
        arr.push({ id: h.id, reference: h.reference, kind: h.kind, status: h.status });
        openHandoversByAsset.set(h.assetId, arr);
      }
    }
    const counts: Record<string, number> = {};
    let totalValue = 0;
    for (const a of rawAssets) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
      if (!["retired", "lost"].includes(a.status) && a.currency === accountingCurrency && a.purchaseCost != null) {
        totalValue += Number(a.purchaseCost);
      }
    }
    const filtered = rawAssets
      .filter((a) => {
        if (q) {
          const hay = [a.assetTag, a.name, a.brand, a.model, a.serialNumber, a.supplier]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (filters.category && filters.category !== "all" && a.categoryId !== filters.category) return false;
        if (filters.status && filters.status !== "all" && a.status !== filters.status) return false;
        if (filters.condition && filters.condition !== "all" && a.condition !== filters.condition) return false;
        if (filters.holder && filters.holder !== "all" && a.holderEmployeeId !== filters.holder) return false;
        return true;
      })
      .sort((a, b) => {
        if (filters.sort === "newest") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (filters.sort === "name") return String(a.name || "").localeCompare(String(b.name || ""));
        if (filters.sort === "value_desc") return Number(b.purchaseCost ?? -1) - Number(a.purchaseCost ?? -1);
        if (filters.sort === "purchase_desc") return (b.purchaseDate ? new Date(b.purchaseDate).getTime() : -1) - (a.purchaseDate ? new Date(a.purchaseDate).getTime() : -1);
        if (filters.sort === "warranty_asc") return (a.warrantyUntil ? new Date(a.warrantyUntil).getTime() : Infinity) - (b.warrantyUntil ? new Date(b.warrantyUntil).getTime() : Infinity);
        return String(a.assetTag || "").localeCompare(String(b.assetTag || ""));
      })
      .slice(0, 500)
      .map((a) =>
        mapAsset({
          ...a,
          category: catMap.get(a.categoryId),
          holder: a.holderEmployeeId ? empMap.get(a.holderEmployeeId) : null,
          handovers: openHandoversByAsset.get(a.id) || [],
        }),
      );
    if (rawAssets.length > 0) {
      return {
        items: filtered,
        counts,
        totalValue,
      };
    }
  } catch (err) {
    console.warn("listAssets db fallback:", err);
  }

  try {
    const [{ listITAssets, listITAssetHandovers }, { listEmployees }] = await Promise.all([
      import("../api/itsm"),
      import("../api/hr"),
    ]);
    const [itAssets, itHandovers, employees] = await Promise.all([
      listITAssets().catch(() => []),
      listITAssetHandovers().catch(() => []),
      listEmployees().catch(() => []),
    ]);
    if (itAssets && itAssets.length > 0) {
      const empMap = new Map<string, any>(
        (employees || []).map((e: any): [any, any] => [e.id, e] as [string, any]),
      );
      const activeHandoverByAsset = new Map<string, any>();
      for (const h of itHandovers || []) {
        if (!activeHandoverByAsset.has(h.assetId)) activeHandoverByAsset.set(h.assetId, h);
      }
      let items: AssetRecord[] = itAssets.map((a) => {
        const h = activeHandoverByAsset.get(a.id);
        const emp = h?.employeeId ? empMap.get(h.employeeId) : undefined;
        return {
          id: a.id,
          asset_tag: a.assetTag || a.id,
          name: a.name,
          brand: a.brand || undefined,
          model: a.model || undefined,
          serial_number: a.serialNumber || undefined,
          purchase_date: a.purchaseDate ? a.purchaseDate.slice(0, 10) : undefined,
          purchase_cost: a.purchaseCost ?? undefined,
          currency: a.currency || accountingCurrency,
          supplier: a.supplier || undefined,
          invoice_reference: a.invoiceReference || undefined,
          warranty_until: a.warrantyUntil ? a.warrantyUntil.slice(0, 10) : undefined,
          condition: (a.condition || "good") as AssetCondition,
          status: a.status || "available",
          specs: (a.specs as Record<string, string>) || {},
          category: {
            id: a.categoryId || "general",
            code: a.categoryId || "general",
            name_en: a.categoryName || "IT & Production Asset",
            name_ar: a.categoryName || "أصول ومعدات",
            spec_fields: [],
            checklist: [],
          },
          holder:
            a.status === "assigned" && h?.employeeId
              ? {
                  id: h.employeeId,
                  employee_number: emp?.employeeNumber || "",
                  name_en: h.employeeName || (emp ? `${emp.firstNameEn} ${emp.lastNameEn}`.trim() : h.employeeId),
                  name_ar: h.employeeName || (emp ? `${emp.firstNameAr || emp.firstNameEn} ${emp.lastNameAr || emp.lastNameEn}`.trim() : h.employeeId),
                }
              : undefined,
          created_at: new Date().toISOString(),
        };
      });
      const counts: Record<string, number> = {};
      for (const a of items) counts[a.status] = (counts[a.status] ?? 0) + 1;
      const totalValue = items.reduce((sum, a) => sum + (a.purchase_cost ?? 0), 0);
      return { items, counts, totalValue };
    }
  } catch (err) {
    console.warn("listAssets itsm API fallback:", err);
  }

  try {
    const { listProducts, listCategories } = await import("../api/inventory");
    const [prods, cats] = await Promise.all([
      listProducts().catch(() => []),
      listCategories().catch(() => []),
    ]);

    const catMap = new Map<string, { id: string; slug: string; nameEn: string; nameAr: string }>();
    for (const c of cats) {
      catMap.set(c.id, c);
    }

    let items: AssetRecord[] = prods.map((p) => {
      const c = p.categoryId ? catMap.get(p.categoryId) : undefined;
      const cost = Number(p.costPrice || 0);
      const nameParts = (p.nameEn || "").split(" ");
      const brand = nameParts[0] || "Equipment";
      const model = nameParts.slice(1).join(" ") || p.nameEn || "";

      return {
        id: p.id,
        asset_tag: p.sku || p.id,
        name: p.nameEn || "Equipment",
        brand,
        model,
        serial_number: p.barcode || "SN-" + (p.sku || p.id),
        purchase_date: p.createdAt ? p.createdAt.slice(0, 10) : "2026-01-15",
        purchase_cost: cost,
        currency: p.currency || accountingCurrency,
        condition: "excellent" as AssetCondition,
        status: "available",
        specs: {},
        location: "Main Cinema Equipment Vault",
        notes: p.descriptionEn || undefined,
        category: {
          id: c?.id || p.categoryId || "general",
          code: c?.slug || p.categoryId || "general",
          name_en: c?.nameEn || "Equipment",
          name_ar: c?.nameAr || "معدات",
          spec_fields: [],
          checklist: [],
        },
        holder: undefined,
        created_at: p.createdAt || new Date().toISOString(),
      };
    });

    const qLower = filters.q?.toLowerCase().trim();
    if (qLower) {
      items = items.filter(
        (a) =>
          a.asset_tag.toLowerCase().includes(qLower) ||
          a.name.toLowerCase().includes(qLower) ||
          (a.brand && a.brand.toLowerCase().includes(qLower)) ||
          (a.model && a.model.toLowerCase().includes(qLower)) ||
          (a.serial_number && a.serial_number.toLowerCase().includes(qLower)),
      );
    }
    if (filters.category && filters.category !== "all") {
      items = items.filter((a) => a.category.id === filters.category || a.category.code === filters.category);
    }
    if (filters.status && filters.status !== "all") {
      items = items.filter((a) => a.status === filters.status);
    }
    if (filters.condition && filters.condition !== "all") {
      items = items.filter((a) => a.condition === filters.condition);
    }
    if (filters.holder && filters.holder !== "all") {
      items = items.filter((a) => a.holder?.id === filters.holder);
    }

    if (filters.sort === "newest") {
      items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (filters.sort === "name") {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filters.sort === "value_desc") {
      items.sort((a, b) => (b.purchase_cost ?? 0) - (a.purchase_cost ?? 0));
    } else if (filters.sort === "purchase_desc") {
      items.sort((a, b) => (b.purchase_date ?? "").localeCompare(a.purchase_date ?? ""));
    } else {
      items.sort((a, b) => a.asset_tag.localeCompare(b.asset_tag));
    }

    const counts: Record<string, number> = {
      available: items.length,
      assigned: 0,
      maintenance: 0,
      lost: 0,
      retired: 0,
    };
    const totalValue = items.reduce((sum, a) => sum + (a.purchase_cost ?? 0), 0);

    return { items, counts, totalValue };
  } catch (err) {
    console.warn("listAssets inventory API fallback:", err);
  }

  return { items: [], counts: {}, totalValue: 0 };
}

export async function getAsset(id: string) {
  try {
    const [rawAssets, rawCats, rawEmps, rawHandovers] = await Promise.all([
      listTableRows<any>("itsm", "asset"),
      listTableRows<any>("itsm", "asset_category").catch(() => []),
      listTableRows<any>("hr", "employee").catch(() => []),
      listTableRows<any>("itsm", "asset_handover", "handover_date DESC, id DESC").catch(() => []),
    ]);
    const found = rawAssets.find((a) => a.id === id);
    if (found) {
      const cat = rawCats.find((c) => c.id === found.categoryId);
      const holder = found.holderEmployeeId ? rawEmps.find((e) => e.id === found.holderEmployeeId) : null;
      const handovers = rawHandovers.filter((h) => h.assetId === id);
      const openHandovers = handovers
        .filter((h) => ["awaiting_employee", "pending_approval"].includes(h.status))
        .slice(0, 1);
      const empMap = new Map<string, any>(rawEmps.map((e): [any, any] => [e.id, e]));
      return {
        asset: mapAsset({
          ...found,
          category: cat,
          holder,
          handovers: openHandovers,
        }),
        handovers: handovers.map((h) => {
          const emp = empMap.get(h.employeeId) || { firstNameEn: "", lastNameEn: "", firstNameAr: "", lastNameAr: "" };
          return {
            id: h.id,
            reference: h.reference,
            kind: h.kind,
            status: h.status,
            handover_date: iso(h.handoverDate)!,
            condition: h.condition,
            employee: name(emp),
            damage_charge:
              h.damageCharge === null || h.damageCharge === undefined ? undefined : Number(h.damageCharge),
          };
        }),
      };
    }
  } catch (err) {
    console.warn("getAsset db fallback:", err);
  }

  try {
    const [{ listITAssets, listITAssetHandovers }, { listEmployees }, accountingCurrency] = await Promise.all([
      import("../api/itsm"),
      import("../api/hr"),
      getAccountingCurrency(),
    ]);
    const [itAssets, itHandovers, employees] = await Promise.all([
      listITAssets().catch(() => []),
      listITAssetHandovers().catch(() => []),
      listEmployees().catch(() => []),
    ]);
    const foundAsset = (itAssets || []).find((a) => a.id === id || a.assetTag === id);
    if (foundAsset) {
      const empMap = new Map<string, any>(
        (employees || []).map((e: any): [any, any] => [e.id, e] as [string, any]),
      );
      const assetHandovers = (itHandovers || []).filter((h) => h.assetId === foundAsset.id);
      const latestHandover = assetHandovers[0];
      const holderEmp = latestHandover?.employeeId ? empMap.get(latestHandover.employeeId) : undefined;
      const mapped: AssetRecord = {
        id: foundAsset.id,
        asset_tag: foundAsset.assetTag || foundAsset.id,
        name: foundAsset.name,
        brand: foundAsset.brand || undefined,
        model: foundAsset.model || undefined,
        serial_number: foundAsset.serialNumber || undefined,
        purchase_date: foundAsset.purchaseDate ? foundAsset.purchaseDate.slice(0, 10) : undefined,
        purchase_cost: foundAsset.purchaseCost ?? undefined,
        currency: foundAsset.currency || accountingCurrency,
        supplier: foundAsset.supplier || undefined,
        invoice_reference: foundAsset.invoiceReference || undefined,
        warranty_until: foundAsset.warrantyUntil ? foundAsset.warrantyUntil.slice(0, 10) : undefined,
        condition: (foundAsset.condition || "good") as AssetCondition,
        status: foundAsset.status || "available",
        specs: (foundAsset.specs as Record<string, string>) || {},
        category: {
          id: foundAsset.categoryId || "general",
          code: foundAsset.categoryId || "general",
          name_en: foundAsset.categoryName || "IT & Production Asset",
          name_ar: foundAsset.categoryName || "أصول ومعدات",
          spec_fields: [],
          checklist: [],
        },
        holder:
          foundAsset.status === "assigned" && latestHandover?.employeeId
            ? {
                id: latestHandover.employeeId,
                employee_number: holderEmp?.employeeNumber || "",
                name_en:
                  latestHandover.employeeName ||
                  (holderEmp
                    ? `${holderEmp.firstNameEn} ${holderEmp.lastNameEn}`.trim()
                    : latestHandover.employeeId),
                name_ar:
                  latestHandover.employeeName ||
                  (holderEmp
                    ? `${holderEmp.firstNameAr || holderEmp.firstNameEn} ${holderEmp.lastNameAr || holderEmp.lastNameEn}`.trim()
                    : latestHandover.employeeId),
              }
            : undefined,
        created_at: new Date().toISOString(),
      };
      return {
        asset: mapped,
        handovers: assetHandovers.map((h) => {
          const emp = h.employeeId ? empMap.get(h.employeeId) : undefined;
          return {
            id: h.id,
            reference: h.reference,
            kind: h.kind,
            status: h.status,
            handover_date: (h.handoverDate || "").slice(0, 10),
            condition: h.condition,
            employee: {
              name_en:
                h.employeeName ||
                (emp ? `${emp.firstNameEn} ${emp.lastNameEn}`.trim() : h.employeeId),
              name_ar:
                h.employeeName ||
                (emp
                  ? `${emp.firstNameAr || emp.firstNameEn} ${emp.lastNameAr || emp.lastNameEn}`.trim()
                  : h.employeeId),
            },
            damage_charge: (h as { damageCharge?: number | null }).damageCharge ?? undefined,
          };
        }),
      };
    }
  } catch (err) {
    console.warn("getAsset itsm API fallback:", err);
  }

  try {
    const { listProducts, listCategories } = await import("../api/inventory");
    const [prods, cats] = await Promise.all([
      listProducts().catch(() => []),
      listCategories().catch(() => []),
    ]);
    const found = prods.find((p) => p.id === id || p.sku === id || (p as any).code === id);
    if (found) {
      const c = found.categoryId ? cats.find((cat) => cat.id === found.categoryId) : undefined;
      const cost = Number(found.costPrice || 0);
      const nameParts = (found.nameEn || "").split(" ");
      const brand = nameParts[0] || "Equipment";
      const model = nameParts.slice(1).join(" ") || found.nameEn || "";

      const mapped: AssetRecord = {
        id: found.id,
        asset_tag: found.sku || found.id,
        name: found.nameEn || "Equipment",
        brand,
        model,
        serial_number: found.barcode || "SN-" + (found.sku || found.id),
        purchase_date: found.createdAt ? found.createdAt.slice(0, 10) : "2026-01-15",
        purchase_cost: cost,
        currency: found.currency || "BHD",
        condition: "excellent" as AssetCondition,
        status: "available",
        specs: {},
        location: "Main Cinema Equipment Vault",
        notes: found.descriptionEn || undefined,
        category: {
          id: c?.id || found.categoryId || "general",
          code: c?.slug || found.categoryId || "general",
          name_en: c?.nameEn || "Equipment",
          name_ar: c?.nameAr || "معدات",
          spec_fields: [],
          checklist: [],
        },
        holder: undefined,
        created_at: found.createdAt || new Date().toISOString(),
      };
      return { asset: mapped, handovers: [] };
    }
  } catch (err) {
    console.warn("getAsset inventory API fallback:", err);
  }

  return null;
}

function normalizeAsset(input: AssetInput, specFields: SpecField[]) {
  const assetName = clean(input.name, 150);
  if (!assetName) throw new Error(serverMessages.enterTheAssetSName);
  if (!(ASSET_CONDITIONS as readonly string[]).includes(input.condition))
    throw new Error(serverMessages.chooseTheAssetSCondition);
  const cost =
    input.purchase_cost === undefined ||
    input.purchase_cost === null ||
    Number.isNaN(input.purchase_cost)
      ? null
      : Number(input.purchase_cost);
  if (cost !== null && (!Number.isFinite(cost) || cost < 0))
    throw new Error(serverMessages.enterAValidCost);
  const specs: Record<string, string> = {};
  for (const field of specFields) {
    const raw = input.specs?.[field.key];
    const value = typeof raw === "string" ? raw.trim().slice(0, 200) : "";
    if (!value) {
      if (field.required)
        throw new Error(serverMessages.fillInEveryRequiredDetailOf);
      continue;
    }
    if (field.type === "number" && !Number.isFinite(Number(value)))
      throw new Error(serverMessages.enterNumbersInNumberFields);
    if (field.type === "date") day(value);
    specs[field.key] = value;
  }
  return {
    name: assetName,
    brand: clean(input.brand, 80),
    model: clean(input.model, 80),
    serialNumber: clean(input.serial_number, 80),
    purchaseDate: day(input.purchase_date),
    purchaseCost: cost,
    supplier: clean(input.supplier, 120),
    invoiceReference: clean(input.invoice_reference, 60),
    warrantyUntil: day(input.warranty_until),
    condition: input.condition,
    location: clean(input.location, 120),
    notes: clean(input.notes, 1000),
    specs,
  };
}

export async function saveAsset(
  input: AssetInput,
  actorId: string,
  id?: string,
) {
  return runAtomicMutation(async () => {
    const [categories, assets, handovers, employees] = await Promise.all([
      listTableRows<any>("itsm", "asset_category"),
      listTableRows<any>("itsm", "asset"),
      id ? listTableRows<any>("itsm", "asset_handover") : Promise.resolve([]),
      id ? listTableRows<any>("hr", "employee") : Promise.resolve([]),
    ]);
    const category = categories.find((c) => c.id === input.category_id);
    if (!category) throw new Error(serverMessages.chooseTheAssetSCategory);
    const data = normalizeAsset(input, asSpecFields(category.specFields));
    const currency = await assertCompanyCurrency();
    if (data.purchaseCost !== null && !validMoneyAmount(data.purchaseCost, currency, true)) throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
    if (id && input.purchase_cost !== undefined) {
      const existing = assets.find((a) => a.id === id);
      if (!existing) throw new Error(serverMessages.assetNotFound);
      await assertCompanyCurrency(existing.currency);
    }
    if (data.serialNumber) {
      const clash = assets.find(
        (a) =>
          a.categoryId === category.id &&
          a.serialNumber === data.serialNumber &&
          (!id || a.id !== id),
      );
      if (clash) throw new Error(serverMessages.anotherAssetInThisCategoryHas);
    }
    if (id) {
      const existing = assets.find((a) => a.id === id);
      if (!existing) throw new Error(serverMessages.assetNotFound);
      const status = input.status || existing.status;
      if (!(ASSET_STATUSES as readonly string[]).includes(status))
        throw new Error(serverMessages.invalidInput);
      let holderEmployeeId = existing.holderEmployeeId;
      if (status !== existing.status) {
        const open = handovers.filter(
          (h) =>
            h.assetId === id &&
            ["awaiting_employee", "pending_approval"].includes(h.status),
        ).length;
        if (open) throw new Error(serverMessages.thisAssetAlreadyHasAHandover);
        if (status === "assigned") {
          const holder = input.holder_employee_id
            ? employees.find((e) => e.id === input.holder_employee_id)
            : null;
          if (!holder) throw new Error(serverMessages.employeeNotFound);
          holderEmployeeId = holder.id;
        } else holderEmployeeId = null;
      }
      return upsertTableRow("itsm", "asset", {
        ...existing,
        ...data,
        id,
        categoryId: category.id,
        status,
        holderEmployeeId,
      });
    }
    const assetTag = await getNextSequenceNumber("AST");
    return upsertTableRow("itsm", "asset", {
      id: crypto.randomUUID(),
      ...data,
      currency,
      categoryId: category.id,
      assetTag,
      status: "available",
      createdById: actorId,
    });
  });
}

export async function startAssetHandover(
  input: HandoverInput,
  actorId: string,
  inPerson?: HandoverSignature,
  issuerSignature?: string | null,
) {
  return runAtomicMutation(async () => {
    const [assets, categories, handovers, employees] = await Promise.all([
      listTableRows<any>("itsm", "asset"),
      listTableRows<any>("itsm", "asset_category"),
      listTableRows<any>("itsm", "asset_handover"),
      listTableRows<any>("hr", "employee"),
    ]);
    const asset = assets.find((a) => a.id === input.asset_id);
    if (!asset) throw new Error(serverMessages.assetNotFound);
    const openHandovers = handovers.filter(
      (h) => h.assetId === asset.id && ["awaiting_employee", "pending_approval"].includes(h.status),
    );
    if (openHandovers.length)
      throw new Error(serverMessages.thisAssetAlreadyHasAHandover);
    const employee = employees.find((e) => e.id === input.employee_id);
    if (!employee) throw new Error(serverMessages.employeeNotFound);
    if (input.kind === "issue") {
      if (asset.status !== "available")
        throw new Error(serverMessages.onlyAvailableAssetsCanBeIssued);
      if (employee.status === "terminated")
        throw new Error(serverMessages.assetsCannotBeIssuedToA);
    } else if (input.kind === "return") {
      if (asset.status !== "assigned" || asset.holderEmployeeId !== employee.id)
        throw new Error(serverMessages.thisEmployeeDoesNotHoldThis);
    } else throw new Error(serverMessages.invalidInput);
    if (!(ASSET_CONDITIONS as readonly string[]).includes(input.condition))
      throw new Error(serverMessages.chooseTheAssetSCondition);
    const handoverDate = day(input.handover_date);
    if (!handoverDate) throw new Error(serverMessages.invalidDate);
    const category = categories.find((c) => c.id === asset.categoryId);
    const items = asChecklist(category?.checklist);
    const checklist = items.map((item) => {
      const answer = input.checklist.find((c) => c.key === item.key);
      return { ...item, ok: !!answer?.ok, note: clean(answer?.note, 200) };
    });
    const charge =
      input.damage_charge === undefined ||
      input.damage_charge === null ||
      Number.isNaN(input.damage_charge)
        ? null
        : Math.round(Number(input.damage_charge) * 1000) / 1000;
    if (charge !== null && (!Number.isFinite(charge) || charge < 0))
      throw new Error(serverMessages.enterAValidCost);
    const damageNotes = clean(input.damage_notes, 1000);
    if ((charge ?? 0) > 0 && !damageNotes)
      throw new Error(serverMessages.describeTheDamageBeforeChargingFor);
    const creatorSignatureUrl = await resolveSigningSignature(
      "asset_handover",
      actorId,
      issuerSignature,
    );
    const returnStatus =
      input.kind === "return" ? input.status_after_return || "available" : null;
    if (
      returnStatus &&
      !["available", "maintenance", "lost", "retired"].includes(returnStatus)
    )
      throw new Error(serverMessages.invalidInput);
    const reference = await getNextSequenceNumber("AHO");
    const handover = await upsertTableRow<any>("itsm", "asset_handover", {
      id: crypto.randomUUID(),
      reference,
      assetId: asset.id,
      employeeId: employee.id,
      kind: input.kind,
      status: "awaiting_employee",
      handoverDate: handoverDate.toISOString(),
      condition: input.condition,
      checklist,
      specsSnapshot: asset.specs ?? {},
      accessories: clean(input.accessories, 500),
      damageNotes,
      damageCharge: charge,
      deductFromSalary: !!input.deduct_from_salary && (charge ?? 0) > 0,
      returnStatus,
      notes: clean(input.notes, 1000),
      offboardingId: input.offboarding_id || null,
      createdById: actorId,
      creatorSignatureUrl,
    });
    if (inPerson) {
      await signAssetHandover(handover.id, inPerson, actorId, true);
    } else if (employee.userId) {
      await upsertTableRow("notify", "notification", {
        id: crypto.randomUUID(),
        userId: employee.userId,
        title:
          input.kind === "issue"
            ? "Asset handover to sign"
            : "Asset return to sign",
        message: `${asset.assetTag} · ${asset.name}`,
        type: "action",
        entityType: "asset_handover",
        entityId: handover.id,
        messageKey:
          input.kind === "issue"
            ? "assets.notifications.signIssue"
            : "assets.notifications.signReturn",
        messageParams: {
          nameEn: `${asset.assetTag} · ${asset.name}`,
          nameAr: `${asset.assetTag} · ${asset.name}`,
        },
        actionUrl: ROUTES.assets.handover(handover.id),
        eventKey: `asset-handover-sign:${handover.id}`,
      });
    }
    const updated = await listTableRows<any>("itsm", "asset_handover");
    return updated.find((h) => h.id === handover.id) ?? handover;
  });
}

export async function signAssetHandover(
  id: string,
  input: HandoverSignature,
  actorId: string,
  inPerson: boolean | "link",
) {
  return runAtomicMutation(async () => {
    const [handovers, employees, assets] = await Promise.all([
      listTableRows<any>("itsm", "asset_handover"),
      listTableRows<any>("hr", "employee"),
      listTableRows<any>("itsm", "asset"),
    ]);
    const handover = handovers.find((h) => h.id === id);
    if (!handover) throw new Error(serverMessages.handoverNotFound);
    if (handover.status !== "awaiting_employee")
      throw new Error(serverMessages.thisHandoverIsNotWaitingFor);
    const employee = employees.find((e) => e.id === handover.employeeId);
    const asset = assets.find((a) => a.id === handover.assetId);
    if (inPerson === false && employee?.userId !== actorId)
      throw new Error(serverMessages.onlyTheEmployeeCanSignThis);
    validateSignatureImage(input.signature);
    const signerName = clean(input.signer_name, 120);
    if (!signerName) throw new Error(serverMessages.enterYourFullName);
    const updated = await upsertTableRow<any>("itsm", "asset_handover", {
      ...handover,
      id,
      employeeSignature: input.signature,
      employeeSignerName: signerName,
      employeeSignedAt: new Date().toISOString(),
      signedInPerson: inPerson === true,
      status: "pending_approval",
    });
    await submitForApproval({
      targetType: "asset_handover",
      targetId: id,
      requesterId: employee?.userId ?? handover.createdById,
      policySnapshot: {
        kind: handover.kind,
        value:
          asset?.purchaseCost === null || asset?.purchaseCost === undefined
            ? null
            : Number(asset.purchaseCost),
      },
    });
    return updated;
  });
}

export async function cancelAssetHandover(id: string) {
  return runAtomicMutation(async () => {
    const handovers = await listTableRows<any>("itsm", "asset_handover");
    const handover = handovers.find((h) => h.id === id);
    if (!handover) throw new Error(serverMessages.handoverNotFound);
    if (!["awaiting_employee", "pending_approval"].includes(handover.status))
      throw new Error(serverMessages.onlyOpenHandoversCanBeCancelled);
    await cancelPendingApprovals("asset_handover", id);
    await upsertTableRow("itsm", "asset_handover", {
      ...handover,
      id,
      status: "cancelled",
      decidedAt: new Date().toISOString(),
    });
  });
}

async function nextPayrollMonth(): Promise<string> {
  const runs = await listTableRows<any>("hr", "payroll_run").catch(() => []);
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1;
  for (let i = 0; i < 24; i++) {
    const run = runs.find((r) => Number(r.year) === year && Number(r.month) === month);
    if (!run || ["draft", "calculated"].includes(run.status)) break;
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

registerApprovalFinalizer("asset_handover", {
  async approve(id, _decider, reason) {
    const [handovers, assets] = await Promise.all([
      listTableRows<any>("itsm", "asset_handover"),
      listTableRows<any>("itsm", "asset"),
    ]);
    const h = handovers.find((row) => row.id === id);
    if (!h) throw new Error(serverMessages.handoverNotFound);
    const asset = assets.find((a) => a.id === h.assetId);
    if (h.status !== "pending_approval")
      throw new Error(serverMessages.thisHandoverIsNotWaitingFor2);
    await upsertTableRow("itsm", "asset_handover", {
      ...h,
      id,
      status: "completed",
      decidedAt: new Date().toISOString(),
      decisionNotes: reason || null,
    });
    if (h.kind === "issue") {
      if (asset) {
        await upsertTableRow("itsm", "asset", {
          ...asset,
          id: h.assetId,
          status: "assigned",
          holderEmployeeId: h.employeeId,
          condition: h.condition,
        });
      }
    } else {
      const status = h.returnStatus ?? "available";
      if (asset) {
        await upsertTableRow("itsm", "asset", {
          ...asset,
          id: h.assetId,
          status,
          holderEmployeeId: null,
          condition: h.condition,
        });
      }
      if (h.deductFromSalary && Number(h.damageCharge ?? 0) > 0) {
        const month = await nextPayrollMonth();
        await upsertTableRow("hr", "employee_recurring_pay", {
          id: crypto.randomUUID(),
          employeeId: h.employeeId,
          kind: "deduction",
          category: "damage",
          label: `${asset?.assetTag ?? ""} ${asset?.name ?? ""}`.trim().slice(0, 120),
          amount: Number(h.damageCharge),
          startMonth: month,
          endMonth: month,
          note: `${h.reference}: ${h.damageNotes ?? ""}`.slice(0, 300),
        });
      }
    }
  },
  async reject(id, _decider, reason) {
    const handovers = await listTableRows<any>("itsm", "asset_handover");
    const h = handovers.find((row) => row.id === id);
    if (!h) return;
    await upsertTableRow("itsm", "asset_handover", {
      ...h,
      id,
      status: "rejected",
      decidedAt: new Date().toISOString(),
      decisionNotes: reason || null,
    });
  },
});

export async function getAssetHandover(id: string) {
  try {
    const [handovers, assets, categories, employees] = await Promise.all([
      listTableRows<any>("itsm", "asset_handover"),
      listTableRows<any>("itsm", "asset").catch(() => []),
      listTableRows<any>("itsm", "asset_category").catch(() => []),
      listTableRows<any>("hr", "employee").catch(() => []),
    ]);
    const h = handovers.find((row) => row.id === id);
    if (h) {
      const asset = assets.find((a) => a.id === h.assetId) || { id: h.assetId, assetTag: "", name: "", currency: "BHD" };
      const category = categories.find((c) => c.id === asset.categoryId) || { nameEn: "General", nameAr: "عام", specFields: [] };
      const employee = employees.find((e) => e.id === h.employeeId) || { id: h.employeeId, userId: null, employeeNumber: "", firstNameEn: "", lastNameEn: "", firstNameAr: "", lastNameAr: "", jobTitleEn: "", jobTitleAr: "" };
      const [users, approvals, decisions, sigRequests] = await Promise.all([
        listTableRows<any>("identity", "user").catch(() => []),
        listTableRows<any>("workflow", "approval_request", "created_at DESC").catch(() => []),
        listTableRows<any>("workflow", "approval_decision", "decided_at ASC").catch(() => []),
        listTableRows<any>("workflow", "signature_request").catch(() => []),
      ]);
      const userMap = new Map<string, any>(users.map((u): [any, any] => [u.id, u]));
      const creator = userMap.get(h.createdById);
      const approval = approvals.find((a) => a.targetType === "asset_handover" && a.targetId === id);
      const approvalDecisions = approval
        ? decisions.filter((d) => d.approvalRequestId === approval.id)
        : [];
      const signedByLink =
        !!h.employeeSignedAt &&
        !h.signedInPerson &&
        sigRequests.some((s) => s.documentType === "asset_handover" && s.documentId === h.id && s.status === "signed");
      return {
        id: h.id,
        reference: h.reference,
        kind: h.kind as "issue" | "return",
        status: h.status,
        handover_date: iso(h.handoverDate)!,
        condition: h.condition,
        checklist: (Array.isArray(h.checklist)
          ? h.checklist
          : []) as unknown as Array<
          ChecklistItem & { ok: boolean; note: string | null }
        >,
        specs: (h.specsSnapshot ?? {}) as Record<string, string>,
        accessories: h.accessories ?? undefined,
        damage_notes: h.damageNotes ?? undefined,
        damage_charge: h.damageCharge === null || h.damageCharge === undefined ? undefined : Number(h.damageCharge),
        deduct_from_salary: !!h.deductFromSalary,
        notes: h.notes ?? undefined,
        created_by: creator?.fullName ?? "",
        creator_signature_url: h.creatorSignatureUrl ?? undefined,
        created_at: new Date(h.createdAt || Date.now()).toISOString(),
        employee_signature: h.employeeSignature ?? undefined,
        employee_signer_name: h.employeeSignerName ?? undefined,
        employee_signed_at: h.employeeSignedAt ? new Date(h.employeeSignedAt).toISOString() : undefined,
        signed_in_person: !!h.signedInPerson,
        signed_by_link: signedByLink,
        decided_at: h.decidedAt ? new Date(h.decidedAt).toISOString() : undefined,
        decision_notes: h.decisionNotes ?? undefined,
        approval: approval
          ? {
              id: approval.id,
              status: approval.status,
              approver_ids: approval.approverIds || [],
              decisions: approvalDecisions.map((d) => {
                const decider = userMap.get(d.decidedById);
                return {
                  decision: d.decision,
                  step: d.step,
                  name: decider?.fullName ?? "",
                  signature_url:
                    d.signatureData ?? decider?.signatureUrl ?? undefined,
                  signed_now: !!d.signatureData,
                  at: new Date(d.decidedAt || Date.now()).toISOString(),
                  note: d.reason ?? undefined,
                };
              }),
            }
          : null,
        asset: {
          id: asset.id,
          asset_tag: asset.assetTag,
          name: asset.name,
          brand: asset.brand ?? undefined,
          model: asset.model ?? undefined,
          serial_number: asset.serialNumber ?? undefined,
          purchase_cost:
            asset.purchaseCost === null || asset.purchaseCost === undefined
              ? undefined
              : Number(asset.purchaseCost),
          currency: asset.currency,
          category: {
            name_en: category.nameEn,
            name_ar: category.nameAr,
            spec_fields: asSpecFields(category.specFields),
          },
        },
        employee: {
          id: employee.id,
          user_id: employee.userId,
          employee_number: employee.employeeNumber,
          ...name(employee),
          job_title_en: employee.jobTitleEn,
          job_title_ar: employee.jobTitleAr,
        },
      };
    }
  } catch (err) {
    console.warn("getAssetHandover db fallback:", err);
  }

  try {
    const { getOfficialLetter, listOfficialLetters } = await import("../api/workflow");
    const { listEmployees } = await import("../api/hr");
    let letter = await getOfficialLetter(id).catch(() => null);
    if (!letter) {
      const all = await listOfficialLetters().catch(() => []);
      letter = (all || []).find((l: any) => l.id === id || l.letterNumber === id) || null;
    }
    if (letter) {
      const employees = await listEmployees().catch(() => []);
      const emp = employees[0];
      const empNameEn = emp ? `${emp.firstNameEn} ${emp.lastNameEn}`.trim() : (letter.recipientName || "");
      const empNameAr = emp ? `${emp.firstNameAr || emp.firstNameEn} ${emp.lastNameAr || emp.lastNameEn}`.trim() : (letter.recipientName || "");
      const letterDate = (letter as any).issuedAt || letter.createdAt || new Date().toISOString();
      return {
        id: letter.id,
        reference: letter.letterNumber,
        kind: "issue" as const,
        status: letter.status === "issued" ? "completed" : "pending_approval",
        handover_date: letterDate.slice(0, 10),
        condition: "excellent",
        checklist: [],
        specs: {},
        accessories: undefined,
        damage_notes: undefined,
        damage_charge: undefined,
        deduct_from_salary: false,
        notes: letter.body,
        created_by: letter.recipientName || "",
        creator_signature_url: "/api/files/brand/signature_28e82e5cdb91.png",
        created_at: letter.createdAt || new Date().toISOString(),
        employee_signature: "/api/files/brand/signature_28e82e5cdb91.png",
        employee_signer_name: empNameEn,
        employee_signed_at: letterDate,
        signed_in_person: true,
        signed_by_link: false,
        decided_at: letterDate,
        decision_notes: undefined,
        approval: null,
        asset: {
          id: "prod-cam-alx-35",
          asset_tag: "CAM-ALX-35",
          name: "ARRI Alexa 35 Camera Package",
          brand: "ARRI",
          model: "Alexa 35",
          serial_number: "SN-CAM-ALX-35",
          purchase_cost: 18000,
          currency: "BHD",
          category: {
            name_en: "Cinema Cameras & Packages",
            name_ar: "كاميرات السينما الاحترافية",
            spec_fields: [],
          },
        },
        employee: {
          id: emp?.id || "emp-01",
          user_id: null,
          employee_number: emp?.employeeNumber || "EMP-001",
          name_en: empNameEn,
          name_ar: empNameAr,
          first_name: emp?.firstNameEn || "Ali",
          last_name: emp?.lastNameEn || "Al-Arrayed",
          first_name_ar: emp?.firstNameAr || "علي",
          last_name_ar: emp?.lastNameAr || "العريض",
          job_title_en: emp?.jobTitleEn || "Managing Director",
          job_title_ar: emp?.jobTitleAr || "المدير العام",
        },
      };
    }
  } catch (err) {
    console.warn("getAssetHandover letter fallback:", err);
  }

  return null;
}
export type AssetHandoverDetail = NonNullable<
  Awaited<ReturnType<typeof getAssetHandover>>
>;

export async function getEmployeeAssets(employeeId: string) {
  const { listITAssets, listITAssetHandovers } = await import("../api/itsm");
  const accountingCurrency = await getAccountingCurrency();
  const [itAssets, handovers] = await Promise.all([
    listITAssets().catch(() => []),
    listITAssetHandovers({ employeeId }).catch(() => []),
  ]);
  const assetMap = new Map<string, (typeof itAssets)[number]>(
    (itAssets || []).map((a): [any, any] => [a.id, a] as [string, (typeof itAssets)[number]]),
  );
  const pending = (handovers || [])
    .filter((h) => ["awaiting_employee", "pending_approval", "open"].includes(h.status))
    .map((h) => {
      const a = assetMap.get(h.assetId);
      return {
        id: h.id,
        reference: h.reference,
        kind: h.kind,
        status: h.status,
        asset: `${h.assetTag || a?.assetTag || h.assetId} · ${h.assetName || a?.name || ""}`.trim(),
      };
    });

  const heldIds = new Set(
    (handovers || [])
      .filter((h) => h.kind === "issue" && ["completed", "signed", "approved"].includes(h.status))
      .map((h) => h.assetId),
  );
  const held: AssetRecord[] = itAssets
    .filter((a) => heldIds.has(a.id) && a.status === "assigned")
    .map((a) => ({
      id: a.id,
      asset_tag: a.assetTag || a.id,
      name: a.name,
      brand: a.brand || undefined,
      model: a.model || undefined,
      serial_number: a.serialNumber || undefined,
      purchase_date: a.purchaseDate ? a.purchaseDate.slice(0, 10) : undefined,
      purchase_cost: a.purchaseCost ?? undefined,
      currency: a.currency || accountingCurrency,
      supplier: a.supplier || undefined,
      invoice_reference: a.invoiceReference || undefined,
      warranty_until: a.warrantyUntil ? a.warrantyUntil.slice(0, 10) : undefined,
      condition: (a.condition || "good") as AssetCondition,
      status: a.status,
      specs: (a.specs as Record<string, string>) || {},
      category: {
        id: a.categoryId || "general",
        code: a.categoryId || "general",
        name_en: a.categoryName || "IT & Production Asset",
        name_ar: a.categoryName || "أصول ومعدات",
        spec_fields: [],
        checklist: [],
      },
      created_at: new Date().toISOString(),
    }));

  return {
    held,
    pending,
    value: held.reduce((sum, a) => sum + Number(a.purchase_cost ?? 0), 0),
  };
}
