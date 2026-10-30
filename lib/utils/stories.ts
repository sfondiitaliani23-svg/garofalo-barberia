/**
 * Storie (Wrapped + storie di Instagram): tipi e calcoli senza dipendenze.
 * Solo TypeScript "cancellabile": i test lo importano direttamente.
 */

export type StoryKind = 'foto' | 'video' | 'testo' | 'numero';

export type StoryRow = {
  id: string;
  kind: StoryKind;
  title: string | null;
  body: string | null;
  title_en: string | null;
  body_en: string | null;
  big_number: string | null;
  media_path: string | null;
  cta_label: string | null;
  cta_label_en: string | null;
  cta_href: string | null;
  starts_on: string;
  ends_on: string | null;
  sort_order: number;
  has_release: boolean;
  created_by: string | null;
  created_at: string;
};

/** Storia pronta per il visore (testi già nella lingua giusta). */
export type StorySlide = {
  id: string;
  kind: StoryKind;
  title: string;
  body: string;
  bigNumber: string;
  mediaUrl: string | null;
  ctaLabel: string;
  ctaHref: string | null;
  /** Durata in millisecondi (i video usano la loro durata). */
  duration: number;
  /** Istante in cui la storia è diventata visibile. Vuoto per le storie di base e il Wrapped. */
  publishedAt?: number | null;
};

export const STORY_KINDS: StoryKind[] = ['foto', 'video', 'testo', 'numero'];
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
/** Solo formato verticale 9:16 (es. 1080x1920). Tolleranza del 2% per i tagli dei telefoni. */
export const STORY_RATIO = 9 / 16;
export function isStoryRatio(width: number, height: number): boolean {
  if (!(width > 0 && height > 0)) return false;
  return Math.abs(width / height - STORY_RATIO) / STORY_RATIO <= 0.02;
}
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

/** Data di oggi a Roma, "AAAA-MM-GG". */
export function romeToday(nowMs: number = Date.now()): string {
  return new Date(nowMs).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
}

/** Una storia dura sempre 24 ore: né di più, né di meno. */
export const STORY_MS = 24 * 60 * 60 * 1000;

/** Istante UTC di un orario civile a Roma. Il giorno è AAAA-MM-GG. */
export function romeInstant(day: string, h = 0, m = 0, s = 0): number {
  const [Y, M, D] = day.split('-').map(Number);
  const want = Date.UTC(Y, M - 1, D, h, m, s);
  let utc = want;
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(fmt.formatToParts(new Date(utc)).filter((x) => x.type !== 'literal').map((x) => [x.type, x.value]));
    const hour = parts.hour === '24' ? 0 : Number(parts.hour);
    const got = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour, Number(parts.minute), Number(parts.second));
    utc -= got - want;
  }
  return utc;
}

/** Oggi parte all'istante della pubblicazione. Un giorno futuro parte a mezzanotte. */
export function storyStartMs(story: { starts_on: string; created_at: string }): number {
  const created = Date.parse(story.created_at);
  if (!Number.isFinite(created)) return NaN;
  if (story.starts_on > romeToday(created)) return romeInstant(story.starts_on);
  return created;
}

export function isLiveNow(story: { starts_on: string; created_at: string }, now = Date.now()): boolean {
  const start = storyStartMs(story);
  return Number.isFinite(start) && start <= now && now < start + STORY_MS;
}

/** Il giorno scelto copre la finestra di 24 ore? */
export function storyCoversDay(story: { starts_on: string; created_at: string }, day: string): boolean {
  const start = storyStartMs(story);
  if (!Number.isFinite(start)) return false;
  return romeToday(start) === day || romeToday(start + STORY_MS - 1) === day;
}

export function storySlot(day: string, now = Date.now()): { starts_on: string; ends_on: string; created_at: string } {
  const today = romeToday(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || day < today) {
    throw new Error('Il giorno di inizio è oggi o un giorno futuro.');
  }
  const start = day === today ? now : romeInstant(day);
  return {
    starts_on: romeToday(start),
    ends_on: romeToday(start + STORY_MS - 1),
    created_at: new Date(start).toISOString(),
  };
}

