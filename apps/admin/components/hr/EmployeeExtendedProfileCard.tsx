"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@platform/ui";
import { Save, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { saveEmployeeExtendedProfileAction } from "../../app/actions/hrms";
import type { EmployeeExtendedProfile } from "../../lib/api/hr";
import { EmployeeExtendedProfileFields } from "./EmployeeExtendedProfileFields";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmployeeExtendedProfileCardProps {
  employeeId: string;
  initialProfile: EmployeeExtendedProfile;
  canEdit: boolean;
}

export function EmployeeExtendedProfileCard({
  employeeId,
  initialProfile,
  canEdit,
}: EmployeeExtendedProfileCardProps) {
  const router = useRouter();
  const { t } = useAdminLocale();
  const ext = t.employeeExtendedProfile;

  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [profile, setProfile] = React.useState<EmployeeExtendedProfile>(initialProfile);

  React.useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const handleSave = async () => {
    for (const em of profile.emails) {
      if (em.value.trim() && !EMAIL_RE.test(em.value.trim())) {
        toast.error(`${ext.invalidEmail}: ${em.value}`);
        return;
      }
    }
    for (const ec of profile.emergencyContacts) {
      if (ec.email?.trim() && !EMAIL_RE.test(ec.email.trim())) {
        toast.error(`${ext.invalidEmail}: ${ec.email}`);
        return;
      }
    }
    setSaving(true);
    const toastId = toast.loading(ext.savingProfile);
    try {
      const cleaned: EmployeeExtendedProfile = {
        ...profile,
        contacts: profile.contacts.filter((c) => c.value.trim() !== ""),
        emails: profile.emails.filter((e) => e.value.trim() !== ""),
        emergencyContacts: profile.emergencyContacts.filter(
          (ec) => ec.name.trim() !== "" || ec.phone.trim() !== "",
        ),
      };
      const res = await saveEmployeeExtendedProfileAction(employeeId, cleaned);
      if (res.success) {
        toast.success(ext.savedProfile, { id: toastId });
        setProfile(res.profile);
        setEditing(false);
        router.refresh();
      } else {
        toast.error(ext.saveFailed, { id: toastId });
      }
    } catch (err) {
      toast.error(errorMessage(err, t, ext.saveFailed), { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">{ext.sectionHeading}</h2>
          <p className="text-xs text-ink-muted">{ext.sectionSubtitle}</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setProfile(initialProfile);
                    setEditing(false);
                  }}
                  className="gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  {t.actions.cancel}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {t.actions.save}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                className="gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {ext.editExtendedProfile}
              </Button>
            )}
          </div>
        )}
      </div>

      <EmployeeExtendedProfileFields
        value={profile}
        onChange={setProfile}
        disabled={!editing}
      />
    </div>
  );
}
