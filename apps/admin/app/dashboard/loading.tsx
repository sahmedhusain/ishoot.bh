export default function DashboardLoading() {
  return (
    <div aria-busy="true" className="space-y-6 animate-pulse">
      <div className="h-8 w-56 rounded-lg bg-slate-200 dark:bg-white/10" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-white/10" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-slate-200 dark:bg-white/10" />
    </div>
  );
}
