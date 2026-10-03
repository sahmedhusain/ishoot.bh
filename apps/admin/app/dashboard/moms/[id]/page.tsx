import { requirePermission, getCurrentUser } from "../../../../lib/auth";
import * as React from "react";
import { notFound } from "next/navigation";
import { getMinuteOfMeetingById, getCompanySettings } from "@ishoot/database";
import { MomDetailView } from "../../../../components/moms/MomDetailView";

export const dynamic = "force-dynamic";

interface MomDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MomDetailPage({ params }: MomDetailPageProps) {
  await requirePermission("moms", "read");
  const { id } = await params;

  const [mom, company, currentUser] = await Promise.all([
    getMinuteOfMeetingById(id),
    getCompanySettings(),
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
