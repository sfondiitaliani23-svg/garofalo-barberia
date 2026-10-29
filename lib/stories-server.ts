import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { STORY_MS, isLiveNow, romeToday, sortStories, toSlide, type StoryRow, type StorySlide } from '@/lib/utils/stories';

export const STORIES_BUCKET = 'storie';
export const STORIES_TAG = 'stories';

/** Indirizzo pubblico di un file nello spazio "storie". */
export function storyMediaUrl(path: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${STORIES_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

async function readLiveRows(): Promise<StoryRow[]> {
  try {
    const supabase = await createServiceClient();
    if (!supabase) return [];
    const today = romeToday();
    // Ieri e oggi: copre le 24 ore che scavalcano la mezzanotte e le storie
    // programmate (partono a mezzanotte anche se sono state create prima).
    const fromDay = romeToday(Date.now() - STORY_MS);
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .gte('starts_on', fromDay)
      .lte('starts_on', today)
      .limit(60);
    if (error || !data) return [];
    return sortStories((data as StoryRow[]).filter((s) => isLiveNow(s)));
  } catch {
    // Tabella non ancora creata (migrazione 016 da eseguire): nessuna storia.
    return [];
  }
}

const loadLiveRows = unstable_cache(readLiveRows, ['stories-live'], { revalidate: 60, tags: [STORIES_TAG] });

function slidesFrom(rows: StoryRow[], lang: 'it' | 'en'): StorySlide[] {
  return rows
    .filter((r) => (r.kind !== 'foto' && r.kind !== 'video') || r.media_path)
    .map((r) => toSlide(r, lang, storyMediaUrl(r.media_path)));
}

/** Storie attive oggi, per il visore pubblico. Non lancia mai errori. */
export async function getLiveStories(lang: 'it' | 'en'): Promise<StorySlide[]> {
  return slidesFrom(await loadLiveRows(), lang);
}

/** Stesse storie, lette adesso: la home in cache le chiede appena si apre. */
export async function getLiveStoriesFresh(lang: 'it' | 'en'): Promise<StorySlide[]> {
  return slidesFrom(await readLiveRows(), lang);
}
