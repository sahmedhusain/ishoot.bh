import { isApiError } from "@platform/api-client";
export type StaffFailure =
  "lastAdmin" | "exists" | "roleAssigned" | "invalid" | "failed";
export async function staffCommand<T>(
  run: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; reason: StaffFailure }> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 403))
      throw error;
    const reasons: Record<string, StaffFailure> = {
      last_staff_admin: "lastAdmin",
      email_taken: "exists",
      role_exists: "exists",
      role_assigned: "roleAssigned",
    };
    return {
      ok: false,
      reason: isApiError(error)
        ? (reasons[error.code] ??
          ([400, 422].includes(error.status) ? "invalid" : "failed"))
        : "failed",
    };
  }
}
