import { listInvoices, listPayments } from "../api/finance";
import {
  listDepartments,
  listEmployees,
  listHRUsers,
  listLeaveRequests,
} from "../api/hr";
import { listInquiries, listQuotations } from "../api/sales";
import { leaveDaysRequested } from "../constants/hr";
import { companyCurrency } from "../finance/company-currency";

export interface TeamMemberKpis {
  userId: string;
  name: string;
  role: string;
  quotations: {
    issued: number;
    accepted: number;
    value: number;
    acceptedValue: number;
    winRate: number;
  };
  sales: { invoices: number; invoicedNet: number; collectedNet: number };
  requests: {
    assigned: number;
    resolved: number;
    open: number;
    overdue: number;
    avgResolutionDays: number | null;
  };
  leaveDays: number;
}

export interface TeamHistoryItem {
  kind: "quotation" | "invoice" | "request";
  id: string;
  reference: string;
  title: string;
  status: string;
  amount: number | null;
  currency: string | null;
  date: string;
}

const parseDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

export async function getTeamMembers(
  managerId: string,
  includeEveryone = false,
) {
  const [users, departments, employees] = await Promise.all([
    listHRUsers().catch(() => []),
    includeEveryone ? Promise.resolve([]) : listDepartments().catch(() => []),
    includeEveryone ? Promise.resolve([]) : listEmployees().catch(() => []),
  ]);

  const activeUsers = (users as any[])
    .filter((u) => u.isActive !== false && u.id !== managerId)
    .map((u) => ({
      id: u.id,
      fullName: u.fullName || u.email || u.id,
      role: u.role || "staff",
      managerId: u.managerId ?? null,
    }));

  if (includeEveryone) {
    return activeUsers
      .map(({ id, fullName, role }) => ({ id, fullName, role }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  const managedDeptIds = new Set(
    (departments as any[])
      .filter((d) => d.managerId === managerId)
      .map((d) => d.id),
  );
  const deptUserIds = new Set(
    (employees as any[])
      .filter((e) => e.departmentId && managedDeptIds.has(e.departmentId) && e.userId)
      .map((e) => e.userId as string),
  );

  return activeUsers
    .filter((u) => u.managerId === managerId || deptUserIds.has(u.id))
    .map(({ id, fullName, role }) => ({ id, fullName, role }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function getTeamPerformance(
  memberIds: string[],
  from: Date,
  to: Date,
): Promise<TeamMemberKpis[]> {
  const FUNCTIONAL_CURRENCY = await companyCurrency();
  if (!memberIds.length) return [];
  const memberSet = new Set(memberIds);

  const [allUsers, allQuotes, allInvoices, allPayments, allInquiries, allLeaves, allEmployees] =
    await Promise.all([
      listHRUsers().catch(() => []),
      listQuotations().catch(() => []),
      listInvoices().catch(() => []),
      listPayments().catch(() => []),
      listInquiries().catch(() => []),
      listLeaveRequests().catch(() => []),
      listEmployees().catch(() => []),
    ]);

  const users = (allUsers as any[])
    .filter((u) => memberSet.has(u.id))
    .map((u) => ({
      id: u.id,
      fullName: u.fullName || u.email || u.id,
      role: u.role || "staff",
    }));

  const inRange = (d: Date | null) => !!d && d >= from && d <= to;

  const quotes = (allQuotes as any[]).filter((q) => {
    const owner = q.salesOwnerId ?? q.sales_owner_id;
    const issue = parseDate(q.issueDate ?? q.issue_date);
    return (
      owner &&
      memberSet.has(owner) &&
      inRange(issue) &&
      !["draft", "cancelled"].includes(q.status) &&
      (q.currency ?? FUNCTIONAL_CURRENCY) === FUNCTIONAL_CURRENCY
    );
  });

  const invoices = (allInvoices as any[]).filter((i) => {
    const owner = i.salesOwnerId ?? i.sales_owner_id;
    const issue = parseDate(i.issueDate ?? i.issue_date);
    return (
      owner &&
      memberSet.has(owner) &&
      inRange(issue) &&
      !["draft", "void"].includes(i.status) &&
      (i.currency ?? FUNCTIONAL_CURRENCY) === FUNCTIONAL_CURRENCY
    );
  });

  const invoiceById = new Map((allInvoices as any[]).map((i) => [i.id, i]));
  const payments = (allPayments as any[]).filter((p) => {
    const pDate = parseDate(p.paymentDate ?? p.payment_date);
    if (!inRange(pDate)) return false;
    if ((p.currency ?? FUNCTIONAL_CURRENCY) !== FUNCTIONAL_CURRENCY) return false;
    const inv = p.invoice ?? invoiceById.get(p.invoiceId ?? p.invoice_id);
    if (!inv || inv.status === "void") return false;
    const owner = inv.salesOwnerId ?? inv.sales_owner_id;
    return !!owner && memberSet.has(owner);
  });

  const srInquiries = (allInquiries as any[]).filter((r) => {
    const assigned = r.assignedToId ?? r.assigned_to_id;
    const reqType = r.requestType ?? r.request_type;
    return !!assigned && memberSet.has(assigned) && reqType === "SR";
  });

  const requests = srInquiries.filter((r) => {
    const c = parseDate(r.createdAt ?? r.created_at);
    return !c || c <= to;
  });

  const resolved = srInquiries.filter((r) =>
    inRange(parseDate(r.resolvedAt ?? r.resolved_at)),
  );

  const empToUser = new Map(
    (allEmployees as any[])
      .filter((e) => e.userId && memberSet.has(e.userId))
      .map((e) => [e.id, e.userId as string]),
  );

  const leave = (allLeaves as any[]).filter((l) => {
    if (l.status !== "approved") return false;
    const uid = empToUser.get(l.employeeId);
    if (!uid) return false;
    const start = parseDate(l.startDate);
    const end = parseDate(l.endDate);
    return !!start && !!end && start <= to && end >= from;
  });

  const now = new Date();
  const round3 = (n: number) => Math.round(n * 1000) / 1000;
  const net = (x: any) =>
    Number(x.subtotal ?? 0) - Number(x.discountAmount ?? x.discount_amount ?? 0);

  return users
    .map((u) => {
      const q = quotes.filter((x) => (x.salesOwnerId ?? x.sales_owner_id) === u.id);
      const accepted = q.filter((x) => ["accepted", "converted"].includes(x.status));
      const decided = q.filter((x) =>
        ["accepted", "converted", "rejected", "expired"].includes(x.status),
      ).length;
      const inv = invoices.filter((x) => (x.salesOwnerId ?? x.sales_owner_id) === u.id);
      const collected = payments
        .filter((p) => {
          const i = p.invoice ?? invoiceById.get(p.invoiceId ?? p.invoice_id);
          return (i?.salesOwnerId ?? i?.sales_owner_id) === u.id;
        })
        .reduce((sum, p) => {
          const i = p.invoice ?? invoiceById.get(p.invoiceId ?? p.invoice_id);
          const total = Number(i?.totalAmount ?? i?.total_amount ?? 0);
          const amount = Number(p.amount ?? 0);
          const vat = Number(i?.vatAmount ?? i?.vat_amount ?? 0);
          const otherTax = Number(i?.otherTaxAmount ?? i?.other_tax_amount ?? 0);
          return (
            sum +
            (total > 0 ? amount - ((vat + otherTax) * amount) / total : amount)
          );
        }, 0);

      const r = requests.filter((x) => (x.assignedToId ?? x.assigned_to_id) === u.id);
      const open = r.filter(
        (x) => !["resolved", "rejected"].includes(x.workflowStatus ?? x.workflow_status),
      );
      const done = resolved.filter(
        (x) => (x.assignedToId ?? x.assigned_to_id) === u.id,
      );
      const days = done
        .map((x) => {
          const c = parseDate(x.createdAt ?? x.created_at);
          const res = parseDate(x.resolvedAt ?? x.resolved_at);
          return c && res ? (res.getTime() - c.getTime()) / 86400000 : null;
        })
        .filter((v): v is number => v !== null);

      return {
        userId: u.id,
        name: u.fullName,
        role: u.role,
        quotations: {
          issued: q.length,
          accepted: accepted.length,
          value: round3(q.reduce((s, x) => s + net(x), 0)),
          acceptedValue: round3(accepted.reduce((s, x) => s + net(x), 0)),
          winRate: decided ? Math.round((accepted.length / decided) * 100) : 0,
        },
        sales: {
          invoices: inv.length,
          invoicedNet: round3(inv.reduce((s, x) => s + net(x), 0)),
          collectedNet: round3(collected),
        },
        requests: {
          assigned: r.filter((x) => {
            const c = parseDate(x.createdAt ?? x.created_at);
            return c ? c >= from : false;
          }).length,
          resolved: done.length,
          open: open.length,
          overdue: open.filter((x) => {
            const sla = parseDate(x.slaDueDate ?? x.sla_due_date);
            return sla ? sla < now : false;
          }).length,
          avgResolutionDays: days.length
            ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10
            : null,
        },
        leaveDays: leave
          .filter((l) => empToUser.get(l.employeeId) === u.id)
          .reduce((s, l) => {
            const start = parseDate(l.startDate);
            const end = parseDate(l.endDate);
            if (!start || !end) return s;
            return (
              s +
              leaveDaysRequested(
                start,
                end,
                l.fullDay ?? true,
                l.hours == null ? undefined : Number(l.hours),
              )
            );
          }, 0),
      };
    })
    .sort(
      (a, b) =>
        b.sales.collectedNet - a.sales.collectedNet ||
        a.name.localeCompare(b.name),
    );
}

export async function getMemberHistory(
  userId: string,
  take = 12,
): Promise<TeamHistoryItem[]> {
  const [allQuotes, allInvoices, allInquiries] = await Promise.all([
    listQuotations().catch(() => []),
    listInvoices().catch(() => []),
    listInquiries().catch(() => []),
  ]);

  const quotes = (allQuotes as any[])
    .filter((q) => (q.salesOwnerId ?? q.sales_owner_id) === userId)
    .sort((a, b) =>
      String(b.issueDate ?? b.issue_date ?? "").localeCompare(
        String(a.issueDate ?? a.issue_date ?? ""),
      ),
    )
    .slice(0, take);

  const invoices = (allInvoices as any[])
    .filter((i) => (i.salesOwnerId ?? i.sales_owner_id) === userId)
    .sort((a, b) =>
      String(b.issueDate ?? b.issue_date ?? "").localeCompare(
        String(a.issueDate ?? a.issue_date ?? ""),
      ),
    )
    .slice(0, take);

  const requests = (allInquiries as any[])
    .filter(
      (r) =>
        (r.assignedToId ?? r.assigned_to_id) === userId &&
        (r.requestType ?? r.request_type) === "SR",
    )
    .sort((a, b) =>
      String(b.createdAt ?? b.created_at ?? "").localeCompare(
        String(a.createdAt ?? a.created_at ?? ""),
      ),
    )
    .slice(0, take);

  return [
    ...quotes.map((q) => ({
      kind: "quotation" as const,
      id: q.id,
      reference: q.quotationNumber ?? q.quotation_number ?? q.id,
      title: q.client?.companyName || q.client?.firstName || q.clientName || "",
      status: q.status,
      amount: Number(q.totalAmount ?? q.total_amount ?? 0),
      currency: q.currency ?? null,
      date:
        parseDate(q.issueDate ?? q.issue_date)?.toISOString() ??
        new Date().toISOString(),
    })),
    ...invoices.map((i) => ({
      kind: "invoice" as const,
      id: i.id,
      reference: i.invoiceNumber ?? i.invoice_number ?? i.id,
      title: i.client?.companyName || i.client?.firstName || i.clientName || "",
      status: i.status,
      amount: Number(i.totalAmount ?? i.total_amount ?? 0),
      currency: i.currency ?? null,
      date:
        parseDate(i.issueDate ?? i.issue_date)?.toISOString() ??
        new Date().toISOString(),
    })),
    ...requests.map((r) => ({
      kind: "request" as const,
      id: r.id,
      reference: r.reference ?? r.id,
      title: r.serviceType ?? r.service_type ?? "",
      status: r.workflowStatus ?? r.workflow_status ?? "new",
      amount: null,
      currency: null,
      date:
        parseDate(r.createdAt ?? r.created_at)?.toISOString() ??
        new Date().toISOString(),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}
