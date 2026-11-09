// Analisi come Keplero (09/11/2026): numeri delle conversazioni degli ultimi 7 giorni
// rispetto ai 7 precedenti, e mappa giorno × fascia oraria. Solo calcoli puri sui messaggi della casella.

import { chatKeyOf, isGroupChat } from '@/lib/utils/wa-conversations';

export type AnalisiInput = { rif: string; quando: string; contatto?: string | null; nome?: string | null; assegnato?: string | null; stato?: string; tipo?: string };

export type AnalisiResult = {
  conversazioni: number;
  conversazioniPrima: number;
  messaggi: number;
  messaggiPrima: number;
  conOperatore: number;
  conOperatorePrima: number;
  /** 7 righe (lun→dom) × 8 fasce di 3 ore */
  mappa: number[][];
  max: number;
};

const DAY = 86_400_000;

function giornoFascia(d: Date, tz: string): [number, number] {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const idx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd);
  return [idx < 0 ? 0 : idx, Math.min(7, Math.floor(h / 3))];
}

export function analisiConversazioni(items: AnalisiInput[], now = new Date(), tz = 'Europe/Rome'): AnalisiResult {
  const t = now.getTime();
  const mappa = Array.from({ length: 7 }, () => Array(8).fill(0) as number[]);
  const chatOra = new Set<string>();
  const chatPrima = new Set<string>();
  const opOra = new Set<string>();
  const opPrima = new Set<string>();
  let messaggi = 0;
  let messaggiPrima = 0;
  const primoDellaChat = new Map<string, number>();

  for (const it of items) {
    if (isGroupChat(it.contatto)) continue;
    const ts = Date.parse(it.quando);
    if (!Number.isFinite(ts) || ts > t) continue;
    const key = chatKeyOf(it);
    const age = t - ts;
    if (age <= 7 * DAY) {
      messaggi++;
      chatOra.add(key);
      if (it.assegnato) opOra.add(key);
      const prev = primoDellaChat.get(key);
      if (prev === undefined || ts < prev) primoDellaChat.set(key, ts);
    } else if (age <= 14 * DAY) {
      messaggiPrima++;
      chatPrima.add(key);
      if (it.assegnato) opPrima.add(key);
    }
  }
  // La mappa conta le conversazioni dal loro primo messaggio della settimana.
  for (const ts of primoDellaChat.values()) {
    const [g, f] = giornoFascia(new Date(ts), tz);
    mappa[g][f]++;
  }
  const max = Math.max(0, ...mappa.flat());
  return {
    conversazioni: chatOra.size,
    conversazioniPrima: chatPrima.size,
    messaggi,
    messaggiPrima,
    conOperatore: opOra.size,
    conOperatorePrima: opPrima.size,
    mappa,
    max,
  };
}

/** Variazione in percentuale, arrotondata; null se prima non c'era niente. */
export function variazione(ora: number, prima: number): number | null {
  if (!prima) return null;
  return Math.round(((ora - prima) / prima) * 100);
}
