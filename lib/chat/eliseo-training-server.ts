import { createServiceClient } from '@/lib/supabase/server';
import type { EliseoTraining, TrainingPrompt } from '@/lib/utils/eliseo-training';

// Addestramento letto da /admin/eliseo per la chat del sito. Cache di 60 secondi: una modifica in admin arriva entro un minuto.
const TTL = 60_000;
let cache: { at: number; data: EliseoTraining } | null = null;

export const PROMPTS_KEY = 'eliseo:prompts';

export function clearTrainingCache() {
  cache = null;
}

export async function loadEliseoTraining(): Promise<EliseoTraining | null> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  try {
    const supabase = await createServiceClient();
    if (!supabase) return null;
    const [a, f, d, p] = await Promise.all([
      supabase.from('eliseo_assistente').select('istruzioni').eq('id', 1).maybeSingle(),
      supabase.from('eliseo_faq').select('cartella, domanda, parole, risposta').eq('attiva', true).limit(300),
      supabase.from('eliseo_documenti').select('titolo, testo').eq('attivo', true).limit(60),
      supabase.from('site_content').select('body').eq('key', PROMPTS_KEY).maybeSingle(),
    ]);
    let prompts: TrainingPrompt[] = [];
    try {
      const raw = p.data?.body ? JSON.parse(p.data.body) : [];
      if (Array.isArray(raw)) prompts = raw.filter((x) => x && typeof x.testo === 'string');
    } catch {
      prompts = [];
    }
    const data: EliseoTraining = {
      istruzioni: (a.data?.istruzioni as string | undefined) || '',
      prompts,
      faq: (f.data ?? []) as EliseoTraining['faq'],
      documenti: (d.data ?? []) as EliseoTraining['documenti'],
    };
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return null;
  }
}
