import { describe, expect, test } from "vitest";
import { dnsRecords, domainOrigin, normalizeDomain } from "../../packages/database/src/constants/domains";

describe("company domains", () => {
  test("accepts host names in any common spelling", () => {
    expect(normalizeDomain("Example.com")).toBe("example.com");
    expect(normalizeDomain("https://www.example.com/about?x=1")).toBe("www.example.com");
    expect(normalizeDomain(" admin.example.co.uk. ")).toBe("admin.example.co.uk");
    expect(domainOrigin("shop.example.com")).toBe("https://shop.example.com");
  });

  test("refuses addresses that are not public host names", () => {
    for (const value of ["localhost", "127.0.0.1", "10.0.0.1", "example", "user@example.com", "example.com:8080", "-bad.example.com", "app.localhost", "printer.local", "exa mple.com", "example.123"])
      expect(normalizeDomain(value), value).toBe("");
    expect(domainOrigin("")).toBe("");
  });

  test("suggests an apex record for a bare domain and a CNAME for a subdomain", () => {
    expect(dnsRecords("example.com")[0]).toMatchObject({ type: "A", name: "@" });
    expect(dnsRecords("www.example.com")[0]).toMatchObject({ type: "CNAME", name: "www", value: "cname.vercel-dns.com" });
  });
});
