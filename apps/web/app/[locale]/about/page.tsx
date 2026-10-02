import { getPublicCompanySettings } from "../../../lib/company";
import { getStudioEquipment } from "@ishoot/database";
import { CEOHero } from "../../../components/about/CEOHero";
import { StatsCounter } from "../../../components/about/StatsCounter";
import { EquipmentGrid } from "../../../components/about/EquipmentGrid";
import { PillarsOfCraft } from "../../../components/about/PillarsOfCraft";

export default async function AboutPage() {
  const [equipment, company] = await Promise.all([
    getStudioEquipment(),
    getPublicCompanySettings(),
  ]);

  return (
    <div className="w-full flex flex-col">
      <CEOHero company={company} />

      <PillarsOfCraft />

      <StatsCounter />

      <EquipmentGrid equipment={equipment} />
    </div>
  );
}
