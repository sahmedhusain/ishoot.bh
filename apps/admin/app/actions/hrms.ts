"use server";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { measureOperation, runAtomicMutation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";
import {
  createEmployee,
  getEmployeeById,
  EmployeePayrollSettings,
  updateEmployee,
  createDepartment,
  updateDepartment,
  createActivityLog,
  saveEmployeeCredential,
  updateEmployeeIdentity,
  type EmployeeCredentialInput,
  type EmployeeIdentityInput,
} from "@platform/database";
import { revalidatePath } from "next/cache";
import { createTicket } from "@platform/api-client";
import { hasPermission, requirePermission } from "../../lib/auth";
import { announceChange } from "../../lib/live";

const PAY_FIELDS = [
  "basicSalary",
  "housingAllowance",
  "transportAllowance",
  "otherAllowances",
  "payrollSettings",
] as const;

async function requirePayAccessFor(
  data: Partial<Record<(typeof PAY_FIELDS)[number], unknown>>,
) {
  const touchesPay = PAY_FIELDS.some(
    (key) =>
      data[key] !== undefined &&
      !(typeof data[key] === "number" && data[key] === 0),
  );
  if (touchesPay && !(await hasPermission("payroll", "edit")))
    throw new Error(serverMessages.onlyPayrollManagersCanSetSalariesAnd);
}

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
  userId?: string;
  userAccountMode?: "none" | "existing" | "request_it";
  requestedUsername?: string | null;
  referenceUserId?: string | null;
  referenceUserName?: string | null;
  referenceUserRole?: string | null;
  itRequestNotes?: string | null;
  identity?: EmployeeIdentityInput;
  credentials?: EmployeeCredentialInput[];
}) {
  return measureOperation("action:createEmployeeAction", async () => {
    try {
      const actor = await requirePermission("employees", "create");
      validateActionArguments("createEmployeeAction", { data });
      await requirePayAccessFor(data);

      const hireDateStr = data.hireDate
        ? String(data.hireDate).slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      const { employee } = await runAtomicMutation(async () => {
        const {
          identity,
          credentials,
          userAccountMode,
          requestedUsername,
          referenceUserId,
          referenceUserName,
          referenceUserRole,
          itRequestNotes,
          ...employeeData
        } = data;
        const resolvedUserId =
          userAccountMode === "none" || userAccountMode === "request_it"
            ? undefined
            : employeeData.userId;
        const employee = await createEmployee(
          {
            ...employeeData,
            userId: resolvedUserId,
            firstNameAr: data.firstNameAr || data.firstNameEn,
            lastNameAr: data.lastNameAr || data.lastNameEn,
            jobTitleAr: data.jobTitleAr || data.jobTitleEn,
            basicSalary: data.basicSalary || 0,
            hireDate: hireDateStr,
          },
          actor.id,
        );

        if (identity) {
          try {
            await updateEmployeeIdentity(employee.id, {
              ...identity,
              cpr_number: identity.cpr_number ?? data.cprNumber ?? undefined,
            });
          } catch (e) {
            console.error("Failed to update employee identity:", e);
          }
        }
        for (const credential of credentials ?? []) {
          try {
            await saveEmployeeCredential(employee.id, credential, actor.id);
          } catch (e) {
            console.error("Failed to save employee credential:", e);
          }
        }

        try {
          await createActivityLog({
            user_id: actor.id,
            action: "create",
            entity_type: "employee",
            entity_id: employee.id,
            details: {
              employeeNumber: employee.employeeNumber,
              name: `${data.firstNameEn} ${data.lastNameEn}`,
            },
          });
        } catch (e) {
          console.error("Failed to create activity log:", e);
        }

        return { employee };
      });

      let itTicketId: string | undefined;
      if (data.userAccountMode === "request_it") {
        const reqUsername = (data.requestedUsername || "").trim();
        const empFullName = `${data.firstNameEn.trim()} ${data.lastNameEn.trim()}`.trim();
        const refSummary = data.referenceUserId
          ? `${data.referenceUserName || data.referenceUserId} (ID: ${data.referenceUserId}${data.referenceUserRole ? `, Role: ${data.referenceUserRole}` : ""})`
          : "Not specified — IT to decide role & permissions";
        const metaParts = [
          `username=${encodeURIComponent(reqUsername)}`,
          `copyFrom=${encodeURIComponent(data.referenceUserId || "")}`,
          `employeeId=${encodeURIComponent(employee.id)}`,
          `email=${encodeURIComponent((data.email || "").trim())}`,
          `name=${encodeURIComponent(empFullName)}`,
        ].join("&");
        const description = [
          `HR Onboarding — New Portal User Account Request`,
          `Employee: ${empFullName} (${employee.employeeNumber})`,
          `Job Title: ${data.jobTitleEn.trim()}`,
          `Work Email: ${(data.email || "").trim() || "Not provided"}`,
          `Requested Username: ${reqUsername || "IT to assign"}`,
          `Reference / Example User (Copy Access From): ${refSummary}`,
          data.itRequestNotes?.trim() ? `HR Notes: ${data.itRequestNotes.trim()}` : null,
          `[HR_ONBOARDING_META:${metaParts}]`,
        ]
          .filter(Boolean)
          .join("\n");

        const ticket = await createTicket({
          requesterId: actor.id,
          requesterName: actor.full_name,
          requesterEmail: actor.email,
          category: "access",
          subcategory: "new_access",
          priority: "high",
          title: `New Staff User Onboarding: ${empFullName}${reqUsername ? ` (${reqUsername})` : ""}`.slice(0, 190),
          description,
        });
        itTicketId = ticket.id;
        await announceChange("it_support", ticket.id, { topics: ["it.tickets"], event: "created" });
      }

      revalidatePath(ROUTES.hr.employees);
      return { success: true, employee, itTicketId };
    } catch (err: any) {
      console.error("createEmployeeAction error:", err);
      return { success: false, error: err?.message || "Failed to create employee" };
    }
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
    await requirePayAccessFor(data);

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
