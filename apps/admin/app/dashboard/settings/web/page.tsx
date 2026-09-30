import * as React from "react";
import { requirePermission } from "../../../../lib/auth";
import {
  getCompanySettings,
  getAllBanners,
  getPortfolioItems,
  getAllClientLogos,
  getStudioEquipment,
  getReviews,
  getFaqs,
  getStatistics,
} from "@ishoot/database";
import { WebSettingsView } from "../../../../components/settings/WebSettingsView";

export const dynamic = "force-dynamic";

export default async function WebSettingsPage() {
  await requirePermission("settings", "read");

  const [
    company,
    banners,
    portfolio,
    clients,
    equipment,
    reviews,
    faqs,
    stats,
  ] = await Promise.all([
    getCompanySettings(),
    getAllBanners(),
    getPortfolioItems(),
    getAllClientLogos(),
    getStudioEquipment(),
    getReviews(true),
    getFaqs(true),
    getStatistics(),
  ]);

  const pendingReviews = reviews.filter((r: any) => !r.isApproved).length;

  return (
    <WebSettingsView
      initialSettings={company}
      cmsCounts={{
        banners: banners.length,
        portfolio: portfolio.length,
        clients: clients.length,
        equipment: equipment.length,
        reviews: reviews.length,
        pendingReviews,
        faqs: faqs.length,
        stats: stats.length,
      }}
    />
  );
}
