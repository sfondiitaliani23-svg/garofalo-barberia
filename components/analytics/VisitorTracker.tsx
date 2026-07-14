'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/actions/analytics';
import { VISITOR_HEARTBEAT_MS } from '@/lib/analytics/live-config';
import { getOrCreateSessionId } from '@/lib/analytics/session';
import { hasAnalyticsConsent } from '@/lib/consent/cookie-consent';
import { DemographicsSurvey } from './DemographicsSurvey';

function sendHeartbeat(sessionId: string) {
  void fetch('/api/analytics/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
    keepalive: true,
  });
}

function sendSessionEnd(sessionId: string) {
  const payload = JSON.stringify({ sessionId });
  const blob = new Blob([payload], { type: 'application/json' });

  if (navigator.sendBeacon('/api/analytics/end-session', blob)) return;

  void fetch('/api/analytics/end-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  });
}

export function VisitorTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const isAdminArea = pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdminArea || !hasAnalyticsConsent()) return;

    const sessionId = getOrCreateSessionId();
    if (!sessionId || pathname === lastPath.current) return;

    lastPath.current = pathname;
    trackPageView(sessionId, pathname);
    sendHeartbeat(sessionId);
  }, [isAdminArea, pathname]);

  useEffect(() => {
    if (isAdminArea || !hasAnalyticsConsent()) return;

    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;

    const syncPresence = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(sessionId);
      } else {
        sendSessionEnd(sessionId);
      }
    };

    syncPresence();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(sessionId);
      }
    }, VISITOR_HEARTBEAT_MS);

    const onVisibilityChange = () => syncPresence();
    const onPageHide = () => sendSessionEnd(sessionId);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      sendSessionEnd(sessionId);
    };
  }, [isAdminArea]);

  useEffect(() => {
    const handleConsent = () => {
      if (!hasAnalyticsConsent()) return;
      const sessionId = getOrCreateSessionId();
      if (!sessionId || !pathname || pathname === lastPath.current) return;
      lastPath.current = pathname;
      trackPageView(sessionId, pathname);
      sendHeartbeat(sessionId);
    };

    window.addEventListener('garofalo:cookie-consent', handleConsent);
    return () => window.removeEventListener('garofalo:cookie-consent', handleConsent);
  }, [pathname]);

  if (isAdminArea) return null;

  return <DemographicsSurvey />;
}