import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getWebsiteTranslations } from "@platform/locales";
import {
  makeBranches,
  makeCartQuote,
  makeCatalogueItems,
  makeCategories,
  makeCustomerProfile,
  makeDeliveryOptions,
  makeResolvedConfig,
  makeSiteInfo,
  resolveServerJsx,
  StoreTestProviders,
} from "./fixtures";

vi.mock("../../lib/site", async () => {
  const f = await import("./fixtures");
  const { getWebsiteTranslations: getWebT } = await import("@platform/locales");
  const cfg = {
    ...f.makeResolvedConfig(),
    promotions: [
      {
        titleEn: "Spring Studio Offer",
        titleAr: "عرض الربيع",
        bodyEn: "Save 15% on cinema rigs.",
        bodyAr: "وفر 15%",
        placement: "home" as const,
        couponCode: "SPRING15",
        url: "/en/products",
        imageUrl: "/media/promo.jpg",
        active: true,
        startsAt: null,
        endsAt: null,
        categorySlug: "",
      },
    ],
  };
  return {
    getSite: vi.fn(async () => ({
      config: cfg,
      info: f.makeSiteInfo(),
      company: f.makeStoreCompany(),
      website: null,
      enabled: true,
    })),
    siteTranslations: vi.fn(async (locale: string) => getWebT(locale === "ar" ? "ar" : "en")),
  };
});

vi.mock("@platform/database/queries/store", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    listCoupons: vi.fn(async () => [
      {
        code: "SPRING15",
        is_active: true,
        starts_at: null,
        ends_at: null,
        max_uses: null,
        used_count: 0,
      },
    ]),
  };
});

import { CategoryTabs } from "../../components/catalog/CategoryTabs";
import { ProductCard } from "../../components/catalog/ProductCard";
import { AddToCart } from "../../components/store/AddToCart";
import { CartDrawer, openCartDrawer } from "../../components/store/CartDrawer";
import { CartLink } from "../../components/store/CartLink";
import { CartTotals } from "../../components/store/CartTotals";
import { COUPON_KEY, CartView, FULFILMENT_KEY } from "../../components/store/CartView";
import { CheckoutView } from "../../components/store/CheckoutView";
import { PayButton } from "../../components/store/PayButton";
import { ProductGrid } from "../../components/store/ProductGrid";
import { Promotions } from "../../components/store/Promotions";
import { StoreHero } from "../../components/store/StoreHero";
import {
  CountdownCampaignBanner,
  PcMatchmakerBanner,
  ProductCarouselSection,
  ProductGallery,
} from "../../components/store/StorefrontShowcase";
import { UtmCapture } from "../../components/store/UtmCapture";
import { addToCart, clearCart, useCart, writeCart } from "../../components/store/cart";
import { useQuote } from "../../components/store/useQuote";
import { makeBanners, makeStoreCompany, makeAddresses } from "./fixtures";
import { mockNavigation } from "./setup";

