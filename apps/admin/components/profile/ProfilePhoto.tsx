"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { AvatarEditor } from "@platform/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadFileDirectly } from "../../lib/upload-client";
import { errorMessage } from "../../lib/error-text";
import { removeMyAvatarAction, updateMyAvatarAction } from "../../app/actions/profile";
import { PresenceAvatar } from "../live/PresenceAvatar";

export function ProfilePhoto({ userId, name, avatarUrl, size = 88 }: { userId: string; name: string; avatarUrl?: string | null; size?: number }) {
  const { t } = useAdminLocale();
  const p = t.profileWorkspace;
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const save = async (photo: Blob) => {
    const extension = photo.type === "image/webp" ? "webp" : photo.type === "image/png" ? "png" : "jpg";
    try {
      const uploaded = await uploadFileDirectly(new File([photo], `profile-photo.${extension}`, { type: photo.type }), {
        entityType: "user_avatar",
        entityId: "pending",
      });
      await updateMyAvatarAction(uploaded.fileUrl);
    } catch (error) {
      throw new Error(errorMessage(error, t, p.photoFailed));
    }
    toast.success(p.photoSaved);
    router.refresh();
  };
  const remove = async () => {
    try {
      await removeMyAvatarAction();
    } catch (error) {
      throw new Error(errorMessage(error, t, p.photoFailed));
    }
    toast.success(p.photoRemoved);
    router.refresh();
  };
  const importLink = async (url: string) => {
    const response = await fetch("/api/profile/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const body = (await response.json().catch(() => ({}))) as { fileUrl?: string; error?: string };
    if (!response.ok || !body.fileUrl) throw new Error(errorMessage(new Error(body.error ?? ""), t, p.photoLinkFailed));
    return body.fileUrl;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label={avatarUrl ? p.changePhoto : p.addPhoto}
        title={avatarUrl ? p.changePhoto : p.addPhoto}
      >
        <PresenceAvatar userId={userId} name={name} src={avatarUrl} size={size} />
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <Camera className="h-6 w-6" />
        </span>
        <span aria-hidden className="absolute -bottom-1 -start-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-raised bg-primary text-primary-foreground shadow">
          <Camera className="h-3.5 w-3.5" />
        </span>
      </button>
      <AvatarEditor
        isOpen={open}
        onClose={() => setOpen(false)}
        name={name}
        currentUrl={avatarUrl}
        onSave={save}
        onRemove={avatarUrl ? remove : undefined}
        onImportLink={importLink}
      />
    </>
  );
}
