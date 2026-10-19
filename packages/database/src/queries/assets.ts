import { serverMessages } from "@ishoot/locales";
import type { Prisma } from "@prisma/client";
import { db, runAtomicMutation } from "../db";
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
  /** Who holds the asset when its status is set to "assigned" by hand. */
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
  /** Where a returned asset goes: "available" (default), "maintenance", "lost" or "retired". A damaged return no longer assumes servicing. */
  status_after_return?: string;
  notes?: string;
  offboarding_id?: string;
}

export interface HandoverSignature {
  signature: string;
  signer_name: string;
}

const iso = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : undefined;
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

// ---------------------------------------------------------------- categories

export async function listAssetCategories(
  includeInactive = true,
): Promise<AssetCategoryRecord[]> {
  const rows = await db.assetCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { assets: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name_en: r.nameEn,
    name_ar: r.nameAr,
    spec_fields: asSpecFields(r.specFields),
    checklist: asChecklist(r.checklist),
    is_active: r.isActive,
    assets: r._count.assets,
  }));
}

/** A category with its own spec fields and handover checklist; keys stay stable so recorded values keep their meaning. */
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
      throw new Error(
        serverMessages.everyFieldAndChecklistItemNeeds,
      );
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
      throw new Error(
        serverMessages.everyFieldAndChecklistItemNeeds,
      );
    return { key: key(c.key, labelEn), labelEn, labelAr };
  });
  const data = {
    nameEn,
    nameAr,
    specFields: specFields as unknown as Prisma.InputJsonValue,
    checklist: checklist as unknown as Prisma.InputJsonValue,
    isActive: !!input.is_active,
  };
  if (id) return db.assetCategory.update({ where: { id }, data });
  let code = slug(nameEn) || "category";
  for (
    let n = 2;
    await db.assetCategory.findUnique({
      where: { code },
      select: { id: true },
    });
    n++
  )
    code = `${slug(nameEn)}_${n}`;
  return db.assetCategory.create({
    data: { ...data, code, displayOrder: await db.assetCategory.count() },
  });
}

// ---------------------------------------------------------------- assets

const assetInclude = {
  category: true,
  holder: {
    select: {
      id: true,
      employeeNumber: true,
      firstNameEn: true,
      lastNameEn: true,
      firstNameAr: true,
      lastNameAr: true,
    },
  },
  handovers: {
    where: { status: { in: ["awaiting_employee", "pending_approval"] } },
    select: { id: true, reference: true, kind: true, status: true },
    take: 1,
  },
} satisfies Prisma.AssetInclude;
type AssetRow = Prisma.AssetGetPayload<{ include: typeof assetInclude }>;

