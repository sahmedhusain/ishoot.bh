/** Each page enters with a short fade and rise (nothing moves with "reduce motion"). */
export default function PageTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
