'use client';

import dynamic from 'next/dynamic';

const CookieConsent = dynamic(() => import('@/components/layout/CookieConsent').then((m) => m.CookieConsent), { ssr: false });
const WhatsAppFloat = dynamic(() => import('@/components/layout/WhatsAppFloat').then((m) => m.WhatsAppFloat), { ssr: false });
const ScrollToTop = dynamic(() => import('@/components/layout/ScrollToTop').then((m) => m.ScrollToTop), { ssr: false });
const EliseoChat = dynamic(() => import('@/components/layout/EliseoChat').then((m) => m.EliseoChat), { ssr: false });
const VisitorTracker = dynamic(() => import('@/components/analytics/VisitorTracker').then((m) => m.VisitorTracker), { ssr: false });

export function ClientFloatingWidgets() {
  return (
    <>
      <CookieConsent />
      <WhatsAppFloat />
      <ScrollToTop />
      <EliseoChat />
      <VisitorTracker />
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
