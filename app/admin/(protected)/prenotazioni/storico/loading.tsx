// Skeleton loading istantaneo per lo storico prenotazioni admin
export default function AdminStoricoLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div>
        <div className="h-8 w-64 rounded bg-white/10 mb-2" />
        <div className="h-4 w-96 rounded bg-white/5" />
      </div>

      {/* Control panel skeleton */}
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-xl space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <div className="h-7 w-48 rounded bg-white/10" />
          <div className="h-7 w-28 rounded-full bg-white/5" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-lg bg-white/5" />
          <div className="h-8 w-32 rounded-lg bg-white/5" />
          <div className="h-8 w-28 rounded-lg bg-white/5" />
        </div>
        <div className="h-10 w-full rounded-lg bg-white/5" />
      </div>

      {/* Rows skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#141414] p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gold/10" />
              <div className="space-y-1.5">
                <div className="h-4 w-40 rounded bg-white/10" />
                <div className="h-3 w-56 rounded bg-white/5" />
              </div>
            </div>
            <div className="h-8 w-28 rounded-lg bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
