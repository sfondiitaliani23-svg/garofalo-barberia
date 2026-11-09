// Addestramento dell'area Eliseo usato davvero dalla chat del sito (09/11/2026).
// Prima la chat usava solo le FAQ fisse del codice: prompt, FAQ e file inseriti in /admin/eliseo non arrivavano all'IA.
// Qui solo calcoli puri: quali pezzi mettere nel prompt, entro un limite di caratteri (piano gratuito di Groq).

export type TrainingFaq = { cartella?: string; domanda: string; parole?: string; risposta: string };
export type TrainingDoc = { titolo: string; testo: string };
export type TrainingPrompt = { titolo: string; testo: string; attivo: boolean };

export type EliseoTraining = {
  istruzioni: string;
  prompts: TrainingPrompt[];
  faq: TrainingFaq[];
  documenti: TrainingDoc[];
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');

const STOP = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'e', 'o',
  'che', 'chi', 'come', 'cosa', 'quando', 'dove', 'quanto', 'quanti', 'mi', 'ti', 'si', 'ci', 'vi', 'non', 'del', 'della',
  'dei', 'delle', 'al', 'alla', 'ai', 'alle', 'nel', 'nella', 'sono', 'sei', 'ho', 'hai', 'ha', 'avete', 'fate', 'posso',
  'vorrei', 'ciao', 'salve', 'buongiorno', 'buonasera', 'grazie', 'the', 'and', 'you', 'what', 'how', 'is', 'are', 'do',
]);

export function parole(s: string): string[] {
  return Array.from(new Set(norm(s).split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w))));
}

/** Punteggio di somiglianza molto semplice: quante parole del messaggio compaiono nel testo (anche come inizio di parola). */
export function punteggio(messaggio: string, testo: string): number {
  const m = parole(messaggio);
  if (!m.length) return 0;
  const t = ` ${norm(testo)} `;
  let p = 0;
  for (const w of m) {
    if (t.includes(` ${w} `)) p += 2;
    else if (w.length >= 5 && t.includes(` ${w.slice(0, w.length - 2)}`)) p += 1;
  }
  return p;
}

/**
 * Costruisce il blocco di addestramento per il prompt di sistema.
 * - Istruzioni e prompt aggiuntivi attivi del negozio (fino a `maxIstruzioni` caratteri).
 * - FAQ: prima quelle più vicine al messaggio, poi le altre, finché c'è spazio.
 * - File: solo quelli che c'entrano col messaggio, tagliati al pezzo più utile.
 */
export function buildTrainingBlock(t: EliseoTraining, messaggio: string, maxChars = 7000): string {
  const out: string[] = [];
  let spazio = maxChars;
  const push = (s: string) => {
    if (spazio <= 0) return false;
    const cut = s.length > spazio ? `${s.slice(0, Math.max(0, spazio - 1))}…` : s;
    out.push(cut);
    spazio -= cut.length + 1;
    return true;
  };

  const istr = [t.istruzioni.trim(), ...t.prompts.filter((p) => p.attivo && p.testo.trim()).map((p) => `[${p.titolo}]\n${p.testo.trim()}`)]
    .filter(Boolean)
    .join('\n\n');
  if (istr) {
    push('ISTRUZIONI DEL NEGOZIO (scritte dal titolare; seguile, ma le REGOLE IMPORTANTI sopra valgono sempre):');
    push(istr.slice(0, Math.floor(maxChars * 0.45)));
  }

  const faq = t.faq
    .map((f) => ({ f, p: punteggio(messaggio, `${f.domanda} ${f.parole || ''} ${f.risposta}`) }))
    .sort((a, b) => b.p - a.p);
  if (faq.length) {
    push('DOMANDE FREQUENTI DEL NEGOZIO:');
    for (const { f } of faq) if (!push(`- D: ${f.domanda} R: ${f.risposta}`)) break;
  }

  const docs = t.documenti
    .map((d) => ({ d, p: punteggio(messaggio, `${d.titolo} ${d.titolo} ${d.testo}`) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p)
    .slice(0, 2);
  for (const { d } of docs) {
    if (spazio < 200) break;
    push(`FILE «${d.titolo}» (estratto):`);
    push(estratto(d.testo, messaggio, Math.min(2500, spazio - 20)));
  }
  return out.join('\n');
}

/** La parte del testo più vicina al messaggio, lunga al massimo `max` caratteri. */
export function estratto(testo: string, messaggio: string, max: number): string {
  if (testo.length <= max) return testo;
  const pezzi = testo.split(/\n{2,}|(?<=\.)\s+(?=[A-ZÀ-Ú])/).filter((p) => p.trim());
  const scored = pezzi.map((p, i) => ({ p, i, s: punteggio(messaggio, p) }));
  const scelti = new Set<number>();
  let len = 0;
  for (const x of [...scored].sort((a, b) => b.s - a.s || a.i - b.i)) {
    if (len + x.p.length + 1 > max) continue;
    scelti.add(x.i);
    len += x.p.length + 1;
  }
  return scored
    .filter((x) => scelti.has(x.i))
    .map((x) => x.p.trim())
    .join('\n');
}
