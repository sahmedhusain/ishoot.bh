import { toLeaveTypeRules } from "./hr-settings";
import { parsePayrollSettings } from "../payroll-calculation";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { Employee, Department, EmployeePayrollSettings } from "../types";
import { getNextSequenceNumber } from "./sequence";
import { assertActorNotOnLeave } from "./leave";

export async function createEmployee(
  data: {
    userId?: string | null;
    firstNameEn: string;
    lastNameEn: string;
    firstNameAr: string;
    lastNameAr: string;
    email?: string | null;
    phone?: string | null;
    cprNumber?: string | null;
    jobTitleEn: string;
    jobTitleAr: string;
    departmentId?: string | null;
    hireDate: Date;
    contractType?: string;
    basicSalary: number;
    housingAllowance?: number;
    transportAllowance?: number;
    otherAllowances?: number;
    payrollSettings?: EmployeePayrollSettings;
  },
  actorId: string,
): Promise<Employee> {
  await assertActorNotOnLeave(actorId);
  if (data.payrollSettings) parsePayrollSettings(data.payrollSettings);

  const employeeNumber = await getNextSequenceNumber("EMP");

  const created = await db.$transaction(async (tx) => {
    const emp = await tx.employee.create({
      data: {
        employeeNumber,
        userId: data.userId || null,
        firstNameEn: data.firstNameEn,
        lastNameEn: data.lastNameEn,
        firstNameAr: data.firstNameAr,
        lastNameAr: data.lastNameAr,
        email: data.email || null,
        phone: data.phone || null,
        cprNumber: data.cprNumber || null,
        jobTitleEn: data.jobTitleEn,
        jobTitleAr: data.jobTitleAr,
        departmentId: data.departmentId || null,
        hireDate: data.hireDate,
        status: "active",
        leaveBalanceDays: 30.0,
        employmentRecords: {
          create: {
            contractType: data.contractType || "full_time",
            basicSalary: data.basicSalary,
            housingAllowance: data.housingAllowance || 0,
            transportAllowance: data.transportAllowance || 0,
            otherAllowances: data.otherAllowances || 0,
            payrollSettings: data.payrollSettings as unknown as Prisma.InputJsonValue,
            effectiveFrom: data.hireDate,
            isCurrent: true,
          },
        },
      },
      include: {
        department: true,
        user: { select: { id: true, fullName: true, email: true, role: true, isActive: true } },
        employmentRecords: { where: { isCurrent: true } },
      },
    });

    return emp;
  });

  return {
    ...created,
    leaveBalanceDays: Number(created.leaveBalanceDays),
    hireDate: created.hireDate.toISOString(),
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    employmentRecords: created.employmentRecords.map((r) => ({
      ...r,
      basicSalary: Number(r.basicSalary),
      housingAllowance: Number(r.housingAllowance),
      transportAllowance: Number(r.transportAllowance),
      otherAllowances: Number(r.otherAllowances),
      payrollSettings: parsePayrollSettings(r.payrollSettings),
      effectiveFrom: r.effectiveFrom.toISOString(),
      effectiveTo: r.effectiveTo?.toISOString() || null,
    })),
  };
}

export async function listEmployees(filters: {
  departmentId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: Employee[]; total: number }> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const where: any = {};

  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { employeeNumber: { contains: filters.search, mode: "insensitive" } },
      { firstNameEn: { contains: filters.search, mode: "insensitive" } },
      { lastNameEn: { contains: filters.search, mode: "insensitive" } },
      { firstNameAr: { contains: filters.search } },
      { lastNameAr: { contains: filters.search } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { cprNumber: { contains: filters.search } },
    ];
  }

  const [total, records] = await Promise.all([
    db.employee.count({ where }),
    db.employee.findMany({
      where,
      orderBy: { employeeNumber: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        department: true,
        user: { select: { id: true, fullName: true, email: true, role: true, isActive: true } },
        employmentRecords: { where: { isCurrent: true } },
      },
    }),
  ]);

  return {
    total,
    items: records.map((e) => ({
      ...e,
      leaveBalanceDays: Number(e.leaveBalanceDays),
      hireDate: e.hireDate.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      employmentRecords: e.employmentRecords.map((r) => ({
        ...r,
        basicSalary: Number(r.basicSalary),
        housingAllowance: Number(r.housingAllowance),
        transportAllowance: Number(r.transportAllowance),
        otherAllowances: Number(r.otherAllowances),
      payrollSettings: parsePayrollSettings(r.payrollSettings),
        effectiveFrom: r.effectiveFrom.toISOString(),
        effectiveTo: r.effectiveTo?.toISOString() || null,
      })),
    })),
  };
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const emp = await db.employee.findUnique({
    where: { id },
    include: {
      department: true,
      user: { select: { id: true, fullName: true, email: true, role: true, isActive: true } },
      employmentRecords: { orderBy: { effectiveFrom: "desc" } },
      leaveRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { leaveType: true },
      },
      attendanceEntries: {
        orderBy: { date: "desc" },
        take: 30,
      },
    },
  });

  if (!emp) return null;

  return {
    ...emp,
    leaveBalanceDays: Number(emp.leaveBalanceDays),
    hireDate: emp.hireDate.toISOString(),
    createdAt: emp.createdAt.toISOString(),
    updatedAt: emp.updatedAt.toISOString(),
    // Decimal cannot cross to client components.
    leaveRequests: emp.leaveRequests.map((r) => ({
      ...r,
      hours: r.hours == null ? null : Number(r.hours),
      days: Number(r.days),
      leaveType: toLeaveTypeRules(r.leaveType),
    })),
    employmentRecords: emp.employmentRecords.map((r) => ({
      ...r,
      basicSalary: Number(r.basicSalary),
      housingAllowance: Number(r.housingAllowance),
      transportAllowance: Number(r.transportAllowance),
      otherAllowances: Number(r.otherAllowances),
      payrollSettings: parsePayrollSettings(r.payrollSettings),
      effectiveFrom: r.effectiveFrom.toISOString(),
      effectiveTo: r.effectiveTo?.toISOString() || null,
    })),
  } as Employee;
}

