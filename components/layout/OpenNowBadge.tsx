'use client';

import { useEffect, useState } from 'react';
import { getOpenStatus, type OpenStatus } from '@/lib/utils/open-now';
import { useLang } from '@/components/i18n/LangProvider';
import { openLabel } from '@/lib/i18n/content-widgets';

/**
 * Badge "Aperto ora / Chiuso". Calcolato nel browser con gli orari pubblici,
 * poi corretto dal server con ferie e chiusure straordinarie.
 */
export function OpenNowBadge({ className = '' }: { className?: string }) {
  const lang = useLang();
  const [status, setStatus] = useState<OpenStatus | null>(null);

  useEffect(() => {
    let closed: string[] = [];
    let alive = true;
    const tick = () => setStatus(getOpenStatus(new Date(), closed));
    tick();
    fetch('/api/open-now')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { closedDates?: string[] } | null) => {
        if (!alive || !d?.closedDates) return;
        closed = d.closedDates;
        tick();
      })
      .catch(() => {});
    const id = window.setInterval(tick, 60_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  if (!status) return <span className={`open-badge open-badge--placeholder ${className}`} aria-hidden />;

  const tone = status.open ? (status.soon ? 'closing' : 'open') : 'closed';
  return (
    <span className={`open-badge open-badge--${tone} ${className}`} role="status" aria-live="polite">
      <span className="open-badge__dot" aria-hidden />
      {openLabel(lang, status.label)}
    </span>
  );
}
