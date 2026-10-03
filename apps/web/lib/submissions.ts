import { NextRequest } from "next/server";

// ponytail: process-local abuse guard; use a shared limiter when deploying multiple instances.
const windows = new Map<string, { count: number; until: number }>();
export async function readSubmission(
  req: NextRequest,
): Promise<Record<string, unknown>> {
  const key =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  windows.forEach((state, id) => {
    if (state.until < now) windows.delete(id);
  });
  const state = windows.get(key) || { count: 0, until: now + 60000 };
  if (state.count >= 12 || (!windows.has(key) && windows.size >= 5000))
    throw new Error("RATE_LIMIT");
  state.count++;
  windows.set(key, state);
  if (Number(req.headers.get("content-length")) > 24000)
    throw new Error("INVALID_INPUT");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("INVALID_INPUT");
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > 24000) {
      await reader.cancel();
      throw new Error("INVALID_INPUT");
    }
    chunks.push(part.value);
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("INVALID_INPUT");
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || body.website)
    throw new Error("INVALID_INPUT");
  return body;
}
export function textField(
  body: Record<string, unknown>,
  key: string,
  max = 500,
  required = false,
) {
  const value = body[key] ?? "";
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error("INVALID_INPUT");
  return value.trim();
}
export function submissionKey(body: Record<string, unknown>) {
  const key = textField(body, "submissionKey", 80, true);
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(key)) throw new Error("INVALID_INPUT");
  return key;
}
