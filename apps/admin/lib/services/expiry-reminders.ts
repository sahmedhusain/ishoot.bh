import { listTableRows, upsertTableRow } from "../api/tables";
import { ROUTES } from "../constants/routes";
import { hasPermission } from "../queries/permissions";
import { listExpiringEmployeeDocuments } from "../queries/employee-credentials";
import type {
  PermissionAction,
  PermissionResource,
} from "../constants/permissions";

const STAGES = [60, 30, 7, 0] as const;
const stageOf = (days: number) =>
  days < 0 ? 0 : (STAGES.filter((s) => days <= s).at(-1) ?? null);

async function usersWith(
  resource: PermissionResource,
  action: PermissionAction,
) {
  const allUsers = await listTableRows<any>("identity", "user").catch(() => []);
  const users = allUsers.filter((u) => u.isActive);
  const allowed = await Promise.all(
    users.map((u) =>
      hasPermission(
        u.role,
        resource,
        action,
        u.permissions as Record<string, boolean> | null,
      ),
    ),
  );
  return users.filter((_, i) => allowed[i]).map((u) => u.id);
}

interface Reminder {
  key: string;
  recipients: string[];
  title: string;
  message: string;
  messageKey: string;
  params: Record<string, string>;
  actionUrl: string;
  entityType: string;
  entityId: string;
}

async function send(reminders: Reminder[]) {
  let sent = 0;
  const pending = reminders.filter((r) => r.recipients.length);
  const wantedKeys = new Set(pending.map((r) => r.key));
  const existingNotifs = pending.length
    ? await listTableRows<any>("notify", "notification").catch(() => [])
    : [];
  const told = new Set(
    existingNotifs
      .filter((n) => n.eventKey && wantedKeys.has(n.eventKey))
      .map((n) => `${n.eventKey}|${n.userId}`),
  );
  for (const r of pending) {
    const data = r.recipients
      .filter((id) => !told.has(`${r.key}|${id}`))
      .map((userId) => ({
        id: crypto.randomUUID(),
        userId,
        title: r.title,
        message: r.message,
        type:
          r.params.days === "0" || r.params.days.startsWith("-")
            ? "warning"
            : "info",
        entityType: r.entityType,
        entityId: r.entityId,
        messageKey: r.messageKey,
        messageParams: r.params,
        actionUrl: r.actionUrl,
        eventKey: r.key,
        isRead: false,
      }));
    if (data.length) {
      await Promise.all(data.map((row) => upsertTableRow("notify", "notification", row)));
      sent += data.length;
    }
  }
  return sent;
}

export async function sendExpiryReminders() {
  const reminders: Reminder[] = [];
  const cutoffMs = Date.now() + STAGES[0] * 86400000;
  const [hr, admins, employeeDocs, rawCompanyDocs, rawTaxes] = await Promise.all([
    usersWith("employees", "edit"),
    usersWith("settings", "write"),
    listExpiringEmployeeDocuments(STAGES[0]),
    listTableRows<any>("system", "company_document").catch(() => []),
    listTableRows<any>("finance", "tax_rate").catch(() => []),
  ]);
  const companyDocs = rawCompanyDocs
    .filter((d) => d.validUntil && new Date(d.validUntil).getTime() <= cutoffMs)
    .map((d) => ({ ...d, validUntil: new Date(d.validUntil) }));
  const taxes = rawTaxes
    .filter(
      (t) =>
        t.isActive &&
        t.certificateValidUntil &&
        new Date(t.certificateValidUntil).getTime() <= cutoffMs,
    )
    .map((t) => ({ ...t, certificateValidUntil: new Date(t.certificateValidUntil) }));
  for (const doc of employeeDocs) {
    const stage = stageOf(doc.days);
    if (stage === null) continue;
    reminders.push({
      key: `expiry:employee:${doc.employeeId}:${doc.document}:${doc.label ?? ""}:${doc.expiryDate}:${stage}`,
      recipients: hr,
      title:
        doc.days < 0
          ? "Employee document expired"
          : "Employee document expiring",
      message: `${doc.nameEn}: ${doc.label ?? doc.document} ${doc.days < 0 ? "expired on" : "expires on"} ${doc.expiryDate}`,
      messageKey:
        doc.days < 0
          ? "expiryReminders.employeeExpired"
          : "expiryReminders.employeeExpiring",
      params: {
        nameEn: doc.nameEn,
        nameAr: doc.nameAr,
        document: doc.document,
        label: doc.label ?? "",
        date: doc.expiryDate,
        days: String(doc.days),
      },
      actionUrl: ROUTES.hr.employee(doc.employeeId),
      entityType: "employee",
      entityId: doc.employeeId,
    });
  }
  const today = Date.parse(
    new Date().toISOString().slice(0, 10),
  );
  const daysTo = (d: Date) => Math.round((d.getTime() - today) / 86400000);
  for (const doc of companyDocs) {
    if (!doc.validUntil) continue;
    const days = daysTo(doc.validUntil);
    const stage = stageOf(days);
    if (stage === null) continue;
    const date = doc.validUntil.toISOString().slice(0, 10);
    reminders.push({
      key: `expiry:company-document:${doc.id}:${date}:${stage}`,
      recipients: admins,
      title:
        days < 0 ? "Company document expired" : "Company document expiring",
      message: `${doc.titleEn} ${days < 0 ? "expired on" : "expires on"} ${date}`,
      messageKey:
        days < 0
          ? "expiryReminders.companyExpired"
          : "expiryReminders.companyExpiring",
      params: {
        nameEn: doc.titleEn,
        nameAr: doc.titleAr ?? doc.titleEn,
        date,
        days: String(days),
      },
      actionUrl: ROUTES.company.documents,
      entityType: "company_document",
      entityId: doc.id,
    });
  }
  for (const tax of taxes) {
    if (!tax.certificateValidUntil) continue;
    const days = daysTo(tax.certificateValidUntil);
    const stage = stageOf(days);
    if (stage === null) continue;
    const date = tax.certificateValidUntil.toISOString().slice(0, 10);
    reminders.push({
      key: `expiry:tax-certificate:${tax.id}:${date}:${stage}`,
      recipients: admins,
      title: days < 0 ? "Tax certificate expired" : "Tax certificate expiring",
      message: `${tax.nameEn} ${days < 0 ? "expired on" : "expires on"} ${date}`,
      messageKey:
        days < 0
          ? "expiryReminders.companyExpired"
          : "expiryReminders.companyExpiring",
      params: {
        nameEn: tax.nameEn,
        nameAr: tax.nameAr,
        date,
        days: String(days),
      },
      actionUrl: ROUTES.settings.company,
      entityType: "tax_rate",
      entityId: tax.id,
    });
  }
  return send(reminders);
}
