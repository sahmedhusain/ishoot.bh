import {
  calculateContributions,
  parsePayrollSettings,
} from "../payroll-calculation";
import { db } from "../db";
import { PayrollRun } from "../types";
import { submitForApproval } from "../services/approval-engine";
import { assertActorNotOnLeave } from "./leave";
import type { EmployeePayrollSettings } from "../types";

function mapPayrollItem(it: any) {
  return {
    ...it,
    basicSalary: Number(it.basicSalary),
    housingAllowance: Number(it.housingAllowance),
    transportAllowance: Number(it.transportAllowance),
    otherAllowances: Number(it.otherAllowances),
    grossSalary: Number(it.grossSalary),
    gosiEmployee: Number(it.gosiEmployee),
    gosiEmployer: Number(it.gosiEmployer),
    externalSupport: Number(it.externalSupport),
    otherDeductions: Number(it.otherDeductions),
    bonus: Number(it.bonus ?? 0),
    netSalary: Number(it.netSalary),
    createdAt: it.createdAt.toISOString(),
    editedAt: it.editedAt ? it.editedAt.toISOString() : null,
  };
}

const r3 = (value: number) => Math.round(value * 1000) / 1000;

export interface PayrollLineInput {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  bonus?: number;
  otherDeductions?: number;
}

/**
 * One employee's month: contributions and support are worked out on the fixed pay (basic and
 * allowances); bonuses are added to gross on top, and other deductions come off net.
 */
export function computePayrollLine(input: PayrollLineInput, settings: EmployeePayrollSettings | null, month: string) {
  for (const [key, value] of Object.entries(input))
    if (value !== undefined && !(Number.isFinite(value) && value >= 0)) throw new Error(`${key} must be zero or more`);
  const fixed = r3(input.basicSalary + input.housingAllowance + input.transportAllowance + input.otherAllowances);
  const bonus = r3(input.bonus ?? 0);
  const otherDeductions = r3(input.otherDeductions ?? 0);
  const calculated = calculateContributions(fixed, settings, month);
  const gross = r3(fixed + bonus);
  const net = r3(gross - calculated.employee - otherDeductions);
  if (net < 0) throw new Error("Deductions cannot exceed the month's pay");
  return {
    grossSalary: gross,
    gosiEmployee: calculated.employee,
    gosiEmployer: calculated.employer,
    externalSupport: calculated.support,
    netSalary: net,
    employerCost: r3(gross + calculated.employer - calculated.support),
    deductions: r3(calculated.employee + otherDeductions),
  };
}

async function refreshPayrollTotals(runId: string) {
  const items = await db.payrollItem.findMany({ where: { payrollRunId: runId } });
  const sum = (pick: (i: (typeof items)[number]) => number) => r3(items.reduce((acc, i) => acc + pick(i), 0));
  await db.payrollRun.update({
    where: { id: runId },
    data: {
      totalGross: sum((i) => Number(i.grossSalary)),
      totalDeductions: sum((i) => Number(i.gosiEmployee) + Number(i.otherDeductions)),
      totalNet: sum((i) => Number(i.netSalary)),
      totalEmployerCost: sum((i) => Number(i.grossSalary) + Number(i.gosiEmployer) - Number(i.externalSupport)),
    },
  });
}

/** Adjust one employee's line while the run is still being prepared; totals follow. */
export async function updatePayrollItem(
  itemId: string,
  patch: Partial<PayrollLineInput> & { adjustmentNote?: string | null },
  actorId: string,
) {
  const item = await db.payrollItem.findUniqueOrThrow({ where: { id: itemId }, include: { payrollRun: { select: { id: true, status: true, year: true, month: true } } } });
  if (!["draft", "calculated"].includes(item.payrollRun.status))
    throw new Error(`Payroll is ${item.payrollRun.status}; lines can only be changed before it is submitted`);
  const next: PayrollLineInput = {
    basicSalary: patch.basicSalary ?? Number(item.basicSalary),
    housingAllowance: patch.housingAllowance ?? Number(item.housingAllowance),
    transportAllowance: patch.transportAllowance ?? Number(item.transportAllowance),
    otherAllowances: patch.otherAllowances ?? Number(item.otherAllowances),
    bonus: patch.bonus ?? Number(item.bonus),
    otherDeductions: patch.otherDeductions ?? Number(item.otherDeductions),
  };
  const settings = parsePayrollSettings(item.calculationSnapshot);
  const month = `${item.payrollRun.year}-${String(item.payrollRun.month).padStart(2, "0")}`;
  const line = computePayrollLine(next, settings, month);
  const note = patch.adjustmentNote === undefined ? item.adjustmentNote : patch.adjustmentNote?.trim().slice(0, 500) || null;
  const updated = await db.payrollItem.update({
    where: { id: itemId },
    data: {
      basicSalary: r3(next.basicSalary),
      housingAllowance: r3(next.housingAllowance),
      transportAllowance: r3(next.transportAllowance),
      otherAllowances: r3(next.otherAllowances),
      bonus: r3(next.bonus ?? 0),
      otherDeductions: r3(next.otherDeductions ?? 0),
      grossSalary: line.grossSalary,
      gosiEmployee: line.gosiEmployee,
      gosiEmployer: line.gosiEmployer,
      externalSupport: line.externalSupport,
      netSalary: line.netSalary,
      adjustmentNote: note,
      editedById: actorId,
      editedAt: new Date(),
    },
  });
  await refreshPayrollTotals(item.payrollRun.id);
  return { item: mapPayrollItem(updated), before: mapPayrollItem(item) };
}

