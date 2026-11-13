import { describe, expect, test } from "vitest";
import { runInNewContext } from "node:vm";
import {
  defaultWebsiteDesign,
  resolveSiteMode,
  siteBaseTone,
  siteThemeBootstrap,
  validateWebsiteDesign,
} from "@platform/database/constants/website-design";
import {
  defaultWebsiteConfig,
  resolveWebsiteConfig,
  validateWebsiteConfig,
} from "@platform/database/website-config";
import {
  defaultWebsiteCommerce,
  selectedPickupBranch,
  pickupAvailable,
  validateWebsiteCommerce,
  type PublicBranch,
} from "@platform/database/constants/website-commerce";
import { newBlockData } from "@platform/database/cms/blocks";
import { validateBlocks } from "@platform/database/queries/cms-pages";
import {
  DEFAULT_THEME,
  websiteThemeStylesheet,
} from "@platform/database/constants/theme";
import {
  INDUSTRY_PAGES,
  industryPageBlocks,
} from "@platform/database/cms/industry-pages";
import { BUSINESS_ACTIVITIES } from "@platform/database/website-presets";
import { validateWebsiteDocuments } from "@platform/database/constants/website-documents";
import {
  catalogueQuery,
  searchCatalogue,
} from "@platform/database/constants/catalogue-search";
import type { PortfolioItem } from "@platform/database/types";
import {
  promotionVisible,
  validateWebsitePromotions,
} from "@platform/database/constants/website-promotions";
import {
  inquiryUploadToken,
  inquiryFromUploadToken,
} from "@platform/database/services/inquiry-upload-token";

describe("website design and commerce snapshots", () => {
  test("category hierarchies reject loops and excessive depth", () => {
    const commerce = defaultWebsiteCommerce();
    expect(
      validateWebsiteCommerce({
        ...commerce,
        categoryParents: { shirts: "clothes", coats: "clothes" },
        orderLayout: "stacked",
      }).categoryParents,
    ).toEqual({ shirts: "clothes", coats: "clothes" });
    expect(() =>
      validateWebsiteCommerce({
        ...commerce,
        categoryParents: { a: "b", b: "a" },
      }),
    ).toThrow();
    expect(() =>
      validateWebsiteCommerce({ ...commerce, categoryParents: { a: "a" } }),
    ).toThrow();
    expect(() =>
      validateWebsiteCommerce({
        ...commerce,
        categoryParents: { a: "b", b: "c", c: "d", d: "e", e: "f", f: "g" },
      }),
    ).toThrow();
  });
  test("legacy publications retain their brand mode and retire WhatsApp", () => {
    expect(
      resolveWebsiteConfig(
        { ...defaultWebsiteConfig, whatsappButton: true },
        "light",
      ).design.defaultMode,
    ).toBe("light");
    expect(
      resolveWebsiteConfig({ ...defaultWebsiteConfig, whatsappButton: true })
        .whatsappButton,
    ).toBe(false);
    expect(
      validateWebsiteConfig({ ...defaultWebsiteConfig, whatsappButton: true })
        .whatsappButton,
    ).toBe(false);
  });
  test("design and capabilities survive validation without sharing mutable defaults", () => {
    const config = resolveWebsiteConfig(defaultWebsiteConfig);
    config.design.tones.header = "dark";
    config.commerce.capabilities.ordering = false;
    expect(validateWebsiteConfig(config).design).toEqual(config.design);
    expect(validateWebsiteConfig(config).commerce).toEqual(config.commerce);
    expect(resolveWebsiteConfig(defaultWebsiteConfig).design.tones.header).toBe(
      "inherit",
    );
    expect(
      resolveWebsiteConfig(defaultWebsiteConfig).commerce.capabilities.ordering,
    ).toBe(true);
  });
  test("CMS mode restrictions always outrank stale visitor storage", () => {
    const design = {
      ...defaultWebsiteDesign(),
      defaultMode: "light" as const,
      allowedModes: ["light" as const],
    };
    expect(resolveSiteMode(design, "dark", true)).toBe("light");
    expect(
      resolveSiteMode({ ...design, visitorSwitching: true }, "mixed", true),
    ).toBe("light");
    expect(
      resolveSiteMode(
        { ...defaultWebsiteDesign(), visitorSwitching: true },
        "mixed",
        false,
      ),
    ).toBe("mixed");
    expect(
      resolveSiteMode(
        { ...defaultWebsiteDesign(), followSystem: true },
        null,
        false,
      ),
    ).toBe("light");
    expect(siteBaseTone({ ...design, mixedBase: "dark" }, "mixed")).toBe(
      "dark",
    );
  });
  test.each([
    "defaultMode",
    "allowedModes",
    "motion",
    "tones",
    "version",
    "visitorSwitching",
  ])("invalid %s is rejected", (key) => {
    expect(() =>
      validateWebsiteDesign({ ...defaultWebsiteDesign(), [key]: "invalid" }),
    ).toThrow();
  });
  test("the first-paint script and runtime choose the same mode, even when storage is unavailable", () => {
    for (const visitorSwitching of [false, true])
      for (const followSystem of [false, true])
        for (const saved of ["light", "dark", "mixed", "invalid"]) {
          const design = {
            ...defaultWebsiteDesign(),
            visitorSwitching,
            followSystem,
          };
          const root = {
            dataset: {} as Record<string, string>,
            classList: { remove() {}, add() {} },
          };
          runInNewContext(siteThemeBootstrap(design), {
            document: { documentElement: root },
            localStorage: { getItem: () => saved },
            matchMedia: () => ({ matches: false }),
          });
          expect(root.dataset.siteMode).toBe(
            resolveSiteMode(design, saved, false),
          );
        }
    const root = {
      dataset: {} as Record<string, string>,
      classList: { remove() {}, add() {} },
    };
    runInNewContext(siteThemeBootstrap(defaultWebsiteDesign()), {
      document: { documentElement: root },
      localStorage: {
        getItem() {
          throw new Error("denied");
        },
      },
      matchMedia: () => ({ matches: false }),
    });
    expect(root.dataset.siteMode).toBe("dark");
  });
  test("scoped palettes expose semantic foregrounds, native scheme and both logos", () => {
    const css = websiteThemeStylesheet(DEFAULT_THEME);
    expect(css).toContain(
      'html[data-site-mode="mixed"] [data-site-tone="light"]',
    );
    expect(css).toContain("--site-logo-dark:none");
    expect(css).toContain("color-scheme:dark");
  });
  test("a section tone survives cleaning and rejects unsupported colors", () => {
    expect(
      validateBlocks([{ id: "tone1", type: "divider", tone: "dark" }])[0].tone,
    ).toBe("dark");
    expect(() => validateBlocks([{ type: "divider", tone: "red" }])).toThrow();
  });
});

