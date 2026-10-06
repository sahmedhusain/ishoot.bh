"use server";
import { revalidatePath } from "next/cache";
import { createActivityLog, deleteTaxRate, measureOperation, runAtomicMutation, saveTaxRate, type TaxRateInput } from "@ishoot/database";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { requirePermission } from "../../lib/auth";

/** Adds or edits a tax besides VAT (rate, registration number, certificate, where it applies). */
export async function saveTaxRateAction(data: TaxRateInput) {
  return measureOperation("action:saveTaxRateAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("saveTaxRateAction", { data });
    const tax = await runAtomicMutation(async () => {
      const saved = await saveTaxRate(data);
      await createActivityLog({
        user_id: user.id,
        action: data.id ? "update" : "create",
        entity_type: "tax_rate",
        entity_id: saved.id,
        details: { name: saved.nameEn, rate: Number(saved.ratePercent), active: saved.isActive },
      });
      return saved;
    });
    revalidatePath(ROUTES.settings.company);
    return { success: true, id: tax.id, code: tax.code };
  });
}

export async function deleteTaxRateAction(id: string) {
  return measureOperation("action:deleteTaxRateAction", async () => {
    const user = await requirePermission("settings", "write");
    validateActionArguments("deleteTaxRateAction", { id });
    await runAtomicMutation(async () => {
      await deleteTaxRate(id);
      await createActivityLog({ user_id: user.id, action: "delete", entity_type: "tax_rate", entity_id: id, details: {} });
    });
    revalidatePath(ROUTES.settings.company);
    return { success: true };
  });
}