export async function createPayrollRun(
  month: number,
  year: number,
  actorId: string,
): Promise<PayrollRun> {
  await assertActorNotOnLeave(actorId);

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2200
  )
    throw new Error("Invalid payroll period");

  // Period start and end dates
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 0)); // last day of month

  const existing = await db.payrollRun.findUnique({
    where: {
      year_month: { year, month },
    },
    include: {
      items: {
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              firstNameEn: true,
              lastNameEn: true,
            },
          },
        },
      },
    },
  });

  if (existing) {
    return {
      ...existing,
      totalGross: Number(existing.totalGross),
      totalDeductions: Number(existing.totalDeductions),
      totalNet: Number(existing.totalNet),
      totalEmployerCost: Number(existing.totalEmployerCost),
      periodStart: existing.periodStart.toISOString(),
      periodEnd: existing.periodEnd.toISOString(),
      createdAt: existing.createdAt.toISOString(),
      updatedAt: existing.updatedAt.toISOString(),
      approvedAt: existing.approvedAt?.toISOString() || null,
      paidAt: existing.paidAt?.toISOString() || null,
      items: existing.items.map((it) => ({
        ...mapPayrollItem(it),
      })),
    };
  }

  // Find active employees with current employment records
  const employees = await db.employee.findMany({
    where: {
      status: { in: ["active", "on_leave"] },
      hireDate: { lte: periodEnd },
    },
    include: {
      employmentRecords: {
        where: {
          effectiveFrom: { lte: periodEnd },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
        },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
  });

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let totalEmployerCost = 0;

  const itemsData = employees.map((emp) => {
    const record = emp.employmentRecords[0];
    const basic = record ? Number(record.basicSalary) : 0;
    const housing = record ? Number(record.housingAllowance) : 0;
    const transport = record ? Number(record.transportAllowance) : 0;
    const otherAllowances = record ? Number(record.otherAllowances) : 0;

    const settings = parsePayrollSettings(record?.payrollSettings);
    if (!settings || !record)
      throw new Error(`Complete the salary and payroll settings for ${emp.firstNameEn} ${emp.lastNameEn} (${emp.employeeNumber}) before generating payroll`);
    const line = computePayrollLine(
      { basicSalary: basic, housingAllowance: housing, transportAllowance: transport, otherAllowances },
      settings,
      `${year}-${String(month).padStart(2, "0")}`,
    );
    const gross = line.grossSalary;
    const gosiEmployee = line.gosiEmployee;
    const gosiEmployer = line.gosiEmployer;
    const otherDeductions = 0;
    const net = line.netSalary;

    totalGross += gross;
    totalDeductions += line.deductions;
    totalNet += net;
    totalEmployerCost += line.employerCost;

    return {
      employeeId: emp.id,
      basicSalary: basic,
      housingAllowance: housing,
      transportAllowance: transport,
      otherAllowances,
      grossSalary: gross,
      gosiEmployee,
      gosiEmployer,
      externalSupport: line.externalSupport,
      calculationSnapshot: JSON.parse(JSON.stringify(settings)),
      otherDeductions,
      netSalary: net,
      paymentStatus: "pending",
    };
  });

  const run = await db.payrollRun.create({
    data: {
      month,
      year,
      periodStart,
      periodEnd,
      status: "calculated",
      totalGross: Math.round(totalGross * 1000) / 1000,
      totalDeductions: Math.round(totalDeductions * 1000) / 1000,
      totalNet: Math.round(totalNet * 1000) / 1000,
      totalEmployerCost: Math.round(totalEmployerCost * 1000) / 1000,
      items: {
        create: itemsData,
      },
    },
    include: {
      items: {
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              firstNameEn: true,
              lastNameEn: true,
            },
          },
        },
      },
    },
  });

  return {
    ...run,
    totalGross: Number(run.totalGross),
    totalDeductions: Number(run.totalDeductions),
    totalNet: Number(run.totalNet),
    totalEmployerCost: Number(run.totalEmployerCost),
    periodStart: run.periodStart.toISOString(),
    periodEnd: run.periodEnd.toISOString(),
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    approvedAt: run.approvedAt?.toISOString() || null,
    paidAt: run.paidAt?.toISOString() || null,
    items: run.items.map((it) => ({
      ...mapPayrollItem(it),
    })),
  };
}

