import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { JOURNAL, type JournalArticle } from '@/lib/data/journal';

/**
 * Articoli del Journal: quelli di base (nel codice) + quelli scritti dall'admin
 * (site_content con chiave "journal:<slug>", privati per il database, letti qui dal server).
 * Un articolo dell'admin con lo stesso indirizzo sostituisce quello di base.
 */
export type StoredArticle = JournalArticle & { published: boolean; text?: string; source: 'base' | 'admin' };

export async function readAdminArticles(): Promise<StoredArticle[]> {
  const supabase = await createServiceClient();
  if (!supabase) return [];
  const { data } = await supabase.from('site_content').select('key, body').like('key', 'journal:%').limit(500);
  const out: StoredArticle[] = [];
  for (const row of data ?? []) {
    try {
      const a = JSON.parse(row.body ?? '{}');
      out.push({ ...a, slug: (row.key as string).slice('journal:'.length), source: 'admin' });
    } catch {
      /* riga non valida */
    }
  }
  return out;
}

const cachedAdmin = unstable_cache(readAdminArticles, ['journal-admin-articles'], { revalidate: 300, tags: ['journal'] });

/** Tutti gli articoli (base + admin), con o senza bozze. */
export async function getAllArticles(opts: { includeDrafts?: boolean; fresh?: boolean } = {}): Promise<StoredArticle[]> {
  const admin = await (opts.fresh ? readAdminArticles() : cachedAdmin()).catch(() => [] as StoredArticle[]);
  const bySlug = new Map<string, StoredArticle>();
  for (const a of JOURNAL) bySlug.set(a.slug, { ...a, published: true, source: 'base' });
  for (const a of admin) bySlug.set(a.slug, a);
  return [...bySlug.values()]
    .filter((a) => opts.includeDrafts || a.published)
    .sort((x, y) => y.date.localeCompare(x.date));
}

export async function getArticleBySlug(slug: string) {
  return (await getAllArticles()).find((a) => a.slug === slug) ?? null;
}

export type AdminArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string;
  image: string;
  imageAlt: string;
  text: string;
  published: boolean;
  source: 'base' | 'admin';
};
