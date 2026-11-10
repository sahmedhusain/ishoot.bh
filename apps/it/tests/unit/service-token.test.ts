import { describe, expect, it } from "vitest";
import { serviceCaller, serviceTokenTtlSeconds, apiUrl } from "../../lib/api/config";

describe("IT Service Config Suite", () => {
  it("defines service caller and TTL configuration", () => {
    expect(serviceCaller()).toBe("admin");
    expect(serviceTokenTtlSeconds()).toBe(300);
  });

  it("throws when API_URL is not set", () => {
    delete process.env.API_URL;
    expect(() => apiUrl()).toThrow("API_URL is not set");
  });
});
