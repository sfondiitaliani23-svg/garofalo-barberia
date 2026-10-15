/**
 * Supabase restituisce al massimo 1000 righe per richiesta. Chi legge di più riceve in silenzio solo le prime 1000
 * e i conteggi risultano sbagliati (es. «Visite al sito: 0»). Qui si conta prima e poi si leggono tutte le pagine insieme.
 */
export async function fetchAllRows<T>(
  count: () => PromiseLike<{ count: number | null }>,
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  maxPages = 60
): Promise<T[]> {
  const { count: total } = await count();
  const pages = Math.min(maxPages, Math.max(1, Math.ceil((total ?? 0) / 1000)));
  const chunks = await Promise.all(Array.from({ length: pages }, (_, i) => page(i * 1000, i * 1000 + 999)));
  const rows: T[] = [];
  for (const c of chunks) {
    if (c.error || !c.data) continue;
    rows.push(...c.data);
  }
  return rows;
}
