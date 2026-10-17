// Comprende una frase detta (o scritta) per la prenotazione istantanea.
// Esempio: "Mario Rossi tre due zero uno due tre quattro cinque sei sette domani alle tre e mezza con Vittorio taglio e barba".
// Il file non usa librerie: gira nel browser e nei test.

export interface VoiceBarber { id: string; name: string }
export interface VoiceService { id: string; name: string }

export interface VoiceBookingResult {
  customerName: string;
  customerPhone: string;
  /** AAAA-MM-GG oppure '' se la data non è stata detta. */
  dateStr: string;
  /** HH:MM oppure '' se l'orario non è stato detto. */
  timeStr: string;
  barberId: string;
  serviceIds: string[];
  isRecurring: boolean;
  recurrenceWeeks: number;
  /** Quanti campi sono stati riconosciuti (serve a scegliere la migliore tra più ascolti). */
  score: number;
}

const RECURRENCE_OPTIONS = [2, 4, 6, 8, 12];

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const WEEKDAYS: Record<string, number> = { domenica: 0, lunedi: 1, martedi: 2, mercoledi: 3, giovedi: 4, venerdi: 5, sabato: 6 };

const UNITS: Record<string, number> = {
  zero: 0, uno: 1, una: 1, un: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9,
  dieci: 10, undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15, sedici: 16, diciassette: 17,
  diciotto: 18, diciannove: 19, venti: 20, trenta: 30, quaranta: 40, cinquanta: 50, sessanta: 60,
  primo: 1,
};
// ventuno, ventitre, ventotto, trentuno... (con o senza accento: "ventitré" diventa "ventitre")
for (const [stem, base] of [['vent', 20], ['trent', 30], ['quarant', 40], ['cinquant', 50]] as const) {
  for (const [word, n] of [['uno', 1], ['due', 2], ['tre', 3], ['quattro', 4], ['cinque', 5], ['sei', 6], ['sette', 7], ['otto', 8], ['nove', 9]] as const) {
    UNITS[stem + (word === 'uno' || word === 'otto' ? '' : 'i') + word] = base + n;
  }
}
const DIGIT_WORDS: Record<string, string> = { zero: '0', uno: '1', due: '2', tre: '3', quattro: '4', cinque: '5', sei: '6', sette: '7', otto: '8', nove: '9' };

const STOP = new Set((
  'prenota prenotare prenotami prenotazione fissa fissare segna segnare metti mettere aggiungi inserisci appuntamento ' +
  'vorrei voglio nuovo nuova cliente nome a ad di del dello della dei delle degli il lo la le l i gli un una uno per con da dal dalla ' +
  'e ed ha mi si in su tra fra alle alla ore ora oggi domani dopodomani mattina mattino pomeriggio sera notte punto prossimo prossima ' +
  'questo questa settimana settimane mese mesi giorno giorni volta volte ogni tutte tutti ricorrente ripeti ripetere ripetuta settimanale ' +
  'barbiere servizio servizi telefono numero cellulare signor signore sig signora favore grazie ciao buongiorno anche poi piu quindi che ' +
  'sara viene vuole deve verra mezza mezzo quarto meno mezzogiorno taglio barba shampoo acconciatura baby bambino lama rasata rasoio ' +
  'forbici modellata panno caldo colore tinta piega sopracciglia massaggio abbonamento'
).split(' '));

function norm(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}

