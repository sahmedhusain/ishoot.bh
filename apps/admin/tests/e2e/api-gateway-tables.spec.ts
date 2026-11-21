import { expect, test } from "@playwright/test";
import { loadManifest, mintServiceToken } from "./helpers/strict-audit";

const GATEWAY = process.env.API_URL || "http://127.0.0.1:8080";

test.describe("Phase 1.4 — Exhaustive All-257 JsonCRUD Table Endpoints", () => {
  test("every single one of the 257 registered tables responds 200 JSON array on GET and rejects unknown table names", async ({
    request,
  }) => {
    test.setTimeout(180_000);
    const manifest = loadManifest();
    const tables: Array<{ service: string; schema: string; prefix: string; table: string; endpoint: string }> =
      manifest.backend.tables;

    expect(tables.length, "Expected 257 jsoncrud tables in manifest").toBeGreaterThanOrEqual(250);

    const token = mintServiceToken("admin");
    const seenSchemas = new Set<string>();

    for (const t of tables) {
      seenSchemas.add(`${t.service}:${t.prefix}`);
      const res = await request.get(`${GATEWAY}${t.endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status(), `GET ${t.endpoint} (${t.service}.${t.table})`).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body), `${t.endpoint} should return JSON array`).toBe(true);
    }

    // Verify allowlist guard on every schema
    for (const pair of seenSchemas) {
      const [, prefix] = pair.split(":");
      const bad = await request.get(`${GATEWAY}${prefix}/tables/__nonexistent_e2e_table__`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(bad.status()).toBe(400);
    }
  });

  test("jsoncrud POST insert, PK upsert update, and DELETE lifecycle across schemas", async ({ request }) => {
    const token = mintServiceToken("admin");
    const ts = Date.now();
    const id = crypto.randomUUID();

    // 1. System schema: tag (id, name, color) or canned_reply
    const createTag = await request.post(`${GATEWAY}/v1/system/tables/tag`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { id, name: `e2e-tag-${ts}`, slug: `e2e-tag-${ts}`, color: "#336699" },
    });
    expect(createTag.status(), `Create tag: ${await createTag.text()}`).toBe(200);

    // PK upsert update (testing commit a5cbb26a fix)
    const updateTag = await request.post(`${GATEWAY}/v1/system/tables/tag`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { id, name: `e2e-tag-updated-${ts}`, slug: `e2e-tag-${ts}`, color: "#112233" },
    });
    expect(updateTag.status(), `Upsert tag: ${await updateTag.text()}`).toBe(200);
    const updatedJson = await updateTag.json();
    expect(updatedJson.name).toBe(`e2e-tag-updated-${ts}`);

    const listTags = await request.get(`${GATEWAY}/v1/system/tables/tag`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const tags = await listTags.json();
    expect(tags.some((t: any) => t.id === id && t.name === `e2e-tag-updated-${ts}`)).toBe(true);

    const delTag = await request.delete(`${GATEWAY}/v1/system/tables/tag/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delTag.status()).toBe(204);

    // 2. CMS schema (verifies our /v1/cms table prefix fix!): faq CRUD via jsoncrud
    const faqId = crypto.randomUUID();
    const createFaq = await request.post(`${GATEWAY}/v1/cms/tables/faq`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        id: faqId,
        questionEn: `E2E Table FAQ ${ts}?`,
        questionAr: `سؤال اختبار ${ts}؟`,
        answerEn: "Yes, works cleanly.",
        answerAr: "نعم يعمل.",
        category: "general",
        isPublished: false,
        sortOrder: 999,
      },
    });
    expect(createFaq.status(), `CMS FAQ jsoncrud POST: ${await createFaq.text()}`).toBe(200);
    const delFaq = await request.delete(`${GATEWAY}/v1/cms/tables/faq/${faqId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delFaq.status()).toBe(204);

    // 3. Finance schema: expense_category via jsoncrud
    const catId = crypto.randomUUID();
    const createCat = await request.post(`${GATEWAY}/v1/finance/tables/expense_category`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        id: catId,
        nameEn: `E2E JsonCRUD Cat ${ts}`,
        nameAr: `فئة ${ts}`,
        code: `EC${ts.toString().slice(-6)}`,
        isActive: true,
      },
    });
    expect(createCat.status(), `Finance expense_category POST: ${await createCat.text()}`).toBe(200);
    const delCat = await request.delete(`${GATEWAY}/v1/finance/tables/expense_category/${catId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delCat.status()).toBe(204);
  });
});
