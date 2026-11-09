import { flushNotifications } from "@platform/database/services/notification-handover";

const state = globalThis as { __notificationHandover?: ReturnType<typeof setTimeout> };

export function startNotificationHandover() {
  const raw = process.env.NOTIFICATION_HANDOVER_MS;
  const every = Number(!raw ? 1000 : raw);
  if (state.__notificationHandover || !Number.isFinite(every) || every <= 0) return;
  if (!process.env.API_URL) return;
  let failures = 0;
  const tick = async () => {
    try {
      await flushNotifications();
      failures = 0;
    } catch (error) {
      failures++;
      if (failures === 1 || failures % 100 === 0)
        console.error("Handing notifications to the notify service failed; retrying:", error);
    }
    state.__notificationHandover = setTimeout(tick, failures ? Math.min(every * 2 ** failures, 30_000) : every);
    state.__notificationHandover.unref?.();
  };
  state.__notificationHandover = setTimeout(tick, every);
  state.__notificationHandover.unref?.();
}
