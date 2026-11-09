import { db } from "../atomic";
import { companyCurrency } from "../finance/company-currency";
import { leaveDaysRequested } from "../constants/hr";

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

export async function getTeamMembers(
  managerId: string,
  includeEveryone = false,
) {
  if (includeEveryone)
    return db.user.findMany({
      where: { isActive: true, id: { not: managerId } },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    });
  const departments = await db.department.findMany({
    where: { managerId },
    select: { id: true },
  });
  return db.user.findMany({
    where: {
      isActive: true,
      id: { not: managerId },
      OR: [
        { managerId },
        ...(departments.length
          ? [
              {
                employee: {
                  departmentId: { in: departments.map((d) => d.id) },
                },
              },
            ]
          : []),
      ],
    },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: "asc" },
  });
}

export async function getTeamPerformance(
  memberIds: string[],
  from: Date,
  to: Date,
): Promise<TeamMemberKpis[]> {
  const FUNCTIONAL_CURRENCY = await companyCurrency();
  if (!memberIds.length) return [];
  const range = { gte: from, lte: to };
  const [users, quotes, invoices, payments, requests, resolved, leave] =
    await Promise.all([
      db.user.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, fullName: true, role: true },
      }),
      db.quotation.findMany({
        where: {
          salesOwnerId: { in: memberIds },
          issueDate: range,
          status: { notIn: ["draft", "cancelled"] },
          currency: FUNCTIONAL_CURRENCY,
        },
        select: {
          salesOwnerId: true,
          status: true,
          subtotal: true,
          discountAmount: true,
        },
      }),
      db.invoice.findMany({
        where: {
          salesOwnerId: { in: memberIds },
          issueDate: range,
          status: { notIn: ["draft", "void"] },
          currency: FUNCTIONAL_CURRENCY,
        },
        select: { salesOwnerId: true, subtotal: true, discountAmount: true },
      }),
      db.payment.findMany({
        where: {
          paymentDate: range,
          currency: FUNCTIONAL_CURRENCY,
          invoice: { salesOwnerId: { in: memberIds }, status: { not: "void" } },
        },
        select: {
          amount: true,
          invoice: {
            select: {
              salesOwnerId: true,
              totalAmount: true,
              vatAmount: true,
              otherTaxAmount: true,
            },
          },
        },
      }),
      db.inquiry.findMany({
        where: {
          assignedToId: { in: memberIds },
          requestType: "SR",
          createdAt: { lte: to },
        },
        select: {
          assignedToId: true,
          workflowStatus: true,
          slaDueDate: true,
          createdAt: true,
          resolvedAt: true,
        },
      }),
      db.inquiry.findMany({
        where: {
          assignedToId: { in: memberIds },
          requestType: "SR",
          resolvedAt: range,
        },
        select: { assignedToId: true, createdAt: true, resolvedAt: true },
      }),
      db.leaveRequest.findMany({
        where: {
          status: "approved",
          startDate: { lte: to },
          endDate: { gte: from },
          employee: { userId: { in: memberIds } },
        },
        select: {
          startDate: true,
          endDate: true,
          fullDay: true,
          hours: true,
          employee: { select: { userId: true } },
        },
      }),
    ]);
  const now = new Date();
  return users
    .map((u) => {
      const q = quotes.filter((x) => x.salesOwnerId === u.id);
      const accepted = q.filter((x) =>
        ["accepted", "converted"].includes(x.status),
      );
      const net = (x: { subtotal: unknown; discountAmount: unknown }) =>
        Number(x.subtotal) - Number(x.discountAmount);
      const decided = q.filter((x) =>
        ["accepted", "converted", "rejected", "expired"].includes(x.status),
      ).length;
      const inv = invoices.filter((x) => x.salesOwnerId === u.id);
      const collected = payments
        .filter((p) => p.invoice?.salesOwnerId === u.id)
        .reduce((sum, p) => {
          const total = Number(p.invoice!.totalAmount);
          const amount = Number(p.amount);
          return (
            sum +
            (total > 0
              ? amount -
                ((Number(p.invoice!.vatAmount) +
                  Number(p.invoice!.otherTaxAmount ?? 0)) *
                  amount) /
                  total
              : amount)
          );
        }, 0);
      const r = requests.filter((x) => x.assignedToId === u.id);
      const open = r.filter(
        (x) => !["resolved", "rejected"].includes(x.workflowStatus),
      );
      const done = resolved.filter((x) => x.assignedToId === u.id);
      const days = done.map(
        (x) => (x.resolvedAt!.getTime() - x.createdAt.getTime()) / 86400000,
      );
      const round3 = (n: number) => Math.round(n * 1000) / 1000;
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
          assigned: r.filter((x) => x.createdAt >= from).length,
          resolved: done.length,
          open: open.length,
          overdue: open.filter((x) => x.slaDueDate && x.slaDueDate < now)
            .length,
          avgResolutionDays: days.length
            ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) /
              10
            : null,
        },
        leaveDays: leave
          .filter((l) => l.employee.userId === u.id)
          .reduce(
            (s, l) =>
              s +
              leaveDaysRequested(
                l.startDate,
                l.endDate,
                l.fullDay,
                l.hours == null ? undefined : Number(l.hours),
              ),
            0,
          ),
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
  const [quotes, invoices, requests] = await Promise.all([
    db.quotation.findMany({
      where: { salesOwnerId: userId },
      orderBy: { issueDate: "desc" },
      take,
      select: {
        id: true,
        quotationNumber: true,
        status: true,
        totalAmount: true,
        currency: true,
        issueDate: true,
        client: { select: { companyName: true, firstName: true } },
      },
    }),
    db.invoice.findMany({
      where: { salesOwnerId: userId },
      orderBy: { issueDate: "desc" },
      take,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        currency: true,
        issueDate: true,
        client: { select: { companyName: true, firstName: true } },
      },
    }),
    db.inquiry.findMany({
      where: { assignedToId: userId, requestType: "SR" },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        reference: true,
        workflowStatus: true,
        serviceType: true,
        createdAt: true,
      },
    }),
  ]);
  return [
    ...quotes.map((q) => ({
      kind: "quotation" as const,
      id: q.id,
      reference: q.quotationNumber,
      title: q.client?.companyName || q.client?.firstName || "",
      status: q.status,
      amount: Number(q.totalAmount),
      currency: q.currency,
      date: q.issueDate.toISOString(),
    })),
    ...invoices.map((i) => ({
      kind: "invoice" as const,
      id: i.id,
      reference: i.invoiceNumber,
      title: i.client?.companyName || i.client?.firstName || "",
      status: i.status,
      amount: Number(i.totalAmount),
      currency: i.currency,
      date: i.issueDate.toISOString(),
    })),
    ...requests.map((r) => ({
      kind: "request" as const,
      id: r.id,
      reference: r.reference,
      title: r.serviceType ?? "",
      status: r.workflowStatus,
      amount: null,
      currency: null,
      date: r.createdAt.toISOString(),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}
