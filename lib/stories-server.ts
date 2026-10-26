import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { isStoryLive, romeToday, sortStories, toSlide, type StoryRow, type StorySlide } from '@/lib/utils/stories';

export const STORIES_BUCKET = 'storie';
export const STORIES_TAG = 'stories';

/** Indirizzo pubblico di un file nello spazio "storie". */
export function storyMediaUrl(path: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${STORIES_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

const loadLiveRows = unstable_cache(
  async (): Promise<StoryRow[]> => {
    try {
      const supabase = await createServiceClient();
      if (!supabase) return [];
      const today = romeToday();
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .lte('starts_on', today)
        .or(`ends_on.is.null,ends_on.gte.${today}`)
        .limit(60);
      if (error || !data) return [];
      return sortStories((data as StoryRow[]).filter((s) => isStoryLive(s, today)));
    } catch {
      // Tabella non ancora creata (migrazione 016 da eseguire): nessuna storia.
      return [];
    }
  },
  ['stories-live'],
  { revalidate: 60, tags: [STORIES_TAG] }
);

/** Storie attive oggi, per il visore pubblico. Non lancia mai errori. */
export async function getLiveStories(lang: 'it' | 'en'): Promise<StorySlide[]> {
  const rows = await loadLiveRows();
  return rows
    .filter((r) => (r.kind !== 'foto' && r.kind !== 'video') || r.media_path)
    .map((r) => toSlide(r, lang, storyMediaUrl(r.media_path)));
}
