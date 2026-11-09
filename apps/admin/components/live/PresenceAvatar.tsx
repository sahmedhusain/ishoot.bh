"use client";
import { UserAvatar, type UserAvatarProps } from "@platform/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { presenceLook, usePresence } from "./LiveProvider";
import { statusName } from "./status-text";

export function PresenceAvatar({ userId, ...props }: Omit<UserAvatarProps, "tone" | "doNotDisturb" | "statusLabel"> & { userId?: string | null }) {
  const { locale } = useAdminLocale();
  const presence = usePresence(userId);
  const look = presence ? presenceLook(presence.status) : null;
  return (
    <UserAvatar
      {...props}
      tone={look?.tone ?? null}
      doNotDisturb={look?.doNotDisturb}
      statusLabel={presence ? statusName(presence.status, locale) : undefined}
    />
  );
}