const branch: PublicBranch = {
  id: "seef",
  nameEn: "Seef",
  nameAr: "السيف",
  addressEn: "Road 1",
  addressAr: "طريق ١",
  city: "Manama",
  country: "Bahrain",
  phone: "",
  hoursEn: "",
  hoursAr: "",
  directionsUrl: "",
  latitude: 26.23,
  longitude: 50.54,
  active: true,
  pickup: true,
};
describe("pickup eligibility", () => {
  test("legacy pickup remains valid; configured branches require a real eligible choice", () => {
    const commerce = defaultWebsiteCommerce();
    expect(selectedPickupBranch(commerce)).toBeNull();
    const cleared = {
      ...validateWebsiteCommerce({ ...commerce, branches: [branch] }),
      branches: [],
    };
    expect(pickupAvailable(cleared)).toBe(false);
    expect(() => selectedPickupBranch(cleared)).toThrow();
    expect(pickupAvailable(commerce)).toBe(true);
    commerce.branches = [branch];
    expect(() => selectedPickupBranch(commerce)).toThrow();
    expect(() => selectedPickupBranch(commerce, "warehouse-secret")).toThrow();
    expect(selectedPickupBranch(commerce, "seef")).toEqual(branch);
    expect(selectedPickupBranch(commerce, "seef")).not.toBe(branch);
    expect(() =>
      selectedPickupBranch(
        { ...commerce, branches: [{ ...branch, active: false }] },
        "seef",
      ),
    ).toThrow();
    expect(() =>
      selectedPickupBranch(
        { ...commerce, branches: [{ ...branch, pickup: false }] },
        "seef",
      ),
    ).toThrow();
  });
  test("coordinates, URLs and branch identifiers are validated at the CMS boundary", () => {
    const commerce = { ...defaultWebsiteCommerce(), branches: [branch] };
    expect(validateWebsiteCommerce(commerce).branches).toEqual([branch]);
    expect(() =>
      validateWebsiteCommerce({ ...commerce, branchSelectionRequired: "true" }),
    ).toThrow();
    for (const patch of [
      { latitude: 91 },
      { latitude: null },
      { longitude: NaN },
      { directionsUrl: "javascript:alert(1)" },
      { nameEn: "" },
    ])
      expect(() =>
        validateWebsiteCommerce({
          ...commerce,
          branches: [{ ...branch, ...patch }],
        }),
      ).toThrow();
    expect(() =>
      validateWebsiteCommerce({ ...commerce, branches: [branch, branch] }),
    ).toThrow();
  });
});

test("all 23 activities provide editable compositions using validated block types", () => {
  expect(Object.keys(INDUSTRY_PAGES).sort()).toEqual(
    [...BUSINESS_ACTIVITIES].sort(),
  );
  for (const activity of BUSINESS_ACTIVITIES)
    for (const recipe of INDUSTRY_PAGES[activity]) {
      expect(recipe.en).toBeTruthy();
      expect(recipe.ar).toBeTruthy();
      let id = 0;
      const blocks = industryPageBlocks(recipe, () => `block${id++}`);
      expect(validateBlocks(blocks)).toEqual(blocks);
    }
});

