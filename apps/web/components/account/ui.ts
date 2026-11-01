// Shared look of the account forms (the contact form's fields and buttons).
export const field =
  "w-full px-4 py-3 rounded-brand bg-m3-surface-container-low border border-m3-outline-variant text-m3-on-surface text-sm placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary focus:ring-1 focus:ring-m3-primary transition-colors duration-150 font-sans";
export const primaryButton =
  "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-m3-primary hover:brightness-95 text-m3-on-primary font-bold text-sm shadow-m3-1 hover:shadow-m3-2 transition-all duration-150 disabled:opacity-50 cursor-pointer";
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-m3-outline-variant bg-m3-surface-container-low text-m3-primary text-sm font-semibold hover:bg-m3-surface-container-high transition-colors duration-150 disabled:opacity-50 cursor-pointer";
export const btnPrimary = primaryButton;
export const btnGhost = secondaryButton;
export const card =
  "scroll-mt-32 rounded-brand bg-m3-surface-container-low border border-m3-outline-variant p-5 sm:p-6 space-y-5";
export const label = "text-xs font-semibold text-m3-on-surface font-sans";

export function statusTone(status: string): string {
  switch (status) {
    case "paid":
    case "delivered":
      return "bg-m3-primary-container text-m3-on-primary-container";
    case "cancelled":
    case "returned":
      return "bg-m3-error-container text-m3-on-error-container";
    default:
      return "bg-m3-secondary-container text-m3-on-secondary-container";
  }
}

/** Posts to the account API; resolves with the JSON body or throws the error key. */
export async function accountPost<T = { success: boolean }>(
  action: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`/api/account/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response
    .json()
    .catch(() => ({ error: "generic" }))) as T & { error?: string };
  if (!response.ok || data.error) throw new Error(data.error || "generic");
  return data;
}
