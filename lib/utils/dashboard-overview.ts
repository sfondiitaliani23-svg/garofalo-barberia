/** Tipi e calcoli della dashboard admin (puri: girano nel browser al cambio periodo). */

/** [inizio ms, stato 0 confermato 1 completato 2 annullato 3 non presentato, importo netto cent, servizio, barbiere, cliente] */
export type OverviewApt = [number, 0 | 1 | 2 | 3, number, number, number, number];

export type OverviewData = {
  now: string;
  services: { id: string; name: string; category: string; price: number; minutes: number }[];
  barbers: { id: string; name: string; image: string | null; active: boolean }[];
  apts: OverviewApt[];
  customers: number[];
  recent: { id: string; name: string; service: string; barber: string; amount: number; status: string; startsAt: string; createdAt: string }[];
  unread: number;
};

export type RangeId = 'oggi' | '7g' | '30g' | 'mese' | 'anno';

export const RANGES: { id: RangeId; label: string }[] = [
  { id: 'oggi', label: 'Oggi' },
  { id: '7g', label: 'Ultimi 7 giorni' },
  { id: '30g', label: 'Ultimi 30 giorni' },
  { id: 'mese', label: 'Questo mese' },
  { id: 'anno', label: "Quest'anno" },
];

const fmtKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
/** Giorno di Roma "AAAA-MM-GG" */
export const romeKey = (ms: number) => fmtKey.format(new Date(ms));

