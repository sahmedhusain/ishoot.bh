import { requirePagePermission, getCurrentUser } from "../../../../lib/auth";
import { notFound } from "next/navigation";
import { getMinuteOfMeetingById } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { MomDetailView } from "../../../../components/moms/MomDetailView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("moms/[id]");

export const dynamic = "force-dynamic";

interface MomDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MomDetailPage({ params }: MomDetailPageProps) {
  await requirePagePermission("moms", "read");
  const { id } = await params;

  const [mom, company, currentUser] = await Promise.all([
    getMinuteOfMeetingById(id),
    getCachedCompanySettings(),
    getCurrentUser(),
  ]);

  if (!mom || !company) {
    notFound();
  }

  return (
    <MomDetailView
      mom={mom}
      company={company}
      currentUser={
        currentUser
          ? {
            id: currentUser.id,
            name: currentUser.full_name,
            email: currentUser.email,
            role: currentUser.role,
            signature_url: currentUser.signature_url,
          }
          : null
      }
    />
  );
}
