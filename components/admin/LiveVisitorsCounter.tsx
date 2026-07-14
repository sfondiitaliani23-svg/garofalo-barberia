'use client';

import { useEffect, useState } from 'react';
import { getLiveVisitorsCount } from '@/lib/actions/analytics';
import { ADMIN_LIVE_POLL_MS } from '@/lib/analytics/live-config';

export function LiveVisitorsCounter({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const live = await getLiveVisitorsCount();
        if (active) setCount(live);
      } catch {
        /* ignore polling errors */
      }
    };

    refresh();
    const interval = setInterval(refresh, ADMIN_LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-400"
        aria-hidden
      />
      <p className="text-3xl font-bold text-gold">{count}</p>
    </div>
  );
}