"use client";
// The operating system's notifications (the Notification API), for when the app's tab is in the background. They
// need the person's permission, asked from a click. Some browsers (iOS Safari outside a home-screen app) have no such
// API; the in-app pop-up and sound still work there.

export type DesktopPermission = "granted" | "denied" | "default" | "unsupported";

export function desktopPermission(): DesktopPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as DesktopPermission;
}

/** Asks for permission; call it from a click. Older Safari takes a callback instead of returning a promise. */
export async function requestDesktopPermission(): Promise<DesktopPermission> {
  if (desktopPermission() === "unsupported") return "unsupported";
  try {
    const result = await new Promise<NotificationPermission>((resolve) => {
      const maybe = Notification.requestPermission(resolve);
      if (maybe && typeof maybe.then === "function") void maybe.then(resolve);
    });
    return result as DesktopPermission;
  } catch {
    return desktopPermission();
  }
}

/** Shows a notification when allowed and the page is not in front. Clicking it focuses the tab and runs onClick. */
export function showDesktopNotification(
  title: string,
  options: { body?: string; tag?: string; icon?: string; onClick?: () => void; requireInteraction?: boolean },
): boolean {
  if (desktopPermission() !== "granted" || document.visibilityState === "visible") return false;
  try {
    const n = new Notification(title, {
      body: options.body,
      tag: options.tag,
      icon: options.icon,
      requireInteraction: options.requireInteraction,
    });
    n.onclick = () => {
      window.focus();
      options.onClick?.();
      n.close();
    };
    return true;
  } catch {
    // Chrome on Android allows notifications only from a service worker.
    return false;
  }
}
