import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getWebsiteTranslations } from "@platform/locales";
import {
  makeCmsPage,
  makePortfolioItems,
  makeCategories,
  makeArticles,
  makeReviews,
  makeEquipment,
  makeResolvedConfig,
  makeSiteInfo,
  makeWebCompany,
  makeWebsiteSnapshot,
  resolveServerJsx,
  WebTestProviders,
} from "./fixtures";

const { mockSite, mockCompany, mockSnapshot, mockReviews, mockEquipment } = vi.hoisted(() => ({
  mockSite: null as unknown as Record<string, unknown>,
  mockCompany: null as unknown as Record<string, unknown>,
  mockSnapshot: null as unknown as Record<string, unknown>,
  mockReviews: null as unknown as unknown[],
  mockEquipment: null as unknown as unknown[],
}));
void mockSite; void mockCompany; void mockSnapshot; void mockReviews; void mockEquipment;

vi.mock("../../lib/site", async () => {
  const f = await import("./fixtures");
  const { getWebsiteTranslations } = await import("@platform/locales");
  const cfg = {
    ...f.makeResolvedConfig(),
    commerce: {
      ...f.makeResolvedConfig().commerce,
      capabilities: { ...f.makeResolvedConfig().commerce.capabilities, downloads: true },
    },
    documents: [
      {
        itemSlug: "",
        titleEn: "Company Profile PDF",
        titleAr: "ملف الشركة",
        url: "https://example.test/profile.pdf",
      },
    ],
  };
  return {
    getSite: vi.fn(async () => ({
      company: f.makeWebCompany(),
      website: f.makeWebsiteSnapshot(),
      config: cfg,
      info: f.makeSiteInfo(),
      enabled: true,
    })),
    siteTranslations: vi.fn(async (locale: string) =>
      getWebsiteTranslations(locale === "ar" ? "ar" : "en"),
    ),
  };
});

vi.mock("../../lib/company", async () => {
  const f = await import("./fixtures");
  return {
    getPublicCompanySettings: vi.fn(async () => f.makeWebCompany()),
  };
});

vi.mock("../../lib/website", async () => {
  const f = await import("./fixtures");
  return {
    getWebsite: vi.fn(async () => f.makeWebsiteSnapshot()),
  };
});

vi.mock("@platform/database", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const f = await import("./fixtures");
  return {
    ...actual,
    getReviews: vi.fn(async () => f.makeReviews()),
    getStudioEquipment: vi.fn(async () => f.makeEquipment()),
  };
});

import { ArticleCards, articleDate, estimateReadMinutes } from "../../components/articles/ArticleCards";
import { ArticleView, ArticlesIndex, liveArticles } from "../../components/articles/ArticleViews";
import { ShareLinks } from "../../components/articles/ShareLinks";
import { CmsPageView, findPage } from "../../components/blocks/CmsPageView";
import { CodeBlock } from "../../components/blocks/CodeBlock";
import {
  BlockTitle,
  ColumnsBlock,
  CtaBlock,
  DividerBlock,
  EmbedBlock,
  GalleryBlock,
  ImageTextBlock,
  MapBlock,
  RichTextBlock,
  SpacerBlock,
  TeamBlock,
  VideoBlock,
  pick,
} from "../../components/blocks/ContentBlocks";
import { PageBlocks } from "../../components/blocks/PageBlocks";
import { PublicDocuments } from "../../components/blocks/PublicDocuments";
import { BranchLocations, branchDirections } from "../../components/contact/BranchLocations";
import { ContactBody } from "../../components/contact/ContactBody";
import { ContactForm } from "../../components/contact/ContactForm";
import { InquiryAttachments } from "../../components/contact/InquiryAttachments";
import { CategoryTabs } from "../../components/portfolio/CategoryTabs";
import { CollectionCard } from "../../components/portfolio/CollectionCard";
import { PortfolioGrid } from "../../components/portfolio/PortfolioGrid";
import { ShowcaseLightbox } from "../../components/portfolio/ShowcaseLightbox";
import { WorksSection } from "../../components/portfolio/WorksSection";
import { mockNavigation } from "./setup";

