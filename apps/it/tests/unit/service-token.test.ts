import { describe, expect, it } from "vitest";
import { serviceCaller, serviceTokenTtlSeconds, apiUrl } from "../../lib/api/config";

describe("IT Service Config Suite", () => {
  it("defines service caller and TTL configuration", () => {
    expect(serviceCaller()).toBe("admin");
    expect(serviceTokenTtlSeconds()).toBe(300);
  });

  it("defaults to http://127.0.0.1:8080 when API_URL is not set and strips trailing slashes", () => {
    const prev = process.env.API_URL;
    try {
      delete process.env.API_URL;
      expect(apiUrl()).toBe("http://127.0.0.1:8080");
      process.env.API_URL = "http://gateway:8080///";
      expect(apiUrl()).toBe("http://gateway:8080");
    } finally {
      if (prev === undefined) delete process.env.API_URL;
      else process.env.API_URL = prev;
    }
  });
});