export async function listDepartments(): Promise<Department[]> {
  const list = await db.department.findMany({
    orderBy: { nameEn: "asc" },
  });
  return list.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));
}

export async function createDepartment(data: {
  code: string;
  nameEn: string;
  nameAr: string;
  managerId?: string | null;
}): Promise<Department> {
  const d = await db.department.create({
    data: {
      code: data.code,
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      managerId: data.managerId || null,
    },
  });
  return {
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function updateDepartment(
  id: string,
  data: {
    nameEn?: string;
    nameAr?: string;
    managerId?: string | null;
  },
): Promise<Department> {
  const d = await db.department.update({
    where: { id },
    data: {
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      managerId: data.managerId !== undefined ? data.managerId : undefined,
    },
  });
  return {
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function updateEmployee(
  id: string,
  data: {
    firstNameEn?: string;
    lastNameEn?: string;
    firstNameAr?: string;
    lastNameAr?: string;
    email?: string | null;
    phone?: string | null;
    cprNumber?: string | null;
    jobTitleEn?: string;
    jobTitleAr?: string;
    departmentId?: string | null;
    status?: "active" | "on_leave" | "suspended" | "terminated";
    contractType?: string;
    basicSalary?: number;
    housingAllowance?: number;
    transportAllowance?: number;
    otherAllowances?: number;
    payrollSettings?: EmployeePayrollSettings;
  },
  actorId: string,
): Promise<Employee> {
  await assertActorNotOnLeave(actorId);
  if (data.payrollSettings) parsePayrollSettings(data.payrollSettings);

  await db.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id },
      data: {
        firstNameEn: data.firstNameEn,
        lastNameEn: data.lastNameEn,
        firstNameAr: data.firstNameAr,
        lastNameAr: data.lastNameAr,
        email: data.email !== undefined ? data.email : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        cprNumber: data.cprNumber !== undefined ? data.cprNumber : undefined,
        jobTitleEn: data.jobTitleEn,
        jobTitleAr: data.jobTitleAr,
        departmentId: data.departmentId !== undefined ? data.departmentId : undefined,
        status: data.status,
      },
    });

    const compensationFields = ["basicSalary", "housingAllowance", "transportAllowance", "otherAllowances", "contractType", "payrollSettings"] as const;
    if (compensationFields.some(key => data[key] !== undefined)) {
      const previous = await tx.employmentRecord.findFirst({ where: { employeeId: id, isCurrent: true }, orderBy: { effectiveFrom: "desc" } });
      await tx.employmentRecord.updateMany({
        where: { employeeId: id, isCurrent: true },
        data: { isCurrent: false, effectiveTo: new Date() },
      });
      await tx.employmentRecord.create({
        data: {
          employeeId: id,
          contractType: data.contractType ?? previous?.contractType ?? "full_time",
          basicSalary: data.basicSalary ?? previous?.basicSalary ?? 0,
          housingAllowance: data.housingAllowance ?? previous?.housingAllowance ?? 0,
          transportAllowance: data.transportAllowance ?? previous?.transportAllowance ?? 0,
          otherAllowances: data.otherAllowances ?? previous?.otherAllowances ?? 0,
          payrollSettings: (data.payrollSettings ?? previous?.payrollSettings ?? undefined) as Prisma.InputJsonValue | undefined,
          effectiveFrom: new Date(),
          isCurrent: true,
        },
      });
    }
  });

  const emp = await getEmployeeById(id);
  if (!emp) throw new Error("Employee not found");
  return emp;
}