/** Sposta una chiave giorno di n giorni (calcolo in UTC a mezzogiorno: niente problemi di ora legale). */
export function shiftKey(key: string, days: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

export type Window = { from: string; to: string };

export function rangeWindows(range: RangeId, today: string): { cur: Window; prev: Window; prevLabel: string } {
  if (range === 'oggi') return { cur: { from: today, to: today }, prev: { from: shiftKey(today, -1), to: shiftKey(today, -1) }, prevLabel: 'vs ieri' };
  if (range === '7g' || range === '30g') {
    const n = range === '7g' ? 7 : 30;
    const from = shiftKey(today, -(n - 1));
    return { cur: { from, to: today }, prev: { from: shiftKey(from, -n), to: shiftKey(from, -1) }, prevLabel: `vs ${n} gg prima` };
  }
  if (range === 'mese') {
    const from = `${today.slice(0, 8)}01`;
    const [y, m] = today.split('-').map(Number);
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    const pFrom = `${py}-${String(pm).padStart(2, '0')}-01`;
    const lastDayPrev = new Date(Date.UTC(py, pm, 0)).getUTCDate();
    const pTo = `${py}-${String(pm).padStart(2, '0')}-${String(Math.min(Number(today.slice(8)), lastDayPrev)).padStart(2, '0')}`;
    return { cur: { from, to: today }, prev: { from: pFrom, to: pTo }, prevLabel: 'vs mese scorso' };
  }
  const y = Number(today.slice(0, 4));
  return {
    cur: { from: `${y}-01-01`, to: today },
    prev: { from: `${y - 1}-01-01`, to: `${y - 1}${today.slice(4)}` },
    prevLabel: 'vs anno scorso',
  };
}

const inWin = (k: string, w: Window) => k >= w.from && k <= w.to;
const isDone = (s: number) => s === 0 || s === 1;

export function pct(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

/** Valori per giorno della finestra, raggruppati in massimo `max` punti. */
function series(keys: string[], w: Window, value: (i: number) => number, max = 24) {
  const n = daysBetween(w.from, w.to) + 1;
  const daily = new Array(Math.max(1, n)).fill(0);
  keys.forEach((k, i) => {
    if (inWin(k, w)) daily[daysBetween(w.from, k)] += value(i);
  });
  if (daily.length <= max) return daily;
  const size = Math.ceil(daily.length / max);
  const out: number[] = [];
  for (let i = 0; i < daily.length; i += size) out.push(daily.slice(i, i + size).reduce((a, b) => a + b, 0));
  return out;
}

export type Kpi = { value: number; prev: number; change: number | null; spark: number[] };

export function computeOverview(data: OverviewData, range: RangeId, visitsHistory: number[] = []) {
  const today = romeKey(Date.parse(data.now));
  const { cur, prev, prevLabel } = rangeWindows(range, today);
  const keys = data.apts.map((a) => romeKey(a[0]));
  const custKeys = data.customers.map((c) => romeKey(c));
  // Per la linea dei grafici nel periodo "oggi" mostriamo gli ultimi 7 giorni
  const sparkWin: Window = range === 'oggi' ? { from: shiftKey(today, -6), to: today } : cur;

  const agg = (w: Window) => {
    let revenue = 0, count = 0, lost = 0, total = 0;
    data.apts.forEach((a, i) => {
      if (!inWin(keys[i], w)) return;
      total++;
      if (isDone(a[1])) {
        revenue += a[2];
        count++;
      } else lost++;
    });
    return { revenue, count, lost, total, avg: count ? revenue / count : 0, lostRate: total ? (lost / total) * 100 : 0 };
  };
  const a = agg(cur);
  const b = agg(prev);
  const newCust = custKeys.filter((k) => inWin(k, cur)).length;
  const newCustPrev = custKeys.filter((k) => inWin(k, prev)).length;

  // Visite: abbiamo lo storico degli ultimi 60 giorni (ultimo valore = oggi)
  const vh = visitsHistory;
  const visitsIn = (w: Window) => {
    let s = 0;
    vh.forEach((v, i) => {
      const k = shiftKey(today, -(vh.length - 1 - i));
      if (inWin(k, w)) s += v;
    });
    return s;
  };
  const visitWin = range === 'anno' ? { from: shiftKey(today, -29), to: today } : cur;
  const visitPrevWin = range === 'anno' ? { from: shiftKey(today, -59), to: shiftKey(today, -30) } : prev;
  const visitSpark = vh.slice(-Math.min(vh.length, Math.max(7, daysBetween(sparkWin.from, sparkWin.to) + 1)));

  const done = (i: number) => isDone(data.apts[i][1]);
  const kpis = {
    revenue: { value: a.revenue, prev: b.revenue, change: pct(a.revenue, b.revenue), spark: series(keys, sparkWin, (i) => (done(i) ? data.apts[i][2] : 0)) },
    appointments: { value: a.count, prev: b.count, change: pct(a.count, b.count), spark: series(keys, sparkWin, (i) => (done(i) ? 1 : 0)) },
    avgTicket: { value: a.avg, prev: b.avg, change: pct(a.avg, b.avg), spark: series(keys, sparkWin, (i) => (done(i) ? data.apts[i][2] : 0)) },
    newCustomers: { value: newCust, prev: newCustPrev, change: pct(newCust, newCustPrev), spark: series(custKeys, sparkWin, () => 1) },
    visits: { value: visitsIn(visitWin), prev: visitsIn(visitPrevWin), change: pct(visitsIn(visitWin), visitsIn(visitPrevWin)), spark: visitSpark },
    lostRate: { value: a.lostRate, prev: b.lostRate, change: pct(a.lostRate, b.lostRate), spark: series(keys, sparkWin, (i) => (done(i) ? 0 : 1)) },
  } satisfies Record<string, Kpi>;

  // Per servizio
  const bySvc = data.services.map((s) => ({ ...s, revenue: 0, count: 0, prevRevenue: 0 }));
  // Per barbiere
  const byBarber = data.barbers.map((bb) => ({ ...bb, revenue: 0, count: 0, lost: 0, total: 0, minutes: 0, prevRevenue: 0, customers: new Set<number>() }));
  // Per categoria
  const byCat = new Map<string, number>();
  data.apts.forEach((ap, i) => {
    const k = keys[i];
    const [, st, net, si, bi, ci] = ap;
    if (inWin(k, cur)) {
      const br = byBarber[bi];
      br.total++;
      if (isDone(st)) {
        bySvc[si].revenue += net;
        bySvc[si].count++;
        br.revenue += net;
        br.count++;
        br.minutes += data.services[si].minutes;
        if (ci >= 0) br.customers.add(ci);
        const cat = data.services[si].category;
        byCat.set(cat, (byCat.get(cat) ?? 0) + net);
      } else br.lost++;
    } else if (inWin(k, prev) && isDone(st)) {
      bySvc[si].prevRevenue += net;
      byBarber[bi].prevRevenue += net;
    }
  });

  const topServices = bySvc
    .filter((s) => s.count > 0)
    .sort((x, y) => y.revenue - x.revenue)
    .slice(0, 5)
    .map((s) => ({ name: s.name, revenue: s.revenue, count: s.count, change: pct(s.revenue, s.prevRevenue) }));

  const barbers = byBarber
    .map((bb, bIndex) => ({
      keep: bb.active || bb.total > 0,
      id: bb.id,
      name: bb.name,
      image: bb.image,
      revenue: bb.revenue,
      count: bb.count,
      avg: bb.count ? bb.revenue / bb.count : 0,
      hours: bb.minutes / 60,
      lostRate: bb.total ? (bb.lost / bb.total) * 100 : 0,
      customers: bb.customers.size,
      change: pct(bb.revenue, bb.prevRevenue),
      spark: series(keys, sparkWin, (i) => (data.apts[i][4] === bIndex && done(i) ? 1 : 0), 14),
    }))
    .filter((bb) => bb.keep)
    .sort((x, y) => y.revenue - x.revenue);

  const CAT_LABEL: Record<string, string> = { taglio: 'Taglio', barba: 'Barba', styling: 'Styling', baby: 'Bimbo' };
  const catTotal = [...byCat.values()].reduce((s, v) => s + v, 0);
  const categories = ['taglio', 'barba', 'styling', 'baby']
    .map((c) => ({ id: c, label: CAT_LABEL[c] ?? c, value: byCat.get(c) ?? 0, share: catTotal ? ((byCat.get(c) ?? 0) / catTotal) * 100 : 0 }))
    .filter((c) => c.value > 0 || catTotal === 0);

  return { today, cur, prev, prevLabel, kpis, topServices, barbers, categories, catTotal };
}

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

/** Incassi per mese: quest'anno contro l'anno scorso. */
export function monthlyComparison(data: OverviewData) {
  const today = romeKey(Date.parse(data.now));
  const y = Number(today.slice(0, 4));
  const curM = Number(today.slice(5, 7));
  const rows = MONTHS.map((m, i) => ({ label: m, thisYear: 0, lastYear: 0, future: i + 1 > curM }));
  data.apts.forEach((a) => {
    if (!isDone(a[1])) return;
    const k = romeKey(a[0]);
    const yy = Number(k.slice(0, 4));
    const mm = Number(k.slice(5, 7)) - 1;
    if (yy === y && k <= today) rows[mm].thisYear += a[2];
    else if (yy === y - 1) rows[mm].lastYear += a[2];
  });
  return rows.map((r) => ({ ...r, thisYear: r.future ? null : r.thisYear / 100, lastYear: r.lastYear / 100 }));
}

/** Incassi per settimana: ultime 12 settimane contro le stesse dell'anno scorso. */
export function weeklyComparison(data: OverviewData) {
  const today = romeKey(Date.parse(data.now));
  const out: { label: string; thisYear: number | null; lastYear: number }[] = [];
  const start = shiftKey(today, -(12 * 7 - 1));
  for (let w = 0; w < 12; w++) {
    const from = shiftKey(start, w * 7);
    out.push({ label: `${Number(from.slice(8))}/${Number(from.slice(5, 7))}`, thisYear: 0, lastYear: 0 });
  }
  data.apts.forEach((a) => {
    if (!isDone(a[1])) return;
    const k = romeKey(a[0]);
    const d = daysBetween(start, k);
    if (d >= 0 && k <= today) {
      const w = Math.floor(d / 7);
      if (w < 12) out[w].thisYear = (out[w].thisYear ?? 0) + a[2] / 100;
    }
    const dLast = daysBetween(shiftKey(start, -364), k);
    if (dLast >= 0 && dLast < 84) out[Math.floor(dLast / 7)].lastYear += a[2] / 100;
  });
  return out;
}
