import { syncAllStatusWindows } from "@platform/database/services/status-windows";

const state = globalThis as { __statusSync?: ReturnType<typeof setTimeout> };

export function startStatusSync() {
  const every = Number(process.env.STATUS_SYNC_MS ?? 120_000);
  if (state.__statusSync || !Number.isFinite(every) || every <= 0) return;
  if (!process.env.API_URL) return;
  let failures = 0;
  const tick = async () => {
    try {
      await syncAllStatusWindows();
      failures = 0;
    } catch (error) {
      if (failures++ % 30 === 0) console.error("Syncing statuses with the realtime service failed; retrying:", error);
    }
    state.__statusSync = setTimeout(tick, every);
    state.__statusSync.unref?.();
  };
  state.__statusSync = setTimeout(tick, 5_000);
  state.__statusSync.unref?.();
}
