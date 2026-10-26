// Shared look of the account forms (the contact form's fields and buttons).
export const field =
  "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors duration-150 font-sans";
export const primaryButton =
  "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--web-accent)] hover:bg-tone-15 text-paper font-bold text-sm transition-colors duration-150 disabled:opacity-50 cursor-pointer";
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/15 text-white text-sm font-semibold hover:bg-white/5 transition-colors duration-150 disabled:opacity-50 cursor-pointer";
export const label = "text-xs font-semibold text-ink font-sans";

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