function storyAge(ms: number, now: number) {
  if (!Number.isFinite(ms) || ms > now + 5000) return null;
  const sec = Math.floor(Math.max(0, now - ms) / 1000);
  if (sec < 60) return { unit: 'now' as const, n: 0 };
  const min = Math.floor(sec / 60);
  if (min < 60) return { unit: 'm' as const, n: min };
  const ore = Math.floor(min / 60);
  if (ore < 24) return { unit: 'h' as const, n: ore };
  return { unit: 'd' as const, n: Math.floor(ore / 24) };
}

/** Quanto tempo fa, come nelle storie: «5 minuti fa», non «5 min». */
export function storyAgo(ms: number | null, now = Date.now(), en = false): string {
  if (ms == null) return '';
  const age = storyAge(ms, now);
  if (!age) return '';
  if (age.unit === 'now') return en ? 'now' : 'adesso';
  if (en) {
    if (age.unit === 'm') return `${age.n} ${age.n === 1 ? 'minute' : 'minutes'} ago`;
    if (age.unit === 'h') return `${age.n} ${age.n === 1 ? 'hour' : 'hours'} ago`;
    return `${age.n} ${age.n === 1 ? 'day' : 'days'} ago`;
  }
  if (age.unit === 'm') return `${age.n} ${age.n === 1 ? 'minuto' : 'minuti'} fa`;
  if (age.unit === 'h') return `${age.n} ${age.n === 1 ? 'ora' : 'ore'} fa`;
  return `${age.n} ${age.n === 1 ? 'giorno' : 'giorni'} fa`;
}

export function storyAgoLabel(ms: number | null, now = Date.now(), en = false): string {
  if (ms == null) return '';
  const age = storyAge(ms, now);
  if (!age) return '';
  if (age.unit === 'now') return en ? 'Published just now' : 'Pubblicata adesso';
  if (en) {
    if (age.unit === 'm') return `Published ${age.n} ${age.n === 1 ? 'minute' : 'minutes'} ago`;
    if (age.unit === 'h') return `Published ${age.n} ${age.n === 1 ? 'hour' : 'hours'} ago`;
    return `Published ${age.n} ${age.n === 1 ? 'day' : 'days'} ago`;
  }
  if (age.unit === 'm') return `Pubblicata ${age.n} ${age.n === 1 ? 'minuto' : 'minuti'} fa`;
  if (age.unit === 'h') return `Pubblicata ${age.n} ${age.n === 1 ? 'ora' : 'ore'} fa`;
  return `Pubblicata ${age.n} ${age.n === 1 ? 'giorno' : 'giorni'} fa`;
}

/** La storia è visibile nel giorno indicato? */
export function isStoryLive(story: Pick<StoryRow, 'starts_on' | 'ends_on'>, day: string): boolean {
  if (story.starts_on > day) return false;
  if (story.ends_on && story.ends_on < day) return false;
  return true;
}

