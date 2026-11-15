import {
  canDecideApproval,
  getSignatureMode,
  type Profile,
} from "@platform/database";
import {
  APPROVAL_TARGET_TYPES,
  type ApprovalTargetType,
} from "@platform/database/constants/approvals";
import { listTableRows } from "./api/tables";
import { ROUTES } from "../constants/routes";
import { readableApprovalTypes } from "./approval-access";

export type FactValue =
  | { kind: "text"; value: string }
  | { kind: "bilingual"; en: string; ar: string }
  | { kind: "date"; value: string }
  | { kind: "datetime"; value: string }
  | { kind: "money"; value: number; currency: string }
  | { kind: "number"; value: number; unit?: "days" | "percent" | "people" }
  | { kind: "enum"; group: string; value: string };

export interface ApprovalItemDetail {
  targetType: ApprovalTargetType;
  targetId: string;
  reference: string | null;
  subject: { name: string; email?: string | null } | null;
  facts: Array<{ key: string; value: FactValue }>;
  changes: Array<{
    key: string;
    before: FactValue | null;
    after: FactValue | null;
  }>;
  images: Array<{ key: string; url: string | null }>;
  files: Array<{ name: string; url: string }>;
  note: string | null;
  recordUrl: string | null;
  approval: {
    id: string;
    status: string;
    currentStep: number;
    revision: number;
    selfApproved: boolean;
    createdAt: string;
    requestedBy: { name: string; email: string };
    waitingFor: string[];
    decisions: Array<{
      decision: string;
      name: string;
      at: string;
      reason: string | null;
      step: number;
    }>;
  } | null;
  canDecide: boolean;
  isRequester: boolean;
  signatureRequired: boolean;
}

const text = (value: string | null | undefined): FactValue | null =>
  value ? { kind: "text", value } : null;
const day = (value: Date | string | null | undefined): FactValue | null =>
  value ? { kind: "date", value: new Date(value).toISOString().slice(0, 10) } : null;
const money = (value: unknown, currency = "USD"): FactValue => ({
  kind: "money",
  value: Number(value ?? 0),
  currency,
});
const name = (e: { firstNameEn: string; lastNameEn: string }) =>
  `${e.firstNameEn} ${e.lastNameEn}`;
const bilingual = (en: string, ar: string | null | undefined): FactValue => ({
  kind: "bilingual",
  en,
  ar: ar || en,
});

type Builder = Omit<
  ApprovalItemDetail,
  | "targetType"
  | "targetId"
  | "approval"
  | "canDecide"
  | "isRequester"
  | "signatureRequired"
> & { subjectUserId?: string | null };
const empty = (): Builder => ({
  reference: null,
  subject: null,
  facts: [],
  changes: [],
  images: [],
  files: [],
  note: null,
  recordUrl: null,
});
const push = (b: Builder, key: string, value: FactValue | null) =>
  value && b.facts.push({ key, value });

async function userName(id: string | null | undefined) {
  if (!id) return null;
  const users = await listTableRows<Record<string, any>>("identity", "user");
  const user = users.find((u) => u.id === id);
  return user?.fullName ?? null;
}

async function attachmentsOf(entityType: string, entityId: string) {
  const rows = await listTableRows<Record<string, any>>(
    "notify",
    "attachment",
  );
  return rows
    .filter((r) => r.entityType === entityType && r.entityId === entityId)
    .sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime(),
    )
    .slice(0, 20)
    .map((r) => ({ name: r.fileName, url: r.fileUrl }));
}

