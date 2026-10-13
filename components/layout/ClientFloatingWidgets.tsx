'use client';

import dynamic from 'next/dynamic';

const CookieConsent = dynamic(() => import('@/components/layout/CookieConsent').then((m) => m.CookieConsent), { ssr: false });
const WhatsAppFloat = dynamic(() => import('@/components/layout/WhatsAppFloat').then((m) => m.WhatsAppFloat), { ssr: false });
const ScrollToTop = dynamic(() => import('@/components/layout/ScrollToTop').then((m) => m.ScrollToTop), { ssr: false });
const EliseoChat = dynamic(() => import('@/components/layout/EliseoChat').then((m) => m.EliseoChat), { ssr: false });
const VisitorTracker = dynamic(() => import('@/components/analytics/VisitorTracker').then((m) => m.VisitorTracker), { ssr: false });
const ClickTracker = dynamic(() => import('@/components/analytics/ClickTracker').then((m) => m.ClickTracker), { ssr: false });

export function ClientFloatingWidgets() {
  return (
    <>
      <CookieConsent />
      <WhatsAppFloat />
      <ScrollToTop />
      <EliseoChat />
      <VisitorTracker />
      <ClickTracker />
    </>
  );
}

export function CustomerFloatingWidgets() {
  return (
    <>
      <ScrollToTop />
      <EliseoChat />
    </>
  );
}

/** Solo consenso cookie e statistiche (pagina link senza pulsanti flottanti). */
export function TrackingOnlyWidgets() {
  return (
    <>
      <CookieConsent />
      <VisitorTracker />
      <ClickTracker />
    </>
  );
}