/** Ordine del visore: posizione scelta dall'admin, poi la più vecchia prima. */
export function sortStories<T extends Pick<StoryRow, 'sort_order' | 'created_at'>>(list: T[]): T[] {
  return [...list].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

/** Link del pulsante: solo pagine del sito o indirizzi https. */
export function safeCtaHref(href: string | null | undefined): string | null {
  const h = String(href ?? '').trim();
  if (!h) return null;
  if (h.startsWith('/') && !h.startsWith('//')) return h;
  if (/^https:\/\/[^\s]+$/i.test(h)) return h;
  return null;
}

/** Converte una riga del database nella storia per il visore. */
export function toSlide(row: StoryRow, lang: 'it' | 'en', mediaUrl: string | null): StorySlide {
  const en = lang === 'en';
  const pick = (it: string | null, eng: string | null) => (en && eng?.trim() ? eng : it ?? '').trim();
  return {
    id: row.id,
    kind: row.kind,
    title: pick(row.title, row.title_en),
    body: pick(row.body, row.body_en),
    bigNumber: (row.big_number ?? '').trim(),
    mediaUrl,
    ctaLabel: pick(row.cta_label, row.cta_label_en),
    ctaHref: safeCtaHref(row.cta_href),
    duration: row.kind === 'testo' || row.kind === 'numero' ? 6000 : 5000,
    publishedAt: Number.isFinite(storyStartMs(row)) ? storyStartMs(row) : null,
  };
}

/** Nuovo ordine dopo lo spostamento di una storia di una posizione. */
export function moveInOrder(ids: string[], id: string, dir: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// ─── Wrapped personale ──────────────────────────────────────────────────────

export type WrappedApt = {
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  service: string | null;
  barber: string | null;
};

export type Wrapped = {
  year: number;
  visits: number;
  minutes: number;
  topService: { name: string; count: number } | null;
  topBarber: { name: string; count: number } | null;
  favoriteDay: number | null; // 0 = domenica
  firstVisit: string | null; // "AAAA-MM-GG"
  servicesTried: number;
};

const comboId = (notes: string | null) => (notes ?? '').match(/\[Combo:\s*(combo_[a-zA-Z0-9_]+)\]/)?.[1] ?? null;

function top(counts: Map<string, number>): { name: string; count: number } | null {
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) {
    if (!best || count > best.count || (count === best.count && name.localeCompare(best.name) < 0)) best = { name, count };
  }
  return best;
}

/**
 * Riassunto dell'anno del cliente: solo visite fatte (completate, o confermate e già passate).
 * Le combo di più servizi contano come una visita sola. Nessun importo.
 */
export function computeWrapped(apts: WrappedApt[], year: number, nowMs: number = Date.now()): Wrapped {
  const done = apts.filter((a) => {
    const t = Date.parse(a.starts_at);
    if (!Number.isFinite(t) || t > nowMs) return false;
    if (Number(romeToday(t).slice(0, 4)) !== year) return false;
    return a.status === 'completed' || a.status === 'confirmed';
  });
  const visitKeys = new Set<string>();
  const services = new Map<string, number>();
  const barbers = new Map<string, number>();
  const days = new Map<string, number>();
  let minutes = 0;
  let first: string | null = null;
  for (const a of done) {
    const key = comboId(a.notes) ?? `${a.starts_at}|${a.barber ?? ''}`;
    const isNewVisit = !visitKeys.has(key);
    visitKeys.add(key);
    const t = Date.parse(a.starts_at);
    minutes += Math.max(0, Math.round((Date.parse(a.ends_at) - t) / 60000));
    if (a.service) services.set(a.service, (services.get(a.service) ?? 0) + 1);
    if (isNewVisit && a.barber) barbers.set(a.barber, (barbers.get(a.barber) ?? 0) + 1);
    if (isNewVisit) {
      const wd = String(new Date(t).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Europe/Rome' }));
      days.set(wd, (days.get(wd) ?? 0) + 1);
      const d = romeToday(t);
      if (!first || d < first) first = d;
    }
  }
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const favDay = top(days);
  return {
    year,
    visits: visitKeys.size,
    minutes,
    topService: top(services),
    topBarber: top(barbers),
    favoriteDay: favDay ? WD.indexOf(favDay.name) : null,
    firstVisit: first,
    servicesTried: services.size,
  };
}

const DAYS_IT = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Durata leggibile: "3 ore e 20 minuti" / "45 minuti". */
export function humanMinutes(min: number, lang: 'it' | 'en'): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (lang === 'en') {
    const hs = h ? `${h} hour${h === 1 ? '' : 's'}` : '';
    const ms = m ? `${m} minute${m === 1 ? '' : 's'}` : '';
    return [hs, ms].filter(Boolean).join(' and ') || '0 minutes';
  }
  const hs = h ? `${h} or${h === 1 ? 'a' : 'e'}` : '';
  const ms = m ? `${m} minut${m === 1 ? 'o' : 'i'}` : '';
  return [hs, ms].filter(Boolean).join(' e ') || '0 minuti';
}

/** Le storie del Wrapped personale, pronte per il visore. */
export function wrappedSlides(w: Wrapped, firstName: string, lang: 'it' | 'en'): StorySlide[] {
  if (w.visits === 0) return [];
  const en = lang === 'en';
  const s = (id: string, title: string, bigNumber: string, body: string): StorySlide => ({
    id: `wrapped-${id}`,
    kind: 'numero',
    title,
    body,
    bigNumber,
    mediaUrl: null,
    ctaLabel: '',
    ctaHref: null,
    duration: 5500,
  });
  const name = firstName.trim();
  const out: StorySlide[] = [
    s('intro', en ? `${name ? `${name}, your` : 'Your'} ${w.year} at Garofalo` : `${name ? `${name}, il tuo` : 'Il tuo'} ${w.year} da Garofalo`, String(w.year), en ? 'A year of cuts, beards and good chats. Here it is.' : 'Un anno di tagli, barbe e chiacchiere. Eccolo qui.'),
    s('visits', en ? 'Visits this year' : 'Visite quest\'anno', String(w.visits), en ? (w.visits === 1 ? 'One visit, and we remember it well.' : 'Every one of them counted.') : (w.visits === 1 ? 'Una visita, e ce la ricordiamo bene.' : 'Ognuna è contata.')),
    s('time', en ? 'Time in the chair' : 'Tempo in poltrona', humanMinutes(w.minutes, lang), en ? 'Time well spent.' : 'Tempo speso bene.'),
  ];
  if (w.topService) out.push(s('service', en ? 'Your favourite service' : 'Il tuo servizio preferito', w.topService.name, en ? `Chosen ${w.topService.count} time${w.topService.count === 1 ? '' : 's'}.` : `Scelto ${w.topService.count} volt${w.topService.count === 1 ? 'a' : 'e'}.`));
  if (w.topBarber) out.push(s('barber', en ? 'Your barber' : 'Il tuo barbiere', w.topBarber.name.split(' ')[0], en ? `${w.topBarber.count} visit${w.topBarber.count === 1 ? '' : 's'} together.` : `${w.topBarber.count} visit${w.topBarber.count === 1 ? 'a' : 'e'} insieme.`));
  if (w.favoriteDay !== null && w.visits > 1) out.push(s('day', en ? 'Your day' : 'Il tuo giorno', (en ? DAYS_EN : DAYS_IT)[w.favoriteDay], en ? 'The day you come by most often.' : 'Il giorno in cui passi più spesso.'));
  out.push({ ...s('share', en ? 'Thank you for this year' : 'Grazie per quest\'anno', '♥', en ? 'Share your year in your stories.' : 'Condividi il tuo anno nelle storie.'), kind: 'testo', id: 'wrapped-share', duration: 8000 });
  return out;
}

/**
 * Storie di base del salone: si vedono quando il team non ne ha caricate per oggi,
 * così il cerchio «Novità» c'è sempre. Il voto compare solo con almeno 3 recensioni.
 */
export function baseSlides(lang: 'it' | 'en', ratings: number[] = []): StorySlide[] {
  const en = lang === 'en';
  const slide = (id: string, kind: StoryKind, title: string, body: string, ctaLabel: string, ctaHref: string | null, bigNumber = ''): StorySlide => ({
    id: `base-${id}`,
    kind,
    title,
    body,
    bigNumber,
    mediaUrl: null,
    ctaLabel,
    ctaHref,
    duration: 6500,
  });
  const out: StorySlide[] = [
    slide('benvenuto', 'testo', en ? 'Welcome to Barberia Garofalo' : 'Benvenuto da Barberia Garofalo', en ? 'Cuts, beards and styling for men, boys and kids in Foggia.' : 'Taglio, barba e styling per uomo, ragazzo e bimbo a Foggia.', en ? 'Book now' : 'Prenota ora', '/prenota'),
  ];
  const valid = ratings.filter((r) => Number.isFinite(r) && r >= 1 && r <= 5);
  if (valid.length >= 3) {
    const avg = Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
    out.push(slide('voto', 'numero', en ? 'Average of the latest reviews' : 'Media delle ultime recensioni', en ? 'Thank you for every word.' : 'Grazie per ogni parola.', en ? 'Read the reviews' : 'Leggi le recensioni', '/recensioni', `${String(avg).replace('.', en ? '.' : ',')} / 5`));
  }
  out.push(
    slide('prima', 'testo', en ? 'First time with us?' : 'Prima volta da noi?', en ? 'Here is what to expect, step by step.' : 'Ecco cosa ti aspetta, passo dopo passo.', en ? 'First visit' : 'Prima visita', '/prima-visita'),
    slide('wrapped', 'testo', en ? 'Your year at Garofalo' : 'Il tuo anno da Garofalo', en ? 'Sign in to see your Wrapped: visits, time in the chair, favourite service.' : 'Accedi per vedere il tuo Wrapped: visite, tempo in poltrona, servizio preferito.', en ? 'Sign in' : 'Accedi', '/login'),
  );
  return out;
}
