"use client";

export type DesktopPermission = "granted" | "denied" | "default" | "unsupported";

export function desktopPermission(): DesktopPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as DesktopPermission;
}

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
    return false;
  }
}
