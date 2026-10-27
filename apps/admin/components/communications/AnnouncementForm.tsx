"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, Button, Input, Textarea } from "@platform/ui";
import type { AnnouncementInput, AnnouncementDetail } from "@platform/database";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
} from "@platform/database/constants/communications";
import { saveAnnouncementAction } from "../../app/actions/communications";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
export type AudienceOptions = {
  users: Array<{ id: string; fullName: string }>;
  departments: Array<{ id: string; nameEn: string; nameAr: string }>;
  roles: Array<{ id: string; nameEn: string; nameAr: string }>;
};
export function AnnouncementForm({
  initial,
  options,
  createAny,
}: {
  initial?: AnnouncementDetail;
  options: AudienceOptions;
  createAny: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const c = t.communications;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<AnnouncementInput>({
    title_en: initial?.titleEn ?? "",
    title_ar: initial?.titleAr ?? "",
    body_en: initial?.bodyEn ?? "",
    body_ar: initial?.bodyAr ?? "",
    category: initial?.category ?? "general",
    priority: initial?.priority ?? "normal",
    audience: initial?.audience ?? (createAny ? "company" : "team"),
    official: initial?.official ?? false,
    requires_acknowledgement: initial?.requiresAcknowledgement ?? false,
    audience_department_ids: initial?.audienceDepartmentIds ?? [],
    audience_roles: initial?.audienceRoles ?? [],
    audience_user_ids: initial?.audienceUserIds ?? [],
    pinned: initial?.pinned ?? false,
    publish_at: initial?.publishAt ?? "",
    expires_at: initial?.expiresAt ?? "",
  });
  const patch = (next: Partial<AnnouncementInput>) =>
    setForm({ ...form, ...next });
  const labels: Record<string, string> = c;
  const choices =
    form.audience === "people"
      ? options.users.map((u) => ({ id: u.id, label: u.fullName }))
      : form.audience === "departments"
        ? options.departments.map((d) => ({
          id: d.id,
          label: locale === "ar" ? d.nameAr : d.nameEn,
        }))
        : options.roles.map((r) => ({
          id: r.id,
          label: locale === "ar" ? r.nameAr : r.nameEn,
        }));
  const audienceKey =
    form.audience === "people"
      ? "audience_user_ids"
      : form.audience === "departments"
        ? "audience_department_ids"
        : "audience_roles";
  return (
    <form
      className="space-y-5 rounded-3xl border border-outline-variant p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const result = await saveAnnouncementAction(form, initial?.id);
          router.push(ROUTES.announcements.detail(result.id));
          router.refresh();
        } catch (err) {
          toast.error(errorMessage(err, t, c.failed));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["title_en", "titleEn"],
            ["title_ar", "titleAr"],
            ["body_en", "bodyEn"],
            ["body_ar", "bodyAr"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            {c[label]}
            {key.startsWith("body") ? (
              <Textarea
                required
                dir={key.endsWith("ar") ? "rtl" : "ltr"}
                rows={7}
                value={form[key]}
                onChange={(e) => patch({ [key]: e.target.value })}
              />
            ) : (
              <Input
                required
                value={form[key]}
                dir={key.endsWith("ar") ? "rtl" : "ltr"}
                onChange={(e) => patch({ [key]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["category", ANNOUNCEMENT_CATEGORIES],
            ["priority", ANNOUNCEMENT_PRIORITIES],
            ["audience", createAny ? ANNOUNCEMENT_AUDIENCES : ["team"]],
          ] as const
        ).map(([key, values]) => (
          <label key={key}>
            {c[key]}
            <Select
              className="block w-full rounded-xl border border-outline-variant bg-surface p-2"
              value={form[key]}
              onChange={(e) => patch({ [key]: e.target.value })}
            >
              {values.map((v) => (
                <option key={v} value={v}>
                  {labels[v]}
                </option>
              ))}
            </Select>
          </label>
        ))}
      </div>
      {["people", "roles", "departments"].includes(form.audience) && (
        <fieldset className="flex flex-wrap gap-3">
          {choices.map((v) => (
            <label key={v.id}>
              <input
                type="checkbox"
                checked={form[audienceKey]?.includes(v.id)}
                onChange={(e) =>
                  patch({
                    [audienceKey]: e.target.checked
                      ? [...(form[audienceKey] ?? []), v.id]
                      : (form[audienceKey] ?? []).filter((id) => id !== v.id),
                  })
                }
              />{" "}
              {v.label}
            </label>
          ))}
        </fieldset>
      )}
      <div className="flex flex-wrap gap-5">
        {(["official", "requires_acknowledgement", "pinned"] as const).map(
          (key) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={!!form[key]}
                onChange={(e) => patch({ [key]: e.target.checked })}
              />{" "}
              {key === "requires_acknowledgement"
                ? c.requiresAcknowledgement
                : c[key]}
            </label>
          ),
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["publish_at", "expires_at"] as const).map((key) => (
          <label key={key}>
            {key === "publish_at" ? c.publishAt : c.expiresAt}
            <input
              type="datetime-local"
              className="block rounded border p-2 bg-surface"
              value={
                form[key]
                  ? new Date(
                    new Date(form[key]!).getTime() -
                    new Date(form[key]!).getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                patch({
                  [key]: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
            />
          </label>
        ))}
      </div>
      <Button disabled={busy} type="submit">
        {c.save}
      </Button>
    </form>
  );
}
