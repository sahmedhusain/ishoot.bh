import { describe, expect, it } from "vitest";
import { checkDomain } from "../../lib/config/domain-check";

describe("IT Domain Check Suite", () => {
  it("returns unreachable for non-existent domains", async () => {
    const result = await checkDomain("website", "invalid-domain-nonexistent-12345.test", async () => null);
    expect(result.state).toBe("unreachable");
  });
});
