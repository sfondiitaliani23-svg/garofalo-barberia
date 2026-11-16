// Numeri della dashboard che salgono da 0 (16/11/2026). Calcoli puri, testati in tests/count-up.test.mjs.

export type NumeroInTesto = { prima: string; valore: number; decimali: number; dopo: string };

/** Trova il primo numero in un testo formattato all'italiana ("1.284", "12,50 €", "3,4%", "€ 1.200"). */
export function leggiNumero(testo: string): NumeroInTesto | null {
  const m = /^(\D*?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?([\s\S]*)$/.exec(testo);
  if (!m) return null;
  const intero = m[2].replace(/\./g, '');
  const dec = m[3] ?? '';
  const valore = Number(dec ? `${intero}.${dec}` : intero);
  if (!Number.isFinite(valore)) return null;
  return { prima: m[1], valore, decimali: dec.length, dopo: m[4] };
}

/** Testo a metà animazione: k va da 0 a 1, con frenata finale. A k = 1 torna il testo originale. */
export function testoAlPasso(testo: string, n: NumeroInTesto, k: number): string {
  if (k >= 1) return testo;
  const t = Math.max(0, k);
  const v = n.valore * (1 - Math.pow(1 - t, 3));
  const f = new Intl.NumberFormat('it-IT', { minimumFractionDigits: n.decimali, maximumFractionDigits: n.decimali, useGrouping: true });
  return `${n.prima}${f.format(v)}${n.dopo}`;
}