function mapAsset(a: AssetRow): AssetRecord {
  return {
    id: a.id,
    asset_tag: a.assetTag,
    category: {
      id: a.category.id,
      code: a.category.code,
      name_en: a.category.nameEn,
      name_ar: a.category.nameAr,
      spec_fields: asSpecFields(a.category.specFields),
      checklist: asChecklist(a.category.checklist),
    },
    name: a.name,
    brand: a.brand ?? undefined,
    model: a.model ?? undefined,
    serial_number: a.serialNumber ?? undefined,
    purchase_date: iso(a.purchaseDate),
    purchase_cost: a.purchaseCost === null ? undefined : Number(a.purchaseCost),
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
    open_handover: a.handovers[0] ? { ...a.handovers[0] } : undefined,
    created_at: a.createdAt.toISOString(),
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
  const and: Prisma.AssetWhereInput[] = [];
  const q = filters.q?.trim().slice(0, 100);
  if (q)
    and.push({
      OR: [
        "assetTag",
        "name",
        "brand",
        "model",
        "serialNumber",
        "supplier",
      ].map((f) => ({ [f]: { contains: q, mode: "insensitive" as const } })),
    });
  if (filters.category && filters.category !== "all")
    and.push({ categoryId: filters.category });
  if (filters.status && filters.status !== "all")
    and.push({ status: filters.status });
  if (filters.condition && filters.condition !== "all")
    and.push({ condition: filters.condition });
  if (filters.holder && filters.holder !== "all")
    and.push({ holderEmployeeId: filters.holder });
  const orderBy: Prisma.AssetOrderByWithRelationInput[] =
    filters.sort === "newest"
      ? [{ createdAt: "desc" }]
      : filters.sort === "name"
        ? [{ name: "asc" }]
        : filters.sort === "value_desc"
          ? [{ purchaseCost: { sort: "desc", nulls: "last" } }]
          : filters.sort === "purchase_desc"
            ? [{ purchaseDate: { sort: "desc", nulls: "last" } }]
            : filters.sort === "warranty_asc"
              ? [{ warrantyUntil: { sort: "asc", nulls: "last" } }]
              : [{ assetTag: "asc" }];
  const [rows, byStatus, value] = await Promise.all([
    db.asset.findMany({
      where: and.length ? { AND: and } : {},
      include: assetInclude,
      orderBy,
      take: 500,
    }),
    db.asset.groupBy({ by: ["status"], _count: { _all: true } }),
    db.asset.aggregate({
      where: { status: { notIn: ["retired", "lost"] }, currency: "BHD" },
      _sum: { purchaseCost: true },
    }),
  ]);
  return {
    items: rows.map(mapAsset),
    counts: Object.fromEntries(
      byStatus.map((g) => [g.status, g._count._all]),
    ) as Record<string, number>,
    totalValue: Number(value._sum.purchaseCost ?? 0),
  };
}

export async function getAsset(id: string) {
  const asset = await db.asset.findUnique({
    where: { id },
    include: assetInclude,
  });
  if (!asset) return null;
  const handovers = await db.assetHandover.findMany({
    where: { assetId: id },
    orderBy: { createdAt: "desc" },
    include: {
      employee: {
        select: {
          firstNameEn: true,
          lastNameEn: true,
          firstNameAr: true,
          lastNameAr: true,
        },
      },
    },
  });
  return {
    asset: mapAsset(asset),
    handovers: handovers.map((h) => ({
      id: h.id,
      reference: h.reference,
      kind: h.kind,
      status: h.status,
      handover_date: iso(h.handoverDate)!,
      condition: h.condition,
      employee: name(h.employee),
      damage_charge:
        h.damageCharge === null ? undefined : Number(h.damageCharge),
    })),
  };
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
      : Math.round(Number(input.purchase_cost) * 1000) / 1000;
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
    specs: specs as Prisma.InputJsonValue,
  };
}

export async function saveAsset(
  input: AssetInput,
  actorId: string,
  id?: string,
) {
  return runAtomicMutation(async () => {
    const category = await db.assetCategory.findUnique({
      where: { id: input.category_id },
    });
    if (!category) throw new Error(serverMessages.chooseTheAssetSCategory);
    const data = normalizeAsset(input, asSpecFields(category.specFields));
    if (data.serialNumber) {
      const clash = await db.asset.findFirst({
        where: {
          categoryId: category.id,
          serialNumber: data.serialNumber,
          ...(id ? { id: { not: id } } : {}),
        },
        select: { id: true },
      });
      if (clash)
        throw new Error(
          serverMessages.anotherAssetInThisCategoryHas,
        );
    }
    if (id) {
      const existing = await db.asset.findUnique({
        where: { id },
        select: { status: true, holderEmployeeId: true },
      });
      if (!existing) throw new Error(serverMessages.assetNotFound);
      // Any status can be set by hand. Only a pending handover blocks it, since it would change hands underneath the edit.
      const status = input.status || existing.status;
      if (!(ASSET_STATUSES as readonly string[]).includes(status))
        throw new Error(serverMessages.invalidInput);
      let holderEmployeeId = existing.holderEmployeeId;
      if (status !== existing.status) {
        const open = await db.assetHandover.count({
          where: {
            assetId: id,
            status: { in: ["awaiting_employee", "pending_approval"] },
          },
        });
        if (open) throw new Error(serverMessages.thisAssetAlreadyHasAHandover);
        if (status === "assigned") {
          const holder = input.holder_employee_id
            ? await db.employee.findUnique({
                where: { id: input.holder_employee_id },
                select: { id: true },
              })
            : null;
          if (!holder) throw new Error(serverMessages.employeeNotFound);
          holderEmployeeId = holder.id;
        } else holderEmployeeId = null;
      }
      return db.asset.update({
        where: { id },
        data: { ...data, categoryId: category.id, status, holderEmployeeId },
      });
    }
    const assetTag = await getNextSequenceNumber("AST");
    return db.asset.create({
      data: {
        ...data,
        categoryId: category.id,
        assetTag,
        status: "available",
        createdById: actorId,
      },
    });
  });
}

