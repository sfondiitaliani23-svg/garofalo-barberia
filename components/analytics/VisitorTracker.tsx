'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackHeartbeat, trackPageView } from '@/lib/actions/analytics';
import { getOrCreateSessionId } from '@/lib/analytics/session';
import { DemographicsSurvey } from './DemographicsSurvey';

const HEARTBEAT_MS = 60_000;

export function VisitorTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    if (!sessionId || pathname === lastPath.current) return;

    lastPath.current = pathname;
    trackPageView(sessionId, pathname);
  }, [pathname]);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;

    const ping = () => trackHeartbeat(sessionId);
    ping();

    const interval = setInterval(ping, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, []);

  return <DemographicsSurvey />;
}