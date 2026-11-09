"use server";
import { revalidatePath } from "next/cache";
import {
  createActivityLog,
  deleteEmployeeGosiRecord,
  deleteEmployeeSupport,
  deleteSupportRule,
  endGosiComponent,
  measureOperation,
  registerUnregisteredEmployees,
  runAtomicMutation,
  saveEmployeeGosiRecord,
  saveEmployeeSupport,
  saveSupportProgram,
  scheduleGosiComponent,
  scheduleSupportRule,
  updateGosiComponent,
  updateGosiRules,
  type EmployeeGosiInput,
  type EmployeeSupportInput,
  type GosiComponentInput,
  type SupportProgramInput,
  type SupportRuleInput,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { requirePermission } from "../../lib/auth";

const refresh = (employeeId?: string) => {
  revalidatePath(ROUTES.hr.gosi);
  revalidatePath(ROUTES.hr.supports());
  revalidatePath(ROUTES.hr.payroll());
  if (employeeId) revalidatePath(ROUTES.hr.employee(employeeId));
};

export async function updateGosiRulesAction(input: {
  firstOfMonthRule: boolean;
  wageSource: "contract" | "registered";
}) {
  return measureOperation("action:updateGosiRulesAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("updateGosiRulesAction", { input });
    await runAtomicMutation(async () => {
      const rules = await updateGosiRules(input, actor.id);
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "gosi_settings",
        entity_id: "default",
        details: { ...rules },
      });
    });
    refresh();
    return { success: true };
  });
}

export async function scheduleGosiComponentAction(input: GosiComponentInput) {
  return measureOperation("action:scheduleGosiComponentAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("scheduleGosiComponentAction", { input });
    const created = await runAtomicMutation(async () => {
      const created = await scheduleGosiComponent(input, actor.id);
      await createActivityLog({
        user_id: actor.id,
        action: "schedule",
        entity_type: "gosi_component",
        entity_id: created.id,
        details: {
          code: created.code,
          from: input.effective_from,
          employee: input.employee_percent,
          employer: input.employer_percent,
        },
      });
      return created;
    });
    refresh();
    return { success: true, id: created.id };
  });
}

export async function updateGosiComponentAction(
  id: string,
  input: Omit<GosiComponentInput, "effective_from" | "code">,
) {
  return measureOperation("action:updateGosiComponentAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("updateGosiComponentAction", { id, input });
    await runAtomicMutation(async () => {
      const updated = await updateGosiComponent(id, input);
      await createActivityLog({
        user_id: actor.id,
        action: "update",
        entity_type: "gosi_component",
        entity_id: id,
        details: {
          code: updated.code,
          employee: input.employee_percent,
          employer: input.employer_percent,
        },
      });
    });
    refresh();
    return { success: true };
  });
}

export async function endGosiComponentAction(id: string, endsOn: string) {
  return measureOperation("action:endGosiComponentAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("endGosiComponentAction", { id, endsOn });
    await runAtomicMutation(async () => {
      await endGosiComponent(id, endsOn);
      await createActivityLog({
        user_id: actor.id,
        action: "end",
        entity_type: "gosi_component",
        entity_id: id,
        details: { endsOn },
      });
    });
    refresh();
    return { success: true };
  });
}

export async function saveEmployeeGosiRecordAction(
  employeeId: string,
  input: EmployeeGosiInput,
) {
  return measureOperation("action:saveEmployeeGosiRecordAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("saveEmployeeGosiRecordAction", {
      employeeId,
      input,
    });
    await runAtomicMutation(async () => {
      const record = await saveEmployeeGosiRecord(employeeId, input, actor.id);
      await createActivityLog({
        user_id: actor.id,
        action: "register",
        entity_type: "employee_gosi",
        entity_id: record.id,
        details: {
          employeeId,
          category: input.category,
          from: input.effective_from,
        },
      });
    });
    refresh(employeeId);
    return { success: true };
  });
}

