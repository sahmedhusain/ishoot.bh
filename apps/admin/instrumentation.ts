// Runs once when the admin server starts (Next.js instrumentation): background hand-overs to the Go services.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ startNotificationHandover }, { startStatusSync }] = await Promise.all([
    import("./lib/notification-handover"),
    import("./lib/status-sync"),
  ]);
  startNotificationHandover();
  startStatusSync();
}
