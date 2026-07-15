// Skeleton loading per la dashboard admin
export default function AdminDashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-9 w-40 rounded bg-white/10 mb-2" />
      <div className="h-4 w-48 rounded bg-white/5 mb-8" />

      {/* KPI cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-[#111] p-5">
            <div className="h-3 w-28 rounded bg-white/10 mb-4" />
            <div className="h-9 w-16 rounded bg-gold/20" />
          </div>
        ))}
      </div>

      {/* Analytics block skeleton */}
      <div className="rounded-xl border border-white/10 bg-[#111] p-6">
        <div className="h-5 w-32 rounded bg-white/10 mb-4" />
        <div className="h-48 w-full rounded bg-white/5" />
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="h-3 w-20 rounded bg-white/10 mb-2" />
              <div className="h-7 w-12 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
