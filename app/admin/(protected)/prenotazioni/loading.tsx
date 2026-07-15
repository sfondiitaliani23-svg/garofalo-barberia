// Skeleton loading per le prenotazioni admin
export default function AdminPrenotazioniLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-9 w-44 rounded bg-white/10 mb-2" />
      <div className="h-4 w-60 rounded bg-white/5 mb-8" />

      {/* Toolbar skeleton */}
      <div className="flex gap-3 mb-6">
        <div className="h-10 w-36 rounded-lg bg-white/5 border border-white/10" />
        <div className="h-10 w-28 rounded-lg bg-white/5 border border-white/10" />
        <div className="h-10 flex-1 rounded-lg bg-white/5 border border-white/10" />
      </div>

      {/* Appointment rows skeleton */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#111] px-4 py-3.5">
            <div className="h-10 w-1 rounded-full bg-gold/20 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-36 rounded bg-white/10" />
              <div className="h-3 w-56 rounded bg-white/5" />
            </div>
            <div className="h-4 w-16 rounded bg-white/10" />
            <div className="h-4 w-20 rounded bg-white/10" />
            <div className="h-7 w-24 rounded-full bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
