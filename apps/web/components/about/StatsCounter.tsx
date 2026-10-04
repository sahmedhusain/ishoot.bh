"use client";

import type { Statistic } from "@ishoot/database/types";
import { StatsSection } from "./StatsSection";

// Legacy entry point uses the same CMS statistics as the rest of the website.
export function StatsCounter({ stats = [] }: { stats?: Statistic[] }) {
  return <StatsSection stats={stats} />;
}
