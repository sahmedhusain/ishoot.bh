import { headers } from "next/headers";
import { categoryAncestors } from "@platform/database/constants/website-commerce";
import { PublicDocuments } from "./PublicDocuments";
import { BranchLocations } from "../contact/BranchLocations";
import { resolveWebsiteConfig } from "@platform/database/website-config";
import { SiteRegion } from "../site/SiteTheme";
import type { ReactNode } from "react";
import type { Block, BlockType } from "@platform/database/cms/blocks";
import type { PublicCompanySettings, StudioEquipment } from "@platform/database/types";
import type { ComponentProps } from "react";
import type { WebsiteSnapshot } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { ShowcaseHero } from "../hero/ShowcaseHero";
import { SplitHero } from "../hero/SplitHero";
import { CenteredHero } from "../hero/CenteredHero";
import { AboutSection } from "../about/AboutSection";
import { LogoMarquee } from "../clients/LogoMarquee";
import { ServicesSection } from "../services/ServicesSection";
import { WorksSection } from "../portfolio/WorksSection";
import { StatsSection } from "../about/StatsSection";
import { ReviewsSection } from "../about/ReviewsSection";
import { FAQSection } from "../about/FAQSection";
import { CEOHero } from "../about/CEOHero";
import { PillarsOfCraft } from "../about/PillarsOfCraft";
import { EquipmentGrid } from "../about/EquipmentGrid";
import { ArticleCards } from "../articles/ArticleCards";
import { CodeBlock } from "./CodeBlock";
import { ScrollReveal } from "../shared/ScrollReveal";
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
} from "./ContentBlocks";

export interface BlockContext {
  locale: string;
  home?: boolean;
  website: WebsiteSnapshot;
  company: PublicCompanySettings;
  reviews: ComponentProps<typeof ReviewsSection>["reviews"];
  equipment: StudioEquipment[];
  contact?: ReactNode;
  showEquipment: boolean;
  articlesBase: string;
}

const REVEAL_HERE: readonly BlockType[] = ["catalogue", "services", "testimonials", "faq", "clients", "pillars", "equipment"];

const LIGHT: readonly BlockType[] = ["about", "catalogue", "testimonials"];

