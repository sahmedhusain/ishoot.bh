/**
 * Formats and validates company usernames.
 * Format: <FirstInitial><LastInitial><4-digit-zero-padded-number>
 * E.g. "Ali Jassim", 20 -> "AJ0020"
 * E.g. "Bader Ali", 1 -> "BA0001"
 */

export function formatUsername(nameEn: string, sequenceNumber: number): string {
  const clean = (nameEn || "").trim().replace(/[^a-zA-Z\s]/g, "");
  const parts = clean.split(/\s+/).filter(Boolean);
  let initials = "BA";
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    initials = parts[0].slice(0, 2).toUpperCase();
  } else if (parts.length === 1) {
    initials = (parts[0][0] + "A").toUpperCase();
  }
  const seq = String(Math.max(1, Math.floor(sequenceNumber))).padStart(4, "0");
  return `${initials}${seq}`;
}

export function parseUsername(
  username: string,
): { initials: string; sequenceNumber: number } | null {
  const match = (username || "").trim().toUpperCase().match(/^([A-Z]{2})(\d{4})$/);
  if (!match) return null;
  return {
    initials: match[1],
    sequenceNumber: parseInt(match[2], 10),
  };
}

export function isValidUsername(username: string): boolean {
  return /^([A-Z]{2})(\d{4})$/i.test((username || "").trim());
}
