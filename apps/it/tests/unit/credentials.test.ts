import { describe, expect, it } from "vitest";
import { clearedCookies, needsRenewal, REALM } from "../../lib/credentials";

describe("IT Credentials & Session Suite", () => {
  it("defines IT realm constant", () => {
    expect(REALM).toBe("it");
  });

  it("generates cleared cookie specs for session logout", () => {
    const cookies = clearedCookies();
    expect(cookies).toHaveLength(3);
    for (const cookie of cookies) {
      expect(cookie.value).toBe("");
      expect(cookie.options.expires).toEqual(new Date(0));
    }
  });

  it("determines when access tokens need renewal", () => {
    expect(needsRenewal(undefined)).toBe(true);
    expect(needsRenewal("invalid-jwt-token")).toBe(true);
  });
});
