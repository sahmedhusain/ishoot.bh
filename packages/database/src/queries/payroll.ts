import {
  calculateContributions,
  parsePayrollSettings,
} from "../payroll-calculation";
import { db } from "../db";
import { PayrollRun } from "../types";
import { submitForApproval } from "../services/approval-engine";
import { assertActorNotOnLeave } from "./leave";

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
        netSalary: Number(it.netSalary),
        createdAt: it.createdAt.toISOString(),
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

    const gross =
      Math.round((basic + housing + transport + otherAllowances) * 1000) / 1000;

    const settings = parsePayrollSettings(record?.payrollSettings);
    const calculated = calculateContributions(
      gross,
      settings,
      `${year}-${String(month).padStart(2, "0")}`,
    );
    const gosiEmployee = calculated.employee;
    const gosiEmployer = calculated.employer;
    const otherDeductions = 0;
    const deductions = gosiEmployee;
    const net = calculated.net;
    const employerCost = calculated.employerCost;

    totalGross += gross;
    totalDeductions += deductions;
    totalNet += net;
    totalEmployerCost += employerCost;

    return {
      employeeId: emp.id,
      basicSalary: basic,
      housingAllowance: housing,
      transportAllowance: transport,
      otherAllowances,
      grossSalary: gross,
      gosiEmployee,
      gosiEmployer,
      externalSupport: calculated.support,
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
      netSalary: Number(it.netSalary),
      createdAt: it.createdAt.toISOString(),
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
      netSalary: Number(it.netSalary),
      createdAt: it.createdAt.toISOString(),
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
      netSalary: Number(it.netSalary),
      createdAt: it.createdAt.toISOString(),
    })),
  }));
}

export async function getPayslipById(
  payslipId: string,
  actor: { id: string; role: string },
): Promise<any> {
  const payslip = await db.payslip.findUnique({
    where: { id: payslipId },
    include: {
      payrollItem: true,
      employee: {
        include: {
          department: true,
          user: { select: { id: true } },
        },
      },
    },
  });

  if (!payslip) return null;

  // Access check: only the employee or HR/Admin/Super Admin
  const isOwner = payslip.employee.userId === actor.id;
  const isAuthorized =
    actor.role === "super_admin" ||
    actor.role === "admin" ||
    actor.role === "finance_manager";

  if (!isOwner && !isAuthorized) {
    throw new Error("Unauthorized: you can only view your own payslips");
  }

  return payslip;
}
