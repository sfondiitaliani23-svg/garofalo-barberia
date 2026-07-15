// Skeleton loading per gli appuntamenti cliente
export default function CustomerAppuntamentiLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-white/10" />
      <div className="h-3 w-64 rounded bg-white/5" />

      <div className="space-y-3 mt-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#111] px-5 py-4">
            <div className="w-10 h-10 rounded-full bg-gold/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 rounded bg-white/10" />
              <div className="h-3 w-52 rounded bg-white/5" />
            </div>
            <div className="h-6 w-24 rounded-full bg-gold/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
