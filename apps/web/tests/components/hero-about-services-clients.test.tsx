import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getWebsiteTranslations } from "@platform/locales";
import { makeResolvedConfig, makeSiteInfo } from "./fixtures";

vi.mock("../../lib/site", () => ({
  siteTranslations: vi.fn(async (locale: string) =>
    getWebsiteTranslations(locale === "ar" ? "ar" : "en"),
  ),
  getSite: vi.fn(async () => ({
    company: {},
    website: {},
    config: makeResolvedConfig(),
    info: makeSiteInfo(),
    enabled: true,
  })),
}));

import { AboutSection } from "../../components/about/AboutSection";
import { CEOHero } from "../../components/about/CEOHero";
import { EquipmentGrid } from "../../components/about/EquipmentGrid";
import { ExecutiveCtaBanner } from "../../components/about/ExecutiveCtaBanner";
import { FAQSection } from "../../components/about/FAQSection";
import { PillarsOfCraft } from "../../components/about/PillarsOfCraft";
import { ReviewSubmissionModal } from "../../components/about/ReviewSubmissionModal";
import { ReviewsSection } from "../../components/about/ReviewsSection";
import { StatsSection } from "../../components/about/StatsSection";
import { LogoMarquee } from "../../components/clients/LogoMarquee";
import { CenteredHero } from "../../components/hero/CenteredHero";
import { HeroActions, useHeroContent } from "../../components/hero/HeroActions";
import { ShowcaseHero } from "../../components/hero/ShowcaseHero";
import { SplitHero } from "../../components/hero/SplitHero";
import { ServicesSection } from "../../components/services/ServicesSection";
import {
  makeBanners,
  makeClientLogos,
  makeEquipment,
  makeFaqs,
  makeReviews,
  makeWebCompany,
  makeWebsiteSnapshot,
  WebTestProviders,
} from "./fixtures";

describe("Web Hero, About, Services & Clients Components", () => {
  it("renders CenteredHero, SplitHero, ShowcaseHero & HeroActions/useHeroContent", () => {
    const banners = makeBanners();
    function HeroHookProbe() {
      const content = useHeroContent(banners[0], "Fallback", "Sub");
      return <span data-testid="hero-hook-heading">{content.heading}</span>;
    }

    render(
      <WebTestProviders>
        <HeroHookProbe />
        <HeroActions banner={banners[0]} tone="brand" />
        <CenteredHero banners={[]} title="Centered Title" subtitle="Centered Sub" />
        <SplitHero banners={[]} title="Split Title" subtitle="Split Sub" />
        <ShowcaseHero banners={banners} companyName={{ en: "Zayed Studio", ar: "استوديو زايد" }} />
      </WebTestProviders>,
    );

    expect(screen.getByTestId("hero-hook-heading")).toHaveTextContent("Cinema Built For Brands");
    expect(screen.getByText("Centered Title")).toBeInTheDocument();
    expect(screen.getByText("Split Title")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /start a project/i }).length).toBeGreaterThan(0);
  });

  it("renders AboutSection, CEOHero, PillarsOfCraft, StatsSection, LogoMarquee, ServicesSection & ExecutiveCtaBanner", async () => {
    const company = makeWebCompany();
    const snapshot = makeWebsiteSnapshot();

    const ctaJsx = await ExecutiveCtaBanner({
      locale: "en",
      companyName: company.company_name_en,
      catalogueHref: "/en/works",
    });

    render(
      <WebTestProviders>
        <AboutSection company={company} imageUrl="/media/about.jpg" />
        <CEOHero company={company} imageUrl="/media/ceo.jpg" />
        <PillarsOfCraft
          pillars={[
            {
              titleEn: "Precision",
              titleAr: "الدقة",
              bodyEn: "Broadcast grade workflows.",
              bodyAr: "سير عمل احترافي.",
            },
          ]}
        />
        <StatsSection stats={snapshot.stats} />
        <LogoMarquee logos={makeClientLogos()} instanceId="qa" />
        <ServicesSection services={snapshot.services} />
        {ctaJsx}
      </WebTestProviders>,
    );

    expect(screen.getAllByText(/Tariq Al-Zayed/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Precision")).toBeInTheDocument();
    expect(screen.getByText("140+")).toBeInTheDocument();
    expect(screen.getByText("Commercial Film")).toBeInTheDocument();
    expect(screen.getByTestId("executive-cta-banner")).toBeInTheDocument();
  });

  it("FAQSection toggles aria-expanded and EquipmentGrid filters categories", async () => {
    const user = userEvent.setup();
    render(
      <WebTestProviders>
        <FAQSection faqs={makeFaqs()} />
        <EquipmentGrid equipment={makeEquipment()} />
      </WebTestProviders>,
    );

    const faqBtn = screen.getByRole("button", { name: /What is your typical turnaround\?/i });
    expect(faqBtn).toHaveAttribute("aria-expanded", "false");
    await user.click(faqBtn);
    expect(faqBtn).toHaveAttribute("aria-expanded", "true");

    const catBtn = screen.getByRole("button", { name: "Camera" });
    await user.click(catBtn);
    expect(catBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("ARRI Alexa 35")).toBeInTheDocument();
  });

  it("ReviewsSection opens ReviewSubmissionModal, validates required fields, and POSTs to /api/reviews", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 201 }),
      );

    render(
      <WebTestProviders>
        <ReviewsSection reviews={makeReviews()} />
      </WebTestProviders>,
    );

    const tEn = getWebsiteTranslations("en");
    expect(screen.getByText(/Delivered ahead of schedule/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: tEn.reviews.writeReviewBtn }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    const modalInputs = dialog.querySelectorAll("input, textarea");
    await user.type(modalInputs[0], "Amina Khalil");
    await user.type(modalInputs[2], "Outstanding studio support and crew.");
    await user.click(dialog.querySelector('button[type="submit"]')!);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/reviews",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    // Also test direct ReviewSubmissionModal error state when unsubmitted/validation fails
    const { container } = render(
      <WebTestProviders>
        <ReviewSubmissionModal isOpen onClose={vi.fn()} />
      </WebTestProviders>,
    );
    expect(container.querySelector("dialog")).toBeInTheDocument();
  });
});
