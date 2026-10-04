import { getPublicCompanySettings } from "../../../lib/company";
import { getStudioEquipment } from "@ishoot/database";
import { CEOHero } from "../../../components/about/CEOHero";
import { StatsSection } from "../../../components/about/StatsSection";
import { getWebsite, isWebsitePreview } from "../../../lib/website";
import { EquipmentGrid } from "../../../components/about/EquipmentGrid";
import { PillarsOfCraft } from "../../../components/about/PillarsOfCraft";
import { notFound } from "next/navigation";

export default async function AboutPage() {
  const [equipment, company, website, isPreview] = await Promise.all([
    getStudioEquipment(),
    getPublicCompanySettings(),
    getWebsite(),
    isWebsitePreview(),
  ]);

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

      <EquipmentGrid equipment={equipment} />
    </div>
  );
}
