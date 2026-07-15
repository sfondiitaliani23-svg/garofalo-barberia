// Skeleton loading per la dashboard cliente — appare IMMEDIATAMENTE mentre i dati arrivano dal server
export default function CustomerDashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Hero benvenuto skeleton */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#0f0c08] via-[#111] to-[#0a0a0a] p-8">
        <div className="h-3 w-24 rounded bg-gold/20 mb-3" />
        <div className="h-8 w-48 rounded bg-white/10 mb-4" />
        <div className="h-3 w-72 rounded bg-white/5" />
        <div className="mt-6 flex gap-4">
          <div className="h-12 w-36 rounded-lg bg-white/5 border border-white/8" />
          <div className="h-12 w-36 rounded-lg bg-white/5 border border-white/8" />
        </div>
      </div>

      {/* Prossimi appuntamenti skeleton */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-40 rounded bg-white/10" />
          <div className="h-3 w-16 rounded bg-white/5" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#111] px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-gold/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-white/10" />
                <div className="h-3 w-48 rounded bg-white/5" />
              </div>
              <div className="h-6 w-20 rounded-full bg-gold/10" />
            </div>
          ))}
        </div>
      </div>

      {/* Accesso rapido skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-white/8 bg-[#111] p-4">
            <div className="h-8 w-8 rounded bg-white/5 mb-2" />
            <div className="h-4 w-20 rounded bg-white/10 mb-1" />
            <div className="h-3 w-28 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
