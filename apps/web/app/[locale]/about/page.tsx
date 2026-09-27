import * as React from "react";
import { getStudioEquipment } from "@ishoot/database";
import { CEOHero } from "../../../components/about/CEOHero";
import { StatsCounter } from "../../../components/about/StatsCounter";
import { EquipmentGrid } from "../../../components/about/EquipmentGrid";

export default async function AboutPage() {
  const equipment = await getStudioEquipment();

  return (
    <div className="py-20 max-w-7xl mx-auto px-6 sm:px-8 space-y-12">
      <CEOHero />

      <StatsCounter />

      <EquipmentGrid equipment={equipment} />
    </div>
  );
}
