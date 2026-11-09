export function normalizeEmail(email?: string | null): string {
  const clean = email?.trim().toLowerCase() ?? "";
  const at = clean.lastIndexOf("@");
  if (at < 0) return clean;
  try {
    const domain = clean.slice(at + 1);
    if (/[\s/:?#\\%]/.test(domain)) return clean;
    return `${clean.slice(0, at)}@${new URL(`https://${domain}`).hostname}`;
  } catch { return clean; }
}

export function isValidEmail(email?: string | null): boolean {
  if (typeof email !== "string") return false;
  const clean = normalizeEmail(email);
  if (clean.length > 254 || /[\s\u0000-\u001f\u007f]/.test(clean)) return false;
  const parts = clean.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..") || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false;
  const labels = domain.split(".");
  return labels.length > 1 && domain.length <= 253 && labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) && /^(?:[a-z]{2,}|xn--[a-z0-9-]+)$/i.test(labels[labels.length - 1]);
}
