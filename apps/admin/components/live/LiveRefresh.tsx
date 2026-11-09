"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { RESYNC, useRealtime } from "@platform/ui";

export function LiveRefresh({
  resources,
  notificationCategories = [],
  delayMs = 800,
}: {
  resources: string[];
  notificationCategories?: string[];
  delayMs?: number;
}) {
  const router = useRouter();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const stale = React.useRef(false);
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && stale.current) {
        stale.current = false;
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router]);
  useRealtime(
    (event) => {
      const resource = typeof event.data?.resource === "string" ? event.data.resource : "";
      const category = typeof event.data?.category === "string" ? event.data.category : "";
      const relevant =
        event.type === RESYNC ||
        (event.type === "entity.changed" && resources.includes(resource)) ||
        (event.type === "notification.created" && notificationCategories.includes(category));
      if (!relevant) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        if (document.visibilityState === "visible") router.refresh();
        else stale.current = true;
      }, delayMs);
    },
    ["entity.changed", "notification.created"],
  );
  return null;
}
