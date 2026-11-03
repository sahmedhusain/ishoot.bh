// Whether a domain reaches this installation: fetches https://<domain>/api/health and compares the installation it
// reports with the expected one. Only public addresses are called, with a short timeout and no redirects; nothing about
// DNS is changed. Used by the admin's setup wizard (which reads the fingerprint from the database) and the IT dashboard
// (which has no database and asks the configured website or admin instead). Imports nothing that needs the database.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { serverMessages } from "@platform/locales";
import { HEALTH_PATH, normalizeDomain } from "../constants/domains";

/** What the domain check found. */
export interface DomainCheckResult {
  /** connected: the domain reaches this installation; other: it answers, but as another site or app. */
  state: "connected" | "other" | "unreachable" | "private";
  /** The HTTP status the domain answered with, when it answered. */
  status?: number;
}

/** Private, loopback, link-local and other non-public addresses the check must never call. */
function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v6 = address.toLowerCase();
  return (
    v6 === "::1" ||
    v6 === "::" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe80") ||
    v6.startsWith("::ffff:")
  );
}

/** The installation's fingerprint as an app's health route reports it, or null when it cannot be read. */
export async function healthFingerprint(origin: string): Promise<string | null> {
  try {
    const response = await fetch(new URL(HEALTH_PATH, origin), {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const body = (await response.json().catch(() => null)) as {
      installation?: unknown;
    } | null;
    return typeof body?.installation === "string" ? body.installation : null;
  } catch {
    return null;
  }
}

/** Checks the website ("web" app) or admin domain against this installation's fingerprint (installation.ts). */
export async function checkDomain(
  kind: "website" | "admin",
  domain: string,
  expected: () => Promise<string | null>,
): Promise<DomainCheckResult> {
  const host = normalizeDomain(domain);
  if (!host) throw new Error(serverMessages.invalidDomain);
  const addresses = await lookup(host, { all: true }).catch(() => []);
  if (!addresses.length) return { state: "unreachable" };
  if (addresses.some((entry) => isPrivateAddress(entry.address)))
    return { state: "private" };
  try {
    const response = await fetch(`https://${host}${HEALTH_PATH}`, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { state: "other", status: response.status };
    const body = (await response.json().catch(() => null)) as {
      app?: unknown;
      installation?: unknown;
    } | null;
    const fingerprint = await expected();
    const connected =
      body?.app === (kind === "admin" ? "admin" : "web") &&
      !!fingerprint &&
      body.installation === fingerprint;
    return {
      state: connected ? "connected" : "other",
      status: response.status,
    };
  } catch {
    return { state: "unreachable" };
  }
}