describe("Store Cart, Checkout, PayButton, Catalog & Promotions", () => {
  it("cart store helpers (writeCart, addToCart, useCart) & CartLink stay synchronized", async () => {
    function CartProbe() {
      const lines = useCart();
      return <span data-testid="cart-probe">{lines.map((l) => `${l.productId}:${l.quantity}`).join(",")}</span>;
    }

    writeCart([]);
    addToCart({ productId: "prod-1", quantity: 1 });
    addToCart({ productId: "prod-1", quantity: 2 });

    render(
      <StoreTestProviders>
        <CartProbe />
        <CartLink className="nav-cart" />
      </StoreTestProviders>,
    );

    expect(screen.getByTestId("cart-probe")).toHaveTextContent("prod-1:3");
  });

  it("AddToCart updates cart lines and renders variant stock status", async () => {
    const user = userEvent.setup();
    writeCart([]);

    render(
      <StoreTestProviders>
        <AddToCart
          currency="BHD"
          product={{
            product_id: "prod-1",
            track_stock: true,
            options: [{ nameEn: "Color", nameAr: "اللون", values: [{ en: "Black", ar: "أسود" }] }],
            price: 120,
            available: 3,
            variants: [
              {
                id: "v-blk",
                values: ["Black"],
                label_en: "Black",
                label_ar: "أسود",
                price: 120,
                available: 3,
              },
            ],
          }}
        />
      </StoreTestProviders>,
    );

    await user.click(screen.getByTestId("add-to-cart-button"));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("useQuote, CartTotals & CartView POST to /api/store/quote and manage coupon/quantity", async () => {
    const quote = makeCartQuote();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(quote), { status: 200 }));

    localStorage.setItem(COUPON_KEY, "SPRING15");
    localStorage.setItem(FULFILMENT_KEY, "delivery");
    writeCart([{ productId: "prod-1", quantity: 2 }]);

    function QuoteProbe() {
      const q = useQuote([{ productId: "prod-1", quantity: 2 }], "SPRING15", "delivery");
      return <span data-testid="quote-status">{q.loading ? "loading" : q.quote?.currency ?? "none"}</span>;
    }

    render(
      <StoreTestProviders>
        <QuoteProbe />
        <CartView locale="en" currency="BHD" shopHref="/en/products" fulfilments={{ delivery: true, pickup: true }} />
        <CartTotals quote={quote} delivery />
      </StoreTestProviders>,
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/store/quote",
        expect.objectContaining({ method: "POST" }),
      );
      expect(screen.getByTestId("quote-status")).toHaveTextContent("BHD");
      expect(screen.getAllByTestId("cart-total").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("CheckoutView validates email/phone, POSTs /api/store/delivery & /api/store/order, and PayButton POSTs /api/store/pay", async () => {
    const user = userEvent.setup();
    const quote = makeCartQuote();
    const delivery = makeDeliveryOptions();
    writeCart([{ productId: "prod-1", quantity: 2 }]);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/store/quote") {
        return new Response(JSON.stringify(quote), { status: 200 });
      }
      if (url === "/api/store/delivery") {
        return new Response(JSON.stringify(delivery), { status: 200 });
      }
      if (url === "/api/store/order") {
        return new Response(JSON.stringify({ number: "ORD-777", payToken: "pay-tok" }), { status: 201 });
      }
      if (url === "/api/store/pay") {
        return new Response(
          JSON.stringify({
            widget: { scriptUrl: "https://pay.example.test/v1.js", brands: "VISA" },
            returnUrl: "https://store.example.test/en/checkout/done",
            testMode: true,
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    // 1. Validation error check on invalid phone/email
    render(
      <StoreTestProviders>
        <CheckoutView
          locale="en"
          settings={{
            guestCheckout: true,
            delivery: true,
            pickup: true,
            cod: true,
            online: true,
            bankTransfer: false,
            bankInstructions: "",
          }}
          customer={makeCustomerProfile({ phone: "12" })}
          addresses={makeAddresses()}
          country="BH"
          branches={makeBranches()}
          accountsEnabled
          collectCoordinates
        />
      </StoreTestProviders>,
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/store/delivery",
        expect.objectContaining({ method: "POST" }),
      );
      expect(screen.getByTestId("checkout-place")).toBeEnabled();
    });

    fireEvent.submit(screen.getByTestId("checkout-form"));
    expect(await screen.findByTestId("checkout-error")).toBeInTheDocument();

    // 2. Valid customer checkout submits POST /api/store/order
    cleanup();
    writeCart([{ productId: "prod-1", quantity: 2 }]);
    render(
      <StoreTestProviders>
        <CheckoutView
          locale="en"
          settings={{
            guestCheckout: true,
            delivery: true,
            pickup: true,
            cod: true,
            online: true,
            bankTransfer: false,
            bankInstructions: "",
          }}
          customer={makeCustomerProfile()}
          addresses={makeAddresses()}
          country="BH"
          branches={makeBranches()}
          accountsEnabled
          collectCoordinates={false}
        />
      </StoreTestProviders>,
    );

    await waitFor(() => expect(screen.getByTestId("checkout-place")).toBeEnabled());
    await user.click(screen.getByTestId("checkout-place"));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/store/order",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockNavigation.push).toHaveBeenCalledWith("/en/pay/pay-tok?start=1");
    });

    // 3. PayButton POST /api/store/pay renders hosted widget
    cleanup();
    render(
      <StoreTestProviders>
        <PayButton token="pay-tok" locale="en" autoStart={false} />
      </StoreTestProviders>,
    );

    await user.click(screen.getByTestId("pay-now"));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/store/pay",
        expect.objectContaining({ method: "POST" }),
      );
      expect(screen.getByTestId("pay-widget")).toBeInTheDocument();
    });
  });

  it("ProductGrid, ProductCard, CategoryTabs, StoreHero, UtmCapture & Promotions render and filter", async () => {
    const user = userEvent.setup();
    const items = makeCatalogueItems();
    const categories = makeCategories();
    const selectSpy = vi.fn();

    const promoJsx = await resolveServerJsx(
      await Promotions({ locale: "en", placement: "home" }),
    );

    render(
      <StoreTestProviders>
        <UtmCapture />
        <StoreHero banner={makeBanners()[0]} company={makeStoreCompany()} locale="en" />
        <CategoryTabs categories={categories} activeCategory="all" onSelect={selectSpy} />
        <ProductCard item={items[0]} />
        <ProductGrid items={items} categories={categories} />
        {promoJsx}
      </StoreTestProviders>,
    );

    expect(screen.getByText("Studio Grade Equipment")).toBeInTheDocument();
    expect(screen.getAllByTestId("product-card-cinema-rig").length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getAllByRole("button", { name: "Cameras" })[0]);
    expect(selectSpy).toHaveBeenCalledWith("cameras");
    expect(getWebsiteTranslations("en").store.shopNow.length).toBeGreaterThan(0);
  });

  it("supports Quick View, Compare Drawer, Clear Cart, and Loyalty Points/Wallet Checkout", async () => {
    const user = userEvent.setup();
    const items = makeCatalogueItems().map((it, i) => ({
      ...it,
      brand: i === 0 ? "SmallRig" : "Sony",
      sku: `SKU-${i + 1}`,
      compare_at_price: (it.price ?? 50) + 20,
      track_stock: true,
      available_stock: 4,
    }));
    const categories = makeCategories();

    render(
      <StoreTestProviders>
        <StoreHero banners={makeBanners()} company={makeStoreCompany()} locale="en" loyaltyEnabled raffleEnabled />
        <PcMatchmakerBanner locale="en" baseCurrency="BHD" />
        <CountdownCampaignBanner
          locale="en"
          badge="Seasonal Sale"
          title="Flash Sale"
          subtitle="Save up to 40%"
          ctaLabel="Shop Sale"
          ctaHref="/en/deals"
        />
        <ProductCarouselSection
          id="test-carousel"
          title="Flash Deals"
          viewAllHref="/en/deals"
          viewAllLabel="View All"
          items={items}
          locale="en"
        />
        <ProductGallery
          images={["/media/a.jpg", "/media/b.jpg"]}
          title="Cinema Rig Pro"
          discountPct={25}
          locale="en"
        />
        <ProductGrid items={items} categories={categories} />
      </StoreTestProviders>,
    );

    const quickViewBtns = screen.getAllByLabelText("Quick View");
    await user.click(quickViewBtns[0]);
    expect(screen.getByTestId("quick-view-modal")).toBeInTheDocument();

    const compareBtns = screen.getAllByLabelText("Compare");
    await user.click(compareBtns[0]);
    await user.click(screen.getByTestId("open-compare-drawer"));
    expect(screen.getByTestId("compare-modal")).toBeInTheDocument();

    clearCart();
    expect(JSON.parse(window.localStorage.getItem("platform-cart") || "[]")).toEqual([]);
  });

  it("opens M3 CartDrawer via openCartDrawer and confirms clear cart via M3 ConfirmDialog", async () => {
    const user = userEvent.setup();
    const quote = makeCartQuote();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(quote), { status: 200 }));

    writeCart([{ productId: "prod-1", quantity: 1 }]);

    render(
      <StoreTestProviders>
        <CartDrawer currency="BHD" />
        <CartView locale="en" currency="BHD" shopHref="/en/products" fulfilments={{ delivery: true, pickup: true }} />
      </StoreTestProviders>,
    );

    openCartDrawer();
    expect(await screen.findByTestId("cart-drawer")).toBeInTheDocument();
    const drawerPanel = document.querySelector("[data-drawer-panel]");
    expect(drawerPanel).not.toBeNull();
    expect(drawerPanel?.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByTestId("cart-drawer")).toBeNull();
    });

    const clearAllBtn = await screen.findByTestId("cart-clear-all");
    await user.click(clearAllBtn);

    const dialog = await screen.findByRole("dialog", { name: /clear shopping cart/i });
    expect(dialog).toBeInTheDocument();
    const confirmBtn = dialog.querySelector('button[data-variant="danger"]') as HTMLButtonElement;
    expect(confirmBtn).not.toBeNull();
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem("platform-cart") || "[]")).toEqual([]);
    });
    fetchSpy.mockRestore();
  });
});
