"use client";

import Link from "next/link";
import { CloudUpload } from "lucide-react";
import type { WebsiteSnapshotSection } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

/** Tells CMS editors that their edits wait for a website publication, and where to publish. */
export function UnpublishedChangesNotice({
  section,
  status,
  canPublish,
}: {
  /** The collection this page edits; omit on the Website page to list every changed section. */
  section?: WebsiteSnapshotSection;
  status: { isPublished: boolean; changedSections: WebsiteSnapshotSection[] };
  canPublish: boolean;
}) {
  const { t } = useAdminLocale();
  const copy = t.websitePublication;
  const changed = section ? status.changedSections.includes(section) : status.changedSections.length > 0;
  if (!changed) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <div className="flex items-start gap-2">
        <CloudUpload className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p>{status.isPublished ? copy.pending : copy.neverPublished}</p>
          {!section && status.isPublished && (
            <p className="text-xs opacity-80">
              {copy.changedSections} {status.changedSections.map((s) => copy.sections[s]).join(" · ")}
            </p>
          )}
        </div>
      </div>
      {section && canPublish && (
        <Link href={ROUTES.cms.website} className="text-xs font-semibold underline">
          {copy.openPublisher}
        </Link>
      )}
    </div>
  );
}
