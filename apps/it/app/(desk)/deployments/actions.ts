"use server";

import { requireAllowed } from "../../../lib/session";
import { pushLogs } from "../../../lib/logger-queue";

export interface RevalidationTargetResult {
  target: "web" | "store";
  url: string;
  ok: boolean;
  status: number;
  durationMs: number;
  error?: string;
}

export interface RevalidationActionResult {
  results: RevalidationTargetResult[];
  triggeredAt: string;
}

async function revalidateSingleTarget(
  target: "web" | "store",
  baseUrl: string,
  secret: string,
  paths: string[],
  tags: string[],
): Promise<RevalidationTargetResult> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/revalidate`;
  const started = Date.now();
  if (!secret) {
    return {
      target,
      url,
      ok: false,
      status: 0,
      durationMs: 0,
      error: "REVALIDATION_SECRET is not configured in IT runtime",
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ paths, tags }),
      cache: "no-store",
    });
    const durationMs = Date.now() - started;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        target,
        url,
        ok: false,
        status: res.status,
        durationMs,
        error: text.slice(0, 200) || `HTTP ${res.status}`,
      };
    }
    return {
      target,
      url,
      ok: true,
      status: res.status,
      durationMs,
    };
  } catch (err) {
    return {
      target,
      url,
      ok: false,
      status: 0,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function revalidateFrontendCacheAction(
  target: "web" | "store" | "all",
  pathsInput?: string[],
  tagsInput?: string[],
): Promise<RevalidationActionResult> {
  const user = await requireAllowed("runtime_config", "edit");
  const secret = process.env.REVALIDATION_SECRET || "";
  const webUrl = process.env.WEB_INTERNAL_URL || process.env.WEB_URL || "http://127.0.0.1:3000";
  const storeUrl = process.env.STORE_INTERNAL_URL || process.env.STORE_URL || "http://127.0.0.1:3003";

  const paths = (pathsInput && pathsInput.length > 0 ? pathsInput : ["/"])
    .map((p) => p.trim())
    .filter((p) => p.startsWith("/") && !p.startsWith("//"))
    .slice(0, 16);
  const tags = (tagsInput && tagsInput.length > 0 ? tagsInput : ["website", "company"])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 16);

  const targets: Array<["web" | "store", string]> =
    target === "all"
      ? [
          ["web", webUrl],
          ["store", storeUrl],
        ]
      : target === "web"
        ? [["web", webUrl]]
        : [["store", storeUrl]];

  const results = await Promise.all(
    targets.map(([name, url]) => revalidateSingleTarget(name, url, secret, paths, tags)),
  );

  const okCount = results.filter((r) => r.ok).length;
  pushLogs([
    {
      timestamp: new Date().toISOString(),
      level: okCount === results.length ? "INFO" : "WARN",
      service: "frontend/it",
      user: user.email,
      action: "REVALIDATE_FRONTEND_CACHE",
      message: `Cache revalidation (${target}): ${okCount}/${results.length} succeeded`,
      metadata: { target, paths, tags, results },
    },
  ]);

  return {
    results,
    triggeredAt: new Date().toISOString(),
  };
}
