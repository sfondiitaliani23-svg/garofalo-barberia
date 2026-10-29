'use client';

import { useEffect } from 'react';
import { syncPushSubscription } from '@/lib/push-client';

/** Tiene aggiornata l'iscrizione di chi ha già acceso le notifiche ed è entrato nel sito. */
export function PushSync() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (location.hostname === 'localhost') return;
    void syncPushSubscription();
  }, []);
  return null;
}
