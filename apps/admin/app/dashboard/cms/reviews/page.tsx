import { requirePagePermission } from "../../../../lib/auth";
import { getReviews } from "@ishoot/database";
import { ReviewsManagementView } from "../../../../components/cms/ReviewsManagementView";

export default async function ReviewsSettingsPage() {
  await requirePagePermission("reviews", "read");

  const reviews = await getReviews(true);

  return <ReviewsManagementView initialReviews={reviews} />;
}
