// Skeleton loading per la lista clienti admin
export default function AdminClientiLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-9 w-24 rounded bg-white/10 mb-2" />
      <div className="h-4 w-48 rounded bg-white/5 mb-8" />

      {/* Search bar skeleton */}
      <div className="h-10 w-full rounded-lg bg-white/5 border border-white/10 mb-6" />

      {/* Customer rows skeleton */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#111] px-4 py-3.5">
            <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 rounded bg-white/10" />
              <div className="h-3 w-48 rounded bg-white/5" />
            </div>
            <div className="h-3 w-24 rounded bg-white/5" />
            <div className="h-7 w-16 rounded-lg bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
