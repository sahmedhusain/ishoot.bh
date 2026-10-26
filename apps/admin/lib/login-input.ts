import { serverMessages } from "@platform/locales";
import type { NextRequest } from "next/server";

import {
  consumeAbuseLimit,
  trustedClientIp,
} from "@platform/database/services/abuse-limits";
export async function readLoginInput(
  req: NextRequest,
): Promise<Record<string, unknown>> {
  const ip = trustedClientIp(req.headers);
  await consumeAbuseLimit("login-ip", ip || "untrusted-ingress", ip ? 10 : 300);
  if (Number(req.headers.get("content-length")) > 4096)
    throw new Error(serverMessages.invalidInput);
  const reader = req.body?.getReader();
  if (!reader) throw new Error(serverMessages.invalidInput);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > 4096) {
      await reader.cancel();
      throw new Error(serverMessages.invalidInput);
    }
    chunks.push(chunk.value);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return data;
  } catch {
    throw new Error(serverMessages.invalidInput);
  }
}
