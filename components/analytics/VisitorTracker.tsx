'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackHeartbeat, trackPageView } from '@/lib/actions/analytics';
import { getOrCreateSessionId } from '@/lib/analytics/session';
import { hasAnalyticsConsent } from '@/lib/consent/cookie-consent';
import { DemographicsSurvey } from './DemographicsSurvey';

const HEARTBEAT_MS = 60_000;

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
  }, [isAdminArea, pathname]);

  useEffect(() => {
    if (isAdminArea || !hasAnalyticsConsent()) return;

    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;

    const ping = () => trackHeartbeat(sessionId);
    ping();

    const interval = setInterval(ping, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [isAdminArea]);

  useEffect(() => {
    const handleConsent = () => {
      if (!hasAnalyticsConsent()) return;
      const sessionId = getOrCreateSessionId();
      if (!sessionId || !pathname || pathname === lastPath.current) return;
      lastPath.current = pathname;
      trackPageView(sessionId, pathname);
    };

    window.addEventListener('garofalo:cookie-consent', handleConsent);
    return () => window.removeEventListener('garofalo:cookie-consent', handleConsent);
  }, [pathname]);

  if (isAdminArea) return null;

  return <DemographicsSurvey />;
}