// ---------------------------------------------------------------- handovers

/**
 * Starts issuing an asset to an employee or taking it back: condition, checklist and damage are recorded with the
 * issuer's signature. The employee then signs (in their profile, or in person now), and the handover goes to approval.
 */
export async function startAssetHandover(
  input: HandoverInput,
  actorId: string,
  inPerson?: HandoverSignature,
  issuerSignature?: string | null,
) {
  return runAtomicMutation(async () => {
    const asset = await db.asset.findUnique({
      where: { id: input.asset_id },
      include: {
        category: true,
        handovers: {
          where: { status: { in: ["awaiting_employee", "pending_approval"] } },
          select: { id: true },
        },
      },
    });
    if (!asset) throw new Error(serverMessages.assetNotFound);
    if (asset.handovers.length)
      throw new Error(serverMessages.thisAssetAlreadyHasAHandover);
    const employee = await db.employee.findUnique({
      where: { id: input.employee_id },
      select: {
        id: true,
        status: true,
        userId: true,
        firstNameEn: true,
        lastNameEn: true,
      },
    });
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
    const items = asChecklist(asset.category.checklist);
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
    // The issuer signs with their saved signature, or draws it now when handovers are signed on the spot.
    const creatorSignatureUrl = await resolveSigningSignature(
      "asset_handover",
      actorId,
      issuerSignature,
    );
    const returnStatus =
      input.kind === "return"
        ? input.status_after_return || "available"
        : null;
    if (
      returnStatus &&
      !["available", "maintenance", "lost", "retired"].includes(returnStatus)
    )
      throw new Error(serverMessages.invalidInput);
    const reference = await getNextSequenceNumber("AHO");
    const handover = await db.assetHandover.create({
      data: {
        reference,
        assetId: asset.id,
        employeeId: employee.id,
        kind: input.kind,
        handoverDate,
        condition: input.condition,
        checklist: checklist as unknown as Prisma.InputJsonValue,
        specsSnapshot: asset.specs as Prisma.InputJsonValue,
        accessories: clean(input.accessories, 500),
        damageNotes,
        damageCharge: charge,
        deductFromSalary: !!input.deduct_from_salary && (charge ?? 0) > 0,
        returnStatus,
        notes: clean(input.notes, 1000),
        offboardingId: input.offboarding_id || null,
        createdById: actorId,
        creatorSignatureUrl,
      },
    });
    if (inPerson) {
      await signAssetHandover(handover.id, inPerson, actorId, true);
    } else if (employee.userId) {
      await db.notification.create({
        data: {
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
        },
      });
    }
    return db.assetHandover.findUniqueOrThrow({ where: { id: handover.id } });
  });
}

/**
 * The employee's signature: in their profile, on the issuer's device in person, or through a one-time signing link
 * sent to them ("link", where `actorId` is the staff member who sent it). The handover then goes to approval.
 */