async function describe(
  targetType: ApprovalTargetType,
  id: string,
  diff: Record<string, unknown> | null,
): Promise<Builder | null> {
  const b = empty();
  switch (targetType) {
    case "profile_change": {
      const [reqs, users] = await Promise.all([
        listTableRows<Record<string, any>>("system", "profile_change_request"),
        listTableRows<Record<string, any>>("identity", "user"),
      ]);
      const r = reqs.find((x) => x.id === id);
      const user = r ? users.find((u) => u.id === r.userId) : null;
      if (!r || !user) return null;
      const before = (r.oldValues ?? {}) as Record<string, string>;
      const after = (r.newValues ?? {}) as Record<string, string>;
      b.subject = { name: user.fullName, email: user.email };
      b.subjectUserId = user.id;
      for (const key of ["fullName", "email"])
        if (after[key] && after[key] !== before[key])
          b.changes.push({
            key,
            before: text(before[key]),
            after: text(after[key]),
          });
      b.note = typeof diff?.reason === "string" ? diff.reason : null;
      push(b, "status", {
        kind: "enum",
        group: "requestStatus",
        value: r.status,
      });
      return b;
    }
    case "signature_change": {
      const [reqs, users] = await Promise.all([
        listTableRows<Record<string, any>>("system", "signature_change"),
        listTableRows<Record<string, any>>("identity", "user"),
      ]);
      const r = reqs.find((x) => x.id === id);
      const user = r ? users.find((u) => u.id === r.userId) : null;
      if (!r || !user) return null;
      b.subject = { name: user.fullName, email: user.email };
      b.subjectUserId = user.id;
      b.images.push(
        { key: "currentSignature", url: r.previousUrl },
        { key: "newSignature", url: r.signatureUrl },
      );
      push(b, "status", {
        kind: "enum",
        group: "requestStatus",
        value: r.status,
      });
      return b;
    }
    case "account_change": {
      const [reqs, users, roles] = await Promise.all([
        listTableRows<Record<string, any>>("system", "account_change_request"),
        listTableRows<Record<string, any>>("identity", "user"),
        listTableRows<Record<string, any>>("identity", "role"),
      ]);
      const r = reqs.find((x) => x.id === id);
      const user = r ? users.find((u) => u.id === r.userId) : null;
      if (!r || !user) return null;
      const changes = (r.changes ?? {}) as Record<string, unknown>;
      const before = (r.before ?? {}) as Record<string, unknown>;
      b.subject = { name: user.fullName, email: user.email };
      b.subjectUserId = user.id;
      const role = (value: unknown): FactValue | null => {
        const found = roles.find((x) => x.id === value);
        return found
          ? bilingual(found.nameEn, found.nameAr)
          : text(value as string);
      };
      const percent = (value: unknown): FactValue | null =>
        value == null
          ? null
          : { kind: "number", value: Number(value), unit: "percent" };
      for (const [key, value] of Object.entries(changes)) {
        if (key === "statusReason") continue;
        const was = before[key];
        if (key === "role")
          b.changes.push({ key, before: role(was), after: role(value) });
        else if (key === "managerId")
          b.changes.push({
            key: "manager",
            before: text(await userName(was as string)),
            after: text(await userName(value as string)),
          });
        else if (key === "status")
          b.changes.push({
            key,
            before: was
              ? { kind: "enum", group: "accountStatus", value: String(was) }
              : null,
            after: {
              kind: "enum",
              group: "accountStatus",
              value: String(value),
            },
          });
        else
          b.changes.push({ key, before: percent(was), after: percent(value) });
      }
      b.note = (changes.statusReason as string) || r.reason || null;
      push(b, "status", {
        kind: "enum",
        group: "requestStatus",
        value: r.status,
      });
      return b;
    }
    case "leave_request": {
      const [reqs, leaveTypes, employees] = await Promise.all([
        listTableRows<Record<string, any>>("hr", "leave_request"),
        listTableRows<Record<string, any>>("hr", "leave_type"),
        listTableRows<Record<string, any>>("hr", "employee"),
      ]);
      const r = reqs.find((x) => x.id === id);
      const leaveType = r ? leaveTypes.find((lt) => lt.id === r.leaveTypeId) : null;
      const employee = r ? employees.find((e) => e.id === r.employeeId) : null;
      if (!r || !leaveType || !employee) return null;
      b.subject = { name: name(employee as any) };
      b.subjectUserId = employee.userId;
      b.reference = employee.employeeNumber;
      push(b, "leaveType", bilingual(leaveType.nameEn, leaveType.nameAr));
      push(b, "from", day(r.startDate));
      push(b, "to", day(r.endDate));
      push(b, "portion", {
        kind: "enum",
        group: "portion",
        value: r.dayPortion,
      });
      push(b, "days", { kind: "number", value: Number(r.days), unit: "days" });
      push(b, "status", {
        kind: "enum",
        group: "requestStatus",
        value: r.status,
      });
      b.note = r.reason;
      if (r.attachmentUrl)
        b.files.push({ name: "attachment", url: r.attachmentUrl });
      b.recordUrl = ROUTES.hr.leave({ highlight: id });
      return b;
    }
    case "salary_document": {
      const [docs, employees] = await Promise.all([
        listTableRows<Record<string, any>>("hr", "salary_document"),
        listTableRows<Record<string, any>>("hr", "employee"),
      ]);
      const r = docs.find((x) => x.id === id);
      const employee = r ? employees.find((e) => e.id === r.employeeId) : null;
      if (!r || !employee) return null;
      b.subject = { name: name(employee as any) };
      b.subjectUserId = employee.userId;
      b.reference = employee.employeeNumber;
      push(b, "documentKind", {
        kind: "enum",
        group: "salaryDocument",
        value: r.kind,
      });
      const months = (r.months as string[]) ?? [];
      if (months.length) push(b, "months", text(months.join(", ")));
      push(
        b,
        "languages",
        text((Array.isArray(r.languages) ? r.languages : []).join(" + ").toUpperCase()),
      );
      push(b, "status", {
        kind: "enum",
        group: "requestStatus",
        value: r.status,
      });
      b.recordUrl = ROUTES.hr.documents({ highlight: id });
      return b;
    }
    case "expense": {
      const [expenses, categories, deals, contacts, users] = await Promise.all([
        listTableRows<Record<string, any>>("finance", "expense"),
        listTableRows<Record<string, any>>("finance", "expense_category"),
        listTableRows<Record<string, any>>("sales", "crm_deal"),
        listTableRows<Record<string, any>>("sales", "crm_contact"),
        listTableRows<Record<string, any>>("identity", "user"),
      ]);
      const r = expenses.find((x) => x.id === id);
      if (!r) return null;
      const category = r.categoryId ? categories.find((c) => c.id === r.categoryId) : null;
      const deal = r.dealId ? deals.find((d) => d.id === r.dealId) : null;
      const client = r.clientId ? contacts.find((c) => c.id === r.clientId) : null;
      const createdBy = r.createdById ? users.find((u) => u.id === r.createdById) : null;
      b.subject = createdBy ? { name: createdBy.fullName } : null;
      b.subjectUserId = createdBy?.id;
      push(b, "description", text(r.descriptionEn));
      push(b, "amount", money(r.amount, r.currency));
      if (Number(r.inputVatAmount) > 0)
        push(b, "inputVat", money(r.inputVatAmount, r.currency));
      push(b, "date", day(r.expenseDate));
      if (category)
        push(b, "category", bilingual(category.nameEn, category.nameAr));
      push(b, "vendor", text(r.vendorName));
      push(b, "scope", { kind: "enum", group: "expenseScope", value: r.scope });
      push(b, "deal", text(deal?.title));
      push(
        b,
        "client",
        text(
          client
            ? client.companyName ||
                [client.firstName, client.lastName].filter(Boolean).join(" ")
            : null,
        ),
      );
      push(b, "status", {
        kind: "enum",
        group: "requestStatus",
        value: r.status,
      });
      b.note = r.notes;
      b.files = await attachmentsOf("expense", id);
      if (!b.files.length && r.receiptUrl)
        b.files.push({ name: "receipt", url: r.receiptUrl });
      b.recordUrl = ROUTES.expenses.list({ highlight: id });
      return b;
    }
    case "expense_claim": {
      const [claims, categories, deals, users] = await Promise.all([
        listTableRows<Record<string, any>>("finance", "expense_claim"),
        listTableRows<Record<string, any>>("finance", "expense_category"),
        listTableRows<Record<string, any>>("sales", "crm_deal"),
        listTableRows<Record<string, any>>("identity", "user"),
      ]);
      const r = claims.find((x) => x.id === id);
      const claimant = r ? users.find((u) => u.id === r.claimantId) : null;
      if (!r || !claimant) return null;
      const category = r.categoryId ? categories.find((c) => c.id === r.categoryId) : null;
      const deal = r.dealId ? deals.find((d) => d.id === r.dealId) : null;
      b.subject = { name: claimant.fullName, email: claimant.email };
      b.subjectUserId = claimant.id;
      b.reference = r.claimNumber;
      push(b, "amount", money(r.amount, r.currency));
      push(b, "date", day(r.expenseDate));
      if (category)
        push(b, "category", bilingual(category.nameEn, category.nameAr));
      push(b, "deal", text(deal?.title));
      push(b, "status", {
        kind: "enum",
        group: "claimStatus",
        value: r.status,
      });
      b.note = r.reason;
      b.files = await attachmentsOf("expense_claim", id);
      if (!b.files.length && r.receiptUrl)
        b.files.push({ name: "receipt", url: r.receiptUrl });
      b.recordUrl = ROUTES.claims.list({ highlight: id });
      return b;
    }
    case "payroll_run": {
      const [runs, items] = await Promise.all([
        listTableRows<Record<string, any>>("hr", "payroll_run"),
        listTableRows<Record<string, any>>("hr", "payroll_item"),
      ]);
      const r = runs.find((x) => x.id === id);
      if (!r) return null;
      const itemCount = items.filter((i) => i.payrollRunId === id).length;
      b.reference = `${r.year}-${String(r.month).padStart(2, "0")}`;
      push(b, "period", text(b.reference));
      push(b, "employees", {
        kind: "number",
        value: itemCount,
        unit: "people",
      });
      push(b, "totalGross", money(r.totalGross));
      push(b, "totalDeductions", money(r.totalDeductions));
      push(b, "totalNet", money(r.totalNet));
      push(b, "employerCost", money(r.totalEmployerCost));
      push(b, "payDate", day(r.payDate));
      push(b, "status", {
        kind: "enum",
        group: "payrollStatus",
        value: r.status,
      });
      b.recordUrl = ROUTES.hr.payroll({ highlight: id });
      return b;
    }
    case "invoice": {
      const [invoices, contacts] = await Promise.all([
        listTableRows<Record<string, any>>("finance", "invoice"),
        listTableRows<Record<string, any>>("sales", "crm_contact"),
      ]);
      const r = invoices.find((x) => x.id === id);
      if (!r) return null;
      const client = r.clientId ? contacts.find((c) => c.id === r.clientId) : null;
      b.reference = r.invoiceNumber;
      push(
        b,
        "client",
        text(
          client
            ? client.companyName ||
                [client.firstName, client.lastName].filter(Boolean).join(" ")
            : null,
        ),
      );
      push(b, "issueDate", day(r.issueDate));
      push(b, "dueDate", day(r.dueDate));
      push(b, "subtotal", money(r.subtotal, r.currency));
      if (Number(r.discountAmount) > 0)
        push(b, "discount", money(r.discountAmount, r.currency));
      push(b, "total", money(r.totalAmount, r.currency));
      b.recordUrl = ROUTES.invoices.detail(id);
      return b;
    }
    case "quotation": {
      const [quotations, contacts] = await Promise.all([
        listTableRows<Record<string, any>>("sales", "quotation"),
        listTableRows<Record<string, any>>("sales", "crm_contact"),
      ]);
      const r = quotations.find((x) => x.id === id);
      if (!r) return null;
      const client = r.clientId ? contacts.find((c) => c.id === r.clientId) : null;
      b.reference = r.quotationNumber;
      push(
        b,
        "client",
        text(
          client
            ? client.companyName ||
                [client.firstName, client.lastName].filter(Boolean).join(" ")
            : null,
        ),
      );
      push(b, "subtotal", money(r.subtotal, r.currency));
      if (Number(r.discountAmount) > 0)
        push(b, "discount", money(r.discountAmount, r.currency));
      push(b, "total", money(r.totalAmount, r.currency));
      b.recordUrl = ROUTES.quotations.detail(id);
      return b;
    }
    case "service_request": {
      const inquiries = await listTableRows<Record<string, any>>("sales", "inquiry");
      const r = inquiries.find((x) => x.id === id);
      if (!r) return null;
      b.reference = r.projectReference || r.reference;
      b.subject = { name: r.name, email: r.email };
      push(b, "requestType", text(r.requestType));
      push(b, "company", text(r.companyName));
      push(b, "priority", text(r.priority));
      b.note = r.message;
      b.recordUrl = ROUTES.requests.detail(id);
      return b;
    }
    case "purchase_requisition": {
      const [reqs, allLines] = await Promise.all([
        listTableRows<Record<string, any>>("inventory", "purchase_requisition"),
        listTableRows<Record<string, any>>("inventory", "purchase_requisition_line"),
      ]);
      const r = reqs.find((x) => x.id === id);
      if (!r) return null;
      const lines = allLines
        .filter((l) => l.requisitionId === id)
        .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
      b.reference = r.number;
      b.subjectUserId = r.requestedById;
      const requester = await userName(r.requestedById);
      b.subject = requester ? { name: requester } : null;
      push(b, "amount", money(r.estimatedTotal));
      push(b, "neededBy", day(r.neededBy));
      push(b, "lineCount", { kind: "number", value: lines.length });
      b.note = [r.note, ...lines.map((l) => `• ${l.description} × ${Number(l.quantity)}`)].filter(Boolean).join("\n");
      b.recordUrl = ROUTES.procurement.requisition(id);
      return b;
    }
    case "purchase_order": {
      const [orders, allLines, contacts] = await Promise.all([
        listTableRows<Record<string, any>>("inventory", "purchase_order"),
        listTableRows<Record<string, any>>("inventory", "purchase_order_line"),
        listTableRows<Record<string, any>>("sales", "crm_contact"),
      ]);
      const o = orders.find((x) => x.id === id);
      if (!o) return null;
      const supplier = o.supplierId ? contacts.find((c) => c.id === o.supplierId) : null;
      const lines = allLines
        .filter((l) => l.purchaseOrderId === id)
        .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
      b.reference = o.number;
      b.subjectUserId = o.createdById;
      push(
        b,
        "vendor",
        text(
          supplier
            ? supplier.companyName ||
                [supplier.firstName, supplier.lastName].filter(Boolean).join(" ")
            : null,
        ),
      );
      push(b, "total", money(o.total));
      push(b, "date", day(o.orderDate));
      push(b, "expectedDate", day(o.expectedDate));
      push(b, "lineCount", { kind: "number", value: lines.length });
      b.note = [o.note, ...lines.map((l) => `• ${l.description} × ${Number(l.quantity)} @ ${Number(l.unitPrice)}`)].filter(Boolean).join("\n");
      b.recordUrl = ROUTES.procurement.order(id);
      return b;
    }
    default:
      return null;
  }
}