export async function deleteEmployeeGosiRecordAction(id: string) {
  return measureOperation("action:deleteEmployeeGosiRecordAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("deleteEmployeeGosiRecordAction", { id });
    const employeeId = await runAtomicMutation(async () => {
      const employeeId = await deleteEmployeeGosiRecord(id);
      await createActivityLog({
        user_id: actor.id,
        action: "delete",
        entity_type: "employee_gosi",
        entity_id: id,
        details: { employeeId },
      });
      return employeeId;
    });
    refresh(employeeId);
    return { success: true };
  });
}

export async function registerUnregisteredEmployeesAction(
  effectiveFrom: string,
) {
  return measureOperation(
    "action:registerUnregisteredEmployeesAction",
    async () => {
      const actor = await requirePermission("payroll", "edit");
      validateActionArguments("registerUnregisteredEmployeesAction", {
        effectiveFrom,
      });
      const result = await runAtomicMutation(async () => {
        const result = await registerUnregisteredEmployees(
          effectiveFrom,
          actor.id,
        );
        await createActivityLog({
          user_id: actor.id,
          action: "bulk_register",
          entity_type: "employee_gosi",
          entity_id: "all",
          details: { ...result, effectiveFrom },
        });
        return result;
      });
      refresh();
      return { success: true, ...result };
    },
  );
}

export async function saveSupportProgramAction(
  input: SupportProgramInput,
  id?: string,
) {
  return measureOperation("action:saveSupportProgramAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("saveSupportProgramAction", { input, id });
    const saved = await runAtomicMutation(async () => {
      const saved = await saveSupportProgram(input, id);
      await createActivityLog({
        user_id: actor.id,
        action: id ? "update" : "create",
        entity_type: "support_program",
        entity_id: saved.id,
        details: { name: saved.nameEn, provider: saved.provider },
      });
      return saved;
    });
    refresh();
    return { success: true, id: saved.id };
  });
}

export async function scheduleSupportRuleAction(
  programId: string,
  input: SupportRuleInput,
) {
  return measureOperation("action:scheduleSupportRuleAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("scheduleSupportRuleAction", { programId, input });
    await runAtomicMutation(async () => {
      const rule = await scheduleSupportRule(programId, input, actor.id);
      await createActivityLog({
        user_id: actor.id,
        action: "schedule",
        entity_type: "support_rule",
        entity_id: rule.id,
        details: {
          programId,
          from: input.effective_from,
          schedule: input.schedule,
          monthlyCap: input.monthly_cap ?? null,
        },
      });
    });
    refresh();
    return { success: true };
  });
}

export async function deleteSupportRuleAction(id: string) {
  return measureOperation("action:deleteSupportRuleAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("deleteSupportRuleAction", { id });
    await runAtomicMutation(async () => {
      await deleteSupportRule(id);
      await createActivityLog({
        user_id: actor.id,
        action: "delete",
        entity_type: "support_rule",
        entity_id: id,
      });
    });
    refresh();
    return { success: true };
  });
}

export async function saveEmployeeSupportAction(
  input: EmployeeSupportInput,
  id?: string,
) {
  return measureOperation("action:saveEmployeeSupportAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("saveEmployeeSupportAction", { input, id });
    const saved = await runAtomicMutation(async () => {
      const saved = await saveEmployeeSupport(input, actor.id, id);
      await createActivityLog({
        user_id: actor.id,
        action: id ? "update" : "create",
        entity_type: "employee_support",
        entity_id: saved.id,
        details: { employeeId: input.employee_id, status: input.status },
      });
      return saved;
    });
    refresh(input.employee_id);
    return { success: true, id: saved.id };
  });
}

export async function deleteEmployeeSupportAction(id: string) {
  return measureOperation("action:deleteEmployeeSupportAction", async () => {
    const actor = await requirePermission("payroll", "edit");
    validateActionArguments("deleteEmployeeSupportAction", { id });
    const employeeId = await runAtomicMutation(async () => {
      const employeeId = await deleteEmployeeSupport(id);
      await createActivityLog({
        user_id: actor.id,
        action: "delete",
        entity_type: "employee_support",
        entity_id: id,
        details: { employeeId },
      });
      return employeeId;
    });
    refresh(employeeId);
    return { success: true };
  });
}
