import { announcementRights } from "@platform/database";
import { requireAuth } from "../../../../lib/auth";
import { communicationOptions } from "../../../../lib/communication-options";
import { AnnouncementForm } from "../../../../components/communications/AnnouncementForm";
import { ForbiddenView } from "../../../../components/shared/ForbiddenView";
export const dynamic = "force-dynamic";
export default async function Page() {
  const actor = await requireAuth();
  const rights = await announcementRights(actor);
  if (!rights.createTeam) return <ForbiddenView />;
  return (
    <div className="max-w-5xl mx-auto">
      <AnnouncementForm
        options={await communicationOptions()}
        createAny={rights.createAny}
      />
    </div>
  );
}
