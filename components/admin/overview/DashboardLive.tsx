'use client';

import { LiveTrafficChart } from '@/components/admin/LiveTrafficChart';
import { PresencePanel } from '@/components/admin/PresencePanel';
import { WhatsAppStatusWidget } from '@/components/admin/WhatsAppStatusWidget';
import type { PresenceSnapshot } from '@/lib/utils/presence';

/** Parte "in tempo reale" della dashboard: visite di oggi, chi è sul sito, promemoria WhatsApp. */
export function DashboardLive({ presence }: { presence: PresenceSnapshot }) {
  return (
    <section className="ov-live" aria-label="In tempo reale">
      <p className="ov-live-title">In tempo reale</p>
      <div className="ov-live-grid">
        <div className="ov-live-traffic">
          <LiveTrafficChart />
        </div>
        <div className="ov-live-side">
          <WhatsAppStatusWidget />
        </div>
      </div>
      <PresencePanel initial={presence} />
    </section>
  );
}