export async function signAssetHandover(
  id: string,
  input: HandoverSignature,
  actorId: string,
  inPerson: boolean | "link",
) {
  return runAtomicMutation(async () => {
    const handover = await db.assetHandover.findUnique({
      where: { id },
      include: {
        employee: { select: { userId: true } },
        asset: { select: { purchaseCost: true } },
      },
    });
    if (!handover) throw new Error(serverMessages.handoverNotFound);
    if (handover.status !== "awaiting_employee")
      throw new Error(serverMessages.thisHandoverIsNotWaitingFor);
    if (inPerson === false && handover.employee.userId !== actorId)
      throw new Error(serverMessages.onlyTheEmployeeCanSignThis);
    validateSignatureImage(input.signature);
    const signerName = clean(input.signer_name, 120);
    if (!signerName) throw new Error(serverMessages.enterYourFullName);
    await db.assetHandover.update({
      where: { id },
      data: {
        employeeSignature: input.signature,
        employeeSignerName: signerName,
        employeeSignedAt: new Date(),
        signedInPerson: inPerson === true,
        status: "pending_approval",
      },
    });
    await submitForApproval({
      targetType: "asset_handover",
      targetId: id,
      requesterId: handover.employee.userId ?? handover.createdById,
      policySnapshot: {
        kind: handover.kind,
        value:
          handover.asset.purchaseCost === null
            ? null
            : Number(handover.asset.purchaseCost),
      },
    });
    return db.assetHandover.findUniqueOrThrow({ where: { id } });
  });
}

export async function cancelAssetHandover(id: string) {
  return runAtomicMutation(async () => {
    const handover = await db.assetHandover.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!handover) throw new Error(serverMessages.handoverNotFound);
    if (!["awaiting_employee", "pending_approval"].includes(handover.status))
      throw new Error(serverMessages.onlyOpenHandoversCanBeCancelled);
    await cancelPendingApprovals("asset_handover", id);
    await db.assetHandover.update({
      where: { id },
      data: { status: "cancelled", decidedAt: new Date() },
    });
  });
}

/** The payroll month a charge is recovered in: the first month whose payroll is not yet submitted. */
async function nextPayrollMonth(): Promise<string> {
  const now = new Date(Date.now() + 3 * 3600000);
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1;
  for (let i = 0; i < 24; i++) {
    const run = await db.payrollRun.findUnique({
      where: { year_month: { year, month } },
      select: { status: true },
    });
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
    const h = await db.assetHandover.findUniqueOrThrow({
      where: { id },
      include: { asset: { select: { assetTag: true, name: true } } },
    });
    if (h.status !== "pending_approval")
      throw new Error(serverMessages.thisHandoverIsNotWaitingFor2);
    await db.assetHandover.update({
      where: { id },
      data: {
        status: "completed",
        decidedAt: new Date(),
        decisionNotes: reason || null,
      },
    });
    if (h.kind === "issue") {
      await db.asset.update({
        where: { id: h.assetId },
        data: {
          status: "assigned",
          holderEmployeeId: h.employeeId,
          condition: h.condition,
        },
      });
    } else {
      // The returner chooses where the asset goes; damage alone no longer sends it to servicing.
      const status = h.returnStatus ?? "available";
      await db.asset.update({
        where: { id: h.assetId },
        data: { status, holderEmployeeId: null, condition: h.condition },
      });
      if (h.deductFromSalary && Number(h.damageCharge ?? 0) > 0) {
        const month = await nextPayrollMonth();
        await db.employeeRecurringPay.create({
          data: {
            employeeId: h.employeeId,
            kind: "deduction",
            category: "damage",
            label: `${h.asset.assetTag} ${h.asset.name}`.slice(0, 120),
            amount: Number(h.damageCharge),
            startMonth: month,
            endMonth: month,
            note: `${h.reference}: ${h.damageNotes ?? ""}`.slice(0, 300),
          },
        });
      }
    }
  },
  async reject(id, _decider, reason) {
    await db.assetHandover.update({
      where: { id },
      data: {
        status: "rejected",
        decidedAt: new Date(),
        decisionNotes: reason || null,
      },
    });
  },
});