test("public documents reject private file paths, credentials and executable links", () => {
  const doc = {
    titleEn: "Specification",
    titleAr: "المواصفات",
    itemSlug: "product-one",
    url: "/api/files/brand/spec.pdf",
  };
  expect(validateWebsiteDocuments([doc])).toEqual([doc]);
  for (const url of [
    "/api/files/general/customer_secret.pdf",
    "javascript:alert(1)",
    "https://user:secret@example.test/spec.pdf",
    "http://example.test/spec.pdf",
  ])
    expect(() => validateWebsiteDocuments([{ ...doc, url }])).toThrow();
});

test("catalogue query handles mixed-language facts, invalid input, missing prices and empty pages", () => {
  const item = (id: string, title_en: string, price?: number) =>
    ({
      id,
      title_en,
      title_ar: id === "b" ? "قهوة" : "",
      attributes: [],
      price,
    }) as unknown as PortfolioItem;
  const items = [
    item("a", "A", 20),
    item("b", "Coffee 250g", 4),
    item("c", "C"),
  ];
  const query = catalogueQuery(
    new URLSearchParams("q=قهوة&page=-1&sort=invalid"),
  );
  expect(query.page).toBe(1);
  expect(query.sort).toBe("featured");
  expect(
    searchCatalogue(items, query, "ar", 12).items.map((i) => i.id),
  ).toEqual(["b"]);
  expect(
    searchCatalogue(
      items,
      { ...query, q: "", sort: "price-desc", page: 100 },
      "en",
      12,
    ).items.map((i) => i.id),
  ).toEqual(["a", "b", "c"]);
  expect(
    searchCatalogue(items, { ...query, q: "missing" }, "en", 12),
  ).toMatchObject({ total: 0, page: 1, pages: 1, items: [] });
  items[1].attributes = [
    { labelEn: "Weight", labelAr: "الوزن", valueEn: "250g", valueAr: "٢٥٠ غ" },
  ];
  const facetQuery = catalogueQuery(new URLSearchParams("filter-Weight=250g"), [
    "Weight",
  ]);
  expect(
    searchCatalogue(items, facetQuery, "ar", 12).items.map((item) => item.id),
  ).toEqual(["b"]);
  expect(
    validateWebsiteCommerce({
      ...defaultWebsiteCommerce(),
      facetLabels: ["Weight", ""],
    }).facetLabels,
  ).toEqual(["Weight"]);
  items[1].category = {
    id: "coffee",
    slug: "coffee",
    name_en: "Coffee",
    name_ar: "قهوة",
    display_order: 0,
  };
  expect(
    searchCatalogue(items, { ...facetQuery, category: "drinks" }, "en", 12, {
      coffee: "drinks",
    }).items.map((item) => item.id),
  ).toEqual(["b"]);
  const block = {
    id: "category",
    type: "catalogue",
    visible: true,
    data: { ...newBlockData("catalogue"), category: "drinks" },
  };
  expect(validateBlocks([block])[0]).toEqual(block);
  expect(() =>
    validateBlocks([
      { ...block, data: { ...block.data, category: "../private" } },
    ]),
  ).toThrow();
});

test("promotion scheduling and category targeting use real boundaries and reject unsafe input", () => {
  const promo = {
    titleEn: "Offer",
    titleAr: "عرض",
    textEn: "",
    textAr: "",
    labelEn: "",
    labelAr: "",
    url: "",
    imageUrl: "",
    placement: "catalogue" as const,
    category: "coffee",
    couponCode: "COFFEE",
    startsAt: "2026-10-28T00:00:00.000Z",
    endsAt: "2026-10-29T00:00:00.000Z",
  };
  expect(validateWebsitePromotions([promo])).toEqual([promo]);
  expect(
    promotionVisible(promo, "catalogue", "coffee", Date.parse(promo.startsAt)),
  ).toBe(true);
  expect(
    promotionVisible(promo, "catalogue", "coffee", Date.parse(promo.endsAt)),
  ).toBe(false);
  expect(
    promotionVisible(promo, "home", "coffee", Date.parse(promo.startsAt)),
  ).toBe(false);
  expect(
    promotionVisible(promo, "catalogue", "tea", Date.parse(promo.startsAt)),
  ).toBe(false);
  for (const patch of [
    { startsAt: "invalid" },
    { endsAt: promo.startsAt },
    { url: "javascript:alert(1)" },
    { couponCode: "<script>" },
  ])
    expect(() => validateWebsitePromotions([{ ...promo, ...patch }])).toThrow();
});

test("inquiry upload capabilities reject forgery, wrong secrets and expired access", () => {
  const now = Date.parse("2026-10-28T00:00:00Z");
  const token = inquiryUploadToken("inquiry-123", "test-secret", now + 60_000);
  expect(inquiryFromUploadToken(token, "test-secret", now)).toBe("inquiry-123");
  expect(
    inquiryFromUploadToken(
      token.replace("inquiry-123", "inquiry-456"),
      "test-secret",
      now,
    ),
  ).toBeNull();
  expect(inquiryFromUploadToken(token, "wrong-secret", now)).toBeNull();
  expect(inquiryFromUploadToken(token, "test-secret", now + 60_000)).toBeNull();
  expect(
    inquiryFromUploadToken(`${token}.extra`, "test-secret", now),
  ).toBeNull();
});
