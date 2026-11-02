import { requireAuth } from "../../../lib/auth";
import { NotificationInboxView } from "../../../components/communications/NotificationInboxView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("notifications");

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAuth();
  const { tab } = await searchParams;
  return <NotificationInboxView tab={tab ?? "all"} />;
}
