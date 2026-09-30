import { getStudioEquipment, getCompanySettings } from "@ishoot/database";
import { CEOHero } from "../../../components/about/CEOHero";
import { StatsCounter } from "../../../components/about/StatsCounter";
import { EquipmentGrid } from "../../../components/about/EquipmentGrid";

export default async function AboutPage() {
  const [equipment, company] = await Promise.all([
    getStudioEquipment(),
    getCompanySettings(),
  ]);

  return (
    <div className="py-20 max-w-7xl mx-auto px-6 sm:px-8 space-y-12">
      <CEOHero company={company} />

      <StatsCounter />

      <EquipmentGrid equipment={equipment} />
    </div>
  );
}
