import { CLICK_EVENTS, type ClickEvent } from '@/lib/utils/click-events';

const ORDER: ClickEvent[] = ['prenota', 'whatsapp', 'chiama', 'mappa', 'instagram', 'recensione_google', 'assistente'];

function trend(now: number, before: number) {
  if (!before) return now ? 'nuovo' : '';
  const d = Math.round(((now - before) / before) * 100);
  return `${d > 0 ? '+' : ''}${d}%`;
}

/** Riquadro admin: clic importanti degli ultimi 30 giorni. */
export function ClickStatsCard({
  totals,
  prev,
  topPages,
}: {
  totals: Record<string, number>;
  prev: Record<string, number>;
  topPages: Record<string, { path: string; n: number }[]>;
}) {
  const any = ORDER.some((k) => totals[k]);
  return (
    <section className="mb-8 rounded-xl border border-white/10 bg-[#0e0e0e] p-5" aria-labelledby="clicks-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="clicks-title" className="font-semibold text-white">Clic importanti · ultimi 30 giorni</h2>
          <p className="text-xs text-white/45">Contati solo per chi accetta le statistiche. Confronto con i 30 giorni prima.</p>
        </div>
      </div>
      {!any ? (
        <p className="text-sm text-white/50">Ancora nessun dato: i clic si contano da oggi.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {ORDER.map((k) => {
            const n = totals[k] ?? 0;
            const t = trend(n, prev[k] ?? 0);
            const top = topPages[k]?.[0];
            return (
              <div key={k} className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-[11px] text-white/50">{CLICK_EVENTS[k]}</p>
                <p className="mt-1 text-2xl font-bold text-white tabular-nums">{n}</p>
                <p className="text-[11px] text-white/40">
                  {t && <span className={t.startsWith('-') ? 'text-red-300' : 'text-emerald-400'}>{t}</span>}
                  {top && <span className="block truncate">da {top.path === '/' ? 'home' : top.path}</span>}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