function lev(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function sameWord(heard: string, wanted: string): boolean {
  if (heard === wanted) return true;
  if (wanted.length < 5) return false;
  return lev(heard, wanted) <= (wanted.length >= 8 ? 2 : 1);
}

export function parseBookingSpeech(
  input: string,
  barbers: VoiceBarber[] = [],
  services: VoiceService[] = [],
  now: Date = new Date(),
): VoiceBookingResult {
  const today = startOfDay(now);
  const text = input
    .replace(/\b(all|dell|nell|sull|dall|un)['’]/gi, (_m, w: string) => (w.toLowerCase() === 'un' ? 'un ' : `${w.toLowerCase().replace(/ll$/, 'lle')} `))
    .replace(/[,;!?()"“”]+/g, ' ')
    .replace(/\s+\+\s*/g, ' più ')
    .trim();
  const rawTokens = text.split(/\s+/).filter(Boolean);
  const t = rawTokens.map(norm);
  const used: boolean[] = t.map((x) => x === '');
  const n = t.length;
  const use = (from: number, to: number = from) => { for (let k = from; k <= to; k++) used[k] = true; };
  const isMonth = (s: string | undefined) => !!s && MONTHS.includes(s);

  /** Numero (cifre o parole) in posizione i: { value, len } */
  const numAt = (i: number, allowTens = true): { value: number; len: number } | null => {
    const s = t[i];
    if (s === undefined) return null;
    if (/^\d{1,4}$/.test(s)) return { value: parseInt(s, 10), len: 1 };
    const u = UNITS[s];
    if (u === undefined) return null;
    if (allowTens && u >= 20 && u % 10 === 0) {
      const nx = UNITS[t[i + 1] ?? ''];
      if (nx !== undefined && nx >= 1 && nx <= 9 && !/^\d/.test(t[i + 1])) return { value: u + nx, len: 2 };
    }
    return { value: u, len: 1 };
  };

  // ── Telefono: cifre dette una per una, a gruppi o tutte insieme ──────────────
  let customerPhone = '';
  for (let i = 0; i < n && !customerPhone; i++) {
    let digits = '';
    let j = i;
    while (j < n) {
      const s = t[j];
      if (/^\d{1,13}$/.test(s) && !rawTokens[j].includes('/')) digits += s;
      else if (DIGIT_WORDS[s] !== undefined) digits += DIGIT_WORDS[s];
      else if (s === 'piu' && j === i) { /* prefisso +39 */ }
      else break;
      j++;
    }
    if (j > i && digits.length >= 9 && digits.length <= 13) {
      customerPhone = digits.length > 10 && digits.startsWith('39') ? digits.slice(2) : digits;
      use(i, j - 1);
      if (i > 0 && ['telefono', 'numero', 'cellulare'].includes(t[i - 1])) use(i - 1);
    } else if (j > i) {
      i = j - 1;
    }
  }

  // ── Ricorrenza ───────────────────────────────────────────────────────────────
  let isRecurring = false;
  let recurrenceWeeks = 4;
  for (let i = 0; i < n; i++) {
    const s = t[i];
    const nx = t[i + 1];
    if (['ricorrente', 'ripeti', 'ripetere', 'ripetuta', 'settimanale', 'ricorrenza'].includes(s)) { isRecurring = true; use(i); }
    else if ((s === 'ogni' && nx === 'settimana') || (s === 'tutte' && nx === 'le' && t[i + 2] === 'settimane')) { isRecurring = true; use(i, i + (s === 'ogni' ? 1 : 2)); }
    else if (s === 'ogni' && nx !== undefined && WEEKDAYS[nx] !== undefined) { isRecurring = true; use(i); }
    else if (s === 'per' || s === 'x') {
      const num = numAt(i + 1);
      const unit = t[i + 1 + (num?.len ?? 0)];
      if (num && ['settimane', 'settimana', 'volte', 'mesi', 'mese'].includes(unit ?? '')) {
        isRecurring = true;
        recurrenceWeeks = (unit ?? '').startsWith('mes') ? num.value * 4 : num.value;
        use(i, i + 1 + num.len);
      }
    } else if (s === 'per' || s === 'un') {
      /* gestito sopra */
    }
    if (s === 'per' && t[i + 1] === 'un' && t[i + 2] === 'mese') { isRecurring = true; recurrenceWeeks = 4; use(i, i + 2); }
  }
  if (isRecurring) {
    recurrenceWeeks = RECURRENCE_OPTIONS.reduce((best, o) => (Math.abs(o - recurrenceWeeks) < Math.abs(best - recurrenceWeeks) ? o : best), 4);
  }

  // ── Orario ───────────────────────────────────────────────────────────────────
  let timeStr = '';
  const dayPart = (from: number): 'am' | 'pm' | '' => {
    for (let k = from; k < Math.min(n, from + 3); k++) {
      if (['mattina', 'mattino'].includes(t[k])) { use(k); return 'am'; }
      if (['pomeriggio', 'sera', 'notte'].includes(t[k])) { use(k); return 'pm'; }
    }
    return '';
  };
  const finishTime = (hh: number, mm: number, from: number, hadCue: boolean) => {
    const part = dayPart(from);
    let h = hh;
    if (part === 'pm' && h < 12) h += 12;
    else if (!part && hadCue && h >= 1 && h <= 7) h += 12; // "alle tre" = 15:00 (la barberia è aperta di giorno)
    if (h > 23 || mm > 59) return false;
    timeStr = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    return true;
  };

  for (let i = 0; i < n && !timeStr; i++) {
    const m = /^(\d{1,2})[:.](\d{2})$/.exec(rawTokens[i].replace(/[^\d:.]/g, ''));
    if (m && +m[1] < 24 && +m[2] < 60) {
      use(i);
      if (finishTime(+m[1], +m[2], i + 1, false)) break;
    }
  }
  for (let i = 0; i < n && !timeStr; i++) {
    if (used[i]) continue;
    if (t[i] === 'mezzogiorno') {
      let mm = 0;
      let end = i;
      if (t[i + 1] === 'e' && ['mezza', 'mezzo'].includes(t[i + 2])) { mm = 30; end = i + 2; }
      timeStr = `12:${String(mm).padStart(2, '0')}`;
      use(i, end);
      break;
    }
    if (!['alle', 'ore', 'le', 'verso'].includes(t[i])) continue;
    let k = i + 1;
    if (t[k] === 'ore' || t[k] === 'le') k++;
    if (t[k] === 'mezzogiorno') { timeStr = '12:00'; use(i, k); break; }
    const hn = numAt(k, false);
    if (!hn || hn.value > 24) continue;
    let h = hn.value;
    let mm = 0;
    let end = k + hn.len - 1;
    const a = t[end + 1];
    const b = t[end + 2];
    if (a === 'e') {
      if (b === 'mezza' || b === 'mezzo') { mm = 30; end += 2; }
      else if (b === 'un' && t[end + 3] === 'quarto') { mm = 15; end += 3; }
      else if (b === 'quarto') { mm = 15; end += 2; }
      else { const mn = numAt(end + 2); if (mn && mn.value < 60) { mm = mn.value; end += 1 + mn.len; } }
    } else if (a === 'meno') {
      if (b === 'un' && t[end + 3] === 'quarto') { mm = 45; h -= 1; end += 3; }
      else if (b === 'quarto') { mm = 45; h -= 1; end += 2; }
      else { const mn = numAt(end + 2); if (mn && mn.value < 60) { mm = 60 - mn.value; h -= 1; end += 1 + mn.len; } }
    } else if (a === 'in' && b === 'punto') {
      end += 2;
    } else if (a && !isMonth(t[end + 2])) {
      const mn = numAt(end + 1);
      if (mn && mn.value < 60 && (/^\d{2}$/.test(t[end + 1]) || mn.value === 0 || mn.value >= 10) && !isMonth(t[end + 1 + mn.len])) { mm = mn.value; end += mn.len; }
    }
    use(i, end);
    if (finishTime(h, mm, end + 1, true)) break;
  }

  // ── Data ─────────────────────────────────────────────────────────────────────
  let dateStr = '';
  const setDate = (d: Date) => { dateStr = fmtDate(d); };

  // 1. giorno + mese (anche a parole): "17 ottobre", "primo novembre 2026"
  for (let i = 0; i < n && !dateStr; i++) {
    if (used[i]) continue;
    const dn = numAt(i);
    if (!dn || dn.value < 1 || dn.value > 31) continue;
    const mi = MONTHS.indexOf(t[i + dn.len] ?? '');
    if (mi < 0) continue;
    let end = i + dn.len;
    let year = today.getFullYear();
    let explicitYear = false;
    const yn = t[end + 1];
    if (yn && /^\d{4}$/.test(yn)) { year = +yn; explicitYear = true; end += 1; }
    else if (yn === 'duemilaventisei') { year = 2026; explicitYear = true; end += 1; }
    let d = new Date(year, mi, dn.value);
    if (!explicitYear && d < today) d = new Date(year + 1, mi, dn.value);
    setDate(d);
    use(i, end);
    if (i > 0 && ['il', 'del', 'di', 'per', 'entro'].includes(t[i - 1])) use(i - 1);
  }
  // 2. numerica: 17/10, 17-10-2026
  for (let i = 0; i < n && !dateStr; i++) {
    const m = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/.exec(rawTokens[i]);
    if (!m) continue;
    const day = +m[1];
    const mon = +m[2];
    if (day < 1 || day > 31 || mon < 1 || mon > 12) continue;
    const explicit = !!m[3];
    let year = explicit ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : today.getFullYear();
    let d = new Date(year, mon - 1, day);
    if (!explicit && d < today) d = new Date(year + 1, mon - 1, day);
    setDate(d);
    use(i);
  }
  // 3. parole relative
  for (let i = 0; i < n && !dateStr; i++) {
    if (used[i]) continue;
    const s = t[i];
    if (s === 'oggi') { setDate(today); use(i); }
    else if (s === 'dopodomani' || (s === 'dopo' && t[i + 1] === 'domani')) { setDate(addDays(today, 2)); use(i, s === 'dopo' ? i + 1 : i); }
    else if (s === 'domani') { setDate(addDays(today, 1)); use(i); }
    else if ((s === 'tra' || s === 'fra') && t[i + 1] !== undefined) {
      const num = numAt(i + 1);
      const unit = t[i + 1 + (num?.len ?? 0)];
      const count = num?.value ?? (t[i + 1] === 'un' || t[i + 1] === 'una' ? 1 : 0);
      const ulen = num ? num.len : 1;
      const un = num ? unit : t[i + 2];
      if (count > 0 && un) {
        if (un.startsWith('giorn')) { setDate(addDays(today, count)); use(i, i + ulen + 1); }
        else if (un.startsWith('settiman')) { setDate(addDays(today, 7 * count)); use(i, i + ulen + 1); }
      }
    }
  }
  // 4. giorno della settimana
  if (!dateStr) {
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const dow = WEEKDAYS[t[i]];
      if (dow === undefined) continue;
      let ahead = (dow - today.getDay() + 7) % 7;
      if (ahead === 0) ahead = 7;
      const nextWeek = (t[i + 1] === 'prossima' && t[i + 2] === 'settimana') || (t[i - 1] === 'settimana' && t[i - 2] === 'prossima');
      if (nextWeek && ahead < 7 && dow !== 0) {
        const monday = addDays(today, ((8 - today.getDay()) % 7) || 7);
        ahead = Math.round((addDays(monday, (dow + 6) % 7).getTime() - today.getTime()) / 86400000);
      }
      setDate(addDays(today, ahead));
      use(i);
      let k = i + 1;
      if (['prossimo', 'prossima', 'prossimi'].includes(t[k])) { use(k); k++; }
      if (t[k] === 'prossima' || (t[k] === 'settimana' && t[k - 1] === 'prossima')) { /* già letto */ }
      if (nextWeek) {
        for (let q = Math.max(0, i - 2); q <= Math.min(n - 1, i + 2); q++) if (t[q] === 'settimana' || t[q] === 'prossima') use(q);
      }
      if (i > 0 && ['di', 'per', 'il', 'questo', 'questa'].includes(t[i - 1])) use(i - 1);
      break;
    }
  }
  // 5. "il 20" (solo il giorno del mese)
  if (!dateStr) {
    for (let i = 0; i < n - 1; i++) {
      if (used[i] || !['il', 'del', 'per'].includes(t[i]) || used[i + 1]) continue;
      if (t[i] === 'per' && t[i + 1] !== 'il') continue;
      const k = t[i] === 'per' ? i + 2 : i + 1;
      const dn = numAt(k);
      if (!dn || dn.value < 1 || dn.value > 31) continue;
      let d = new Date(today.getFullYear(), today.getMonth(), dn.value);
      if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, dn.value);
      if (d.getDate() !== dn.value) continue;
      setDate(d);
      use(i, k + dn.len - 1);
      break;
    }
  }

  // ── Barbiere (serve una parola come "con", "da", "barbiere", oppure il nome completo) ──
  let barberId = '';
  const cues = new Set(['con', 'da', 'dal', 'barbiere', 'dal barbiere', 'insieme']);
  for (const b of barbers) {
    const parts = b.name.split(/\s+/).map(norm).filter((p) => p.length >= 3);
    if (parts.length === 0) continue;
    const first = parts[0];
    const full = parts.join(' ');
    // nome e cognome insieme
    for (let i = 0; i + parts.length - 1 < n && !barberId; i++) {
      if (parts.length > 1 && parts.every((p, k) => !used[i + k] && sameWord(t[i + k], p))) {
        barberId = b.id; use(i, i + parts.length - 1);
        if (cues.has(t[i - 1] ?? '')) use(i - 1);
      }
    }
    if (barberId) break;
    // solo nome (o solo cognome) dopo una parola-guida
    for (let i = 1; i < n && !barberId; i++) {
      if (used[i]) continue;
      const heard = t[i];
      if (!cues.has(t[i - 1]) && !(i > 1 && t[i - 2] === 'barbiere' && ['il', 'del', 'dal'].includes(t[i - 1]))) continue;
      if (parts.some((p) => sameWord(heard, p) || (p === first && sameWord(heard, full)))) {
        barberId = b.id; use(i);
        if (cues.has(t[i - 1])) use(i - 1);
      }
    }
    if (barberId) break;
  }

  // ── Servizi ──────────────────────────────────────────────────────────────────
  const SYN: Record<string, string> = { lama: 'rasata', rasoio: 'rasata', rasato: 'rasata', forbice: 'forbici', bambino: 'baby', bambini: 'baby', ragazzo: 'baby', capelli: 'taglio', capello: 'taglio', tagliare: 'taglio', piega: 'acconciatura', styling: 'acconciatura', caldo: 'panno', asciugamano: 'panno', modellare: 'modellata' };
  const canon = (w: string) => SYN[w] ?? w;
  const svcTokens = services.map((s) => ({
    s,
    words: Array.from(new Set(norm(s.name).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !['con', 'per', 'del', 'della'].includes(w)).map(canon))),
  }));
  const heardIdx = new Map<string, number[]>();
  t.forEach((w, i) => {
    if (used[i] || !w) return;
    const c = canon(w);
    if (!heardIdx.has(c)) heardIdx.set(c, []);
    heardIdx.get(c)!.push(i);
  });
  const claimed = new Set<string>();
  const serviceIds: string[] = [];
  for (;;) {
    let best: { id: string; score: number; hits: string[] } | null = null;
    for (const { s, words } of svcTokens) {
      if (serviceIds.includes(s.id) || words.length === 0) continue;
      const hits = words.filter((w) => heardIdx.has(w) && !claimed.has(w));
      if (hits.length === 0) continue;
      const score = hits.length / words.length + hits.length * 0.01;
      if (!best || score > best.score) best = { id: s.id, score, hits };
    }
    if (!best) break;
    serviceIds.push(best.id);
    best.hits.forEach((w) => { claimed.add(w); heardIdx.get(w)!.forEach((i) => use(i)); });
  }

  // ── Nome del cliente ─────────────────────────────────────────────────────────
  const free = (i: number) => !used[i] && /^[a-z']+$/.test(t[i]) && !STOP.has(t[i]) && UNITS[t[i]] === undefined;
  let customerName = '';
  let nameStart = -1;
  for (let i = 0; i < n - 1; i++) {
    if (['nome', 'cliente', 'signor', 'signore', 'sig', 'signora'].includes(t[i]) && free(i + 1)) { nameStart = i + 1; break; }
  }
  if (nameStart < 0) {
    for (let i = 0; i < n; i++) if (free(i)) { nameStart = i; break; }
  }
  if (nameStart >= 0) {
    const parts: string[] = [];
    for (let i = nameStart; i < n && free(i) && parts.length < 3; i++) {
      parts.push(rawTokens[i].replace(/^[^\p{L}]+|[^\p{L}']+$/gu, ''));
      use(i);
    }
    customerName = parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  const score = [customerName, customerPhone, dateStr, timeStr, barberId, serviceIds.length ? 'x' : '', isRecurring ? 'x' : ''].filter(Boolean).length;
  return { customerName, customerPhone, dateStr, timeStr, barberId, serviceIds, isRecurring, recurrenceWeeks, score };
}

// ── Risultati del microfono: niente ripetizioni ────────────────────────────────
// Chrome (soprattutto su telefono, con l'ascolto continuo) può restituire lo stesso pezzo più volte,
// oppure frasi che si allungano ("mario rossi", "mario rossi domani", ...). Qui si tiene una sola copia.
const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}'\s]/gu, ' ').split(/\s+/).filter(Boolean);

/** Se l'intera frase è la stessa sequenza di 2 o più parole ripetuta, tiene una sola copia. */
function collapseWholeRepeats(text: string): string {
  const raw = text.trim().split(/\s+/).filter(Boolean);
  const w = words(text);
  if (raw.length !== w.length) return text.trim();
  for (let size = 2; size <= Math.floor(raw.length / 2); size++) {
    if (raw.length % size !== 0) continue;
    const base = w.slice(0, size).join(' ');
    let same = true;
    for (let i = size; i < w.length; i += size) if (w.slice(i, i + size).join(' ') !== base) { same = false; break; }
    if (same) return raw.slice(0, size).join(' ');
  }
  return text.trim();
}

export function mergeVoiceResults(parts: string[]): string {
  const kept: string[] = [];
  for (const part of parts.map((p) => p.trim()).filter(Boolean)) {
    const pw = words(part).join(' ');
    // già detto (uguale o contenuto in un pezzo precedente): si salta
    if (kept.some((k) => words(k).join(' ').includes(pw))) continue;
    // il nuovo pezzo contiene i precedenti (frase che si allunga): sostituisce
    for (let i = kept.length - 1; i >= 0; i--) if (pw.includes(words(kept[i]).join(' '))) kept.splice(i, 1);
    kept.push(part);
  }
  return collapseWholeRepeats(kept.join(' '));
}

// ── Nome capito male: suggerimento dai clienti che già conosciamo ──────────────
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

function distance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Fino a `max` clienti già registrati con un nome molto simile a quello capito (mai una sostituzione automatica). */
export function suggestKnownNames(spoken: string, known: string[], max = 2): string[] {
  const s = fold(spoken);
  if (s.length < 3) return [];
  const exact = known.some((k) => fold(k) === s);
  if (exact) return [];
  const scored = known
    .map((k) => ({ k, d: distance(s, fold(k)), len: fold(k).length }))
    .filter(({ d, len }) => d > 0 && d <= Math.max(2, Math.floor(Math.max(len, s.length) * 0.25)))
    .sort((a, b) => a.d - b.d);
  return Array.from(new Set(scored.map((x) => x.k))).slice(0, max);
}
