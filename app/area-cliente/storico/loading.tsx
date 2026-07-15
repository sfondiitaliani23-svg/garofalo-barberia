// Skeleton loading per lo storico appuntamenti
export default function CustomerStoricoLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 rounded bg-white/10" />
      <div className="space-y-3 mt-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#111] px-5 py-4">
            <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-white/10" />
              <div className="h-3 w-48 rounded bg-white/5" />
            </div>
            <div className="h-6 w-20 rounded-full bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
