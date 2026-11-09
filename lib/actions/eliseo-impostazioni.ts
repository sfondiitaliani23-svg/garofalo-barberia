'use server';

import { requireAdmin, requireAdminView } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/seo';
import { SITE_CONFIG } from '@/lib/site-config';
import { cleanImpostazioni, IMPOSTAZIONI_KEY, type EliseoImpostazioni } from '@/lib/utils/eliseo-impostazioni';
import type { TrainingPrompt } from '@/lib/utils/eliseo-training';
import { PROMPTS_KEY, clearTrainingCache } from '@/lib/chat/eliseo-training-server';

// Impostazioni, profilo ed escalation dell'area Eliseo (sul modello di Keplero, 09/11/2026).
// Salvate in site_content con is_active = false: non si leggono dal sito pubblico. Nessuna migrazione.

const base = () => ({
  azienda: SITE_CONFIG.name,
  privacyUrl: `${SITE_URL}/privacy`,
  terminiUrl: '',
});

async function readKey(key: string): Promise<string | null> {
  const supabase = await createServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from('site_content').select('body').eq('key', key).maybeSingle();
  return (data?.body as string | undefined) ?? null;
}

async function writeKey(key: string, title: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  const now = new Date().toISOString();
  const { data: row } = await supabase.from('site_content').select('id').eq('key', key).maybeSingle();
  const res = row
    ? await supabase.from('site_content').update({ body, is_active: false, updated_at: now }).eq('id', row.id)
    : await supabase.from('site_content').insert({ key, title, body, is_active: false, updated_at: now });
  if (res.error) return { ok: false, error: res.error.message };
  return { ok: true };
}

export type EliseoAccount = { email: string | null; fullName: string | null; role: string };

export async function getImpostazioniAction(): Promise<
  { ok: true; impostazioni: EliseoImpostazioni; prompts: TrainingPrompt[]; account: EliseoAccount } | { ok: false; error: string }
> {
  const { profile } = await requireAdminView();
  const account: EliseoAccount = { email: profile.email, fullName: profile.full_name, role: profile.role };
  try {
    const [rawImp, rawPrompts] = await Promise.all([readKey(IMPOSTAZIONI_KEY), readKey(PROMPTS_KEY)]);
    let imp: unknown = {};
    try { imp = rawImp ? JSON.parse(rawImp) : {}; } catch { imp = {}; }
    return { ok: true, impostazioni: cleanImpostazioni(imp, base()), prompts: cleanPrompts(safeJson(rawPrompts)), account };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lettura impostazioni non riuscita.' };
  }
}

export async function saveImpostazioniAction(raw: unknown): Promise<{ ok: true; impostazioni: EliseoImpostazioni } | { ok: false; error: string }> {
  await requireAdmin();
  const clean = cleanImpostazioni(raw, base());
  const res = await writeKey(IMPOSTAZIONI_KEY, 'impostazioni Eliseo', JSON.stringify(clean));
  return res.ok ? { ok: true, impostazioni: clean } : res;
}

function safeJson(s: string | null): unknown {
  try { return s ? JSON.parse(s) : []; } catch { return []; }
}

const MAX_PROMPTS = 10;
const MAX_PROMPT_CHARS = 10000;

function cleanPrompts(raw: unknown): TrainingPrompt[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map((p, i) => ({
      titolo: (typeof p.titolo === 'string' && p.titolo.trim() ? p.titolo.trim() : `Prompt ${i + 2}`).slice(0, 80),
      testo: (typeof p.testo === 'string' ? p.testo : '').slice(0, MAX_PROMPT_CHARS),
      attivo: typeof p.attivo === 'boolean' ? p.attivo : true,
    }))
    .slice(0, MAX_PROMPTS);
}

/** Prompt aggiuntivi (oltre al principale da 10.000 caratteri): fino a 10, ciascuno fino a 10.000 caratteri. */
export async function savePromptsAction(raw: unknown): Promise<{ ok: true; prompts: TrainingPrompt[] } | { ok: false; error: string }> {
  await requireAdmin();
  const prompts = cleanPrompts(raw);
  const res = await writeKey(PROMPTS_KEY, 'prompt aggiuntivi Eliseo', JSON.stringify(prompts));
  if (!res.ok) return res;
  clearTrainingCache();
  return { ok: true, prompts };
}
