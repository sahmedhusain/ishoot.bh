import { requirePagePermission } from "../../../../lib/auth";
import { getReviews } from "@platform/database";
import { ReviewsManagementView } from "../../../../components/cms/ReviewsManagementView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("cms/reviews");

export default async function ReviewsSettingsPage() {
  await requirePagePermission("reviews", "read");

  const reviews = await getReviews(true);

  return <ReviewsManagementView initialReviews={reviews} />;
}
