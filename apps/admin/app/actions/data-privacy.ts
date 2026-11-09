"use server";

import { createActivityLog } from "@platform/database";
import { revalidatePath } from "next/cache";
import { ROUTES } from "../../constants/routes";
import { isValidEmail, normalizeEmail } from "../../lib/constants/validation";
import { eraseCustomer, eraseCustomersByEmail } from "../../lib/api/commerce";
import { requirePermission } from "../../lib/auth";

export type CustomerErasureInput =
  | { kind: "customerId"; value: string }
  | { kind: "email"; value: string };

export async function eraseCustomerDataAction(input: CustomerErasureInput) {
  const actor = await requirePermission("contacts", "delete");

  if (!input || typeof input !== "object" || typeof input.value !== "string") {
    throw new Error("A customer ID or e-mail address is required.");
  }

  const value = input.value.trim();
  if (input.kind === "customerId") {
    if (!value || value.length > 128 || /[\u0000-\u001f\u007f]/.test(value)) {
      throw new Error("The customer ID is invalid.");
    }
    await eraseCustomer(value);
    await createActivityLog({
      user_id: actor.id,
      action: "right_to_erasure",
      entity_type: "customer",
      entity_id: value,
      details: { method: "customer_id" },
    });
    revalidatePath(ROUTES.crm.customer(value));
  } else if (input.kind === "email") {
    const email = normalizeEmail(value);
    if (!isValidEmail(email)) throw new Error("The e-mail address is invalid.");
    await eraseCustomersByEmail(email);
    await createActivityLog({
      user_id: actor.id,
      action: "right_to_erasure",
      entity_type: "customer",
      entity_id: "erase-by-email",
      details: { method: "email" },
    });
  } else {
    throw new Error("The erasure request type is invalid.");
  }

  revalidatePath(ROUTES.settings.privacy);
  return { success: true };
}
