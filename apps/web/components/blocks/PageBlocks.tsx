import type { ReactNode } from "react";
import type { Block, BlockType } from "@platform/database/cms/blocks";
import type { PublicCompanySettings, StudioEquipment } from "@platform/database/types";
import type { ComponentProps } from "react";
import type { WebsiteSnapshot } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { CinemaHero } from "../hero/CinemaHero";
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

/** What data blocks read: the published snapshot plus live reviews, equipment and the contact page body. */
export interface BlockContext {
  locale: string;
  website: WebsiteSnapshot;
  company: PublicCompanySettings;
  reviews: ComponentProps<typeof ReviewsSection>["reviews"];
  equipment: StudioEquipment[];
  /** The contact page's own layout (contact details and the enquiry form), rendered by the page. */
  contact?: ReactNode;
  showEquipment: boolean;
  /** Where articles are listed: /{locale}/{articles slug}. */
  articlesBase: string;
}

/** Data blocks with no entrance of their own rise into view as a whole (the others use Reveal inside). */
const REVEAL_HERE: readonly BlockType[] = ["catalogue", "services", "testimonials", "faq", "clients", "pillars", "equipment"];

/** Light sections alternate the slanted edge, as the fixed homepage did. */
const LIGHT: readonly BlockType[] = ["about", "catalogue", "testimonials"];

/** A page's visible blocks, in order. */
export function PageBlocks({ blocks, context }: { blocks: Block[]; context: BlockContext }) {
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
              {node}
            </div>
          ) : null;
        })}
      <ScrollReveal />
    </>
  );

  function renderBlock(block: Block, ctx: BlockContext): ReactNode {
    // An editor's heading over a data block (only when one was written), then the block itself.
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
        // Full-screen media needs a banner; without one the centred headline opens the page.
        const style = data.style === "cinematic" && !website.banners.length ? "centered" : data.style;
        if (style === "cinematic") return <CinemaHero banners={website.banners} companyName={{ en: company.company_name_en, ar: company.company_name_ar }} />;
        if (style === "split") return <SplitHero banners={website.banners} title={title} subtitle={subtitle} />;
        return <CenteredHero banners={website.banners} title={title} subtitle={subtitle} />;
      }
      case "about":
        return <AboutSection imageUrl={website.config.aboutImageUrl} clientLogos={website.clients} company={company} />;
      case "catalogue":
        return <WorksSection items={website.portfolio.slice(0, (block.data as Block<"catalogue">["data"]).limit || undefined)} />;
      case "services":
        return titled(<ServicesSection services={website.services} />);
      case "stats":
        return <StatsSection stats={website.stats} />;
      case "testimonials":
        return <ReviewsSection reviews={ctx.reviews} />;
      case "faq":
        return <FAQSection faqs={website.faqs} />;
      case "clients":
        return titled(<LogoMarquee logos={website.clients} />);
      case "contact_form":
        return ctx.contact ?? null;
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
        return <CodeBlock html={data.html} css={data.css} js={data.js} height={data.height} title={block.id} />;
      }
      default:
        return null;
    }
  }
}
