"use client";
// Refreshes the page's data when records it shows change elsewhere (docs/adr/0012): another person's edit, a new
// order from the website, a reply on a ticket. Put it on list and detail pages; form input on the page is kept.
import * as React from "react";
import { useRouter } from "next/navigation";
import { RESYNC, useRealtime } from "@platform/ui";

export function LiveRefresh({
  resources,
  notificationCategories = [],
  delayMs = 800,
}: {
  /** Permission resources whose changes this page shows (e.g. "orders"). */
  resources: string[];
  /** Also refresh when a notification of these categories arrives (e.g. "approvals"). */
  notificationCategories?: string[];
  delayMs?: number;
}) {
  const router = useRouter();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const stale = React.useRef(false);
  React.useEffect(() => {
    // A change while the tab was in the background refreshes it when the person comes back.
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
      // Several changes in a burst refresh once.
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
