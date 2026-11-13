import { serverMessages } from "@platform/locales";
import { NextRequest, NextResponse } from "next/server";

import { consumeAbuseLimit, trustedClientIp } from "@platform/database";

export function signInSecret() {
  const secret =
    process.env.CUSTOMER_AUTH_SECRET || process.env.REVALIDATION_SECRET;
  if (!secret) throw new Error(serverMessages.customerSignInUnavailable);
  return secret;
}

export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  return !!origin && origin === req.nextUrl.origin;
}

export function errorKey(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const key = Object.entries(serverMessages).find(
    ([, text]) => text === message,
  )?.[0];
  return key ?? "generic";
}

export const jsonError = (error: unknown, status = 400) =>
  NextResponse.json(
    { error: errorKey(error) },
    { status: errorKey(error) === "rateLimit" ? 429 : status },
  );
export async function readSubmission(
  req: NextRequest,
): Promise<Record<string, unknown>> {
  const ip = trustedClientIp(req.headers);
  await consumeAbuseLimit(
    "public-intake",
    ip || "untrusted-ingress",
    ip ? 12 : 300,
  );
  if (Number(req.headers.get("content-length")) > 24000)
    throw new Error(serverMessages.invalidInput);
  const reader = req.body?.getReader();
  if (!reader) throw new Error(serverMessages.invalidInput);
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > 24000) {
      await reader.cancel();
      throw new Error(serverMessages.invalidInput);
    }
    chunks.push(part.value);
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error(serverMessages.invalidInput);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || body.website)
    throw new Error(serverMessages.invalidInput);
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
    throw new Error(serverMessages.invalidInput);
  return value.trim();
}
export function submissionKey(body: Record<string, unknown>) {
  const key = textField(body, "submissionKey", 80, true);
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(key))
    throw new Error(serverMessages.invalidInput);
  return key;
}
