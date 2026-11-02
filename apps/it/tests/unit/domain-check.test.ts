import { afterEach, describe, expect, test, vi } from "vitest";

const lookup = vi.fn();
vi.mock("node:dns/promises", () => ({ lookup: (...args: unknown[]) => lookup(...args) }));

const { checkDomain, healthFingerprint } = await import(
  "../../packages/database/src/services/domain-check"
);

const answer = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
  lookup.mockReset();
});

describe("domain check", () => {
  test("connected only when the domain reports the expected app and installation", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal("fetch", answer({ app: "web", installation: "abc" }));
    expect(await checkDomain("website", "example.com", async () => "abc")).toEqual({ state: "connected", status: 200 });
    expect(await checkDomain("website", "example.com", async () => "other")).toEqual({ state: "other", status: 200 });
    expect(await checkDomain("admin", "example.com", async () => "abc")).toEqual({ state: "other", status: 200 });
    // Without a known fingerprint nothing can be confirmed (the IT dashboard has no database of its own).
    expect(await checkDomain("website", "example.com", async () => null)).toEqual({ state: "other", status: 200 });
  });

  test("never calls private addresses", async () => {
    lookup.mockResolvedValue([{ address: "10.1.2.3", family: 4 }]);
    const fetch = answer({});
    vi.stubGlobal("fetch", fetch);
    expect(await checkDomain("website", "example.com", async () => "abc")).toEqual({ state: "private" });
    expect(fetch).not.toHaveBeenCalled();
  });

  test("an app's health route gives the installation to expect", async () => {
    vi.stubGlobal("fetch", answer({ app: "web", installation: "abc" }));
    expect(await healthFingerprint("http://localhost:3000")).toBe("abc");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect(await healthFingerprint("http://localhost:3000")).toBeNull();
  });
});