export async function submitPayrollRunForApproval(
  id: string,
  actorId: string,
): Promise<{ success: boolean; approvalRequestId: string }> {
  await assertActorNotOnLeave(actorId);

  const run = await db.payrollRun.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!run) throw new Error("Payroll run not found");
  if (run.status !== "calculated" && run.status !== "draft") {
    throw new Error(`Payroll run cannot be submitted: status is ${run.status}`);
  }

  await db.payrollRun.update({ where: { id }, data: { status: "submitted" } });
  const approvalReq = await submitForApproval({
    targetType: "payroll_run",
    targetId: run.id,
    requesterId: actorId,
    policySnapshot: {
      month: run.month,
      year: run.year,
      totalGross: Number(run.totalGross),
      totalNet: Number(run.totalNet),
      totalEmployerCost: Number(run.totalEmployerCost),
      employeesCount: run.items.length,
    },
    diffPayload: {
      month: run.month,
      year: run.year,
      totalNet: Number(run.totalNet),
      totalEmployerCost: Number(run.totalEmployerCost),
      itemsCount: run.items.length,
    },
  });

  return { success: true, approvalRequestId: approvalReq.approvalRequestId };
}

export async function markPayrollAsPaid(
  id: string,
  actorId: string,
): Promise<PayrollRun> {
  await assertActorNotOnLeave(actorId);

  const run = await db.payrollRun.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!run) throw new Error("Payroll run not found");
  if (run.status !== "approved") {
    throw new Error(
      `Payroll run payment blocked: Super Admin approval is required (current status: ${run.status})`,
    );
  }

  const updated = await db.$transaction(async (tx) => {
    const pr = await tx.payrollRun.update({
      where: { id },
      data: {
        status: "paid",
        paidAt: new Date(),
      },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstNameEn: true,
                lastNameEn: true,
              },
            },
          },
        },
      },
    });

    // Mark items paid and generate payslips
    await tx.payrollItem.updateMany({
      where: { payrollRunId: id },
      data: { paymentStatus: "paid" },
    });

    for (const item of pr.items) {
      await tx.payslip.upsert({
        where: { payrollItemId: item.id },
        update: {},
        create: {
          payrollItemId: item.id,
          employeeId: item.employeeId,
          month: run.month,
          year: run.year,
          issuedAt: new Date(),
        },
      });
    }

    return pr;
  });

  return {
    ...updated,
    totalGross: Number(updated.totalGross),
    totalDeductions: Number(updated.totalDeductions),
    totalNet: Number(updated.totalNet),
    totalEmployerCost: Number(updated.totalEmployerCost),
    periodStart: updated.periodStart.toISOString(),
    periodEnd: updated.periodEnd.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    approvedAt: updated.approvedAt?.toISOString() || null,
    paidAt: updated.paidAt?.toISOString() || null,
    items: updated.items.map((it) => ({
      ...mapPayrollItem(it),
    })),
  };
}

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const runs = await db.payrollRun.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      items: {
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              firstNameEn: true,
              lastNameEn: true,
            },
          },
        },
      },
    },
  });

  return runs.map((r) => ({
    ...r,
    totalGross: Number(r.totalGross),
    totalDeductions: Number(r.totalDeductions),
    totalNet: Number(r.totalNet),
    totalEmployerCost: Number(r.totalEmployerCost),
    periodStart: r.periodStart.toISOString(),
    periodEnd: r.periodEnd.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() || null,
    paidAt: r.paidAt?.toISOString() || null,
    items: r.items.map((it) => ({
      ...mapPayrollItem(it),
    })),
  }));
}
