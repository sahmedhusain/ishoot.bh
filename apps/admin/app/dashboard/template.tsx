/** Each dashboard page enters with a short fade and rise (nothing moves with "reduce motion"). */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
