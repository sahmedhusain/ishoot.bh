"use server";
import { ROUTES } from "../../constants/routes";
import { measureOperation, runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";
import {
  createEmployee,
  getEmployeeById,
  EmployeePayrollSettings,
  updateEmployee,
  createDepartment,
  updateDepartment,
  createActivityLog,
  db,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

export async function createEmployeeAction(data: {
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr?: string;
  lastNameAr?: string;
  email?: string | null;
  phone?: string | null;
  cprNumber?: string | null;
  jobTitleEn: string;
  jobTitleAr?: string;
  departmentId?: string | null;
  hireDate?: string;
  contractType?: "full_time" | "part_time" | "contract";
  basicSalary?: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowances?: number;
  payrollSettings?: EmployeePayrollSettings;
  /** Links the new record to an existing user account that has no employee record yet. */
  userId?: string;
}) {
  return measureOperation("action:createEmployeeAction", async () => {
    const actor = await requirePermission("employees", "create");
    validateActionArguments("createEmployeeAction", { data });

    const { employee } = await runAtomicMutation(async () => {
      if (data.userId) {
        const user = await db.user.findUnique({ where: { id: data.userId }, select: { isActive: true, employee: { select: { id: true } } } });
        if (!user || !user.isActive) throw new Error("User account not found");
        if (user.employee) throw new Error("This user already has an employee record");
      }
      const employee = await createEmployee(
        {
          ...data,
          firstNameAr: data.firstNameAr || data.firstNameEn,
          lastNameAr: data.lastNameAr || data.lastNameEn,
          jobTitleAr: data.jobTitleAr || data.jobTitleEn,
          basicSalary: data.basicSalary || 0,
          hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
        },
        actor.id,
      );

      await createActivityLog({
        user_id: actor.id,
        action: "create",
        entity_type: "employee",
        entity_id: employee.id,
        details: { employeeNumber: employee.employeeNumber, name: `${data.firstNameEn} ${data.lastNameEn}` },
      });

      return { employee };
    });

    revalidatePath(ROUTES.hr.employees);
    return { success: true, employee };
  });
}

export async function updateEmployeeAction(
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
    contractType?: "full_time" | "part_time" | "contract";
    basicSalary?: number;
    housingAllowance?: number;
    transportAllowance?: number;
    otherAllowances?: number;
  payrollSettings?: EmployeePayrollSettings;
  },
) {
  return measureOperation("action:updateEmployeeAction", async () => {
    const actor = await requirePermission("employees", "edit");
    validateActionArguments("updateEmployeeAction", { id, data });

    const { employee } = await runAtomicMutation(async () => {
      const before = await getEmployeeById(id);
      const employee = await updateEmployee(id, data, actor.id);

      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "employee",
        entity_id: id,
        details: { updatedFields: Object.keys(data), before, after: employee },
      });

      return { employee };
    });

    revalidatePath(ROUTES.hr.employees);
    revalidatePath(ROUTES.hr.employee(id));
    return { success: true, employee };
  });
}

export async function createDepartmentAction(data: {
  code: string;
  nameEn: string;
  nameAr: string;
  managerId?: string | null;
}) {
  return measureOperation("action:createDepartmentAction", async () => {
    const actor = await requirePermission("employees", "create");
    validateActionArguments("createDepartmentAction", { data });

    const department = await createDepartment(data);

    await createActivityLog({
      user_id: actor.id,
      action: "create",
      entity_type: "department",
      entity_id: department.id,
      details: { code: data.code, name: data.nameEn },
    });

    revalidatePath(ROUTES.hr.employees);
    return { success: true, department };
  });
}

export async function updateDepartmentAction(
  id: string,
  data: {
    nameEn?: string;
    nameAr?: string;
    managerId?: string | null;
  },
) {
  return measureOperation("action:updateDepartmentAction", async () => {
    const actor = await requirePermission("employees", "edit");
    validateActionArguments("updateDepartmentAction", { id, data });

    const department = await updateDepartment(id, data);

    await createActivityLog({
      user_id: actor.id,
      action: "update",
      entity_type: "department",
      entity_id: id,
      details: data,
    });

    revalidatePath(ROUTES.hr.employees);
    return { success: true, department };
  });
}