describe("Web Portfolio, Articles, CMS Blocks & Contact Components", () => {
  it("PortfolioGrid, CategoryTabs, CollectionCard, ShowcaseLightbox & WorksSection filter and open lightbox", async () => {
    const user = userEvent.setup();
    const items = makePortfolioItems();
    const categories = makeCategories();
    const openSpy = vi.fn();
    const closeSpy = vi.fn();

    render(
      <WebTestProviders>
        <CategoryTabs categories={categories} activeCategory="all" onSelect={openSpy} />
        <CollectionCard item={items[0]} layout="media" onOpen={openSpy} />
        <PortfolioGrid items={items} categories={categories} layout="media" />
        <WorksSection items={items} categories={categories} />
        <ShowcaseLightbox item={items[0]} isOpen onClose={closeSpy} />
      </WebTestProviders>,
    );

    expect(screen.getAllByText("Pearl Horizon Campaign").length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: "Commercials" })[0]);
    expect(openSpy).toHaveBeenCalledWith("commercials");

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "Desert");
    await user.click(screen.getByRole("button", { name: /^Search$/i }));
    expect(mockNavigation.push).toHaveBeenCalled();

    const closeBtn = screen.getByRole("dialog").querySelector("button");
    if (closeBtn) await user.click(closeBtn);
    expect(closeSpy).toHaveBeenCalled();
  });

  it("ArticlesIndex, ArticleView, ArticleCards, ShareLinks, articleDate & liveArticles render and copy", async () => {
    const user = userEvent.setup();
    const articles = makeArticles();
    expect(liveArticles(articles)).toHaveLength(1);
    expect(articleDate(articles[0], "en")).toContain("2026");
    expect(estimateReadMinutes(articles[0], "en")).toBeGreaterThanOrEqual(2);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    const indexJsx = await ArticlesIndex({
      articles,
      locale: "en",
      base: "/en/articles",
      query: {},
    });
    const viewJsx = await ArticleView({
      article: articles[0],
      related: [],
      locale: "en",
      base: "/en/articles",
      url: "https://example.test/en/articles/lighting-in-desert",
    });

    render(
      <WebTestProviders>
        <ArticleCards articles={articles} title="Latest Journal" locale="en" />
        {indexJsx}
        {viewJsx}
        <ShareLinks
          url="https://example.test/post"
          title="Post Title"
          labels={{ share: "Share", x: "X", linkedin: "LinkedIn", copy: "Copy Link", copied: "Copied" }}
        />
      </WebTestProviders>,
    );

    expect(screen.getByText("Latest Journal")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy Link" }));
    expect(screen.getByDisplayValue("https://example.test/post")).toBeInTheDocument();
  });

  it("CmsPageView, findPage, PageBlocks, ContentBlocks, CodeBlock & PublicDocuments render all block types", async () => {
    const page = makeCmsPage();
    expect(findPage([page], { slug: "showcase-custom" }, false)?.id).toBe("pg-1");
    expect(pick({ en: "Hello", ar: "مرحبا" }, "ar")).toBe("مرحبا");

    const docsJsx = await resolveServerJsx(await PublicDocuments({ locale: "en", itemSlug: "" }));
    const pageJsx = await resolveServerJsx(await CmsPageView({ page, locale: "en" }));
    const blocksJsx = await resolveServerJsx(await PageBlocks({
      blocks: page.blocks,
      context: {
        locale: "en",
        website: makeWebsiteSnapshot(),
        company: makeWebCompany(),
        reviews: makeReviews(),
        equipment: makeEquipment(),
        showEquipment: true,
        articlesBase: "/en/articles",
      },
    }));

    render(
      <WebTestProviders>
        {docsJsx}
        {pageJsx}
        {blocksJsx}
        <BlockTitle title={{ en: "Section Title", ar: "عنوان" }} locale="en" />
        <RichTextBlock data={{ html: { en: "<p>Rich HTML Content</p>", ar: "" } }} locale="en" />
        <ImageTextBlock
          data={{
            title: { en: "Editorial", ar: "" },
            text: { en: "Body text", ar: "" },
            imageUrl: "/media/img.jpg",
            imageSide: "start",
            buttonLabel: { en: "Go", ar: "" },
            buttonUrl: "/en/contact",
          }}
          locale="en"
        />
        <GalleryBlock
          data={{
            title: { en: "Frames", ar: "" },
            columns: 2,
            images: [{ url: "/media/g1.jpg", caption: { en: "Cap", ar: "" } }],
          }}
          locale="en"
        />
        <VideoBlock data={{ title: { en: "Reel", ar: "" }, url: "/media/video.mp4", posterUrl: "/media/poster.jpg" }} locale="en" />
        <CtaBlock
          data={{
            title: { en: "CTA Heading", ar: "" },
            text: { en: "CTA Sub", ar: "" },
            buttonLabel: { en: "Action", ar: "" },
            buttonUrl: "/en/contact",
          }}
          locale="en"
        />
        <MapBlock data={{ title: { en: "Map", ar: "" }, embedUrl: "https://maps.google.com/maps?q=Manama" }} locale="en" />
        <TeamBlock
          data={{
            title: { en: "Team", ar: "" },
            members: [{ name: { en: "Ali", ar: "" }, role: { en: "Director", ar: "" }, photoUrl: "/media/ali.jpg" }],
          }}
          locale="en"
        />
        <ColumnsBlock
          data={{
            title: { en: "Pillars", ar: "" },
            columns: [{ title: { en: "One", ar: "" }, text: { en: "Desc", ar: "" } }],
          }}
          locale="en"
        />
        <SpacerBlock data={{ size: "sm" }} />
        <DividerBlock />
        <EmbedBlock data={{ title: { en: "Embed", ar: "" }, preset: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }} locale="en" />
        <CodeBlock html="<div>Custom</div>" css="div{color:red}" js="" height={120} title="Sandbox" nonce="n-1" />
      </WebTestProviders>,
    );

    expect(screen.getByText("Company Profile PDF")).toBeInTheDocument();
    expect(screen.getByText("Rich HTML Content")).toBeInTheDocument();
    expect(screen.getByText("CTA Heading")).toBeInTheDocument();
    expect(screen.getByTitle("Sandbox")).toBeInTheDocument();
  });

  it("ContactBody, BranchLocations, ContactForm & InquiryAttachments validate inputs and POST /api/inquiry + /api/inquiry/attachments", async () => {
    const user = userEvent.setup();
    const branches = makeSiteInfo().commerce!.branches;
    expect(branchDirections(branches[0])).toContain("26.2285,50.586");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, reference: "INQ-9001", uploadToken: "tok-123" }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    const bodyJsx = await ContactBody({ locale: "en", query: { intent: "inquiry" } });
    render(
      <WebTestProviders>
        <BranchLocations branches={branches} locale="en" />
        {bodyJsx}
      </WebTestProviders>,
    );

    expect(screen.getByText("Manama HQ")).toBeInTheDocument();

    // Validation + submission on standalone ContactForm + InquiryAttachments
    cleanup();
    const { container } = render(
      <WebTestProviders>
        <ContactForm />
      </WebTestProviders>,
    );

    // Fill required fullName & message while leaving email/phone empty -> shows role="alert"
    const contactForm = container.querySelector("form")!;
    const nameInput = contactForm.querySelector<HTMLInputElement>('input[name="fullName"]')!;
    const msgInput = contactForm.querySelector<HTMLTextAreaElement>('textarea[name="message"]')!;
    await user.type(nameInput, "Nadia Salman");
    await user.type(msgInput, "Requesting production pricing");
    await user.click(contactForm.querySelector('button[type="submit"]')!);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Fill email and submit -> POST /api/inquiry
    const emailInput = contactForm.querySelector<HTMLInputElement>('input[name="email"]')!;
    await user.type(emailInput, "client@example.test");
    await user.click(contactForm.querySelector('button[type="submit"]')!);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/inquiry",
        expect.objectContaining({ method: "POST" }),
      );
    });

    // Attach file in standalone InquiryAttachments -> POST /api/inquiry/attachments
    cleanup();
    const attRender = render(
      <WebTestProviders>
        <InquiryAttachments token="tok-123" locale="en" />
      </WebTestProviders>,
    );
    const fileInput = attRender.container.querySelector<HTMLInputElement>("#inquiry-file")!;
    const file = new File(["%PDF-1.4 brief"], "brief.pdf", { type: "application/pdf" });
    await user.upload(fileInput, file);
    expect(fileInput.files?.[0]?.name).toBe("brief.pdf");
    fireEvent.submit(attRender.container.querySelector("form")!);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/inquiry/attachments",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-inquiry-upload-token": "tok-123",
            "x-file-name": "brief.pdf",
          }),
        }),
      );
    });
  });
});