export async function PageBlocks({ blocks, context }: { blocks: Block[]; context: BlockContext }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const { locale, website, company } = context;
  let light = 0;
  return (
    <>
      {blocks
        .filter((block) => block.visible)
        .map((block) => {
          if (LIGHT.includes(block.type)) light += 1;
          const slope = light % 2 === 0 && light > 0 ? "right" : "left";
          const node = renderBlock(block, context);
          return node ? (
            <div key={block.id} data-slope={slope} data-block={block.type} data-reveal={REVEAL_HERE.includes(block.type) ? "" : undefined}>
              <SiteRegion tone={block.tone}>{node}</SiteRegion>
            </div>
          ) : null;
        })}
      <ScrollReveal />
    </>
  );

  function renderBlock(block: Block, ctx: BlockContext): ReactNode {
    const title = (block.data as { title?: { en: string; ar: string } }).title;
    const titled = (child: ReactNode) =>
      pick(title, locale) ? (
        <>
          <BlockTitle title={title} locale={locale} />
          {child}
        </>
      ) : (
        child
      );
    switch (block.type) {
      case "hero": {
        const data = block.data as Block<"hero">["data"];
        const title = pick(data.title, locale) || pickText(company.company_name_en, company.company_name_ar, locale);
        const subtitle = pick(data.subtitle, locale) || pickText(company.tagline_en, company.tagline_ar, locale);
        const banners = website.banners.map(banner => ({ ...banner,
          ...(pick(data.title, "en") ? { title_en: pick(data.title, "en"), title_ar: pick(data.title, "ar") } : {}),
          ...(pick(data.subtitle, "en") ? { subtitle_en: pick(data.subtitle, "en"), subtitle_ar: pick(data.subtitle, "ar") } : {}),
        }));
        const requested = data.style === "inherit" ? resolveWebsiteConfig(website.config).heroStyle : data.style;
        const style = requested === "cinematic" && !website.banners.length ? "centered" : requested;
        const hero = style === "cinematic" ? <ShowcaseHero banners={banners} companyName={{ en: company.company_name_en, ar: company.company_name_ar }} /> : style === "split" ? <SplitHero banners={banners} title={title} subtitle={subtitle} /> : <CenteredHero banners={banners} title={title} subtitle={subtitle} />;
        return hero;
      }
      case "about":
        return <AboutSection imageUrl={website.config.aboutImageUrl} clientLogos={website.clients} company={company} />;
      case "catalogue": {
        const data = block.data as Block<"catalogue">["data"];
        return <WorksSection items={data.category ? website.portfolio.filter(item => categoryAncestors(item.category?.slug ?? "", resolveWebsiteConfig(website.config).commerce.categoryParents).includes(data.category!)) : website.portfolio} categories={website.categories} title={pick(data.title, locale)} presentation={data.presentation === "inherit" ? undefined : data.presentation} limit={data.limit} filterable={data.filterable && !data.category} list={data.layout === "list"} />;
      }
      case "services":
        return titled(<ServicesSection services={website.services} />);
      case "stats":
        return <StatsSection stats={website.stats} />;
      case "testimonials":
        return <ReviewsSection reviews={ctx.reviews} />;
      case "faq":
        return <FAQSection faqs={website.faqs} />;
      case "clients":
        return titled(<LogoMarquee instanceId={block.id} logos={website.clients} />);
      case "contact_form":
        return ctx.contact ?? null;
      case "locations":
        return <BranchLocations branches={resolveWebsiteConfig(website.config).commerce.branches} locale={locale} title={pick(title, locale)} />;
      case "downloads":
        return <div className="shell py-16"><PublicDocuments locale={locale} title={pick(title, locale)} /></div>;
      case "leader":
        return <CEOHero company={company} imageUrl={website.config.aboutImageUrl} />;
      case "pillars":
        return <PillarsOfCraft pillars={website.config.pillars} />;
      case "equipment":
        return ctx.showEquipment ? <EquipmentGrid equipment={ctx.equipment} /> : null;
      case "latest_articles": {
        const data = block.data as Block<"latest_articles">["data"];
        const now = Date.now();
        const articles = (website.articles ?? [])
          .filter((article) => !article.publish_at || Date.parse(article.publish_at) <= now)
          .filter((article) => !data.category || article.category === data.category)
          .slice(0, data.count);
        return <ArticleCards articles={articles} title={pick(data.title, locale)} locale={locale} base={ctx.articlesBase} />;
      }
      case "rich_text":
        return <RichTextBlock data={block.data as Block<"rich_text">["data"]} locale={locale} />;
      case "image_text":
        return <ImageTextBlock data={block.data as Block<"image_text">["data"]} locale={locale} />;
      case "gallery":
        return <GalleryBlock data={block.data as Block<"gallery">["data"]} locale={locale} />;
      case "video":
        return <VideoBlock data={block.data as Block<"video">["data"]} locale={locale} />;
      case "cta":
        return <CtaBlock data={block.data as Block<"cta">["data"]} locale={locale} />;
      case "map":
        return <MapBlock data={block.data as Block<"map">["data"]} locale={locale} fallbackUrl={company.map_url} />;
      case "team":
        return <TeamBlock data={block.data as Block<"team">["data"]} locale={locale} />;
      case "columns":
        return <ColumnsBlock data={block.data as Block<"columns">["data"]} locale={locale} />;
      case "spacer":
        return <SpacerBlock data={block.data as Block<"spacer">["data"]} />;
      case "divider":
        return <DividerBlock />;
      case "embed":
        return <EmbedBlock data={block.data as Block<"embed">["data"]} locale={locale} />;
      case "code": {
        const data = block.data as Block<"code">["data"];
        return <CodeBlock html={data.html} css={data.css} js={data.js} height={data.height} title={block.id} nonce={nonce} />;
      }
      default:
        return null;
    }
  }
}