export async function getAssetHandover(id: string) {
  const h = await db.assetHandover.findUnique({
    where: { id },
    include: {
      asset: { include: { category: true } },
      employee: {
        select: {
          id: true,
          userId: true,
          employeeNumber: true,
          firstNameEn: true,
          lastNameEn: true,
          firstNameAr: true,
          lastNameAr: true,
          jobTitleEn: true,
          jobTitleAr: true,
        },
      },
    },
  });
  if (!h) return null;
  const [creator, approval] = await Promise.all([
    db.user.findUnique({
      where: { id: h.createdById },
      select: { fullName: true },
    }),
    db.approvalRequest.findFirst({
      where: { targetType: "asset_handover", targetId: id },
      orderBy: { createdAt: "desc" },
      include: {
        decisions: {
          orderBy: { decidedAt: "asc" },
          include: {
            decidedBy: { select: { fullName: true, signatureUrl: true } },
          },
        },
      },
    }),
  ]);
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
    damage_charge: h.damageCharge === null ? undefined : Number(h.damageCharge),
    deduct_from_salary: h.deductFromSalary,
    notes: h.notes ?? undefined,
    created_by: creator?.fullName ?? "",
    creator_signature_url: h.creatorSignatureUrl ?? undefined,
    created_at: h.createdAt.toISOString(),
    employee_signature: h.employeeSignature ?? undefined,
    employee_signer_name: h.employeeSignerName ?? undefined,
    employee_signed_at: h.employeeSignedAt?.toISOString(),
    signed_in_person: h.signedInPerson,
    signed_by_link:
      !!h.employeeSignedAt &&
      !h.signedInPerson &&
      !!(await db.signatureRequest.findFirst({
        where: {
          documentType: "asset_handover",
          documentId: h.id,
          status: "signed",
        },
        select: { id: true },
      })),
    decided_at: h.decidedAt?.toISOString(),
    decision_notes: h.decisionNotes ?? undefined,
    approval: approval
      ? {
          id: approval.id,
          status: approval.status,
          approver_ids: approval.approverIds,
          decisions: approval.decisions.map((d) => ({
            decision: d.decision,
            step: d.step,
            name: d.decidedBy.fullName,
            signature_url:
              d.signatureData ?? d.decidedBy.signatureUrl ?? undefined,
            signed_now: !!d.signatureData,
            at: d.decidedAt.toISOString(),
            note: d.reason ?? undefined,
          })),
        }
      : null,
    asset: {
      id: h.asset.id,
      asset_tag: h.asset.assetTag,
      name: h.asset.name,
      brand: h.asset.brand ?? undefined,
      model: h.asset.model ?? undefined,
      serial_number: h.asset.serialNumber ?? undefined,
      purchase_cost:
        h.asset.purchaseCost === null
          ? undefined
          : Number(h.asset.purchaseCost),
      currency: h.asset.currency,
      category: {
        name_en: h.asset.category.nameEn,
        name_ar: h.asset.category.nameAr,
        spec_fields: asSpecFields(h.asset.category.specFields),
      },
    },
    employee: {
      id: h.employee.id,
      user_id: h.employee.userId,
      employee_number: h.employee.employeeNumber,
      ...name(h.employee),
      job_title_en: h.employee.jobTitleEn,
      job_title_ar: h.employee.jobTitleAr,
    },
  };
}
export type AssetHandoverDetail = NonNullable<
  Awaited<ReturnType<typeof getAssetHandover>>
>;

/** Assets an employee holds and handovers waiting for them, for the profile and the employee page. */
export async function getEmployeeAssets(employeeId: string) {
  const [held, pending] = await Promise.all([
    db.asset.findMany({
      where: { holderEmployeeId: employeeId },
      include: assetInclude,
      orderBy: { assetTag: "asc" },
    }),
    db.assetHandover.findMany({
      where: {
        employeeId,
        status: { in: ["awaiting_employee", "pending_approval"] },
      },
      include: { asset: { select: { assetTag: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return {
    held: held.map(mapAsset),
    pending: pending.map((h) => ({
      id: h.id,
      reference: h.reference,
      kind: h.kind,
      status: h.status,
      asset: `${h.asset.assetTag} · ${h.asset.name}`,
    })),
    value: held.reduce((sum, a) => sum + Number(a.purchaseCost ?? 0), 0),
  };
}
