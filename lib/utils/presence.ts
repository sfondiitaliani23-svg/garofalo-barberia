/** Considerato "online" chi ha mandato un segnale negli ultimi 2 minuti. */
export const ONLINE_WINDOW_MS = 2 * 60_000;

export type PresenceInfo = { lastSeen: string | null; lastSignIn: string | null; online: boolean };

export type PresenceSnapshot = {
  byUser: Record<string, PresenceInfo>;
  team: { id: string; name: string; email: string | null; presence: PresenceInfo }[];
  onlineCustomers: { id: string; name: string }[];
  generatedAt: string;
};

/** "Online ora", "Visto 5 min fa", "Visto ieri alle 18:20", "Mai collegato". */
export function presenceLabel(p: PresenceInfo | undefined, now = Date.now()) {
  if (!p) return 'Mai collegato';
  if (p.online) return 'Online ora';
  const ref = p.lastSeen ?? p.lastSignIn;
  if (!ref) return 'Mai collegato';
  const t = new Date(ref).getTime();
  const min = Math.round((now - t) / 60_000);
  if (min < 60) return `Visto ${Math.max(1, min)} min fa`;
  const d = new Date(ref);
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
  const day = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
  const today = day(new Date(now));
  const yesterday = day(new Date(now - 86_400_000));
  if (day(d) === today) return `Visto oggi alle ${time}`;
  if (day(d) === yesterday) return `Visto ieri alle ${time}`;
  return `Visto il ${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })} alle ${time}`;
}
