import { getPublicCompanySettings } from "../../../lib/company";
import { getStudioEquipment } from "@platform/database";
import { CEOHero } from "../../../components/about/CEOHero";
import { StatsSection } from "../../../components/about/StatsSection";
import { getWebsite, isWebsitePreview } from "../../../lib/website";
import { getSite } from "../../../lib/site";
import { EquipmentGrid } from "../../../components/about/EquipmentGrid";
import { PillarsOfCraft } from "../../../components/about/PillarsOfCraft";
import { notFound } from "next/navigation";
import { CmsPageView, findPage } from "../../../components/blocks/CmsPageView";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [equipment, company, website, isPreview, { config }] = await Promise.all([
    getStudioEquipment(),
    getPublicCompanySettings(),
    getWebsite(),
    isWebsitePreview(),
    getSite(),
  ]);

  const page = findPage(website?.pages, { type: "about" }, isPreview);
  if (page === null) notFound();
  if (page) return <CmsPageView page={page} locale={locale} />;

  const pageVisible =
    website?.config?.pages?.find((p) => p.id === "about")?.visible ?? true;
  if (!pageVisible && !isPreview) {
    notFound();
  }

  return (
    <div className="w-full flex flex-col">
      <CEOHero company={company} imageUrl={website.config.aboutImageUrl} />

      <PillarsOfCraft pillars={website.config.pillars} />

      <StatsSection stats={website.stats} />

      {config.showEquipment ? <EquipmentGrid equipment={equipment} /> : null}
    </div>
  );
}
