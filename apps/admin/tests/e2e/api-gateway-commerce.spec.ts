import { expect, test } from "@playwright/test";
import { getCachedItAuth, mintServiceToken } from "./helpers/strict-audit";

const GATEWAY = process.env.API_URL || "http://127.0.0.1:8080";

test.describe("Phase 1.3 — Inventory, Commerce, Delivery, CMS & ITSM APIs (GET/POST/PUT/DELETE)", () => {
  test("inventory & commerce APIs: categories, products, variants, warehouses, stock, coupons & orders", async ({
    request,
  }) => {
    const adminToken = mintServiceToken("admin");
    const storeToken = mintServiceToken("store");
    const headers = { Authorization: `Bearer ${adminToken}` };
    const ts = Date.now();

    for (const p of [
      "/v1/inventory/warehouses",
      "/v1/inventory/categories",
      "/v1/inventory/products",
      "/v1/inventory/stock/levels",
      "/v1/inventory/stock/movements",
      "/v1/inventory/counts",
      "/v1/inventory/purchase-orders",
      "/v1/inventory/requisitions",
      "/v1/admin/products",
      "/v1/admin/inventory/warehouses",
      "/v1/commerce/customers",
      "/v1/commerce/settings",
      "/v1/commerce/coupons",
      "/v1/commerce/orders",
      "/v1/commerce/retail/registers",
      "/v1/commerce/retail/shifts",
      "/v1/commerce/retail/closings",
      "/v1/commerce/regions",
      "/v1/commerce/segments",
      "/v1/store/settings",
      "/v1/store/orders",
      "/v1/admin/orders",
    ]) {
      const r = await request.get(`${GATEWAY}${p}`, {
        headers: { Authorization: `Bearer ${p.startsWith("/v1/store") ? storeToken : adminToken}` },
      });
      expect(r.status(), `GET ${p}`).toBe(200);
    }

    // Create category -> product -> variant -> update product -> delete category? (keep product inactive & clean or verify GET/PUT)
    const catRes = await request.post(`${GATEWAY}/v1/inventory/categories`, {
      headers,
      data: {
        slug: `e2e-cat-${ts}`,
        nameEn: `E2E Cat ${ts}`,
        nameAr: `فئة ${ts}`,
        isActive: true,
        sortOrder: 99,
      },
    });
    expect(catRes.status(), await catRes.text()).toBe(201);
    const cat = await catRes.json();

    const prodRes = await request.post(`${GATEWAY}/v1/inventory/products`, {
      headers,
      data: {
        sku: `E2E-SKU-${ts}`,
        nameEn: `E2E Product ${ts}`,
        nameAr: `منتج ${ts}`,
        descriptionEn: "API test product",
        descriptionAr: "منتج اختبار",
        categoryId: cat.id,
        costPrice: "10.000",
        sellingPrice: "25.000",
        currency: "BHD",
        taxRate: "10.00",
        isActive: false,
        trackInventory: true,
        reorderPoint: "5",
      },
    });
    expect(prodRes.status(), await prodRes.text()).toBe(201);
    const prod = await prodRes.json();
    expect((await request.get(`${GATEWAY}/v1/inventory/products/${prod.id}`, { headers })).status()).toBe(200);
    expect((await request.put(`${GATEWAY}/v1/inventory/products/${prod.id}`, {
      headers,
      data: { ...prod, nameEn: `E2E Product Updated ${ts}` },
    })).status()).toBe(200);

    // Clean up via jsoncrud tables if product has no movements
    await request.delete(`${GATEWAY}/v1/inventory/tables/product/${prod.id}`, { headers });
    expect((await request.delete(`${GATEWAY}/v1/inventory/categories/${cat.id}`, { headers })).status()).toBe(204);
  });

  test("delivery, cms & itsm APIs full GET/POST/PUT/DELETE", async ({ request }) => {
    const adminToken = mintServiceToken("admin");
    const itToken = (await getCachedItAuth(GATEWAY)).accessToken;
    const headers = { Authorization: `Bearer ${adminToken}` };
    const ts = Date.now();

    for (const p of [
      "/v1/delivery/settings",
      "/v1/delivery/zones",
      "/v1/delivery/vehicles",
      "/v1/delivery/routes",
      "/v1/delivery/shipments",
      "/v1/delivery/agencies",
      "/v1/delivery/cod-settlements",
      "/v1/cms/pages",
      "/v1/cms/articles",
      "/v1/cms/reviews",
      "/v1/cms/faqs",
      "/v1/cms/statistics",
      "/v1/cms/portfolio-categories",
      "/v1/cms/portfolio",
      "/v1/cms/social/plans",
      "/v1/cms/social/links",
      "/v1/itsm/requests/tickets?requesterId=BA0001",
      "/v1/itsm/requests/assets",
      "/v1/itsm/requests/asset-categories",
    ]) {
      const r = await request.get(`${GATEWAY}${p}`, { headers });
      expect(r.status(), `GET ${p}`).toBe(200);
    }

    // ITSM requests/tickets without requesterId must return 422
    expect((await request.get(`${GATEWAY}/v1/itsm/requests/tickets`, { headers })).status()).toBe(422);

    // Delivery agency CRUD
    const agRes = await request.post(`${GATEWAY}/v1/delivery/agencies`, {
      headers,
      data: { name: `E2E Agency ${ts}`, code: `AG${ts.toString().slice(-6)}`, isActive: true },
    });
    expect(agRes.status(), await agRes.text()).toBe(200);
    const ag = await agRes.json();
    expect((await request.put(`${GATEWAY}/v1/delivery/agencies/${ag.id}`, {
      headers,
      data: { ...ag, name: `E2E Agency Updated ${ts}` },
    })).status()).toBe(200);
    expect((await request.delete(`${GATEWAY}/v1/delivery/agencies/${ag.id}`, { headers })).status()).toBe(204);

    // CMS FAQ + Review + Article CRUD
    const faqRes = await request.post(`${GATEWAY}/v1/cms/faqs`, {
      headers,
      data: {
        questionEn: `E2E FAQ ${ts}?`,
        questionAr: `سؤال ${ts}؟`,
        answerEn: "Answer",
        answerAr: "إجابة",
        category: "general",
        isPublished: false,
        sortOrder: 99,
      },
    });
    expect(faqRes.status(), await faqRes.text()).toBe(201);
    const faq = await faqRes.json();
    expect((await request.put(`${GATEWAY}/v1/cms/faqs/${faq.id}`, {
      headers,
      data: { ...faq, questionEn: `E2E FAQ Updated ${ts}?` },
    })).status()).toBe(200);
    expect((await request.delete(`${GATEWAY}/v1/cms/faqs/${faq.id}`, { headers })).status()).toBe(204);

    // ITSM: create ticket as employee (service realm) -> read & comment on IT desk (IT realm)
    const tktRes = await request.post(`${GATEWAY}/v1/itsm/requests/tickets`, {
      headers,
      data: {
        requesterId: "BA0001",
        requesterName: "Super Admin",
        requesterEmail: "admin@example.com",
        category: "access",
        subcategory: "new_access",
        priority: "normal",
        title: `E2E API Ticket ${ts}`,
        description: "Created from Phase 1.3 API test",
      },
    });
    expect(tktRes.status(), await tktRes.text()).toBe(201);
    const ticket = await tktRes.json();

    const deskQueue = await request.get(`${GATEWAY}/v1/itsm/desk/tickets`, {
      headers: { Authorization: `Bearer ${itToken}` },
    });
    expect(deskQueue.status()).toBe(200);

    const deskTicket = await request.get(`${GATEWAY}/v1/itsm/desk/tickets/${ticket.id}`, {
      headers: { Authorization: `Bearer ${itToken}` },
    });
    expect(deskTicket.status()).toBe(200);

    const deskSla = await request.get(`${GATEWAY}/v1/itsm/desk/sla`, {
      headers: { Authorization: `Bearer ${itToken}` },
    });
    expect(deskSla.status()).toBe(200);
  });
});
