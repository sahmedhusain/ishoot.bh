import { describe, expect, it } from "vitest";
import { readSignInState, safeNextPath } from "../../lib/customer-credentials";

describe("Web Customer Credentials & OAuth State Suite", () => {
  it("sanitizes next redirect paths to prevent open redirect vulnerabilities", () => {
    expect(safeNextPath("/en/account", "/en/store")).toBe("/en/account");
    expect(safeNextPath("/ar/checkout/payment", "/ar/store")).toBe("/ar/checkout/payment");
    expect(safeNextPath("https://evil.com", "/en/account")).toBe("/en/account");
    expect(safeNextPath("//evil.com", "/en/account")).toBe("/en/account");
    expect(safeNextPath(null, "/en/account")).toBe("/en/account");
  });

  it("parses valid sign-in state objects", () => {
    const valid = JSON.stringify({
      state: "1234567890123456789012345678901234567890123",
      provider: "google",
      locale: "en",
      next: "/en/account",
    });

    const parsed = readSignInState(valid);
    expect(parsed).not.toBeNull();
    expect(parsed?.provider).toBe("google");
    expect(parsed?.locale).toBe("en");
    expect(parsed?.next).toBe("/en/account");
  });

  it("rejects corrupted or malicious sign-in state objects", () => {
    expect(readSignInState("invalid-json")).toBeNull();
    expect(readSignInState(JSON.stringify({ state: "short", provider: "google" }))).toBeNull();
    expect(readSignInState(JSON.stringify({ state: "1234567890123456789012345678901234567890123", provider: "invalid" }))).toBeNull();
  });
});
