import { describe, expect, it } from "vitest";
import { loadOpenApiEndpoints, parseOpenApiPathsYaml } from "../../lib/openapi-catalog";

describe("openapi-catalog", () => {
  it("parses paths, methods, summaries, operationIds, and services from YAML", () => {
    const sample = `
openapi: 3.1.0
info:
  title: Sample
paths:
  /v1/system/desk/health:
    get:
      summary: System health summary
      operationId: getSystemHealth
      tags:
        - System
  /v1/commerce/orders:
    post:
      summary: Create order
      operationId: createOrder
      tags:
        - Commerce
components:
  schemas: {}
`;
    const items = parseOpenApiPathsYaml(sample);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      method: "GET",
      path: "/v1/system/desk/health",
      service: "system",
      summary: "System health summary",
      operationId: "getSystemHealth",
    });
    expect(items[1]).toMatchObject({
      method: "POST",
      path: "/v1/commerce/orders",
      service: "commerce",
      summary: "Create order",
      operationId: "createOrder",
    });
  });

  it("loads the combined platform OpenAPI specification with all 350+ operations", () => {
    const endpoints = loadOpenApiEndpoints();
    expect(endpoints.length).toBeGreaterThanOrEqual(300);
    expect(endpoints.some((e) => e.path === "/v1/audit/desk/events" && e.method === "GET")).toBe(true);
    expect(endpoints.some((e) => e.service === "system")).toBe(true);
  });
});
