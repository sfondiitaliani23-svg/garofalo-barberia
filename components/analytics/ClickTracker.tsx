'use client';

import { useEffect } from 'react';
import { hasAnalyticsConsent } from '@/lib/consent/cookie-consent';
import { eventFromHref, type ClickEvent } from '@/lib/utils/click-events';

function send(e: ClickEvent) {
  if (!hasAnalyticsConsent()) return;
  const body = JSON.stringify({ e, p: window.location.pathname });
  try {
    if (navigator.sendBeacon?.('/api/evt', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    /* continua con fetch */
  }
  void fetch('/api/evt', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
}

/** Conta i clic importanti (Prenota, WhatsApp, Chiama…) solo con il consenso alle statistiche. */
export function ClickTracker() {
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin')) return;
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as Element | null;
      const a = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (a) {
        const e = eventFromHref(a.getAttribute('href') ?? '');
        if (e) send(e);
        return;
      }
      const btn = target?.closest?.('[data-evt]') as HTMLElement | null;
      const named = btn?.dataset.evt as ClickEvent | undefined;
      if (named) send(named);
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);
  return null;
}