export async function getApprovalItem(
  targetTypeParam: string,
  targetId: string,
  viewer: Profile,
): Promise<ApprovalItemDetail | null> {
  if (!(APPROVAL_TARGET_TYPES as readonly string[]).includes(targetTypeParam))
    return null;
  const targetType = targetTypeParam as ApprovalTargetType;
  const [requests, allDecisions, users] = await Promise.all([
    listTableRows<Record<string, any>>("workflow", "approval_request"),
    listTableRows<Record<string, any>>("workflow", "approval_decision"),
    listTableRows<Record<string, any>>("identity", "user"),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u] as const));
  const latest = requests
    .filter((r) => r.targetType === targetType && r.targetId === targetId)
    .sort((a, b) => Number(b.revision ?? 0) - Number(a.revision ?? 0))[0];
  const latestDecisions = latest
    ? allDecisions
        .filter((d) => d.approvalRequestId === latest.id)
        .sort(
          (a, b) =>
            new Date(a.decidedAt || 0).getTime() -
            new Date(b.decidedAt || 0).getTime(),
        )
    : [];
  const details = await describe(
    targetType,
    targetId,
    (latest?.diffPayload ?? null) as Record<string, unknown> | null,
  );
  if (!details) return null;

  const approverIds: string[] = Array.isArray(latest?.approverIds)
    ? latest.approverIds
    : [];
  const involved =
    viewer.role === "super_admin" ||
    details.subjectUserId === viewer.id ||
    (latest &&
      (latest.requestedById === viewer.id ||
        approverIds.includes(viewer.id) ||
        latestDecisions.some((d) => d.decidedById === viewer.id)));
  if (!involved && !(await readableApprovalTypes()).includes(targetType))
    return null;

  const waitingFor =
    latest?.status === "pending"
      ? approverIds
          .map((uid) => userMap.get(uid)?.fullName)
          .filter((n): n is string => Boolean(n))
      : [];
  const requestedByUser = latest ? userMap.get(latest.requestedById) : null;
  const { subjectUserId: _subject, ...rest } = details;
  return {
    targetType,
    targetId,
    ...rest,
    approval: latest
      ? {
          id: latest.id,
          status: latest.status,
          currentStep: latest.currentStep,
          revision: latest.revision,
          selfApproved: Boolean(latest.selfApproved),
          createdAt: new Date(latest.createdAt || Date.now()).toISOString(),
          requestedBy: {
            name: requestedByUser?.fullName ?? "",
            email: requestedByUser?.email ?? "",
          },
          waitingFor,
          decisions: latestDecisions.map((d) => ({
            decision: d.decision,
            name: userMap.get(d.decidedById)?.fullName ?? "",
            at: new Date(d.decidedAt || Date.now()).toISOString(),
            reason: d.reason ?? null,
            step: d.step,
          })),
        }
      : null,
    canDecide: latest
      ? canDecideApproval(
          {
            status: latest.status,
            requestedById: latest.requestedById,
            approverIds,
            selfApproved: latest.selfApproved,
          },
          viewer,
        )
      : false,
    isRequester: latest?.requestedById === viewer.id,
    signatureRequired: (await getSignatureMode(targetType)) === "live",
  };
}
