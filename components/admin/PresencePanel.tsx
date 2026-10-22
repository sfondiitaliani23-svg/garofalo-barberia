'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { presenceLabel, type PresenceInfo, type PresenceSnapshot } from '@/lib/utils/presence';

/** Aggiorna lo stato online ogni 30 secondi (solo mentre la pagina è visibile). */
export function usePresence(initial: PresenceSnapshot) {
  const [snap, setSnap] = useState(initial);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { getPresenceAction } = await import('@/lib/actions/presence-admin');
        const next = await getPresenceAction();
        if (alive) setSnap(next);
      } catch {
        /* resta l'ultimo dato */
      }
    };
    const id = window.setInterval(load, 30_000);
    document.addEventListener('visibilitychange', load);
    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);
  return snap;
}

export function PresenceDot({ info, withLabel = true, absentLabel = 'Mai collegato' }: { info?: PresenceInfo; withLabel?: boolean; absentLabel?: string }) {
  const online = !!info?.online;
  const label = presenceLabel(info);
  const text = label === 'Mai collegato' ? absentLabel : label;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" title={text}>
      <span className="relative flex h-2 w-2" aria-hidden>
        {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-white/30'}`} />
      </span>
      {withLabel && <span className={online ? 'text-emerald-300' : 'text-white/60'}>{text}</span>}
    </span>
  );
}

/** Riquadro in dashboard: team (admin e co-founder) e clienti collegati adesso. */
export function PresencePanel({ initial }: { initial: PresenceSnapshot }) {
  const snap = usePresence(initial);
  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-[#0e0e0e]/90 p-5" aria-labelledby="presence-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="presence-title" className="text-sm font-semibold uppercase tracking-[0.14em] text-gold">Chi è sul sito</h2>
        <span className="text-[11px] text-white/45">Si aggiorna ogni 30 secondi</span>
      </div>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold text-white/60">Team</p>
          <ul className="space-y-2">
            {snap.team.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                <span className="min-w-0 truncate text-sm text-white">{m.name}</span>
                <PresenceDot info={m.presence} />
              </li>
            ))}
            {snap.team.length === 0 && <li className="text-sm text-white/50">Nessun admin trovato.</li>}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-white/60">
            Clienti online ora <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">{snap.onlineCustomers.length}</span>
          </p>
          {snap.onlineCustomers.length === 0 ? (
            <p className="text-sm text-white/50">Nessun cliente registrato è sul sito in questo momento.</p>
          ) : (
            <ul className="space-y-2">
              {snap.onlineCustomers.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2">
                  <Link href={`/admin/clienti/${c.id}/galleria`} className="min-w-0 truncate text-sm text-white hover:text-gold">
                    {c.name}
                  </Link>
                  <PresenceDot info={snap.byUser[c.id]} withLabel={false} />
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/clienti" className="mt-3 inline-block text-xs text-gold-light underline underline-offset-2">
            Ultimi accessi di tutti i clienti
          </Link>
        </div>
      </div>
    </section>
  );
}
